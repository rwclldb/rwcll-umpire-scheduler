// RWCLL: run EVERY database check script and say which ones have problems.
//
// Normally started through scripts\run-all-checks.ps1, which asks for the
// project's connection details (the password is typed hidden) and then runs
// this file. It can also be run directly when the standard PG* environment
// variables (PGHOST, PGUSER, PGPASSWORD, ...) are already set:
//
//   node scripts/run-checks.mjs --label test
//
// Options
//   --root <folder>    the project folder (default: the folder you are in)
//   --tests <folder>   where the check scripts are (default: found automatically,
//                      normally supabase/tests)
//   --psql <path>      psql program (default: Program Files on Windows, else "psql")
//   --label <name>     "test" or "live", shown in the report and the log name
//   --only <text>      run only the checks whose file name contains this text
//   --log-dir <folder> where the full log is written
//   --timeout <secs>   longest a single check may run (default 180)
//
// Every check runs inside a transaction that is ALWAYS rolled back, so nothing
// a check does can ever be saved, even if a check script has a mistake.
//
// Exit code: 0 all checks passed, 1 something needs attention, 2 could not start.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// ------------------------------------------------------------- reading output

// Reads what psql printed for one check script.
//   finished: the script printed its closing line ("Failures: N" or
//             "Items needing attention: N"), so it ran to the end
//   problems: how many problems the script itself counted
export function parseCheckOutput(text) {
  const lines = text.split(/\r?\n/);
  const result = {
    finished: false,
    problems: 0,
    passes: 0,
    failLines: [],
    infoLines: 0,
    skips: 0,
    errorText: "",
  };

  for (const raw of lines) {
    const line = raw.trim();

    const marker = /^(PASS|FAIL|INFO|SKIP)\s+(\S.*)$/.exec(line);
    if (marker) {
      if (marker[1] === "PASS") result.passes += 1;
      else if (marker[1] === "FAIL") result.failLines.push(line);
      else if (marker[1] === "INFO") result.infoLines += 1;
      else result.skips += 1;
      continue;
    }

    const closing = /^(Failures|Items needing attention):\s*(\d+)$/i.exec(line);
    if (closing) {
      result.finished = true;
      result.problems = Number(closing[2]);
    }
  }

  // If the script did not finish, the useful part is psql's own error message.
  if (!result.finished) {
    const at = lines.findIndex((line) => /ERROR:/.test(line));
    if (at !== -1) {
      result.errorText = lines
        .slice(at, at + 4)
        .map((line) => line.replace(/^psql:[^:]*:\d+:\s*/, "").trim())
        .filter(Boolean)
        .join(" ")
        .slice(0, 300);
    }
  }

  return result;
}

// One of: "pass", "fail", "stopped". Also a short sentence about it.
export function judge(parsed, exitCode) {
  if (!parsed.finished) {
    if (parsed.errorText) {
      return { status: "stopped", note: `could not finish: ${parsed.errorText}` };
    }
    return {
      status: "stopped",
      note:
        exitCode === 0
          ? "ran without printing its report (everything it did was rolled back)"
          : "ended without its report",
    };
  }

  const failed = Math.max(parsed.problems, parsed.failLines.length);
  if (failed > 0) {
    const total = parsed.passes + parsed.failLines.length;
    return {
      status: "fail",
      note: `${failed} ${failed === 1 ? "problem" : "problems"}${total ? ` in ${total} tests` : ""}`,
    };
  }

  return { status: "pass", note: `${parsed.passes} tests passed` };
}

// The check scripts in a folder: every .sql file with "check" in its name.
export function findChecks(folder, only = "") {
  return readdirSync(folder)
    .filter((name) => /check.*\.sql$/i.test(name))
    .filter((name) => !only || name.toLowerCase().includes(only.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

// Finds the folder that holds the check scripts. A folder that was named is
// used as it is. Otherwise supabase/tests is preferred, then the other likely
// places in the project, so the tool still works if the scripts were saved
// somewhere else.
export function findTestsFolder(root, named, home = homedir()) {
  if (named) {
    const folder = resolve(root, named);
    const count = existsSync(folder) && statSync(folder).isDirectory() ? findChecks(folder).length : 0;
    return count > 0 ? { folder, count, fallback: false } : { folder: null, named: folder };
  }

  const preferred = resolve(root, "supabase", "tests");
  const places = [
    preferred,
    ...["supabase/test", "supabase/sql", "supabase", "tests", "scripts", "docs", "sql", "."].map((p) => resolve(root, p)),
  ];

  const found = [];
  const searched = [];
  for (const folder of new Set(places)) {
    searched.push(folder);
    if (existsSync(folder) && statSync(folder).isDirectory()) {
      const count = findChecks(folder).length;
      if (count > 0) found.push({ folder, count });
    }
  }

  if (found.length > 0) {
    const chosen = found.find((item) => item.folder === preferred) ?? [...found].sort((a, b) => b.count - a.count)[0];
    return { folder: chosen.folder, count: chosen.count, fallback: chosen.folder !== preferred };
  }

  // Nothing in the project: see whether they are sitting in Downloads.
  const downloads = join(home, "Downloads");
  const downloadsCount = existsSync(downloads) && statSync(downloads).isDirectory() ? findChecks(downloads).length : 0;
  return { folder: null, searched, downloads: downloadsCount > 0 ? downloads : null, downloadsCount };
}

// What to tell the person when no check scripts can be found.
export function noChecksMessage(root, located) {
  const win = process.platform === "win32";
  const folderHint = win ? "supabase\\tests" : "supabase/tests";

  if (located.named) {
    return `The check scripts folder you named was not found, or has no check scripts in it:\n  ${located.named}`;
  }

  const lines = [
    "No check scripts were found in the project.",
    "",
    `Project folder: ${root}`,
    "I looked in:",
    ...located.searched.map((folder) => `  ${relative(root, folder) || "(the project folder itself)"}`),
    "",
    `The check scripts (files ending in _check.sql) belong in ${folderHint} inside the project.`,
  ];

  if (located.downloads) {
    lines.push(
      "",
      `I can see ${located.downloadsCount} check script${located.downloadsCount === 1 ? "" : "s"} in your Downloads folder (${located.downloads}). To move them into the project:`,
      win
        ? `  mkdir supabase\\tests\n  Move-Item "${join(located.downloads, "*check*.sql")}" supabase\\tests`
        : `  mkdir -p supabase/tests\n  mv ${join(located.downloads, "*check*.sql")} supabase/tests/`
    );
  } else {
    lines.push("", `Create that folder and copy the check scripts into it, then run this again.`);
  }

  return lines.join("\n");
}

// --------------------------------------------------------------------- running

function options(argv) {
  const found = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) found[argv[i].slice(2)] = argv[i + 1] ?? "";
  }
  return found;
}

function colour(text, code) {
  return process.stdout.isTTY && !process.env.NO_COLOR ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function main() {
  const given = options(process.argv.slice(2));
  const label = (given.label || "database").toLowerCase();
  const root = resolve(given.root || process.cwd());
  const psql =
    given.psql || (process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql");
  const timeoutMs = (Number(given.timeout) || 180) * 1000;

  const preferredLogRoot = "D:\\sandbox\\RWCLL-backups";
  const logFolder = given["log-dir"]
    ? resolve(given["log-dir"])
    : existsSync(preferredLogRoot)
      ? join(preferredLogRoot, "check-results")
      : resolve(root, "check-results");

  // --- can we start at all?
  const located = findTestsFolder(root, given.tests || "");
  if (!located.folder) {
    console.error(noChecksMessage(root, located));
    process.exit(2);
  }

  const testsFolder = located.folder;
  if (located.fallback) {
    console.log(`Note: there were no check scripts in supabase/tests, so the ${located.count} found in ${relative(root, testsFolder) || "the project folder"} are being used.`);
  }

  const files = findChecks(testsFolder, given.only || "");
  if (files.length === 0) {
    console.error(`No check scripts were found in ${testsFolder}${given.only ? ` matching "${given.only}"` : ""}.`);
    process.exit(2);
  }

  const version = spawnSync(psql, ["--version"], { encoding: "utf8" });
  if (version.error || version.status !== 0) {
    console.error(`psql could not be started (${psql}).\n${version.error?.message ?? version.stderr ?? ""}\nPass the real location with -PsqlPath.`);
    process.exit(2);
  }

  process.env.PGCLIENTENCODING = "UTF8";

  const probe = spawnSync(
    psql,
    ["--no-psqlrc", "-X", "-t", "-A", "-F", "|", "-c", "select current_user, current_database(), current_setting('server_version')"],
    { encoding: "utf8", timeout: 60000, env: process.env }
  );
  if (probe.error || probe.status !== 0) {
    console.error(`Could not connect to the ${label} project:\n${(probe.stderr || probe.error?.message || "").trim()}`);
    process.exit(2);
  }
  const [who, database, serverVersion] = probe.stdout.trim().split("|");

  console.log("");
  console.log(`Running ${files.length} check${files.length === 1 ? "" : "s"} on the ${label.toUpperCase()} project`);
  console.log(`Connected as ${who} to "${database}" (PostgreSQL ${serverVersion}). Every check is rolled back; nothing is saved.`);
  console.log("");

  const nameWidth = Math.max(...files.map((name) => name.length)) + 2;
  const log = [`RWCLL database checks on ${label.toUpperCase()}`, `Started ${new Date().toISOString()}`, `Connected as ${who} to ${database}`, ""];
  const outcomes = [];

  for (const name of files) {
    const started = Date.now();
    const run = spawnSync(
      psql,
      [
        "--no-psqlrc", "-X",
        "-v", "ON_ERROR_STOP=1",
        // The whole script runs inside a transaction that is always rolled back,
        // even if a check script forgot to end with its own rollback error.
        "-c", "begin",
        "-f", join(testsFolder, name),
        "-c", "rollback",
      ],
      // UTF-8 is forced so that psql reads the script files the same way on every computer
      { encoding: "utf8", timeout: timeoutMs, maxBuffer: 50 * 1024 * 1024, env: { ...process.env, PGCLIENTENCODING: "UTF8" } }
    );

    const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
    let verdict;

    if (run.error) {
      verdict = {
        status: "stopped",
        note: run.error.code === "ETIMEDOUT"
          ? `took longer than ${timeoutMs / 1000} seconds and was stopped`
          : `could not be started: ${run.error.message}`,
      };
    } else {
      verdict = judge(parseCheckOutput(output), run.status);
    }

    const parsed = parseCheckOutput(output);
    outcomes.push({ name, ...verdict, parsed });

    const tag =
      verdict.status === "pass" ? colour("[ PASS ]", "32")
      : verdict.status === "fail" ? colour("[ FAIL ]", "31")
      : colour("[ STOP ]", "33");

    console.log(`  ${tag}  ${name.padEnd(nameWidth)}${verdict.note}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    // show the failing tests, also for a check that stopped part-way
    for (const line of parsed.failLines) console.log(`            ${line}`);

    log.push(`===== ${name}  ->  ${verdict.status.toUpperCase()}: ${verdict.note}`, output.trim(), "");
  }

  const bad = outcomes.filter((outcome) => outcome.status !== "pass");
  const tests = outcomes.reduce((sum, o) => sum + o.parsed.passes + o.parsed.failLines.length, 0);

  console.log("");
  if (bad.length === 0) {
    console.log(colour(`RESULT: ALL ${outcomes.length} CHECKS PASSED on ${label.toUpperCase()}  (${tests} individual tests)`, "32"));
  } else {
    console.log(colour(`RESULT: ${bad.length} OF ${outcomes.length} CHECKS NEED ATTENTION on ${label.toUpperCase()}`, "31"));
    for (const outcome of bad) console.log(`  - ${outcome.name}: ${outcome.note}`);
  }

  try {
    mkdirSync(logFolder, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const logPath = join(logFolder, `checks_${label}_${stamp}.txt`);
    writeFileSync(logPath, log.join("\n"), "utf8");
    console.log(`Full details: ${logPath}`);
  } catch (error) {
    console.log(`(The log file could not be written: ${error.message})`);
  }
  console.log("");

  process.exit(bad.length === 0 ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main();
}
