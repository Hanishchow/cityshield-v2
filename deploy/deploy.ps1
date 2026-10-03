<#
  Deploys the City Shield v2 backend to the `celure` server (ssh alias).
    pwsh deploy/deploy.ps1
  Ships the committed HEAD (git archive) to /srv/celure/cityshield2/src and
  rebuilds the stack. Secrets live in /srv/celure/cityshield2/.env, created
  once on the server and never copied off it. The live cityshield.live stack
  (/srv/celure/cityshield) is not touched.
#>
param([string]$Host_ = 'celure', [string]$Dir = '/srv/celure/cityshield2')
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dirty = git -C $repo status --porcelain
if ($dirty) { Write-Warning 'Uncommitted changes are NOT deployed (git archive ships HEAD).' }
$tar = Join-Path $env:TEMP 'cityshield2.tar.gz'
git -C $repo archive --format=tar.gz -o $tar HEAD
ssh -o BatchMode=yes $Host_ "mkdir -p $Dir"
scp -q $tar "${Host_}:$Dir/release.tar.gz"
ssh -o BatchMode=yes $Host_ @"
set -e
cd $Dir
if [ ! -f .env ]; then
  umask 077
  printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\nAPI_BIND=127.0.0.1:8788\nDEMO_MODE=true\nSECONDS_PER_MINUTE=12\n' "`$(openssl rand -hex 24)" "`$(openssl rand -hex 32)" > .env
fi
rm -rf src && mkdir src && tar -xzf release.tar.gz -C src
cd src && docker compose --env-file ../.env up -d --build
docker compose --env-file ../.env ps
"@
