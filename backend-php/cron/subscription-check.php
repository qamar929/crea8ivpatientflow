<?php
// Subscription lifecycle cron — run daily (e.g. Hostinger cron: 0 9 * * *):
//   php /path/to/backend-php/cron/subscription-check.php
//
// Idempotent transitions:
//   expires within 7 days  -> reminder email (once per day is fine)
//   expired                -> clinic status 'grace' (7-day grace period)
//   expired > 7 days       -> clinic status 'suspended' (data kept, login blocked)
// Trials:
//   trialEndsAt passed     -> 'grace', then 'suspended' on the same schedule.
// Never deletes anything.

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/mailService.php';

$db = DB::getConnection();
$now = time();
$nowSql = date('Y-m-d H:i:s', $now);
$in7d = date('Y-m-d H:i:s', $now + 7 * 86400);
$graceCutoff = date('Y-m-d H:i:s', $now - 7 * 86400);

$log = function ($msg) {
    echo '[' . date('Y-m-d H:i:s') . "] $msg\n";
};

// --- 1. Reminders: active subscriptions expiring within 7 days -----------
$stmt = $db->prepare(
    "SELECT s.id, s.expiresAt, c.id AS clinicId, c.name,
            (SELECT email FROM User WHERE clinicId = c.id AND role = 'owner' LIMIT 1) AS ownerEmail
     FROM Subscription s JOIN Clinic c ON c.id = s.clinicId
     WHERE s.status = 'active' AND s.expiresAt BETWEEN ? AND ? AND c.status = 'active'"
);
$stmt->execute([$nowSql, $in7d]);
foreach ($stmt->fetchAll() as $row) {
    if (!empty($row['ownerEmail'])) {
        $days = max(1, (int)ceil((strtotime($row['expiresAt']) - $now) / 86400));
        send_app_email(
            $row['ownerEmail'],
            "Your portal subscription expires in $days day(s)",
            '<p>Dear ' . htmlspecialchars($row['name']) . ' team,</p>'
            . "<p>Your Crea8iv PatientFlow subscription expires on <b>{$row['expiresAt']}</b>. "
            . 'Please renew via WhatsApp to avoid interruption.</p>'
        );
        $log("Reminder sent: {$row['name']} expires {$row['expiresAt']}");
    }
}

// --- 2. Expired subscriptions: active -> grace ----------------------------
$stmt = $db->prepare(
    "SELECT c.id, c.name FROM Clinic c
     WHERE c.status = 'active' AND c.id != 'platform'
       AND NOT EXISTS (SELECT 1 FROM Subscription s
                       WHERE s.clinicId = c.id AND s.status = 'active' AND s.expiresAt > ?)
       AND EXISTS (SELECT 1 FROM Subscription s WHERE s.clinicId = c.id)"
);
$stmt->execute([$nowSql]);
foreach ($stmt->fetchAll() as $row) {
    $db->prepare("UPDATE Clinic SET status = 'grace' WHERE id = ?")->execute([$row['id']]);
    log_audit($row['id'], null, 'auto_grace', 'Clinic', $row['id']);
    $log("Grace: {$row['name']}");
}

// --- 3. Trials past end date: trial -> grace -------------------------------
$stmt = $db->prepare(
    "SELECT id, name FROM Clinic WHERE status = 'trial' AND trialEndsAt IS NOT NULL AND trialEndsAt < ?"
);
$stmt->execute([$nowSql]);
foreach ($stmt->fetchAll() as $row) {
    $db->prepare("UPDATE Clinic SET status = 'grace' WHERE id = ?")->execute([$row['id']]);
    log_audit($row['id'], null, 'auto_grace_trial', 'Clinic', $row['id']);
    $log("Trial ended -> grace: {$row['name']}");
}

// --- 4. Grace exhausted: grace -> suspended -------------------------------
// A clinic leaves grace 7 days after its last subscription (or trial) expired.
$stmt = $db->prepare(
    "SELECT c.id, c.name FROM Clinic c
     WHERE c.status = 'grace' AND c.id != 'platform'
       AND COALESCE(
             (SELECT MAX(s.expiresAt) FROM Subscription s WHERE s.clinicId = c.id),
             c.trialEndsAt
           ) < ?"
);
$stmt->execute([$graceCutoff]);
foreach ($stmt->fetchAll() as $row) {
    $db->prepare("UPDATE Clinic SET status = 'suspended', suspendedAt = ?, suspensionReason = 'Subscription expired' WHERE id = ?")
       ->execute([$nowSql, $row['id']]);
    $db->prepare("DELETE FROM RefreshToken WHERE userId IN (SELECT id FROM User WHERE clinicId = ?)")
       ->execute([$row['id']]);
    log_audit($row['id'], null, 'auto_suspended', 'Clinic', $row['id']);
    $log("Suspended: {$row['name']}");
}

// --- 5. Mark expired subscription rows ------------------------------------
$count = $db->prepare("UPDATE Subscription SET status = 'expired' WHERE status = 'active' AND expiresAt < ?");
$count->execute([$nowSql]);

// Heartbeat for the owner-portal health panel
$db->prepare("INSERT INTO LoginAttempt (email, ip, success, createdAt) VALUES ('cron-heartbeat', 'cron', 1, ?)")
   ->execute([$nowSql]);

$log('Done.');
