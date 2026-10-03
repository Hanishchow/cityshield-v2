<#
  Deploys the City Shield v2 backend to the `celure` server (ssh alias).
    pwsh deploy/deploy.ps1
  Ships the committed HEAD (git archive) to /srv/celure/cityshield2/src and
  rebuilds the stack. Secrets live in /srv/celure/cityshield2/.env, created
  once on the server and never copied off it. The live cityshield.live stack
  (/srv/celure/cityshield) is not touched.
#>
param([string]$Host_ = 'celure', [string]$Dir = '/srv/celure/cityshield2')
# Native tools (docker, ssh) write progress to stderr; Windows PowerShell 5.1
# would treat that as fatal under 'Stop', so failures are checked via exit codes.
$ErrorActionPreference = 'Continue'
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" } }
$repo = Split-Path -Parent $PSScriptRoot
$dirty = git -C $repo status --porcelain
if ($dirty) { Write-Warning 'Uncommitted changes are NOT deployed (git archive ships HEAD).' }
$tar = Join-Path $env:TEMP 'cityshield2.tar.gz'
git -C $repo archive --format=tar.gz -o $tar HEAD; Check 'git archive'
ssh -o BatchMode=yes $Host_ "mkdir -p $Dir"
scp -q $tar "${Host_}:$Dir/release.tar.gz"; Check 'upload'
$remote = @"
set -e
cd $Dir
if [ ! -f .env ]; then
  umask 077
  printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\nAPI_BIND=127.0.0.1:8788\nDEMO_MODE=true\nSECONDS_PER_MINUTE=12\n' "`$(openssl rand -hex 24)" "`$(openssl rand -hex 32)" > .env
fi
rm -rf src && mkdir src && tar -xzf release.tar.gz -C src
cd src
CS_PROFILE=""; grep -q "^NGROK_AUTHTOKEN=." ../.env && grep -q "^NGROK_DOMAIN=." ../.env && CS_PROFILE="--profile tunnel"
docker compose --env-file ../.env `$CS_PROFILE up -d --build
docker compose --env-file ../.env `$CS_PROFILE ps
"@
# bash rejects Windows line endings (set -e plus a CR), so strip CRs before sending.
ssh -o BatchMode=yes $Host_ ($remote -replace "`r", '') 2>&1 | ForEach-Object { "$_" }
Check 'remote build'
