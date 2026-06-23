<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

// Public clinic-signup form → RegistrationLead (reviewed in the owner portal)
class RegistrationController {

    private function clientIp() {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
            if (!empty($_SERVER[$key])) {
                return substr(trim(explode(',', $_SERVER[$key])[0]), 0, 45);
            }
        }
        return 'unknown';
    }

    public function register($input, $user) {
        $clinicName = trim($input['clinicName'] ?? '');
        $contactName = trim($input['contactName'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $phone = trim($input['phone'] ?? '');

        if ($clinicName === '' || $contactName === '' || $email === '' || $phone === '') {
            send_error('Clinic name, contact name, email and phone are required', 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send_error('A valid email address is required', 400);
        }

        $db = DB::getConnection();

        // Rate limit: max 3 signups per IP per hour (shares the LoginAttempt window table)
        $window = date('Y-m-d H:i:s', time() - 3600);
        $stmt = $db->prepare("SELECT COUNT(*) FROM LoginAttempt WHERE ip = ? AND email = 'public-registration' AND createdAt > ?");
        $stmt->execute([$this->clientIp(), $window]);
        if ((int)$stmt->fetchColumn() >= 3) {
            send_error('Too many registration attempts. Please try again later or contact us on WhatsApp.', 429);
        }
        $db->prepare("INSERT INTO LoginAttempt (email, ip, success, createdAt) VALUES ('public-registration', ?, 1, ?)")
           ->execute([$this->clientIp(), date('Y-m-d H:i:s')]);

        // Duplicate guard: one open lead per email
        $stmt = $db->prepare("SELECT id FROM RegistrationLead WHERE email = ? AND status NOT IN ('converted','rejected')");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            // Don't create a duplicate, but don't fail the visitor either
            send_json(['message' => 'Thanks! Your registration is already with our team — we will contact you shortly.']);
        }

        $allowedTypes = ['dental', 'aesthetic', 'medical', 'multi'];
        $clinicType = in_array($input['clinicType'] ?? '', $allowedTypes, true) ? $input['clinicType'] : 'dental';

        $id = generate_uuid();
        $db->prepare("INSERT INTO RegistrationLead (id, clinicName, contactName, email, phone, whatsapp, city, clinicType, branches, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
           ->execute([
               $id, $clinicName, $contactName, $email, $phone,
               trim($input['whatsapp'] ?? '') ?: null,
               trim($input['city'] ?? '') ?: null,
               $clinicType,
               max(1, min(50, (int)($input['branches'] ?? 1))),
               substr(trim($input['message'] ?? ''), 0, 2000) ?: null,
           ]);

        send_json([
            'message' => 'Thanks! Your registration has been received — our team will contact you on WhatsApp shortly.',
            'leadId' => $id,
        ], 201);
    }
}
