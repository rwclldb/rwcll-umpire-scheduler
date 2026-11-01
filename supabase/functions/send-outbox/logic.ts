// The sender's decisions, with no email, network or database in them, so they can
// be tested exactly. (index.ts does the actual sending.)

export type Settings = Record<string, string>;
export type Mode = "off" | "safe" | "live";

// Anything that is not exactly off, safe or live counts as OFF: a typo can stop
// sending, but it can never switch it on.
export function parseMode(value: string | undefined | null): Mode {
  const v = (value ?? "").trim().toLowerCase();
  return v === "live" || v === "safe" ? v : "off";
}

// "a@x.org, b@y.org  c@z.org;d@w.org" becomes a list of lower-case entries.
export function parseList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item !== "");
}

// A list of phone numbers: separated by commas, semicolons or new lines only
// (NOT spaces, because a number like "(650) 555-0101" has spaces in it).
export function parseNumberList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

// A phone number reduced to its digits, with a leading 1 dropped for the US, so
// "+1 (650) 555-0101" and "650-555-0101" are the same number.
export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function positiveNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

// Nothing in a header may contain a line break (that would let text sneak in extra
// headers, or extra recipients).
export function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

// "RWCLL Umpires" <umpiresched@rwcll.org>, safely.
export function fromHeader(name: string, address: string): string {
  const clean = cleanHeader(name).replace(/["\\<>]/g, "");
  return clean ? `"${clean}" <${cleanHeader(address)}>` : cleanHeader(address);
}

// Compares two secrets without stopping at the first difference.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type Decision<T> = { action: "send"; message: T } | { action: "skip"; reason: string };

export type EmailOut = { to: string; subject: string; text: string; replyTo: string | null };
export type SmsOut = { to: string; text: string };

const hoursBetween = (from: string, now: Date) => (now.getTime() - Date.parse(from)) / 3_600_000;

// What to do with one waiting email.
export function decideEmail(
  row: { to_email: string; subject: string; body: string; created_at: string },
  settings: Settings,
  now: Date
): Decision<EmailOut> {
  const mode = parseMode(settings.email_mode);
  if (mode === "off") return { action: "skip", reason: "Sending is switched off." };

  // so that switching sending on can never release a backlog of old messages
  const maxAge = positiveNumber(settings.email_max_age_hours, 72);
  const age = hoursBetween(row.created_at, now);
  if (age > maxAge) return { action: "skip", reason: `Too old to send (it was queued ${Math.floor(age)} hours ago; the limit is ${maxAge}).` };

  const to = cleanHeader(row.to_email).toLowerCase();
  const subject = cleanHeader(row.subject);
  const replyTo = cleanHeader(settings.email_reply_to ?? "") || null;

  if (mode === "live") return { action: "send", message: { to, subject, text: row.body, replyTo } };

  // safe mode: only the people on the list, unless a redirect address is set
  if (parseList(settings.email_safe_allowlist).includes(to)) {
    return { action: "send", message: { to, subject: `[TEST] ${subject}`, text: row.body, replyTo } };
  }

  const redirect = cleanHeader(settings.email_safe_redirect ?? "").toLowerCase();
  if (redirect) {
    return {
      action: "send",
      message: {
        to: redirect,
        subject: `[TEST for ${to}] ${subject}`,
        text: `SAFE MODE: this message was meant for ${to}. It was sent here instead.\n\n${row.body}`,
        replyTo,
      },
    };
  }

  return { action: "skip", reason: "Safe mode: this address is not on the safe list." };
}

const SMS_SUFFIX = " Reply STOP to opt out.";

export function decideSms(
  row: { to_phone: string; body: string; created_at: string },
  settings: Settings,
  now: Date
): Decision<SmsOut> {
  const mode = parseMode(settings.sms_mode);
  if (mode === "off") return { action: "skip", reason: "Text messages are switched off." };

  const maxAge = positiveNumber(settings.sms_max_age_hours, 6);
  const age = hoursBetween(row.created_at, now);
  if (age > maxAge) return { action: "skip", reason: `Too old to send (it was queued ${Math.floor(age)} hours ago; the limit is ${maxAge}).` };

  if (mode === "safe") {
    const allowed = parseNumberList(settings.sms_safe_allowlist).map(phoneDigits);
    if (!allowed.includes(phoneDigits(row.to_phone))) return { action: "skip", reason: "Safe mode: this number is not on the safe list." };
  }

  const prefix = mode === "safe" ? "[TEST] " : "";
  const body = `${prefix}${row.body}`;
  const text = body.length + SMS_SUFFIX.length <= 320 ? body + SMS_SUFFIX : body.slice(0, 320);
  return { action: "send", message: { to: row.to_phone, text } };
}

// How many emails may go out now: the batch size, but never past the daily limit.
export function dailyBudget(limit: number, sentLastDay: number, batch = 20): number {
  return Math.max(0, Math.min(batch, limit - sentLastDay));
}

export type Outcome = { result: "sent" | "retry" | "failed"; error?: string; stop?: boolean };

// Was a failed send a temporary problem (try again later), a permanent one (this
// message can never be sent), or a sign that the sender itself is broken (stop
// the whole run)?
export function classifySmtpError(err: { responseCode?: number; code?: string; message?: string }): Outcome {
  const message = String(err.message ?? err.code ?? "Could not send.").slice(0, 300);
  const code = err.responseCode ?? 0;
  const text = `${err.code ?? ""} ${message}`.toLowerCase();

  // the mailbox itself: wrong password, or Google's sending limit reached
  if (err.code === "EAUTH" || code === 535 || code === 534 || /sending limit|daily user sending|quota/.test(text)) {
    return { result: "retry", error: message, stop: true };
  }

  // that address will never work
  if ([550, 551, 553, 554].includes(code) || /user unknown|no such user|does not exist|invalid (recipient|address)/.test(text)) {
    return { result: "failed", error: message };
  }

  return { result: "retry", error: message };
}

export function classifyTwilioError(status: number, code: number | undefined, message: string): Outcome {
  const text = String(message ?? "Could not send.").slice(0, 300);
  if (status === 401 || status === 403) return { result: "retry", error: text, stop: true };
  if (status === 429 || status >= 500) return { result: "retry", error: text };
  // invalid or unreachable number, a number that has opted out, and so on
  if ([21211, 21214, 21610, 21612, 21614, 21408].includes(code ?? 0) || (status >= 400 && status < 500)) return { result: "failed", error: text };
  return { result: "retry", error: text };
}
