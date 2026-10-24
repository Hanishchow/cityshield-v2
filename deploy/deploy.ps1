<#
  Deploys the City Shield v2 server side (API + database) to the `celure`
  server (ssh alias). The web app is deployed by GitHub Pages on every push.
    pwsh deploy/deploy.ps1
  Ships the committed HEAD (git archive) and runs deploy/server-deploy.sh from
  that same release on the server: images tagged with the commit, stack
  restarted, last 5 builds kept for rollback, nightly backup installed. Shield
  Control runs the same script when deploying from the server.
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
# The deploy script comes out of the release being deployed, so server and repo never drift.
ssh -o BatchMode=yes $Host_ "cd $Dir && tar -xzf release.tar.gz -O deploy/server-deploy.sh > .server-deploy.sh && CS_DEPLOY_BY=pc bash .server-deploy.sh $sha $Dir/release.tar.gz" 2>&1 | ForEach-Object { "$_" }
Check 'remote build'
Write-Host "Deployed release $sha"
