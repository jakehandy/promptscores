<#
.SYNOPSIS
  Applies Supabase schema and sets local .env for Prompt Scores.

.DESCRIPTION
  Option A: Provide a Postgres connection string (-DbUrl) and this script will run psql to apply supabase/schema.sql.
  Option B: Skip -DbUrl and use the Supabase SQL web editor manually as documented.

.PARAMETER DbUrl
  A Postgres connection string for your Supabase project, e.g.
  "postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"

.PARAMETER SupabaseUrl
  Your Supabase URL from Project Settings > API.

.PARAMETER AnonKey
  Your Supabase anon key from Project Settings > API.

.EXAMPLE
  ./scripts/setup-supabase.ps1 -DbUrl "postgresql://postgres:...@db.xxx.supabase.co:5432/postgres" -SupabaseUrl "https://xxx.supabase.co" -AnonKey "ey..."

.NOTES
  Requires psql if using -DbUrl. Install via: https://www.postgresql.org/download/windows/
#>

param(
  [string]$DbUrl,
  [string]$SupabaseUrl,
  [string]$AnonKey
)

$ErrorActionPreference = 'Stop'

Write-Host "== Prompt Scores Supabase setup ==" -ForegroundColor Cyan

# 1) Apply SQL via psql if DbUrl provided
if ($DbUrl) {
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Error "psql not found. Install PostgreSQL client or run schema via Supabase SQL editor."
  }
  $schemaPath = Join-Path $PSScriptRoot '..' 'supabase' 'schema.sql'
  if (-not (Test-Path $schemaPath)) { Write-Error "Schema file not found: $schemaPath" }
  # Mask sensitive parts when logging
  try {
    $uri = [Uri]$DbUrl
    $safeRef = "$($uri.Host)$($uri.AbsolutePath)"
  } catch {
    $safeRef = "(Supabase database)"
  }
  Write-Host "Applying schema at $schemaPath to $safeRef ..." -ForegroundColor Yellow
  & psql $DbUrl -v ON_ERROR_STOP=1 -f $schemaPath
  Write-Host "Schema applied successfully." -ForegroundColor Green
} else {
  Write-Host "No -DbUrl provided. Run supabase/schema.sql in the Supabase SQL editor." -ForegroundColor Yellow
}

# 2) Write .env if keys provided
if ($SupabaseUrl -and $AnonKey) {
  $envPath = Join-Path $PSScriptRoot '..' '.env'
  $content = @(
    "VITE_SUPABASE_URL=$SupabaseUrl",
    "VITE_SUPABASE_ANON_KEY=$AnonKey"
  ) -join "`n"
  Set-Content -Path $envPath -Value $content -Encoding UTF8
  Write-Host "Wrote .env with Supabase URL and anon key." -ForegroundColor Green
} else {
  Write-Host "Tip: pass -SupabaseUrl and -AnonKey to write local .env automatically." -ForegroundColor DarkGray
}

Write-Host "Done." -ForegroundColor Cyan
