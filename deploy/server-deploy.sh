#!/usr/bin/env bash
# Server side of a City Shield v2 deploy, shared by deploy/deploy.ps1 (from a PC)
# and Shield Control (from the server itself):
#   bash server-deploy.sh <release-id> <absolute path to release.tar.gz>
# Unpacks the release into /srv/celure/cityshield2/src, builds images tagged with
# the release id, restarts the stack, keeps five builds for rollback and installs
# the nightly backup (cron is skipped when CS_SKIP_CRON is set).
set -euo pipefail
SHA="${1:-}"; TAR="${2:-}"
DIR=/srv/celure/cityshield2
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || { echo "bad release id: $SHA" >&2; exit 2; }
[ -f "$TAR" ] || { echo "release archive not found: $TAR" >&2; exit 2; }
cd "$DIR"
if [ ! -f .env ]; then
  # Subshell: the private umask must not leak into the unpack below, or the
  # image's node user could not read the source.
  ( umask 077; printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\nAPI_BIND=127.0.0.1:8788\nDEMO_MODE=true\nSECONDS_PER_MINUTE=12\n' "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" > .env )
fi
rm -rf src.new && mkdir src.new && tar -xzf "$TAR" -C src.new
rm -rf src && mv src.new src
cd src
export RELEASE="$SHA"
P=()
grep -q '^NGROK_AUTHTOKEN=.' ../.env && grep -q '^NGROK_DOMAIN=.' ../.env && P+=(--profile tunnel)
grep -q '^CF_TUNNEL_TOKEN=.' ../.env && P+=(--profile cloudflare)
if grep -q '^WEB_ENABLED=true' ../.env; then P+=(--profile web); else docker rm -f cityshield2-web >/dev/null 2>&1 || true; fi
docker compose --env-file ../.env "${P[@]}" up -d --build
echo "$SHA $(date -Is) ${CS_DEPLOY_BY:-deploy}" >> ../releases.log
# Keep the five newest builds of each image for rollback.
for img in cityshield2-api cityshield2-web; do
  docker images "$img" --format '{{.Tag}}' | grep -v '^latest$' | tail -n +6 | xargs -r -I{} docker rmi "$img:{}" >/dev/null 2>&1 || true
done
install -m 755 deploy/backup.sh ../backup.sh
if command -v crontab >/dev/null && [ -z "${CS_SKIP_CRON:-}" ]; then
  ( crontab -l 2>/dev/null | grep -v 'cityshield2/backup.sh' ; echo "45 2 * * * $DIR/backup.sh >> $DIR/backup.log 2>&1" ) | crontab -
fi
docker compose --env-file ../.env "${P[@]}" ps
