# RWCLL: run EVERY database check script and say which ones have problems.
#
# It works from any folder (it finds the project from where this script is),
# but the usual way is from the project folder:
#   powershell -ExecutionPolicy Bypass -File .\scripts\run-all-checks.ps1
# For the live project:
#   powershell -ExecutionPolicy Bypass -File .\scripts\run-all-checks.ps1 -Target live
# To run only some checks (any part of the file name):
#   powershell -ExecutionPolicy Bypass -File .\scripts\run-all-checks.ps1 -Only games
#
# What it does:
#  - asks for the project's Session pooler host and database password
#    (the password is typed hidden and never saved)
#  - finds the check scripts (normally in supabase\tests) and runs every
#    *check*.sql file, one after another
#  - prints PASS or FAIL for each, then one overall result
#  - writes the full details to a log file
#
# Safety: every check runs inside a transaction that is always rolled back, so
# nothing is ever saved. It is safe to run on the live project.
#
# Needs psql (the same one restore-to-test.ps1 uses) and Node (already needed
# for the app).

param(
  [ValidateSet("test", "live")]
  [string]$Target = "test",
  [string]$Only = "",
  [string]$PsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
)

$ErrorActionPreference = "Stop"
$TestRef = "mucsujjpfefrfxystxse"
$LiveRef = "tayveudoxrdkqnmcjrtu"

if ($Target -eq "live") { $ref = $LiveRef } else { $ref = $TestRef }

# The project folder is the one above this scripts folder, wherever you run from.
$Runner = Join-Path $PSScriptRoot "run-checks.mjs"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $Runner)) {
  throw "run-checks.mjs was not found next to this script ($Runner). Both files must be in the same scripts folder."
}
if (-not (Test-Path $PsqlPath)) {
  throw "psql was not found at $PsqlPath. Pass -PsqlPath with its real location."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node was not found. Close and reopen your terminal (or VS Code) so it picks up Node's path."
}

Write-Host "Project: $($Target.ToUpper()) ($ref)"
if ($Target -eq "live") {
  Write-Host "These checks only read and then roll back, so nothing on the live project is changed."
  $answer = Read-Host "Type LIVE to continue"
  if ($answer -ne "LIVE") {
    Write-Host "Cancelled."
    return
  }
}

$dbHost = (Read-Host "$($Target.ToUpper()) project Session pooler HOST only (Connect > Session pooler; looks like aws-1-us-east-2.pooler.supabase.com)").Trim()
if (-not $dbHost -or $dbHost -match '[\s/@:]') {
  throw "Enter only the host name, with no user name, password, port, or slashes."
}
$secure = Read-Host "$($Target.ToUpper()) project database password (typing is hidden)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$env:PGHOST = $dbHost
$env:PGPORT = "5432"
$env:PGUSER = "postgres.$ref"
$env:PGDATABASE = "postgres"
$env:PGSSLMODE = "require"
$env:PGPASSWORD = $plain
$plain = $null

$nodeArgs = @($Runner, "--root", $ProjectRoot, "--label", $Target, "--psql", $PsqlPath)
if ($Only) { $nodeArgs += @("--only", $Only) }

$code = 1
try {
  & node @nodeArgs
  $code = $LASTEXITCODE
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

exit $code
