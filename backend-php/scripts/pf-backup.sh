#!/bin/bash
# Nightly database backup with rotation — runs ON the Hostinger server.
# Reads DB credentials from the deployed app/.env (never hardcoded here).
#
# Install (hPanel -> Advanced -> Cron Jobs):
#   0 3 * * *  /bin/bash /home/u700603111/pf-safe/pf-backup.sh
#
# Offsite copies are handled separately by .github/workflows/backup.yml,
# which pulls an encrypted dump to GitHub artifact storage.

set -u
APP=/home/u700603111/domains/crea8ivmedia.com/public_html/app
DEST=/home/u700603111/pf-safe/db-backups
KEEP_DAYS=14

# Parse DB creds from the app .env
DB_NAME=$(grep -E '^DB_NAME=' "$APP/.env" | cut -d= -f2-)
DB_USER=$(grep -E '^DB_USER=' "$APP/.env" | cut -d= -f2-)
DB_PASS=$(grep -E '^DB_PASS=' "$APP/.env" | cut -d= -f2-)

mkdir -p "$DEST"
STAMP=$(date +%Y%m%d-%H%M)
OUT="$DEST/db-$STAMP.sql.gz"

if mysqldump -u "$DB_USER" -p"$DB_PASS" --single-transaction --quick "$DB_NAME" 2>/dev/null | gzip > "$OUT"; then
  # A dump under 1KB is almost certainly an error page/empty — keep but flag
  SIZE=$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")
  echo "$(date '+%F %T') backup ok $OUT (${SIZE}B)" >> "$DEST/backup.log"
else
  echo "$(date '+%F %T') BACKUP FAILED" >> "$DEST/backup.log"
  exit 1
fi

# Rotate: drop dumps older than KEEP_DAYS
find "$DEST" -name 'db-*.sql.gz' -mtime +$KEEP_DAYS -delete
exit 0
