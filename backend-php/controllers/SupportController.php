<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

// Clinic-side support tickets (clinic ↔ platform). Admin side lives in
// AdminController. Both read/write the SupportTicket / SupportMessage tables.
class SupportController {

    public function list($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare(
            "SELECT t.*,
                    (SELECT COUNT(*) FROM SupportMessage m WHERE m.ticketId = t.id) AS messageCount,
                    (SELECT body FROM SupportMessage m WHERE m.ticketId = t.id ORDER BY m.createdAt DESC LIMIT 1) AS lastMessage
             FROM SupportTicket t WHERE t.clinicId = ? ORDER BY t.updatedAt DESC"
        );
        $stmt->execute([$user['clinicId']]);
        send_json($stmt->fetchAll());
    }

    public function create($input, $user) {
        $subject = trim($input['subject'] ?? '');
        $body = trim($input['message'] ?? '');
        $priority = in_array($input['priority'] ?? '', ['low', 'normal', 'high', 'urgent'], true)
            ? $input['priority'] : 'normal';

        if ($subject === '' || $body === '') {
            send_error('Subject and message are required', 400);
        }

        $db = DB::getConnection();
        $ticketId = generate_uuid();
        $db->prepare("INSERT INTO SupportTicket (id, clinicId, openedBy, subject, priority, status) VALUES (?, ?, ?, ?, ?, 'open')")
           ->execute([$ticketId, $user['clinicId'], $user['id'], $subject, $priority]);
        $db->prepare("INSERT INTO SupportMessage (id, ticketId, senderType, senderId, body) VALUES (?, ?, 'clinic', ?, ?)")
           ->execute([generate_uuid(), $ticketId, $user['id'], $body]);

        send_json(['id' => $ticketId, 'message' => 'Support ticket created'], 201);
    }

    public function thread($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM SupportTicket WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $ticket = $stmt->fetch();
        if (!$ticket) send_error('Ticket not found', 404);

        $stmt = $db->prepare("SELECT id, senderType, senderId, body, createdAt FROM SupportMessage WHERE ticketId = ? ORDER BY createdAt ASC");
        $stmt->execute([$id]);
        $ticket['messages'] = $stmt->fetchAll();
        send_json($ticket);
    }

    public function reply($input, $user, $id) {
        $body = trim($input['message'] ?? '');
        if ($body === '') send_error('Message is required', 400);

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM SupportTicket WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) send_error('Ticket not found', 404);

        $db->prepare("INSERT INTO SupportMessage (id, ticketId, senderType, senderId, body) VALUES (?, ?, 'clinic', ?, ?)")
           ->execute([generate_uuid(), $id, $user['id'], $body]);
        // A clinic reply reopens a waiting/resolved ticket
        $db->prepare("UPDATE SupportTicket SET status = CASE WHEN status IN ('resolved','closed') THEN 'open' ELSE status END, updatedAt = ? WHERE id = ?")
           ->execute([date('Y-m-d H:i:s'), $id]);

        send_json(['message' => 'Reply sent']);
    }
}
