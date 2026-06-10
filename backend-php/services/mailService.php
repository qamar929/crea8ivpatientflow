<?php
// Email delivery for auth + notifications.
// Production (Hostinger): PHP mail() delivers via the host's sendmail.
// Development / no mail config: messages are appended to logs/mail.log so
// the full email (including reset links) can be inspected locally.

function send_app_email($to, $subject, $htmlBody) {
    $canMail = APP_ENV !== 'development' && function_exists('mail');

    if (!$canMail) {
        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0750, true);
        }
        $entry = sprintf(
            "[%s] TO: %s\nSUBJECT: %s\n%s\n%s\n",
            date('Y-m-d H:i:s'), $to, $subject, $htmlBody, str_repeat('-', 60)
        );
        file_put_contents($logDir . '/mail.log', $entry, FILE_APPEND | LOCK_EX);
        return true;
    }

    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM . '>',
    ]);
    $ok = mail($to, $subject, $htmlBody, $headers);
    if (!$ok) {
        error_log("send_app_email failed for $to: $subject");
    }
    return $ok;
}

function password_reset_email_html($name, $resetUrl, $ttlMinutes) {
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    return <<<HTML
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f766e;">Password Reset Request</h2>
  <p>Hi {$safeName},</p>
  <p>We received a request to reset your portal password. Click the button below to choose a new one. This link expires in {$ttlMinutes} minutes and can be used once.</p>
  <p style="margin:28px 0;">
    <a href="{$resetUrl}" style="background:#0f766e;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a>
  </p>
  <p style="color:#64748b;font-size:13px;">If the button doesn't work, copy this link into your browser:<br>{$resetUrl}</p>
  <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
</div>
HTML;
}
