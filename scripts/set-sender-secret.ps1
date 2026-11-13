# RWCLL: put the sender secret (and the project's address) where the scheduled jobs and functions need them,
# reading the secret from .env.local, so it is never written in a file that goes to GitHub.
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\set-sender-secret.ps1               (test project)
#   powershell -ExecutionPolicy Bypass -File .\scripts\set-sender-secret.ps1 -Target live
#   powershell -ExecutionPolicy Bypass -File .\scripts\set-sender-secret.ps1 -Generate     (make a NEW secret first)
#
# The secret lives in .env.local in the project folder (git ignores every .env.* file), one per project:
#   SENDER_SECRET_TEST=...
#   SENDER_SECRET_LIVE=...
# These names do not start with VITE_, so they are never put into the app that goes to people's browsers.
#
# What it does, for the chosen project:
#   1. With -Generate: makes a new long random secret and saves it in .env.local (replacing the old one).
#   2. Sets SENDER_SECRET on the project's functions (send-outbox and sync-calendar both read it):
#        npx supabase secrets set SENDER_SECRET=... --project-ref <ref>
#   3. Copies a short SQL script to the clipboard that stores the same secret, and the project's address, in the
#      Vault (where the scheduled jobs read them). Paste it into that project's SQL Editor and press Run.
#      It creates the two Vault secrets, or updates them if they are already there, so it is safe to run again.
#
# Do steps 2 and 3 close together: between them the scheduled jobs are refused (nothing is lost; waiting messages
# are sent on the next run that works).

param(
  [ValidateSet("test", "live")]
  [string]$Target = "test",
  [switch]$Generate
)

$ErrorActionPreference = "Stop"
$TestRef = "mucsujjpfefrfxystxse"
$LiveRef = "tayveudoxrdkqnmcjrtu"

if ($Target -eq "live") { $ref = $LiveRef } else { $ref = $TestRef }
$key = "SENDER_SECRET_$($Target.ToUpper())"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $ProjectRoot ".env.local"

Write-Host "Project: $($Target.ToUpper()) ($ref)"

# ---- 1. the secret, from .env.local (or a new one)
$lines = @()
if (Test-Path $EnvFile) { $lines = @(Get-Content $EnvFile) }

if ($Generate) {
  $chars = [char[]]"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })

  $lines = @($lines | Where-Object { $_ -notmatch "^\s*$key\s*=" }) + "$key=$secret"
  Set-Content -Path $EnvFile -Value $lines -Encoding utf8
  Write-Host "A new secret was made and saved in .env.local as $key."
} else {
  $line = $lines | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -Last 1
  if (-not $line) {
    throw "$key is not in .env.local. Add it (a long random value, letters and digits), or run again with -Generate."
  }
  $secret = ($line -replace "^\s*$key\s*=\s*", "").Trim().Trim('"').Trim("'")
}

if ($secret -notmatch "^[A-Za-z0-9]{32,}$") {
  throw "$key in .env.local must be at least 32 letters and digits (nothing else)."
}

# ---- 2. the functions' copy
Write-Host "Setting SENDER_SECRET on the $Target project's functions..."
& npx supabase secrets set "SENDER_SECRET=$secret" --project-ref $ref
if ($LASTEXITCODE -ne 0) {
  throw "The function secret was not set (is the Supabase tool logged in? Try: npx supabase login). Nothing else was changed."
}

# ---- 3. the Vault's copy, for the scheduled jobs
$url = "https://$ref.supabase.co"
$sql = @"
-- Stores the sender secret and the project's address in the Vault ($($Target.ToUpper()) project). Safe to run again.
do `$`$
begin
  if exists (select 1 from vault.secrets where name = 'sender_secret') then
    perform vault.update_secret((select id from vault.secrets where name = 'sender_secret'), '$secret');
  else
    perform vault.create_secret('$secret', 'sender_secret');
  end if;

  if exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.update_secret((select id from vault.secrets where name = 'project_url'), '$url');
  else
    perform vault.create_secret('$url', 'project_url');
  end if;
end
`$`$;

select name, updated_at from vault.secrets where name in ('sender_secret', 'project_url');
"@

Set-Clipboard -Value $sql
Write-Host ""
Write-Host "Done with the functions. The Vault SQL is now on your clipboard."
Write-Host "Open the $($Target.ToUpper()) project's SQL Editor ($ref), paste, and press Run."
Write-Host "It should list sender_secret and project_url with today's time. (Clear the clipboard afterwards by copying something else.)"
