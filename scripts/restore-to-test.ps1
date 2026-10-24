# RWCLL: practice restoring a backup into the TEST project (never live).
#
# Recovery path being practiced:
#   fresh Supabase project -> build structure from the migration files
#   -> load data.sql from a backup (this script).
#
# Needs psql (PostgreSQL command line tools). It does not need Docker.
#
# Run from the project folder:
#   powershell -ExecutionPolicy Bypass -File .\scripts\restore-to-test.ps1
# Optional: -BackupFolder "D:\sandbox\RWCLL-backups\2026-10-24_1518"
#           -PsqlPath "C:\path\to\psql.exe"
#
# Safety:
#  - connects as the TEST project's user, so it cannot reach the live project
#  - refuses to run if the test project already holds data
#  - verifies the backup's checksums first
#  - everything loads in ONE transaction: if anything fails, nothing is loaded
#  - the database password is typed hidden and never saved

param(
  [string]$BackupRoot = "D:\sandbox\RWCLL-backups",
  [string]$BackupFolder = "",
  [string]$PsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
)

$ErrorActionPreference = "Stop"
$TestRef = "mucsujjpfefrfxystxse"

# --- Find and verify the backup ----------------------------------------

if (-not $BackupFolder) {
  $latest = Get-ChildItem $BackupRoot -Directory | Sort-Object Name | Select-Object -Last 1
  if (-not $latest) { throw "No backup folders found in $BackupRoot." }
  $BackupFolder = $latest.FullName
}
$dataFile = Join-Path $BackupFolder "data.sql"
$sumFile = Join-Path $BackupFolder "checksums.txt"
if (-not (Test-Path $dataFile)) { throw "data.sql was not found in $BackupFolder." }
if (-not (Test-Path $sumFile)) { throw "checksums.txt was not found, so this backup cannot be verified." }

foreach ($line in Get-Content $sumFile) {
  if ($line.Trim() -eq "") { continue }
  $parts = $line -split '\s+', 2
  $expectedHash = $parts[0]
  $fileName = $parts[1].Trim()
  $actualHash = (Get-FileHash -Algorithm SHA256 -Path (Join-Path $BackupFolder $fileName)).Hash
  if ($actualHash -ne $expectedHash) {
    throw "Checksum mismatch for $fileName. The backup file has changed or is damaged."
  }
}
Write-Host "Backup: $BackupFolder"
Write-Host "Backup checksums verified."

# --- Check psql ---------------------------------------------------------

if (-not (Test-Path $PsqlPath)) {
  throw "psql was not found at $PsqlPath. Pass -PsqlPath with its real location."
}

function Invoke-Psql {
  param([string[]]$Arguments)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = (& $PsqlPath @Arguments 2>&1 | ForEach-Object { "$_" } | Out-String)
  $code = $LASTEXITCODE
  $ErrorActionPreference = $previous
  return [pscustomobject]@{ Output = $output.Trim(); ExitCode = $code }
}

$version = Invoke-Psql @("--version")
if ($version.ExitCode -ne 0) {
  throw "psql did not start: $($version.Output). If you copied only psql.exe, install the full command line tools so its supporting files are present."
}
Write-Host "Using $($version.Output)"

# --- Connection details (password is never written anywhere) -------------

$dbHost = (Read-Host "Test project Session pooler HOST only (Connect > Session pooler; looks like aws-1-us-east-2.pooler.supabase.com)").Trim()
if (-not $dbHost -or $dbHost -match '[\s/@:]') {
  throw "Enter only the host name, with no user name, password, port, or slashes."
}
$secure = Read-Host "Test project database password (typing is hidden)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$env:PGHOST = $dbHost
$env:PGPORT = "5432"
$env:PGUSER = "postgres.$TestRef"
$env:PGDATABASE = "postgres"
$env:PGSSLMODE = "require"
$env:PGPASSWORD = $plain
$plain = $null

$countQuery = @"
select t as table_name, n as row_count from (
  select 'auth.users' as t, count(*) as n from auth.users
  union all select 'auth.identities', count(*) from auth.identities
  union all select 'public.profiles', count(*) from public.profiles
  union all select 'public.roles', count(*) from public.roles
  union all select 'public.user_roles', count(*) from public.user_roles
  union all select 'public.umpires', count(*) from public.umpires
  union all select 'public.umpire_private_details', count(*) from public.umpire_private_details
  union all select 'public.leagues', count(*) from public.leagues
  union all select 'public.seasons', count(*) from public.seasons
  union all select 'public.divisions', count(*) from public.divisions
  union all select 'public.teams', count(*) from public.teams
  union all select 'public.locations', count(*) from public.locations
  union all select 'public.games', count(*) from public.games
  union all select 'public.game_assignments', count(*) from public.game_assignments
  union all select 'public.umpire_availability', count(*) from public.umpire_availability
  union all select 'public.little_league_age_charts', count(*) from public.little_league_age_charts
  union all select 'public.little_league_age_chart_entries', count(*) from public.little_league_age_chart_entries
) c order by t
"@

try {
  # --- Pre-checks on the test project ------------------------------------

  $emptyCheck = Invoke-Psql @(
    "--no-psqlrc", "-t", "-A", "-c",
    "select (select count(*) from auth.users) + (select count(*) from public.profiles) + (select count(*) from public.umpires) + (select count(*) from public.leagues) + (select count(*) from public.seasons) + (select count(*) from public.little_league_age_charts)"
  )
  if ($emptyCheck.ExitCode -ne 0) {
    throw "Could not connect to the test project:`n$($emptyCheck.Output)"
  }
  if ($emptyCheck.Output -ne "0") {
    throw "The test project already contains data ($($emptyCheck.Output) rows in key tables). This script only restores into an empty test project."
  }
  Write-Host "Connected to the test project; it is empty, as required."

  Write-Host ""
  Write-Host "About to load the backup's data into the TEST project ($TestRef)."
  Write-Host "The 9 seeded roles will be replaced by the backup's copy."
  $answer = Read-Host "Type RESTORE to continue"
  if ($answer -ne "RESTORE") {
    Write-Host "Cancelled. Nothing was changed."
    return
  }

  # --- Restore -------------------------------------------------------------

  Write-Host "Restoring ..."
  $restore = Invoke-Psql @(
    "--no-psqlrc",
    "--single-transaction",
    "--variable", "ON_ERROR_STOP=1",
    "--command", "SET session_replication_role = replica",
    "--command", "DELETE FROM public.roles",
    "--file", $dataFile
  )
  Write-Host $restore.Output
  if ($restore.ExitCode -ne 0) {
    throw "The restore FAILED and was rolled back, so nothing was loaded. Read the messages above."
  }

  # --- Row counts to compare with the live project ---------------------------

  Write-Host ""
  Write-Host "Restore finished. Row counts in the TEST project:"
  $counts = Invoke-Psql @("--no-psqlrc", "-c", $countQuery)
  Write-Host $counts.Output
  Write-Host ""
  Write-Host "Now run the same count query on the LIVE project and compare."
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PGHOST -ErrorAction SilentlyContinue
  Remove-Item Env:PGPORT -ErrorAction SilentlyContinue
  Remove-Item Env:PGUSER -ErrorAction SilentlyContinue
  Remove-Item Env:PGDATABASE -ErrorAction SilentlyContinue
  Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
}
