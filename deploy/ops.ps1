<#
  Day-to-day control of City Shield v2 on `celure`.
    pwsh deploy/ops.ps1 status              containers, health, current release, last backup
    pwsh deploy/ops.ps1 logs [api|web|db]   last 100 log lines (default api)
    pwsh deploy/ops.ps1 releases            builds available for rollback
    pwsh deploy/ops.ps1 rollback <sha>      run an earlier build (no rebuild)
    pwsh deploy/ops.ps1 backup              run the backup now
  Deploy new code with deploy/deploy.ps1.
#>
param([Parameter(Position = 0)][ValidateSet('status', 'logs', 'releases', 'rollback', 'backup')][string]$Cmd = 'status',
      [Parameter(Position = 1)][string]$Arg = '', [string]$Host_ = 'celure', [string]$Dir = '/srv/celure/cityshield2')
$ErrorActionPreference = 'Continue'
$profiles = "CS_PROFILE=''; grep -q '^NGROK_AUTHTOKEN=.' ../.env && CS_PROFILE='--profile tunnel'; grep -q '^CF_TUNNEL_TOKEN=.' ../.env && CS_PROFILE=`"`$CS_PROFILE --profile cloudflare`""
$remote = switch ($Cmd) {
  'status' { @"
cd $Dir/src
docker compose --env-file ../.env ps --format '{{.Name}}  {{.Status}}  {{.Image}}'
echo "release: `$(tail -1 ../releases.log 2>/dev/null)"
echo "health:  `$(curl -s --max-time 5 http://`$(grep '^WEB_BIND=' ../.env | cut -d= -f2)/health || echo unreachable)"
echo "backup:  `$(tail -1 ../backup.log 2>/dev/null || echo none yet)"
df -h / | tail -1
"@ }
  'logs' { $svc = if ($Arg) { $Arg } else { 'api' }; "cd $Dir/src && docker compose --env-file ../.env logs --tail 100 $svc" }
  'releases' { "cd $Dir && tail -10 releases.log && docker images cityshield2-web --format '{{.Tag}}  {{.CreatedSince}}'" }
  'rollback' {
    if ($Arg -notmatch '^[0-9a-f]{7,40}$') { throw 'usage: ops.ps1 rollback <sha> (see: ops.ps1 releases)' }
    @"
set -e
cd $Dir/src
docker image inspect cityshield2-api:$Arg cityshield2-web:$Arg >/dev/null
$profiles
RELEASE=$Arg docker compose --env-file ../.env `$CS_PROFILE up -d --no-build
echo "$Arg `$(date -Is) rollback" >> ../releases.log
docker compose --env-file ../.env ps --format '{{.Name}}  {{.Status}}  {{.Image}}'
"@ }
  'backup' { "$Dir/backup.sh" }
}
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($remote -replace "`r", '')))
ssh -o BatchMode=yes $Host_ "echo $b64 | base64 -d | bash" 2>&1 | ForEach-Object { "$_" }
