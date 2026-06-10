<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/mailService.php';

const PLAN_MONTHLY_PKR = 30000;
const PLAN_ANNUAL_PKR  = 240000; // 20,000/month billed yearly

class AdminController {

    private function slugify($db, $name) {
        $base = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name), '-'));
        $base = substr($base ?: 'clinic', 0, 50);
        $slug = $base;
        $i = 2;
        while (true) {
            $stmt = $db->prepare("SELECT id FROM Clinic WHERE slug = ?");
            $stmt->execute([$slug]);
            if (!$stmt->fetch()) return $slug;
            $slug = $base . '-' . $i++;
        }
    }

    // ------------------------------------------------------------------
    // Dashboard stats
    // ------------------------------------------------------------------

    public function stats($input, $user) {
        $db = DB::getConnection();
        $now = date('Y-m-d H:i:s');
        $in30 = date('Y-m-d H:i:s', time() + 30 * 86400);
        $monthStart = date('Y-m-01 00:00:00');

        $counts = [];
        foreach (['active', 'trial', 'grace', 'suspended', 'pending'] as $s) {
            $stmt = $db->prepare("SELECT COUNT(*) FROM Clinic WHERE status = ? AND id != 'platform'");
            $stmt->execute([$s]);
            $counts[$s] = (int)$stmt->fetchColumn();
        }

        // MRR: active subscriptions normalized to monthly
        $stmt = $db->prepare(
            "SELECT billingCycle, amountPKR FROM Subscription WHERE status = 'active' AND expiresAt > ?"
        );
        $stmt->execute([$now]);
        $mrr = 0;
        foreach ($stmt->fetchAll() as $sub) {
            $mrr += $sub['billingCycle'] === 'annual'
                ? (float)$sub['amountPKR'] / 12
                : (float)$sub['amountPKR'];
        }

        $stmt = $db->prepare(
            "SELECT s.clinicId, c.name, s.expiresAt FROM Subscription s
             JOIN Clinic c ON c.id = s.clinicId
             WHERE s.status = 'active' AND s.expiresAt BETWEEN ? AND ?
             ORDER BY s.expiresAt ASC"
        );
        $stmt->execute([$now, $in30]);
        $expiringSoon = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT COUNT(*) FROM RegistrationLead WHERE createdAt >= ?");
        $stmt->execute([$monthStart]);
        $newLeadsThisMonth = (int)$stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM RegistrationLead WHERE status NOT IN ('converted','rejected')");
        $stmt->execute();
        $openLeads = (int)$stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM Payment WHERE status = 'submitted'");
        $stmt->execute();
        $paymentsAwaitingReview = (int)$stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM SupportTicket WHERE status NOT IN ('resolved','closed')");
        $stmt->execute();
        $openTickets = (int)$stmt->fetchColumn();

        send_json([
            'mrrPKR' => round($mrr, 2),
            'clinicCounts' => $counts,
            'expiringSoon' => $expiringSoon,
            'newLeadsThisMonth' => $newLeadsThisMonth,
            'openLeads' => $openLeads,
            'paymentsAwaitingReview' => $paymentsAwaitingReview,
            'openTickets' => $openTickets,
        ]);
    }

    // ------------------------------------------------------------------
    // Tenants
    // ------------------------------------------------------------------

    public function listTenants($input, $user) {
        $db = DB::getConnection();
        $status = $_GET['status'] ?? '';

        $where = "WHERE c.id != 'platform'";
        $params = [];
        if ($status !== '') {
            $where .= " AND c.status = ?";
            $params[] = $status;
        }

        $stmt = $db->prepare(
            "SELECT c.id, c.name, c.slug, c.customDomain, c.domainStatus, c.sslStatus,
                    c.status, c.clinicType, c.trialEndsAt,
                    c.suspendedAt, c.suspensionReason, c.createdAt,
                    (SELECT COUNT(*) FROM User u WHERE u.clinicId = c.id) AS userCount,
                    (SELECT COUNT(*) FROM Client cl WHERE cl.clinicId = c.id) AS patientCount,
                    (SELECT MAX(s.expiresAt) FROM Subscription s
                      WHERE s.clinicId = c.id AND s.status = 'active') AS subscriptionExpiresAt
             FROM Clinic c $where ORDER BY c.createdAt DESC"
        );
        $stmt->execute($params);
        send_json($stmt->fetchAll());
    }

    public function getTenant($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Clinic WHERE id = ? AND id != 'platform'");
        $stmt->execute([$id]);
        $clinic = $stmt->fetch();
        if (!$clinic) send_error('Tenant not found', 404);
        unset($clinic['logo']);

        $stmt = $db->prepare("SELECT * FROM Subscription WHERE clinicId = ? ORDER BY createdAt DESC LIMIT 10");
        $stmt->execute([$id]);
        $clinic['subscriptions'] = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT * FROM Payment WHERE clinicId = ? ORDER BY createdAt DESC LIMIT 10");
        $stmt->execute([$id]);
        $clinic['payments'] = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT id, name, email, role, lastLogin FROM User WHERE clinicId = ?");
        $stmt->execute([$id]);
        $clinic['users'] = $stmt->fetchAll();

        send_json($clinic);
    }

    public function activateTenant($input, $user, $id) {
        $billingCycle = $input['billingCycle'] ?? 'monthly';
        if (!in_array($billingCycle, ['monthly', 'annual'], true)) {
            send_error('billingCycle must be monthly or annual', 400);
        }
        $amount = isset($input['amountPKR'])
            ? (float)$input['amountPKR']
            : ($billingCycle === 'annual' ? PLAN_ANNUAL_PKR : PLAN_MONTHLY_PKR);

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id, status FROM Clinic WHERE id = ? AND id != 'platform'");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) send_error('Tenant not found', 404);

        $startsAt = date('Y-m-d H:i:s');
        $expiresAt = date('Y-m-d H:i:s', strtotime($billingCycle === 'annual' ? '+12 months' : '+1 month'));

        $db->prepare("UPDATE Subscription SET status = 'expired' WHERE clinicId = ? AND status = 'active'")
           ->execute([$id]);

        $subId = generate_uuid();
        $db->prepare("INSERT INTO Subscription (id, clinicId, billingCycle, amountPKR, startsAt, expiresAt, status) VALUES (?, ?, ?, ?, ?, ?, 'active')")
           ->execute([$subId, $id, $billingCycle, $amount, $startsAt, $expiresAt]);

        $db->prepare("UPDATE Clinic SET status = 'active', suspendedAt = NULL, suspensionReason = NULL WHERE id = ?")
           ->execute([$id]);

        log_audit($id, $user['id'], 'tenant_activated', 'Clinic', $id, null,
                  ['billingCycle' => $billingCycle, 'amountPKR' => $amount, 'expiresAt' => $expiresAt]);

        send_json(['message' => 'Tenant activated', 'subscriptionId' => $subId, 'expiresAt' => $expiresAt]);
    }

    public function setDomain($input, $user, $id) {
        $domain = strtolower(trim($input['customDomain'] ?? ''));

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Clinic WHERE id = ? AND id != 'platform'");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) send_error('Tenant not found', 404);

        if ($domain === '') {
            // Clear the custom domain
            $db->prepare("UPDATE Clinic SET customDomain = NULL WHERE id = ?")->execute([$id]);
            log_audit($id, $user['id'], 'domain_cleared', 'Clinic', $id);
            send_json(['message' => 'Custom domain removed']);
        }

        // Normalize: strip scheme, path, port, leading www.
        if (strpos($domain, '://') !== false) {
            $domain = parse_url($domain, PHP_URL_HOST) ?: $domain;
        }
        $domain = preg_replace('/[\/:].*$/', '', $domain);
        $domain = preg_replace('/^www\./', '', $domain);

        if (!preg_match('/^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/', $domain)) {
            send_error('Enter a valid domain like portal.yourclinic.com', 400);
        }
        // Reserved platform hosts can't be claimed by a tenant
        if ($domain === 'crea8ivmedia.com' || substr($domain, -16) === '.crea8ivmedia.com') {
            send_error('Platform domains cannot be used as a clinic custom domain', 400);
        }

        // Uniqueness across tenants
        $stmt = $db->prepare("SELECT id FROM Clinic WHERE LOWER(customDomain) = ? AND id != ?");
        $stmt->execute([$domain, $id]);
        if ($stmt->fetch()) send_error('That domain is already assigned to another clinic', 409);

        $db->prepare("UPDATE Clinic SET customDomain = ? WHERE id = ?")->execute([$domain, $id]);
        log_audit($id, $user['id'], 'domain_set', 'Clinic', $id, null, ['customDomain' => $domain]);
        send_json(['message' => 'Custom domain saved', 'customDomain' => $domain]);
    }

    // Manual SSL step: after issuing the cert (e.g. Let's Encrypt in hPanel),
    // the platform admin flips the domain to connected. Also supports marking it
    // failed if activation can't be completed.
    public function setDomainSsl($input, $user, $id) {
        $action = $input['action'] ?? 'connect'; // connect | fail

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT customDomain, domainStatus FROM Clinic WHERE id = ? AND id != 'platform'");
        $stmt->execute([$id]);
        $clinic = $stmt->fetch();
        if (!$clinic) send_error('Tenant not found', 404);
        if (empty($clinic['customDomain'])) send_error('This clinic has no custom domain', 400);

        if ($action === 'fail') {
            $db->prepare("UPDATE Clinic SET domainStatus = 'failed', sslStatus = 'failed', domainLastError = ? WHERE id = ?")
               ->execute([trim($input['reason'] ?? 'SSL activation failed'), $id]);
            log_audit($id, $user['id'], 'domain_ssl_failed', 'Clinic', $id);
            send_json(['message' => 'Domain marked failed']);
        }

        $db->prepare("UPDATE Clinic SET domainStatus = 'connected', sslStatus = 'active', domainLastError = NULL WHERE id = ?")
           ->execute([$id]);
        log_audit($id, $user['id'], 'domain_connected', 'Clinic', $id, null, ['customDomain' => $clinic['customDomain']]);
        send_json(['message' => 'Domain activated and connected', 'customDomain' => $clinic['customDomain']]);
    }

    public function suspendTenant($input, $user, $id) {
        $reason = trim($input['reason'] ?? 'Suspended by platform admin');

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Clinic WHERE id = ? AND id != 'platform'");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) send_error('Tenant not found', 404);

        $db->prepare("UPDATE Clinic SET status = 'suspended', suspendedAt = ?, suspensionReason = ? WHERE id = ?")
           ->execute([date('Y-m-d H:i:s'), $reason, $id]);

        // Cut all live sessions for this clinic immediately
        $db->prepare("DELETE FROM RefreshToken WHERE userId IN (SELECT id FROM User WHERE clinicId = ?)")
           ->execute([$id]);

        log_audit($id, $user['id'], 'tenant_suspended', 'Clinic', $id, null, ['reason' => $reason]);
        send_json(['message' => 'Tenant suspended']);
    }

    public function extendTenant($input, $user, $id) {
        $months = max(1, (int)($input['months'] ?? 1));

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Subscription WHERE clinicId = ? AND status = 'active' ORDER BY expiresAt DESC LIMIT 1");
        $stmt->execute([$id]);
        $sub = $stmt->fetch();
        if (!$sub) send_error('No active subscription to extend — use activate instead', 400);

        $from = max(time(), strtotime($sub['expiresAt']));
        $newExpiry = date('Y-m-d H:i:s', strtotime("+$months months", $from));

        $db->prepare("UPDATE Subscription SET expiresAt = ? WHERE id = ?")->execute([$newExpiry, $sub['id']]);
        $db->prepare("UPDATE Clinic SET status = 'active', suspendedAt = NULL, suspensionReason = NULL WHERE id = ?")
           ->execute([$id]);

        log_audit($id, $user['id'], 'tenant_extended', 'Clinic', $id, null,
                  ['months' => $months, 'newExpiry' => $newExpiry]);
        send_json(['message' => "Subscription extended by $months month(s)", 'expiresAt' => $newExpiry]);
    }

    // ------------------------------------------------------------------
    // Registration leads (sales pipeline)
    // ------------------------------------------------------------------

    public function listLeads($input, $user) {
        $db = DB::getConnection();
        $status = $_GET['status'] ?? '';
        if ($status !== '') {
            $stmt = $db->prepare("SELECT * FROM RegistrationLead WHERE status = ? ORDER BY createdAt DESC");
            $stmt->execute([$status]);
        } else {
            $stmt = $db->prepare("SELECT * FROM RegistrationLead ORDER BY createdAt DESC");
            $stmt->execute();
        }
        send_json($stmt->fetchAll());
    }

    public function createLead($input, $user) {
        $clinicName = trim($input['clinicName'] ?? '');
        $contactName = trim($input['contactName'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        if ($clinicName === '' || $contactName === '' || $email === '' || $phone === '') {
            send_error('clinicName, contactName, email and phone are required', 400);
        }

        $db = DB::getConnection();
        $id = generate_uuid();
        $db->prepare("INSERT INTO RegistrationLead (id, clinicName, contactName, email, phone, whatsapp, city, clinicType, branches, message, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
           ->execute([
               $id, $clinicName, $contactName, $email, $phone,
               trim($input['whatsapp'] ?? '') ?: null,
               trim($input['city'] ?? '') ?: null,
               $input['clinicType'] ?? 'dental',
               max(1, (int)($input['branches'] ?? 1)),
               trim($input['message'] ?? '') ?: null,
               trim($input['notes'] ?? '') ?: null,
           ]);
        send_json(['id' => $id, 'message' => 'Lead created'], 201);
    }

    public function updateLead($input, $user, $id) {
        $allowed = ['new', 'contacted', 'demo_given', 'payment_pending', 'payment_review', 'converted', 'rejected'];

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM RegistrationLead WHERE id = ?");
        $stmt->execute([$id]);
        $lead = $stmt->fetch();
        if (!$lead) send_error('Lead not found', 404);

        $fields = [];
        $params = [];
        if (isset($input['status'])) {
            if (!in_array($input['status'], $allowed, true)) send_error('Invalid status', 400);
            $fields[] = "status = ?";
            $params[] = $input['status'];
        }
        if (array_key_exists('notes', $input)) {
            $fields[] = "notes = ?";
            $params[] = $input['notes'];
        }
        if (!$fields) send_error('Nothing to update', 400);

        $fields[] = "updatedAt = ?";
        $params[] = date('Y-m-d H:i:s');
        $params[] = $id;
        $db->prepare("UPDATE RegistrationLead SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
        send_json(['message' => 'Lead updated']);
    }

    public function convertLead($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM RegistrationLead WHERE id = ?");
        $stmt->execute([$id]);
        $lead = $stmt->fetch();
        if (!$lead) send_error('Lead not found', 404);
        if ($lead['status'] === 'converted') send_error('Lead already converted', 409);

        $stmt = $db->prepare("SELECT id FROM User WHERE email = ?");
        $stmt->execute([$lead['email']]);
        if ($stmt->fetch()) send_error('A user with this email already exists', 409);

        try {
            $db->beginTransaction();

            $clinicId = generate_uuid();
            $slug = $this->slugify($db, $lead['clinicName']);
            // Created as 'pending' — activate (after payment) flips it on
            $db->prepare("INSERT INTO Clinic (id, name, phone, email, status, clinicType, slug) VALUES (?, ?, ?, ?, 'pending', ?, ?)")
               ->execute([$clinicId, $lead['clinicName'], $lead['phone'], $lead['email'],
                          $lead['clinicType'] ?: 'dental', $slug]);

            $ownerId = generate_uuid();
            // Unusable random password; the owner sets their own via the invite link
            $randomHash = password_hash(bin2hex(random_bytes(24)), PASSWORD_BCRYPT, ['cost' => 12]);
            $db->prepare("INSERT INTO User (id, clinicId, name, email, password, role) VALUES (?, ?, ?, ?, ?, 'owner')")
               ->execute([$ownerId, $clinicId, $lead['contactName'], $lead['email'], $randomHash]);

            // Set-password invite (72h, single-use, same machinery as forgot-password)
            $rawToken = bin2hex(random_bytes(32));
            $db->prepare("INSERT INTO PasswordReset (id, userId, tokenHash, expiresAt) VALUES (?, ?, ?, ?)")
               ->execute([generate_uuid(), $ownerId, hash('sha256', $rawToken),
                          date('Y-m-d H:i:s', time() + 72 * 3600)]);

            $db->prepare("UPDATE RegistrationLead SET status = 'converted', clinicId = ?, updatedAt = ? WHERE id = ?")
               ->execute([$clinicId, date('Y-m-d H:i:s'), $id]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            error_log('convertLead failed: ' . $e->getMessage());
            send_error('Conversion failed', 500);
        }

        $setupUrl = rtrim(CLIENT_URL, '/') . '/reset-password?token=' . $rawToken;
        send_app_email(
            $lead['email'],
            'Your clinic portal is ready — set your password',
            password_reset_email_html($lead['contactName'], $setupUrl, 72 * 60)
        );

        log_audit($clinicId, $user['id'], 'lead_converted', 'RegistrationLead', $id, null,
                  ['clinicId' => $clinicId, 'slug' => $slug]);

        send_json([
            'message' => 'Clinic created (pending activation). Set-password link emailed to the owner.',
            'clinicId' => $clinicId,
            'slug' => $slug,
        ], 201);
    }

    // ------------------------------------------------------------------
    // Payments (manual verification workflow)
    // ------------------------------------------------------------------

    public function listPayments($input, $user) {
        $db = DB::getConnection();
        $status = $_GET['status'] ?? '';
        if ($status !== '') {
            $stmt = $db->prepare(
                "SELECT p.*, c.name AS clinicName FROM Payment p
                 JOIN Clinic c ON c.id = p.clinicId
                 WHERE p.status = ? ORDER BY p.createdAt DESC"
            );
            $stmt->execute([$status]);
        } else {
            $stmt = $db->prepare(
                "SELECT p.*, c.name AS clinicName FROM Payment p
                 JOIN Clinic c ON c.id = p.clinicId ORDER BY p.createdAt DESC"
            );
            $stmt->execute();
        }
        send_json($stmt->fetchAll());
    }

    public function recordPayment($input, $user) {
        $clinicId = $input['clinicId'] ?? '';
        $amount = (float)($input['amountPKR'] ?? 0);
        if ($clinicId === '' || $amount <= 0) {
            send_error('clinicId and a positive amountPKR are required', 400);
        }

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Clinic WHERE id = ? AND id != 'platform'");
        $stmt->execute([$clinicId]);
        if (!$stmt->fetch()) send_error('Clinic not found', 404);

        $id = generate_uuid();
        $db->prepare("INSERT INTO Payment (id, clinicId, amountPKR, method, reference, screenshotPath) VALUES (?, ?, ?, ?, ?, ?)")
           ->execute([
               $id, $clinicId, $amount,
               $input['method'] ?? 'bank_transfer',
               trim($input['reference'] ?? '') ?: null,
               trim($input['screenshotPath'] ?? '') ?: null,
           ]);
        send_json(['id' => $id, 'message' => 'Payment recorded — awaiting verification'], 201);
    }

    public function verifyPayment($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Payment WHERE id = ?");
        $stmt->execute([$id]);
        $payment = $stmt->fetch();
        if (!$payment) send_error('Payment not found', 404);
        if ($payment['status'] !== 'submitted') send_error('Payment already processed', 409);

        $db->prepare("UPDATE Payment SET status = 'verified', verifiedBy = ?, verifiedAt = ? WHERE id = ?")
           ->execute([$user['id'], date('Y-m-d H:i:s'), $id]);

        log_audit($payment['clinicId'], $user['id'], 'payment_verified', 'Payment', $id, null,
                  ['amountPKR' => $payment['amountPKR']]);
        send_json(['message' => 'Payment verified. You can now activate or extend the tenant.']);
    }

    // ------------------------------------------------------------------
    // Support inbox (platform side)
    // ------------------------------------------------------------------

    public function listTickets($input, $user) {
        $db = DB::getConnection();
        $status = $_GET['status'] ?? '';
        $sql =
            "SELECT t.*, c.name AS clinicName,
                    (SELECT COUNT(*) FROM SupportMessage m WHERE m.ticketId = t.id) AS messageCount,
                    (SELECT body FROM SupportMessage m WHERE m.ticketId = t.id ORDER BY m.createdAt DESC LIMIT 1) AS lastMessage
             FROM SupportTicket t JOIN Clinic c ON c.id = t.clinicId";
        $params = [];
        if ($status !== '') {
            $sql .= " WHERE t.status = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY t.updatedAt DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        send_json($stmt->fetchAll());
    }

    public function getTicket($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare(
            "SELECT t.*, c.name AS clinicName FROM SupportTicket t
             JOIN Clinic c ON c.id = t.clinicId WHERE t.id = ?"
        );
        $stmt->execute([$id]);
        $ticket = $stmt->fetch();
        if (!$ticket) send_error('Ticket not found', 404);

        $stmt = $db->prepare("SELECT id, senderType, senderId, body, createdAt FROM SupportMessage WHERE ticketId = ? ORDER BY createdAt ASC");
        $stmt->execute([$id]);
        $ticket['messages'] = $stmt->fetchAll();
        send_json($ticket);
    }

    public function replyTicket($input, $user, $id) {
        $body = trim($input['message'] ?? '');
        if ($body === '') send_error('Message is required', 400);

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM SupportTicket WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) send_error('Ticket not found', 404);

        $db->prepare("INSERT INTO SupportMessage (id, ticketId, senderType, senderId, body) VALUES (?, ?, 'admin', ?, ?)")
           ->execute([generate_uuid(), $id, $user['id'], $body]);
        // An admin reply moves an open ticket to "waiting" (on the clinic)
        $newStatus = in_array($input['status'] ?? '', ['open','in_progress','waiting','resolved','closed'], true)
            ? $input['status'] : 'waiting';
        $db->prepare("UPDATE SupportTicket SET status = ?, updatedAt = ? WHERE id = ?")
           ->execute([$newStatus, date('Y-m-d H:i:s'), $id]);

        send_json(['message' => 'Reply sent', 'status' => $newStatus]);
    }

    public function updateTicket($input, $user, $id) {
        $status = $input['status'] ?? '';
        if (!in_array($status, ['open','in_progress','waiting','resolved','closed'], true)) {
            send_error('Invalid status', 400);
        }
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM SupportTicket WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) send_error('Ticket not found', 404);

        $db->prepare("UPDATE SupportTicket SET status = ?, updatedAt = ? WHERE id = ?")
           ->execute([$status, date('Y-m-d H:i:s'), $id]);
        send_json(['message' => 'Ticket updated', 'status' => $status]);
    }

    public function rejectPayment($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Payment WHERE id = ?");
        $stmt->execute([$id]);
        $payment = $stmt->fetch();
        if (!$payment) send_error('Payment not found', 404);
        if ($payment['status'] !== 'submitted') send_error('Payment already processed', 409);

        $db->prepare("UPDATE Payment SET status = 'rejected', verifiedBy = ?, verifiedAt = ? WHERE id = ?")
           ->execute([$user['id'], date('Y-m-d H:i:s'), $id]);

        log_audit($payment['clinicId'], $user['id'], 'payment_rejected', 'Payment', $id);
        send_json(['message' => 'Payment rejected']);
    }
}
