<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

// Structured treatment plan: one row per planned procedure for a patient
// (procedure, tooth, cost, status). Kept flat for simplicity.
class TreatmentController {
    private function ensureTable($db) {
        $sql = DB_DRIVER === 'sqlite'
            ? "CREATE TABLE IF NOT EXISTS TreatmentPlanItem (
                 id TEXT PRIMARY KEY, clinicId TEXT NOT NULL, clientId TEXT NOT NULL,
                 procedure TEXT NOT NULL, tooth TEXT, cost REAL DEFAULT 0,
                 status TEXT DEFAULT 'planned', notes TEXT, sortOrder INTEGER DEFAULT 0,
                 createdAt TEXT DEFAULT CURRENT_TIMESTAMP)"
            : "CREATE TABLE IF NOT EXISTS TreatmentPlanItem (
                 id VARCHAR(36) PRIMARY KEY, clinicId VARCHAR(36) NOT NULL, clientId VARCHAR(36) NOT NULL,
                 `procedure` VARCHAR(255) NOT NULL, tooth VARCHAR(50), cost DOUBLE DEFAULT 0,
                 status VARCHAR(30) DEFAULT 'planned', notes TEXT, sortOrder INT DEFAULT 0,
                 createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                 INDEX tp_client (clinicId, clientId)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $db->exec($sql);
    }

    private $statuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    private function col() { return DB_DRIVER === 'sqlite' ? 'procedure' : '`procedure`'; }

    private function assertClient($db, $clientId, $clinicId) {
        $stmt = $db->prepare("SELECT id FROM Client WHERE id = ? AND clinicId = ?");
        $stmt->execute([$clientId, $clinicId]);
        if (!$stmt->fetch()) send_error('Patient not found', 404);
    }

    public function list($input, $user, $clientId) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $this->assertClient($db, $clientId, $user['clinicId']);
        $stmt = $db->prepare("SELECT * FROM TreatmentPlanItem WHERE clinicId = ? AND clientId = ? ORDER BY sortOrder ASC, createdAt ASC");
        $stmt->execute([$user['clinicId'], $clientId]);
        send_json($stmt->fetchAll());
    }

    public function create($input, $user, $clientId) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $this->assertClient($db, $clientId, $user['clinicId']);
        $procedure = trim((string)($input['procedure'] ?? ''));
        if ($procedure === '') send_error('Procedure is required', 400);
        $status = $input['status'] ?? 'planned';
        if (!in_array($status, $this->statuses, true)) $status = 'planned';
        $id = generate_uuid();
        $pc = $this->col();
        $db->prepare("INSERT INTO TreatmentPlanItem (id, clinicId, clientId, $pc, tooth, cost, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
           ->execute([$id, $user['clinicId'], $clientId, $procedure, trim((string)($input['tooth'] ?? '')) ?: null,
                      floatval($input['cost'] ?? 0), $status, trim((string)($input['notes'] ?? '')) ?: null]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'treatment_plan_added', 'TreatmentPlanItem', $id, null, ['procedure' => $procedure]);
        $stmt = $db->prepare("SELECT * FROM TreatmentPlanItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        send_json($stmt->fetch(), 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $stmt = $db->prepare("SELECT id FROM TreatmentPlanItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) send_error('Treatment item not found', 404);

        $fields = []; $params = [];
        if (isset($input['procedure']) && trim($input['procedure']) !== '') { $fields[] = $this->col() . " = ?"; $params[] = trim($input['procedure']); }
        if (array_key_exists('tooth', $input)) { $fields[] = "tooth = ?"; $params[] = trim((string)$input['tooth']) ?: null; }
        if (isset($input['cost'])) { $fields[] = "cost = ?"; $params[] = floatval($input['cost']); }
        if (isset($input['status']) && in_array($input['status'], $this->statuses, true)) { $fields[] = "status = ?"; $params[] = $input['status']; }
        if (array_key_exists('notes', $input)) { $fields[] = "notes = ?"; $params[] = trim((string)$input['notes']) ?: null; }
        if (!$fields) send_error('No fields to update', 400);
        $params[] = $id; $params[] = $user['clinicId'];
        $db->prepare("UPDATE TreatmentPlanItem SET " . implode(', ', $fields) . " WHERE id = ? AND clinicId = ?")->execute($params);
        $stmt = $db->prepare("SELECT * FROM TreatmentPlanItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        send_json($stmt->fetch());
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();
        $this->ensureTable($db);
        $stmt = $db->prepare("DELETE FROM TreatmentPlanItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        send_json(['message' => 'Deleted']);
    }
}
