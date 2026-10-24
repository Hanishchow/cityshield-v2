<#
  Deploys the whole City Shield v2 system (web + API + database) to the
  `celure` server (ssh alias).
    pwsh deploy/deploy.ps1
  Ships the committed HEAD (git archive) to /srv/celure/cityshield2/src,
  builds images tagged with the commit (RELEASE), restarts the stack, keeps the
  last 5 builds for deploy/ops.ps1 rollback, and installs the nightly backup.
  Secrets live in /srv/celure/cityshield2/.env, created once on the server and
  never copied off it. The old v1 stack (/srv/celure/cityshield) is not touched.
#>
param([string]$Host_ = 'celure', [string]$Dir = '/srv/celure/cityshield2')
# Native tools (docker, ssh) write progress to stderr; Windows PowerShell 5.1
# would treat that as fatal under 'Stop', so failures are checked via exit codes.
$ErrorActionPreference = 'Continue'
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" } }
$repo = Split-Path -Parent $PSScriptRoot
$dirty = git -C $repo status --porcelain
if ($dirty) { Write-Warning 'Uncommitted changes are NOT deployed (git archive ships HEAD).' }
$sha = (git -C $repo rev-parse --short HEAD).Trim(); Check 'git rev-parse'
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
# Web app reachable over Tailscale until the public tunnel is set up.
grep -q '^WEB_BIND=' .env || echo 'WEB_BIND=100.93.157.65:8789' >> .env
rm -rf src && mkdir src && tar -xzf release.tar.gz -C src
cd src
export RELEASE=$sha
CS_PROFILE=""
grep -q "^NGROK_AUTHTOKEN=." ../.env && grep -q "^NGROK_DOMAIN=." ../.env && CS_PROFILE="--profile tunnel"
grep -q "^CF_TUNNEL_TOKEN=." ../.env && CS_PROFILE="`$CS_PROFILE --profile cloudflare"
docker compose --env-file ../.env `$CS_PROFILE up -d --build
echo "$sha `$(date -Is)" >> ../releases.log
# Keep the five newest builds of each image for rollback.
for img in cityshield2-api cityshield2-web; do
  docker images "`$img" --format '{{.Tag}}' | grep -v '^latest$' | tail -n +6 | xargs -r -I{} docker rmi "`$img:{}" >/dev/null || true
done
# Nightly database + uploads backup at 02:45.
install -m 755 deploy/backup.sh ../backup.sh
( crontab -l 2>/dev/null | grep -v 'cityshield2/backup.sh' ; echo "45 2 * * * $Dir/backup.sh >> $Dir/backup.log 2>&1" ) | crontab -
docker compose --env-file ../.env `$CS_PROFILE ps
"@
# bash rejects Windows line endings (set -e plus a CR), so CRs are stripped too.
# Windows PowerShell mangles embedded double quotes when passing arguments to
# native programs, so the script travels base64-encoded and is decoded remotely.
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($remote -replace "`r", '')))
ssh -o BatchMode=yes $Host_ "echo $b64 | base64 -d | bash" 2>&1 | ForEach-Object { "$_" }
Check 'remote build'
Write-Host "Deployed release $sha"
