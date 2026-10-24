#!/usr/bin/env bash
# Nightly backup of the City Shield v2 database and uploaded photos.
#   deploy/backup.sh            -> /srv/celure/backups/cityshield2/<stamp>.{dump,uploads.tar.gz}
# Keeps 14 days. Restore a dump with:
#   docker exec -i cityshield2-db pg_restore -U cityshield -d cityshield --clean --if-exists < <file>.dump
set -euo pipefail
OUT=/srv/celure/backups/cityshield2
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$OUT"
docker exec cityshield2-db pg_dump -U cityshield -d cityshield -Fc > "$OUT/$STAMP.dump.tmp"
mv "$OUT/$STAMP.dump.tmp" "$OUT/$STAMP.dump"
docker run --rm -v cityshield2_uploads:/u:ro -v "$OUT":/out alpine tar -czf "/out/$STAMP.uploads.tar.gz" -C /u .
find "$OUT" -maxdepth 1 -type f -mtime +14 -delete
echo "$(date -Is) ok $(du -h "$OUT/$STAMP.dump" | cut -f1) db, $(du -h "$OUT/$STAMP.uploads.tar.gz" | cut -f1) uploads"
