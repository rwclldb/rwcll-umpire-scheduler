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
# Optional: -ProjectRef "abcdefghijklmnop"   the project to load into (default: the TEST project).
#                                             Use this for a practice or replacement project.
#           -BackupFolder "D:\sandbox\RWCLL-backups\2026-10-24_1518"
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
  [string]$ProjectRef = "mucsujjpfefrfxystxse",
  [string]$PsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
)

$ErrorActionPreference = "Stop"
$LiveRef = "tayveudoxrdkqnmcjrtu"
if ($ProjectRef -eq $LiveRef) {
  throw "Refusing to restore into the LIVE project ($LiveRef). This script loads into the test project, or a practice or replacement project."
}
$TestRef = $ProjectRef

# --- Find and verify the backup ----------------------------------------

if (-not $BackupFolder) {
  # A backup is only finished when its checksums.txt has been written (the last thing the backup does).
  # A folder from a backup that stopped part way has no checksums.txt, so it is skipped, and said so.
  $folders = @(Get-ChildItem $BackupRoot -Directory | Sort-Object Name)
  if ($folders.Count -eq 0) { throw "No backup folders found in $BackupRoot." }

  $finished = @($folders | Where-Object {
    (Test-Path (Join-Path $_.FullName "data.sql")) -and (Test-Path (Join-Path $_.FullName "checksums.txt"))
  })
  if ($finished.Count -eq 0) {
    throw "No finished backup was found in $BackupRoot (a finished one has data.sql and checksums.txt). The newest folder, $($folders[-1].Name), probably holds a backup that stopped part way. Take a new backup with backup-live.ps1 and read what it prints."
  }

  $newest = $folders[-1]
  $BackupFolder = $finished[-1].FullName
  if ($finished[-1].Name -ne $newest.Name) {
    Write-Host "NOTE: the newest folder ($($newest.Name)) is not a finished backup (no checksums.txt), so the newest FINISHED one is used instead: $($finished[-1].Name)." -ForegroundColor Yellow
  }
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
  Write-Host "About to load the backup's data into project $TestRef."
  Write-Host "The rows your migrations pre-fill (roles, settings, the sample consent wording) will be replaced by the backup's copy."
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
    # The migrations pre-fill these tables, and the backup holds its own copy of the same rows, so they
    # are cleared first (the project was checked to be empty of real data above). If a future migration
    # inserts default rows into another table, add a DELETE line for it here.
    "--command", "DELETE FROM public.roles",
    "--command", "DELETE FROM public.app_settings",
    "--command", "DELETE FROM public.sending_settings",
    "--command", "DELETE FROM public.consent_wordings",
    "--file", $dataFile
  )
  Write-Host $restore.Output
  if ($restore.ExitCode -ne 0) {
    throw "The restore FAILED and was rolled back, so nothing was loaded. Read the messages above."
  }

  # --- Row counts to compare with the live project ---------------------------

  Write-Host ""
  Write-Host "Restore finished."

  # Compare what was loaded with row-counts.txt from the backup (made by backup-live.ps1), table by table.
  $countsFile = Join-Path $BackupFolder "row-counts.txt"
  $compared = $false
  if (Test-Path $countsFile) {
    try {
      $expectedCounts = [ordered]@{}
      foreach ($countLine in Get-Content $countsFile) {
        if ($countLine.Trim() -eq "" -or $countLine.StartsWith("#")) { continue }
        $pieces = $countLine -split "`t"
        if ($pieces.Count -eq 2 -and $pieces[0] -match '^[a-z0-9_]+\.[a-z0-9_]+$') { $expectedCounts[$pieces[0]] = [int64]$pieces[1] }
      }
      if ($expectedCounts.Count -eq 0) { throw "row-counts.txt has no table lines." }

      $selects = @($expectedCounts.Keys | ForEach-Object {
        $schemaName, $tableName = $_ -split '\.', 2
        'select ''{0}'' as t, count(*) as n from "{1}"."{2}"' -f $_, $schemaName, $tableName
      })
      $counted = Invoke-Psql @("--no-psqlrc", "-t", "-A", "-F", "|", "-c", ($selects -join " union all "))
      if ($counted.ExitCode -ne 0) { throw "The count query failed: $($counted.Output)" }

      $actualCounts = @{}
      foreach ($resultLine in ($counted.Output -split "\r?\n")) {
        $cells = $resultLine -split '\|'
        if ($cells.Count -eq 2) { $actualCounts[$cells[0].Trim()] = [int64]$cells[1] }
      }

      $differences = @()
      foreach ($name in $expectedCounts.Keys) {
        $got = if ($actualCounts.ContainsKey($name)) { $actualCounts[$name] } else { "(missing)" }
        if ($got -ne $expectedCounts[$name]) {
          $differences += ("  {0}: backup {1}, restored {2}" -f $name, $expectedCounts[$name], $got)
        }
      }

      $totalExpected = ($expectedCounts.Values | Measure-Object -Sum).Sum
      Write-Host ""
      if ($differences.Count -eq 0) {
        Write-Host "ROW COUNTS MATCH the backup: all $($expectedCounts.Count) tables, $totalExpected rows." -ForegroundColor Green
      } else {
        Write-Host "ROW COUNTS DIFFER from the backup for $($differences.Count) of $($expectedCounts.Count) tables:" -ForegroundColor Yellow
        $differences | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
        Write-Host "A difference means rows were not restored. Do not rely on this restore until it is explained." -ForegroundColor Yellow
      }
      $compared = $true
    } catch {
      Write-Host "Could not compare the counts automatically: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  } else {
    Write-Host "This backup has no row-counts.txt (backups made before November 2026 do not)."
  }

  if (-not $compared) {
    Write-Host ""
    Write-Host "Row counts in the project (compare them with the live project by hand: see RECOVERY.md):"
    $counts = Invoke-Psql @("--no-psqlrc", "-c", $countQuery)
    Write-Host $counts.Output
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PGHOST -ErrorAction SilentlyContinue
  Remove-Item Env:PGPORT -ErrorAction SilentlyContinue
  Remove-Item Env:PGUSER -ErrorAction SilentlyContinue
  Remove-Item Env:PGDATABASE -ErrorAction SilentlyContinue
  Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
}
