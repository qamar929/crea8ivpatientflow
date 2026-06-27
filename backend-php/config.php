<?php
// PHP Configuration for Crea8iv PatientFlow API
//
// All secrets come from the environment (or a local .env file for development).
// There are NO hardcoded credential fallbacks: the API refuses to boot without
// JWT secrets, and MySQL deployments refuse to boot without a database password.

// --- Minimal .env loader (no dependency) ---------------------------------
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\"'");
        if (getenv($key) === false) {
            putenv("$key=$value");
        }
    }
}

define('APP_ENV', getenv('APP_ENV') ?: 'production');

// Errors: never display in production, always log
error_reporting(E_ALL);
ini_set('display_errors', APP_ENV === 'development' ? '1' : '0');
ini_set('log_errors', '1');

date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Asia/Karachi');

function require_env($key) {
    $value = getenv($key);
    if ($value === false || $value === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Server misconfigured. Contact support.']);
        error_log("FATAL: missing required environment variable $key");
        exit;
    }
    return $value;
}

// Database Configuration
define('DB_DRIVER', getenv('DB_DRIVER') ?: 'mysql');
define('DB_PATH', getenv('DB_PATH') ?: dirname(__DIR__) . '/backend/prisma/dev.db');
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASS', DB_DRIVER === 'sqlite' ? '' : require_env('DB_PASS'));
define('DB_PORT', getenv('DB_PORT') ?: '3306');

// JWT Configuration — secrets are mandatory, no fallback
define('JWT_SECRET', require_env('JWT_SECRET'));
define('JWT_REFRESH_SECRET', require_env('JWT_REFRESH_SECRET'));
define('JWT_EXPIRES_IN', (int)(getenv('JWT_EXPIRES_IN') ?: 900));                     // 15 minutes
define('JWT_REFRESH_EXPIRES_IN', (int)(getenv('JWT_REFRESH_EXPIRES_IN') ?: 604800)); // 7 days

// CORS / Allowed Client origin
define('CLIENT_URL', getenv('CLIENT_URL') ?: 'https://portal.thesmilexperts.com');

// Wildcard subdomain every new clinic gets a default URL on:
//   <slug>.clinic.crea8ivmedia.com → "smile-xperts.clinic.crea8ivmedia.com"
// Override via env if rebranded. Needs wildcard DNS + SSL to actually resolve.
define('TENANT_DOMAIN_SUFFIX', getenv('TENANT_DOMAIN_SUFFIX') ?: 'clinic.crea8ivmedia.com');

// Twilio Config
define('TWILIO_ACCOUNT_SID', getenv('TWILIO_ACCOUNT_SID') ?: '');
define('TWILIO_AUTH_TOKEN', getenv('TWILIO_AUTH_TOKEN') ?: '');
define('TWILIO_WHATSAPP_FROM', getenv('TWILIO_WHATSAPP_FROM') ?: 'whatsapp:+14155238886');

// Meta webhooks must be authenticated with the app secret. The controller
// reports a configuration error instead of accepting unsigned events.
define('META_APP_SECRET', getenv('META_APP_SECRET') ?: '');

// SMTP Email Config
define('SMTP_HOST', getenv('SMTP_HOST') ?: '');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('MAIL_FROM', getenv('MAIL_FROM') ?: 'no-reply@crea8ivpatientflow.com');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'Crea8iv PatientFlow');

// Login security
define('LOGIN_MAX_ATTEMPTS_EMAIL', (int)(getenv('LOGIN_MAX_ATTEMPTS_EMAIL') ?: 5));   // per 15 min window
define('LOGIN_MAX_ATTEMPTS_IP', (int)(getenv('LOGIN_MAX_ATTEMPTS_IP') ?: 20));        // per 60 min window
define('PASSWORD_RESET_TTL', (int)(getenv('PASSWORD_RESET_TTL') ?: 1800));            // 30 minutes

// Upload directory
define('UPLOAD_DIR', __DIR__ . '/uploads/');
