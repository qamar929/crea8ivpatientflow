<?php
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/tenantFeatureService.php';

class StatusController {
    public function health($input, $user) {
        send_json([
            'status' => 'ok',
            'timestamp' => date('Y-m-d\TH:i:s\Z')
        ]);
    }

    public function features($input, $user) {
        $db = DB::getConnection();
        $features = tenant_features_get($db, $user['clinicId']);
        $stmt = $db->prepare("SELECT id, name, tagline, logo, primaryColor, secondaryColor, font, website FROM Clinic WHERE id = ?");
        $stmt->execute([$user['clinicId']]);
        $clinic = $stmt->fetch() ?: null;
        send_json([
            'marketingEnabled' => !empty($features['marketingEnabled']),
            'metaLeadsEnabled' => !empty($features['metaLeadsEnabled']),
            'importsEnabled' => !empty($features['importsEnabled']),
            'whatsappEnabled' => !empty($features['whatsappEnabled']),
            'whatsappMarketingEnabled' => !empty($features['whatsappMarketingEnabled']),
            'whatsappAutomationEnabled' => !empty($features['whatsappAutomationEnabled']),
            'aiEnabled' => !empty($features['aiEnabled']),
            'aiAutoReplyEnabled' => !empty($features['aiAutoReplyEnabled']),
            'aiHumanApprovalRequired' => !empty($features['aiHumanApprovalRequired']),
            'monthlyAiTokenLimit' => intval($features['monthlyAiTokenLimit'] ?? 0),
            'monthlyWhatsAppLimit' => intval($features['monthlyWhatsAppLimit'] ?? 0),
            'clinic' => $clinic,
        ]);
    }
}
