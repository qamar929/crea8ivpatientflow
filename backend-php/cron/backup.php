<?php
/**
 * Nightly backup: MySQL dump + uploads archive, with retention.
 *
 * Run from cron (hPanel → Cron Jobs), e.g. daily 02:30:
 *   /usr/bin/php /home/USER/.../public_html/app/cron/backup.php
 *
 * Output lands in app/backups/ :
 *   db-YYYYMMDD-HHMMSS.sql.gz        (full mysqldump, gzipped)
 *   uploads-YYYYMMDD-HHMMSS.tar.gz   (patient images etc.)
 *
 * Retention: keeps the last BACKUP_RETENTION_DAYS days (default 14).
 *
 * OFF-SITE: shared hosting keeps these on the same disk. For real
 * off-site safety set BACKUP_REMOTE in .env to an rsync/scp target
 * (e.g. user@host:/path) with key auth, OR pull app/backups/ from
 * another machine on a schedule. A local copy still protects against
 * accidental data loss / bad migrations; it does NOT protect against
 * losing the server. Treat that as the next step.
 */

require __DIR__ . '/../config.php';

date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Asia/Karachi');

$appDir     = dirname(__DIR__);
$backupDir  = $appDir . '/backups';
$uploadsDir = defined('UPLOAD_DIR') && UPLOAD_DIR ? rtrim(UPLOAD_DIR, '/') : $appDir . '/uploads';
$logFile    = $appDir . '/logs/backup.log';
$retention  = (int) (getenv('BACKUP_RETENTION_DAYS') ?: 14);
$stamp      = date('Ymd-His');

if (!is_dir($backupDir))      mkdir($backupDir, 0750, true);
if (!is_dir(dirname($logFile))) mkdir(dirname($logFile), 0750, true);

function blog($logFile, $msg) {
    file_put_contents($logFile, sprintf("[%s] %s\n", date('Y-m-d H:i:s'), $msg), FILE_APPEND | LOCK_EX);
}

// Shared hosting disables exec/shell_exec/system; proc_open is allowed.
// Runs $cmd via /bin/sh -c and returns [exitCode, stderr].
function run_cmd($cmd) {
    $spec = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $proc = proc_open($cmd, $spec, $pipes);
    if (!is_resource($proc)) return [127, 'proc_open failed (is it disabled too?)'];
    fclose($pipes[0]);
    stream_get_contents($pipes[1]); fclose($pipes[1]);
    $stderr = stream_get_contents($pipes[2]); fclose($pipes[2]);
    $rc = proc_close($proc);
    return [$rc, trim($stderr)];
}

$errors = [];

// --- 1. Database dump (MySQL only; SQLite is dev) ---
if (DB_DRIVER === 'mysql') {
    $dbFile = "$backupDir/db-$stamp.sql.gz";
    // --single-transaction = consistent dump without locking InnoDB tables.
    // Credentials passed via MYSQL_PWD env so the password never shows in ps.
    $cmd = sprintf(
        'MYSQL_PWD=%s mysqldump --single-transaction --quick --default-character-set=utf8mb4 -h%s -P%s -u%s %s | gzip > %s',
        escapeshellarg(DB_PASS),
        escapeshellarg(DB_HOST),
        escapeshellarg((string) (getenv('DB_PORT') ?: 3306)),
        escapeshellarg(DB_USER),
        escapeshellarg(DB_NAME),
        escapeshellarg($dbFile)
    );
    [$rc, $err] = run_cmd($cmd);
    if ($rc === 0 && file_exists($dbFile) && filesize($dbFile) > 0) {
        blog($logFile, 'DB OK: ' . basename($dbFile) . ' (' . round(filesize($dbFile) / 1024, 1) . ' KB)');
    } else {
        $errors[] = "mysqldump failed (rc=$rc) $err";
        @unlink($dbFile);
    }
} else {
    blog($logFile, 'DB skipped (DB_DRIVER=' . DB_DRIVER . ', not mysql)');
}

// --- 2. Uploads archive ---
if (is_dir($uploadsDir)) {
    $upFile = "$backupDir/uploads-$stamp.tar.gz";
    $cmd = sprintf('tar -czf %s -C %s .', escapeshellarg($upFile), escapeshellarg($uploadsDir));
    [$rc2, $err2] = run_cmd($cmd);
    if ($rc2 === 0 && file_exists($upFile)) {
        blog($logFile, 'Uploads OK: ' . basename($upFile) . ' (' . round(filesize($upFile) / 1024, 1) . ' KB)');
    } else {
        $errors[] = "uploads tar failed (rc=$rc2) $err2";
        @unlink($upFile);
    }
} else {
    blog($logFile, "Uploads skipped (no dir at $uploadsDir)");
}

// --- 3. Optional off-site push (rsync target in BACKUP_REMOTE) ---
$remote = getenv('BACKUP_REMOTE');
if ($remote) {
    $cmd = sprintf('rsync -az %s/ %s', escapeshellarg($backupDir), escapeshellarg($remote));
    [$rc3, $err3] = run_cmd($cmd);
    blog($logFile, $rc3 === 0 ? "Off-site push OK -> $remote" : "Off-site push FAILED (rc=$rc3) -> $remote $err3");
    if ($rc3 !== 0) $errors[] = 'off-site rsync failed';
}

// --- 4. Retention: delete backups older than N days ---
$cutoff = time() - ($retention * 86400);
$pruned = 0;
foreach (glob("$backupDir/{db,uploads}-*.{sql.gz,tar.gz}", GLOB_BRACE) ?: [] as $f) {
    if (filemtime($f) < $cutoff) { @unlink($f); $pruned++; }
}
if ($pruned) blog($logFile, "Pruned $pruned backup(s) older than {$retention}d");

// --- 5. Summary line ---
if ($errors) {
    blog($logFile, 'DONE WITH ERRORS: ' . implode('; ', $errors));
    fwrite(STDERR, "Backup errors: " . implode('; ', $errors) . "\n");
    exit(1);
}
blog($logFile, 'Done.');
echo "Backup complete: $stamp\n";
