<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/aiReceptionistService.php';
require_once __DIR__ . '/../services/tenantFeatureService.php';

// AI Receptionist configuration (AppointmentFlow AI plan only — the route
// prefix api/v1/ai-receptionist is gated to aiEnabled by require_package_feature).
// Every read/write is scoped to $user['clinicId']; clinicId is never taken from
// input, so Clinic A can never touch Clinic B's persona/knowledge/memory.
class AIReceptionistController {
    private function db() { return DB::getConnection(); }

    // ---- Persona ----
    public function getPersona($input, $user) {
        $db = $this->db();
        $persona = air_persona_get($db, $user['clinicId']);
        send_json([
            'persona' => $persona,
            'options' => [
                'tones' => AIR_TONES,
                'languages' => AIR_LANGUAGES,
                'genders' => AIR_GENDERS,
                'knowledgeCategories' => AIR_KNOWLEDGE_CATEGORIES,
            ],
        ]);
    }

    public function savePersona($input, $user) {
        $db = $this->db();
        $persona = air_persona_save($db, $user['clinicId'], $input ?: []);
        log_audit($user['clinicId'], $user['id'] ?? null, 'update', 'ClinicAIPersona', $user['clinicId'], null, ['isActive' => $persona['isActive']]);
        send_json(['persona' => $persona]);
    }

    // ---- Knowledge base ----
    public function listKnowledge($input, $user) {
        $db = $this->db();
        $category = $_GET['category'] ?? null;
        send_json(['items' => air_knowledge_list($db, $user['clinicId'], $category)]);
    }

    public function createKnowledge($input, $user) {
        $db = $this->db();
        $item = air_knowledge_upsert($db, $user['clinicId'], null, $input ?: []);
        log_audit($user['clinicId'], $user['id'] ?? null, 'create', 'ClinicKnowledge', $item['id'] ?? null, null, ['category' => $item['category'] ?? null]);
        send_json(['item' => $item]);
    }

    public function updateKnowledge($input, $user, $id) {
        $db = $this->db();
        $item = air_knowledge_upsert($db, $user['clinicId'], $id, $input ?: []);
        if (!$item) send_error('Knowledge entry not found', 404);
        log_audit($user['clinicId'], $user['id'] ?? null, 'update', 'ClinicKnowledge', $id, null, ['category' => $item['category'] ?? null]);
        send_json(['item' => $item]);
    }

    public function deleteKnowledge($input, $user, $id) {
        $db = $this->db();
        $ok = air_knowledge_delete($db, $user['clinicId'], $id);
        if (!$ok) send_error('Knowledge entry not found', 404);
        log_audit($user['clinicId'], $user['id'] ?? null, 'knowledge_archived', 'ClinicKnowledge', $id, null, null);
        send_json(['archived' => true]);
    }

    // ---- Conversation memory (visibility + manual cleanup; written by automation later) ----
    public function listMemory($input, $user) {
        $db = $this->db();
        $phone = $_GET['phone'] ?? null;
        send_json(['items' => air_memory_list($db, $user['clinicId'], $phone)]);
    }

    public function deleteMemory($input, $user, $id) {
        $db = $this->db();
        $ok = air_memory_delete($db, $user['clinicId'], $id);
        if (!$ok) send_error('Memory entry not found', 404);
        log_audit($user['clinicId'], $user['id'] ?? null, 'delete', 'ConversationMemory', $id, null, null);
        send_json(['deleted' => true]);
    }

    // ---- Sandbox / preview (Builder steps 5–6) ----
    // Generates one AI reply using the (optionally unsaved) persona + this
    // clinic's knowledge base. Never sends anything to a patient.
    public function preview($input, $user) {
        $db = $this->db();
        $message = trim((string)($input['message'] ?? ''));
        if ($message === '') send_error('Type a patient message to preview a reply.', 400);

        require_once __DIR__ . '/../services/aiService.php';
        if (!ai_is_configured($db)) {
            send_error('AI is not configured yet. Ask the platform admin to add an AI key under Platform settings.', 400, ['code' => 'ai_not_configured']);
        }

        $stmt = $db->prepare("SELECT name FROM Clinic WHERE id = ?");
        $stmt->execute([$user['clinicId']]);
        $clinicName = $stmt->fetchColumn() ?: '';

        $personaOverride = (isset($input['persona']) && is_array($input['persona'])) ? $input['persona'] : null;
        try {
            $reply = air_preview_reply($db, $user['clinicId'], $message, $personaOverride, $clinicName);
        } catch (Exception $e) {
            send_error($e->getMessage(), 502, ['code' => 'ai_error']);
        }
        send_json(['reply' => $reply]);
    }

    // ---- Full Lead -> Appointment simulation (Phase 4 test harness) ----
    // Runs the real engine (reply + slot extraction + optional auto-book). Lets a
    // clinic safely test the flow. Auto-book only happens if aiAutoBookEnabled is on.
    public function simulate($input, $user) {
        $db = $this->db();
        $message = trim((string)($input['message'] ?? ''));
        if ($message === '') send_error('Type a patient message to simulate.', 400);

        require_once __DIR__ . '/../services/aiService.php';
        if (!ai_is_configured($db)) {
            send_error('AI is not configured yet. Ask the platform admin to add an AI key under Platform settings.', 400, ['code' => 'ai_not_configured']);
        }

        $stmt = $db->prepare("SELECT name FROM Clinic WHERE id = ?");
        $stmt->execute([$user['clinicId']]);
        $clinicName = $stmt->fetchColumn() ?: '';

        $features = tenant_features_get($db, $user['clinicId']);
        $autobook = !empty($input['autobook']) && !empty($features['aiAutoBookEnabled']);

        try {
            $res = air_handle_message($db, $user['clinicId'], trim((string)($input['phone'] ?? '')), trim((string)($input['name'] ?? '')), $message, [
                'clinicName' => $clinicName,
                'autobook' => $autobook,
            ]);
        } catch (Exception $e) {
            send_error($e->getMessage(), 502, ['code' => 'ai_error']);
        }
        $res['autobookEnabled'] = !empty($features['aiAutoBookEnabled']);
        send_json($res);
    }
}
