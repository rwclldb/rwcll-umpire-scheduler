# RWCLL: back up the LIVE Supabase project to files on this computer.
#
# Uses the official `supabase db dump` command (needs Docker Desktop running).
# It only READS from the database; it changes nothing.
#
# Before running:
#   1. Start Docker Desktop and wait until it says it is running.
#   2. Link the CLI to the live project:
#        npx supabase link --project-ref tayveudoxrdkqnmcjrtu
#   3. Run from the project folder (it makes a dated folder holding roles.sql, schema.sql, data.sql,
#      row-counts.txt and checksums.txt; a backup is finished only when checksums.txt exists):
#        powershell -ExecutionPolicy Bypass -File .\scripts\backup-live.ps1
#   4. Afterwards, link the CLI back to the test project:
#        npx supabase link --project-ref mucsujjpfefrfxystxse
#
# The backup contains personal data (names, emails, emergency contacts)
# and sign-in records. Keep it OFF GitHub and out of email and shared
# folders. Store it only on an encrypted drive or in an encrypted archive.

param(
  [string]$BackupRoot = "D:\sandbox\RWCLL-backups"
)

$ErrorActionPreference = "Stop"
$LiveRef = "tayveudoxrdkqnmcjrtu"
$ProjectFolder = (Get-Location).Path

# --- Safety checks ----------------------------------------------------

# 1. The backup folder must not be inside the project (it could be committed).
$rootFull = [System.IO.Path]::GetFullPath($BackupRoot)
if ($rootFull.TrimEnd('\').StartsWith($ProjectFolder.TrimEnd('\') + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "The backup folder '$rootFull' is inside the project folder. Choose a folder outside the project."
}

# 2. The CLI must be linked to the LIVE project.
$refFile = Join-Path $ProjectFolder "supabase\.temp\project-ref"
if (-not (Test-Path $refFile)) {
  throw "No linked project found. Run this from the project folder, after: npx supabase link --project-ref $LiveRef"
}
$linked = (Get-Content $refFile -Raw).Trim()
if ($linked -ne $LiveRef) {
  throw "The CLI is linked to '$linked', not the live project. Run: npx supabase link --project-ref $LiveRef"
}

# 3. Docker Desktop must be installed and running.
# Docker writes harmless warnings to its error channel, which Windows
# PowerShell would treat as fatal under "Stop". So errors are relaxed
# for this one call, and only docker's exit code decides the result.
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "The 'docker' command was not found. Close and reopen your terminal (or VS Code) so it picks up Docker's path, and check that Docker Desktop is installed."
}
$previousPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$dockerOutput = (& docker info 2>&1 | Out-String)
$dockerExit = $LASTEXITCODE
$ErrorActionPreference = $previousPreference
if ($dockerExit -ne 0) {
  throw "Docker is installed but is not responding (exit code $dockerExit). Docker said:`n$dockerOutput"
}
Write-Host "Docker is running."

# --- Dump -------------------------------------------------------------

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$dir = Join-Path $rootFull $stamp
New-Item -ItemType Directory -Path $dir -Force | Out-Null
Write-Host "Backing up the live project to: $dir"

# The Supabase tool prints progress to the error channel; rely on exit codes.
$ErrorActionPreference = "Continue"

Write-Host "1/3 roles ..."
npx supabase db dump --linked -f (Join-Path $dir "roles.sql") --role-only
if ($LASTEXITCODE -ne 0) { throw "The roles dump failed." }

Write-Host "2/3 schema ..."
npx supabase db dump --linked -f (Join-Path $dir "schema.sql")
if ($LASTEXITCODE -ne 0) { throw "The schema dump failed." }

Write-Host "3/3 data ..."
# storage.buckets_vectors and storage.vector_indexes belong to Supabase's
# storage service; the database user cannot restore them, so they are
# excluded (this matches Supabase's own backup instructions).
npx supabase db dump --linked -f (Join-Path $dir "data.sql") --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
if ($LASTEXITCODE -ne 0) { throw "The data dump failed." }

$ErrorActionPreference = "Stop"

# --- Verify -----------------------------------------------------------

foreach ($name in "roles.sql", "schema.sql", "data.sql") {
  $file = Join-Path $dir $name
  if (-not (Test-Path $file) -or (Get-Item $file).Length -eq 0) {
    throw "$name is missing or empty. Treat this backup as FAILED."
  }
}

$copied = @(
  Select-String -Path (Join-Path $dir "data.sql") -Pattern '^COPY ' |
    ForEach-Object { (($_.Line -split ' ')[1]) -replace '"', '' }
)

$expected = @(
  "public.profiles", "public.roles", "public.user_roles", "public.umpires",
  "public.umpire_private_details", "public.leagues", "public.seasons",
  "public.divisions", "public.teams", "public.locations", "public.games",
  "public.game_assignments", "public.umpire_availability",
  "public.little_league_age_charts", "public.little_league_age_chart_entries",
  "auth.users"
)
$missing = @($expected | Where-Object { $copied -notcontains $_ })

Write-Host ""
Write-Host "Tables found in data.sql: $($copied.Count)"
if ($missing.Count -gt 0) {
  Write-Host "WARNING: these expected tables are NOT in the backup:" -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
} else {
  Write-Host "All expected tables are present, including auth.users." -ForegroundColor Green
}

# Every table the schema defines in "public" should also have a data block in the backup. This
# reads the table names from schema.sql itself, so tables added later are covered automatically
# (the fixed list above only names the oldest tables).
$schemaTables = @(
  Select-String -Path (Join-Path $dir "schema.sql") -Pattern '^CREATE TABLE (IF NOT EXISTS )?"?public"?\."?([A-Za-z0-9_]+)"?' |
    ForEach-Object { "public." + $_.Matches[0].Groups[2].Value }
)
$notInData = @($schemaTables | Where-Object { $copied -notcontains $_ })

Write-Host ""
Write-Host "Tables in schema.sql: $($schemaTables.Count). With a data block in data.sql: $($schemaTables.Count - $notInData.Count)."
if ($schemaTables.Count -eq 0) {
  Write-Host "WARNING: no tables were found in schema.sql, so this check could not run." -ForegroundColor Yellow
} elseif ($notInData.Count -gt 0) {
  Write-Host "WARNING: these tables are defined but have NO data block in the backup:" -ForegroundColor Yellow
  $notInData | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
  Write-Host "If a table listed here should hold rows, treat this backup as incomplete." -ForegroundColor Yellow
} else {
  Write-Host "Every table in the schema has a data block in the backup." -ForegroundColor Green
}

# How many rows each table has in THIS backup, counted from data.sql and saved as row-counts.txt.
# After a restore, restore-to-test.ps1 compares what it loaded with this file, table by table.
$rowCounts = [ordered]@{}
$currentTable = $null
foreach ($dataLine in [System.IO.File]::ReadLines((Join-Path $dir "data.sql"))) {
  if ($null -eq $currentTable) {
    if ($dataLine.StartsWith("COPY ")) {
      $currentTable = (($dataLine -split ' ')[1]) -replace '"', ''
      $rowCounts[$currentTable] = 0
    }
  } elseif ($dataLine -eq '\.') {
    $currentTable = $null
  } else {
    $rowCounts[$currentTable] = $rowCounts[$currentTable] + 1
  }
}
$countLines = @("# Rows in each table of this backup, counted from data.sql ($stamp). Each line: the table, a tab, the row count.")
foreach ($tableName in $rowCounts.Keys) { $countLines += ("{0}`t{1}" -f $tableName, $rowCounts[$tableName]) }
Set-Content -Path (Join-Path $dir "row-counts.txt") -Value $countLines
$totalRows = ($rowCounts.Values | Measure-Object -Sum).Sum
Write-Host ""
Write-Host "Row counts saved in row-counts.txt: $($rowCounts.Count) tables, $totalRows rows."

# Record checksums so a damaged copy can be detected later (row-counts.txt is covered too).
Get-ChildItem $dir -File |
  Where-Object { $_.Extension -eq ".sql" -or $_.Name -eq "row-counts.txt" } |
  Get-FileHash -Algorithm SHA256 |
  ForEach-Object { "$($_.Hash)  $(Split-Path $_.Path -Leaf)" } |
  Set-Content (Join-Path $dir "checksums.txt")

Write-Host ""
Get-ChildItem $dir | Select-Object Name, Length | Format-Table -AutoSize
Write-Host "Done. Remember to link the CLI back to the test project:"
Write-Host "  npx supabase link --project-ref mucsujjpfefrfxystxse"
