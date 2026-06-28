<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

// Lab case tracking: work sent out to dental/aesthetic labs (crowns, dentures,
// aligners, etc.) — lab, procedure, sent/due/received dates, status. Flat table.
class LabController {
    private $statuses = ['sent', 'received', 'fitted', 'cancelled', 'archived'];

    private function ensureTable($db) {
        $sql = DB_DRIVER === 'sqlite'
            ? "CREATE TABLE IF NOT EXISTS LabCase (
                 id TEXT PRIMARY KEY, clinicId TEXT NOT NULL, clientId TEXT,
                 patientName TEXT, labName TEXT NOT NULL, procedure TEXT,
                 itemsSent TEXT, shade TEXT, doctorName TEXT, staffId TEXT,
                 sentDate TEXT, dueDate TEXT, receivedDate TEXT,
                 status TEXT DEFAULT 'sent', cost REAL DEFAULT 0, notes TEXT,
                 createdAt TEXT DEFAULT CURRENT_TIMESTAMP)"
            : "CREATE TABLE IF NOT EXISTS LabCase (
                 id VARCHAR(36) PRIMARY KEY, clinicId VARCHAR(36) NOT NULL, clientId VARCHAR(36),
                 patientName VARCHAR(255), labName VARCHAR(255) NOT NULL, `procedure` VARCHAR(255),
                 itemsSent TEXT, shade VARCHAR(50), doctorName VARCHAR(255), staffId VARCHAR(36),
                 sentDate VARCHAR(20), dueDate VARCHAR(20), receivedDate VARCHAR(20),
                 status VARCHAR(20) DEFAULT 'sent', cost DOUBLE DEFAULT 0, notes TEXT,
                 createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                 INDEX lab_clinic (clinicId, status), INDEX lab_client (clinicId, clientId)
               ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $db->exec($sql);
    }

    private function pc() { return DB_DRIVER === 'sqlite' ? 'procedure' : '`procedure`'; }

    public function list($input, $user) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $status = $_GET['status'] ?? '';
        $clientId = $_GET['clientId'] ?? '';
        $search = $_GET['search'] ?? '';
        $where = ["clinicId = ?", "status <> 'archived'"]; $params = [$user['clinicId']];
        if ($status === 'overdue') {
            $where[] = "status = 'sent' AND dueDate IS NOT NULL AND dueDate <> '' AND dueDate < ?";
            $params[] = date('Y-m-d');
        } elseif ($status !== '' && in_array($status, $this->statuses, true)) {
            $where[] = "status = ?"; $params[] = $status;
        }
        if ($clientId !== '') { $where[] = "clientId = ?"; $params[] = $clientId; }
        if ($search !== '') {
            $where[] = "(patientName LIKE ? OR labName LIKE ? OR " . $this->pc() . " LIKE ?)";
            $like = "%$search%"; array_push($params, $like, $like, $like);
        }
        $sql = "SELECT * FROM LabCase WHERE " . implode(' AND ', $where) .
               " ORDER BY (status='sent') DESC, COALESCE(dueDate, sentDate) ASC, createdAt DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        // Summary counts for the page header.
        $counts = ['sent' => 0, 'received' => 0, 'fitted' => 0, 'overdue' => 0];
        $cs = $db->prepare("SELECT status, COUNT(*) c FROM LabCase WHERE clinicId = ? AND status <> 'archived' GROUP BY status");
        $cs->execute([$user['clinicId']]);
        foreach ($cs->fetchAll() as $r) { if (isset($counts[$r['status']])) $counts[$r['status']] = intval($r['c']); }
        $od = $db->prepare("SELECT COUNT(*) FROM LabCase WHERE clinicId = ? AND status='sent' AND dueDate IS NOT NULL AND dueDate <> '' AND dueDate < ?");
        $od->execute([$user['clinicId'], date('Y-m-d')]);
        $counts['overdue'] = intval($od->fetchColumn());
        send_json(['cases' => $rows, 'counts' => $counts]);
    }

    public function create($input, $user) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $labName = trim((string)($input['labName'] ?? ''));
        if ($labName === '') send_error('Lab name is required', 400);
        $clientId = $input['clientId'] ?? null;
        $patientName = trim((string)($input['patientName'] ?? ''));
        if ($clientId) {
            $c = $db->prepare("SELECT name FROM Client WHERE id = ? AND clinicId = ?");
            $c->execute([$clientId, $user['clinicId']]);
            $row = $c->fetch();
            if (!$row) send_error('Patient not found', 404);
            if ($patientName === '') $patientName = $row['name'];
        }
        $status = $input['status'] ?? 'sent';
        if (!in_array($status, $this->statuses, true)) $status = 'sent';
        $id = generate_uuid();
        $pc = $this->pc();
        $db->prepare("INSERT INTO LabCase (id, clinicId, clientId, patientName, labName, $pc, itemsSent, shade, doctorName, staffId, sentDate, dueDate, receivedDate, status, cost, notes)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
           ->execute([$id, $user['clinicId'], $clientId ?: null, $patientName ?: null, $labName,
                      trim((string)($input['procedure'] ?? '')) ?: null, trim((string)($input['itemsSent'] ?? '')) ?: null,
                      trim((string)($input['shade'] ?? '')) ?: null, trim((string)($input['doctorName'] ?? '')) ?: null,
                      $input['staffId'] ?? null, $input['sentDate'] ?? date('Y-m-d'), $input['dueDate'] ?? null,
                      $input['receivedDate'] ?? null, $status, floatval($input['cost'] ?? 0), trim((string)($input['notes'] ?? '')) ?: null]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'lab_case_added', 'LabCase', $id, null, ['lab' => $labName]);
        $stmt = $db->prepare("SELECT * FROM LabCase WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        send_json($stmt->fetch(), 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $stmt = $db->prepare("SELECT id FROM LabCase WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) send_error('Lab case not found', 404);

        $map = ['patientName'=>'patientName','labName'=>'labName','procedure'=>$this->pc(),'itemsSent'=>'itemsSent',
                'shade'=>'shade','doctorName'=>'doctorName','staffId'=>'staffId','sentDate'=>'sentDate',
                'dueDate'=>'dueDate','receivedDate'=>'receivedDate','cost'=>'cost','notes'=>'notes'];
        $fields = []; $params = [];
        foreach ($map as $key => $col) {
            if (array_key_exists($key, $input)) {
                $fields[] = "$col = ?";
                $params[] = $key === 'cost' ? floatval($input[$key]) : (trim((string)$input[$key]) ?: null);
            }
        }
        if (isset($input['status']) && in_array($input['status'], $this->statuses, true)) {
            $fields[] = "status = ?"; $params[] = $input['status'];
            // Auto-stamp received date when marked received and none given.
            if ($input['status'] === 'received' && empty($input['receivedDate'])) {
                $fields[] = "receivedDate = ?"; $params[] = date('Y-m-d');
            }
        }
        if (!$fields) send_error('No fields to update', 400);
        $params[] = $id; $params[] = $user['clinicId'];
        $db->prepare("UPDATE LabCase SET " . implode(', ', $fields) . " WHERE id = ? AND clinicId = ?")->execute($params);
        $stmt = $db->prepare("SELECT * FROM LabCase WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        send_json($stmt->fetch());
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $db->prepare("UPDATE LabCase SET status = 'archived' WHERE id = ? AND clinicId = ?")->execute([$id, $user['clinicId']]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'lab_case_archived', 'LabCase', $id, null, null);
        send_json(['message' => 'Archived']);
    }
}
