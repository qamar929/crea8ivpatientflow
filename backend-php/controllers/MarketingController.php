<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/tenantFeatureService.php';

class MarketingController {
    private function marketingEnabled($db, $clinicId) {
        $features = tenant_features_get($db, $clinicId);
        return !empty($features['marketingEnabled']);
    }

    private function requireMarketing($db, $clinicId) {
        if (!$this->marketingEnabled($db, $clinicId)) {
            send_error('Contact Support to activate Marketing Growth.', 403, ['code' => 'marketing_growth_inactive']);
        }
    }

    public function list($input, $user) {
        $db = DB::getConnection();
        if (!$this->marketingEnabled($db, $user['clinicId'])) {
            send_json([
                'enabled' => false,
                'message' => 'Contact Support to activate Marketing Growth.',
                'campaigns' => [],
            ]);
        }
        $stmt = $db->prepare("SELECT * FROM Campaign WHERE clinicId = ? AND status <> 'archived' ORDER BY createdAt DESC");
        $stmt->execute([$user['clinicId']]);
        $campaigns = $stmt->fetchAll();
        send_json(['enabled' => true, 'campaigns' => $campaigns]);
    }

    public function getById($input, $user, $id) {
        $db = DB::getConnection();
        $this->requireMarketing($db, $user['clinicId']);
        $stmt = $db->prepare("SELECT * FROM Campaign WHERE id = ? AND clinicId = ? AND status <> 'archived'");
        $stmt->execute([$id, $user['clinicId']]);
        $campaign = $stmt->fetch();
        if (!$campaign) {
            send_error('Campaign not found', 404);
        }
        send_json($campaign);
    }

    public function create($input, $user) {
        $db = DB::getConnection();
        $this->requireMarketing($db, $user['clinicId']);

        $id = generate_uuid();
        $name = $input['name'] ?? '';
        if (empty($name)) {
            send_error('Name is required', 400);
        }

        $type = $input['type'] ?? 'whatsapp';
        $trigger = $input['trigger'] ?? 'manual';
        $subject = $input['subject'] ?? null;
        $body = $input['body'] ?? '';
        $status = $input['status'] ?? 'draft';

        $stmt = $db->prepare("INSERT INTO Campaign (id, clinicId, name, type, `trigger`, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $name, $type, $trigger, $subject, $body, $status
        ]);

        $stmt = $db->prepare("SELECT * FROM Campaign WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $campaign = $stmt->fetch();

        send_json($campaign, 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $this->requireMarketing($db, $user['clinicId']);
        $stmt = $db->prepare("SELECT id FROM Campaign WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Campaign not found', 404);
        }

        $fields = [];
        $params = [];

        $updatable = ['name', 'type', 'trigger', 'subject', 'body', 'status', 'sentCount', 'openCount', 'scheduledAt'];
        foreach ($updatable as $key) {
            if (isset($input[$key])) {
                $fields[] = "`$key` = ?";
                $params[] = $input[$key];
            }
        }

        if (empty($fields)) {
            send_error('No fields to update', 400);
        }

        $params[] = $id;
        $params[] = $user['clinicId'];

        $sql = "UPDATE Campaign SET " . implode(", ", $fields) . " WHERE id = ? AND clinicId = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        send_json(['message' => 'Updated']);
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();
        $this->requireMarketing($db, $user['clinicId']);
        $stmt = $db->prepare("UPDATE Campaign SET status = 'archived' WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        send_json(['message' => 'Archived']);
    }

    public function send($input, $user, $id) {
        $db = DB::getConnection();
        $this->requireMarketing($db, $user['clinicId']);
        
        // Find Campaign
        $stmt = $db->prepare("SELECT * FROM Campaign WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $campaign = $stmt->fetch();
        if (!$campaign) {
            send_error('Campaign not found', 404);
        }

        // Find active clients. WhatsApp marketing campaigns must respect the
        // patient-level consent flag used by the WhatsApp center.
        if ($campaign['type'] === 'whatsapp') {
            $stmtClients = $db->prepare("SELECT name, phone, email FROM Client WHERE clinicId = ? AND status = 'active' AND whatsappMarketingOptIn = 1 AND phone IS NOT NULL");
        } elseif ($campaign['type'] === 'email') {
            $stmtClients = $db->prepare("SELECT name, phone, email FROM Client WHERE clinicId = ? AND status = 'active' AND email IS NOT NULL AND email != ''");
        } else {
            send_error('Unsupported campaign type', 400);
        }
        $stmtClients->execute([$user['clinicId']]);
        $clients = $stmtClients->fetchAll();

        $sentCount = 0;
        foreach ($clients as $client) {
            $personalizedBody = str_replace('{{name}}', $client['name'], $campaign['body']);
            
            if ($campaign['type'] === 'whatsapp' && !empty($client['phone'])) {
                // Send Twilio WhatsApp message if configured
                send_whatsapp_message($client['phone'], $personalizedBody);
                $sentCount++;
            } else if ($campaign['type'] === 'email' && !empty($client['email'])) {
                // Send Email placeholder (could integrate mail() or PHPMailer later)
                $subject = $campaign['subject'] ?? 'The Smile Expert Update';
                $headers = "From: " . SMTP_USER . "\r\n" .
                           "Reply-To: " . SMTP_USER . "\r\n" .
                           "Content-Type: text/html; charset=UTF-8\r\n";
                @mail($client['email'], $subject, $personalizedBody, $headers);
                $sentCount++;
            }
        }

        // Update Campaign status
        $stmtUpdate = $db->prepare("UPDATE Campaign SET sentCount = sentCount + ?, status = 'completed' WHERE id = ? AND clinicId = ?");
        $stmtUpdate->execute([$sentCount, $id, $user['clinicId']]);

        send_json([
            'message' => "Campaign sent to $sentCount clients",
            'sentCount' => $sentCount
        ]);
    }
}
