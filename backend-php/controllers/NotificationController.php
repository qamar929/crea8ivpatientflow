<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class NotificationController {
    private function tableExists($db, $table) {
        try {
            if (DB_DRIVER === 'sqlite') {
                $stmt = $db->prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?");
                $stmt->execute([$table]);
            } else {
                $stmt = $db->prepare("SHOW TABLES LIKE ?");
                $stmt->execute([$table]);
            }
            return (bool)$stmt->fetchColumn();
        } catch (Exception $e) {
            return false;
        }
    }

    private function countRows($db, $sql, $params = []) {
        try {
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            return intval($stmt->fetchColumn() ?: 0);
        } catch (Exception $e) {
            return 0;
        }
    }

    private function sumRows($db, $sql, $params = []) {
        try {
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            return floatval($stmt->fetchColumn() ?: 0);
        } catch (Exception $e) {
            return 0;
        }
    }

    private function alert($id, $type, $priority, $title, $body, $actionUrl, $count = 1, $roles = []) {
        return [
            'id' => 'live-' . $id,
            'type' => $type,
            'priority' => $priority,
            'title' => $title,
            'body' => $body,
            'actionUrl' => $actionUrl,
            'count' => $count,
            'read' => false,
            'computed' => true,
            'createdAt' => date('Y-m-d H:i:s'),
            'roles' => $roles,
        ];
    }

    private function visibleForRole($notification, $role) {
        $roles = $notification['roles'] ?? [];
        return empty($roles) || in_array($role, $roles, true);
    }

    private function liveAlerts($db, $user) {
        $clinicId = $user['clinicId'];
        $today = date('Y-m-d');
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        $week = date('Y-m-d', strtotime('+7 days'));
        $alerts = [];

        $pendingAppointments = $this->countRows(
            $db,
            "SELECT COUNT(*) FROM Appointment WHERE clinicId = ? AND status = 'pending' AND date >= ?",
            [$clinicId, $today]
        );
        if ($pendingAppointments > 0) {
            $alerts[] = $this->alert(
                'pending-appointments',
                'appointment',
                'high',
                "$pendingAppointments appointment request" . ($pendingAppointments === 1 ? '' : 's') . " need confirmation",
                'Review pending bookings before patients arrive or slots are double-booked.',
                '/appointments',
                $pendingAppointments,
                ['owner', 'manager', 'receptionist', 'doctor', 'therapist', 'staff']
            );
        }

        $todayAppointments = $this->countRows(
            $db,
            "SELECT COUNT(*) FROM Appointment WHERE clinicId = ? AND date = ? AND status IN ('confirmed', 'pending')",
            [$clinicId, $today]
        );
        if ($todayAppointments > 0) {
            $alerts[] = $this->alert(
                'today-appointments',
                'schedule',
                'normal',
                "$todayAppointments appointment" . ($todayAppointments === 1 ? '' : 's') . " on today's schedule",
                'Keep reception, doctors, rooms, and patient flow aligned for today.',
                '/appointments',
                $todayAppointments,
                ['owner', 'manager', 'receptionist', 'doctor', 'therapist', 'staff']
            );
        }

        $overdueInvoices = $this->countRows(
            $db,
            "SELECT COUNT(*) FROM Invoice WHERE clinicId = ? AND balanceDue > 0 AND status != 'refunded' AND dueDate IS NOT NULL AND dueDate != '' AND dueDate < ?",
            [$clinicId, $today]
        );
        $overdueAmount = $this->sumRows(
            $db,
            "SELECT COALESCE(SUM(balanceDue), 0) FROM Invoice WHERE clinicId = ? AND balanceDue > 0 AND status != 'refunded' AND dueDate IS NOT NULL AND dueDate != '' AND dueDate < ?",
            [$clinicId, $today]
        );
        if ($overdueInvoices > 0) {
            $alerts[] = $this->alert(
                'overdue-invoices',
                'billing',
                'high',
                "$overdueInvoices overdue invoice" . ($overdueInvoices === 1 ? '' : 's'),
                'Outstanding balance: PKR ' . number_format($overdueAmount) . '. Follow up before new treatment is booked.',
                '/invoices',
                $overdueInvoices,
                ['owner', 'manager', 'accountant', 'receptionist']
            );
        }

        $lowStock = $this->countRows(
            $db,
            "SELECT COUNT(*) FROM InventoryItem WHERE clinicId = ? AND isActive = 1 AND quantity <= reorderLevel",
            [$clinicId]
        );
        if ($lowStock > 0) {
            $alerts[] = $this->alert(
                'low-stock',
                'inventory',
                'high',
                "$lowStock inventory item" . ($lowStock === 1 ? '' : 's') . " at or below reorder level",
                'Restock clinical supplies before appointments are affected.',
                '/inventory',
                $lowStock,
                ['owner', 'manager', 'doctor', 'therapist', 'staff']
            );
        }

        $followUpsDue = $this->countRows(
            $db,
            "SELECT COUNT(*) FROM Client WHERE clinicId = ? AND status = 'active' AND nextFollowUpDue IS NOT NULL AND nextFollowUpDue != '' AND nextFollowUpDue <= ?",
            [$clinicId, $today]
        );
        if ($followUpsDue > 0) {
            $alerts[] = $this->alert(
                'followups-due',
                'patient',
                'normal',
                "$followUpsDue patient follow-up" . ($followUpsDue === 1 ? '' : 's') . " due",
                'Call or message these patients to keep treatment plans moving.',
                '/clients',
                $followUpsDue,
                ['owner', 'manager', 'receptionist', 'doctor', 'therapist', 'staff']
            );
        }

        $expiringPackages = $this->countRows(
            $db,
            "SELECT COUNT(*) FROM ClientPackage cp JOIN Client c ON c.id = cp.clientId WHERE c.clinicId = ? AND cp.status = 'active' AND cp.expiryDate BETWEEN ? AND ?",
            [$clinicId, $today, $week]
        );
        if ($expiringPackages > 0) {
            $alerts[] = $this->alert(
                'expiring-packages',
                'package',
                'normal',
                "$expiringPackages package" . ($expiringPackages === 1 ? '' : 's') . " expiring within 7 days",
                'Remind patients before unused sessions expire.',
                '/packages',
                $expiringPackages,
                ['owner', 'manager', 'accountant', 'receptionist']
            );
        }

        $poorFeedback = $this->countRows(
            $db,
            "SELECT COUNT(*) FROM Feedback WHERE clinicId = ? AND overallRating <= 2 AND createdAt >= ?",
            [$clinicId, date('Y-m-d H:i:s', strtotime('-14 days'))]
        );
        if ($poorFeedback > 0) {
            $alerts[] = $this->alert(
                'poor-feedback',
                'feedback',
                'urgent',
                "$poorFeedback low-rating feedback item" . ($poorFeedback === 1 ? '' : 's'),
                'Respond quickly before a bad patient experience becomes a public review.',
                '/feedback',
                $poorFeedback,
                ['owner', 'manager', 'doctor', 'therapist']
            );
        }

        if ($this->tableExists($db, 'WhatsAppQueue')) {
            $queuedWhatsApp = $this->countRows(
                $db,
                "SELECT COUNT(*) FROM WhatsAppQueue WHERE clinicId = ? AND status = 'pending' AND attempts >= 1",
                [$clinicId]
            );
            if ($queuedWhatsApp > 0) {
                $alerts[] = $this->alert(
                    'whatsapp-queue',
                    'whatsapp',
                    'high',
                    "$queuedWhatsApp WhatsApp message" . ($queuedWhatsApp === 1 ? '' : 's') . " waiting in retry queue",
                    'Check API settings, templates, or phone routing before reminders are missed.',
                    '/whatsapp',
                    $queuedWhatsApp,
                    ['owner', 'manager', 'receptionist']
                );
            }
        }

        if ($this->tableExists($db, 'SupportTicket')) {
            $openSupport = $this->countRows(
                $db,
                "SELECT COUNT(*) FROM SupportTicket WHERE clinicId = ? AND status IN ('open', 'pending')",
                [$clinicId]
            );
            if ($openSupport > 0) {
                $alerts[] = $this->alert(
                    'support-open',
                    'support',
                    'normal',
                    "$openSupport support ticket" . ($openSupport === 1 ? '' : 's') . " open",
                    'Track clinic issues and close the loop with support.',
                    '/support',
                    $openSupport,
                    ['owner', 'manager', 'receptionist']
                );
            }
        }

        if ($this->tableExists($db, 'Subscription')) {
            $stmt = $db->prepare("SELECT expiresAt FROM Subscription WHERE clinicId = ? AND status = 'active' ORDER BY expiresAt DESC LIMIT 1");
            $stmt->execute([$clinicId]);
            $expiresAt = $stmt->fetchColumn();
            if ($expiresAt) {
                $days = floor((strtotime($expiresAt) - time()) / 86400);
                if ($days >= 0 && $days <= 7) {
                    $alerts[] = $this->alert(
                        'subscription-expiring',
                        'subscription',
                        'urgent',
                        'Subscription expires in ' . max(0, $days) . ' day' . ($days === 1 ? '' : 's'),
                        'Renew early so clinic users do not hit a subscription lockout.',
                        '/settings',
                        1,
                        ['owner', 'manager']
                    );
                }
            }
        }

        usort($alerts, function ($a, $b) {
            $weight = ['urgent' => 0, 'high' => 1, 'normal' => 2, 'low' => 3];
            return ($weight[$a['priority']] ?? 9) <=> ($weight[$b['priority']] ?? 9);
        });

        return array_values(array_filter($alerts, function ($alert) use ($user) {
            return $this->visibleForRole($alert, $user['role'] ?? 'owner');
        }));
    }

    public function list($input, $user) {
        $db = DB::getConnection();
        $limit = min(50, max(5, intval($_GET['limit'] ?? 30)));

        $stmt = $db->prepare("
            SELECT *
            FROM Notification
            WHERE clinicId = ? AND (userId = ? OR userId IS NULL)
            ORDER BY `read` ASC, createdAt DESC
            LIMIT $limit
        ");
        $stmt->execute([$user['clinicId'], $user['id']]);
        $stored = $stmt->fetchAll();

        foreach ($stored as &$n) {
            $n['read'] = !empty($n['read']);
            $n['priority'] = $n['priority'] ?? ($n['read'] ? 'low' : 'normal');
            $n['actionUrl'] = $n['actionUrl'] ?? null;
            $n['computed'] = false;
        }

        $live = $this->liveAlerts($db, $user);
        $notifications = array_slice(array_merge($live, $stored), 0, $limit);
        $unreadCount = count(array_filter($notifications, fn($n) => empty($n['read'])));
        $urgentCount = count(array_filter($notifications, fn($n) => ($n['priority'] ?? '') === 'urgent'));

        send_json([
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            'urgentCount' => $urgentCount,
            'generatedAt' => date('c'),
        ]);
    }

    public function markRead($input, $user, $id) {
        if (strpos($id, 'live-') === 0) {
            send_json(['message' => 'Live alert remains visible until the issue is resolved.']);
        }
        $db = DB::getConnection();
        $stmt = $db->prepare("UPDATE Notification SET `read` = 1 WHERE id = ? AND clinicId = ? AND (userId = ? OR userId IS NULL)");
        $stmt->execute([$id, $user['clinicId'], $user['id']]);
        send_json(['message' => 'Marked as read']);
    }

    public function markAllRead($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare("UPDATE Notification SET `read` = 1 WHERE clinicId = ? AND (userId = ? OR userId IS NULL) AND `read` = 0");
        $stmt->execute([$user['clinicId'], $user['id']]);
        send_json(['message' => 'All saved notifications marked as read']);
    }
}
