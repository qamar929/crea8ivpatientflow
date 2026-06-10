<?php
// Creates (or resets) the platform superadmin account.
// Usage: php scripts/setup-superadmin.php <email> <password> [name]
// Run from the backend-php directory so .env is picked up.

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

$email = $argv[1] ?? '';
$password = $argv[2] ?? '';
$name = $argv[3] ?? 'Platform Admin';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Usage: php scripts/setup-superadmin.php <email> <password (min 12 chars)> [name]\n");
    exit(1);
}

$db = DB::getConnection();

// Platform "clinic" anchors superadmin users (User.clinicId is NOT NULL).
// Tenant routes reject superadmin tokens, so this row holds no tenant data.
$stmt = $db->prepare("SELECT id FROM Clinic WHERE id = 'platform'");
$stmt->execute();
if (!$stmt->fetch()) {
    $db->prepare("INSERT INTO Clinic (id, name, status) VALUES ('platform', 'Crea8iv PatientFlow HQ', 'active')")
       ->execute();
    echo "Created platform clinic row.\n";
}

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $db->prepare("SELECT id FROM User WHERE email = ?");
$stmt->execute([$email]);
$existing = $stmt->fetch();

if ($existing) {
    $db->prepare("UPDATE User SET password = ?, role = 'superadmin', clinicId = 'platform', name = ?, isActive = 1 WHERE id = ?")
       ->execute([$hash, $name, $existing['id']]);
    $db->prepare("DELETE FROM RefreshToken WHERE userId = ?")->execute([$existing['id']]);
    echo "Updated existing user $email to superadmin (sessions revoked).\n";
} else {
    $db->prepare("INSERT INTO User (id, clinicId, name, email, password, role) VALUES (?, 'platform', ?, ?, ?, 'superadmin')")
       ->execute([generate_uuid(), $name, $email, $hash]);
    echo "Created superadmin $email.\n";
}
