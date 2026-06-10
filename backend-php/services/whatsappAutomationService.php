<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/metaWhatsAppService.php';

function whatsapp_automation_dispatch_flow($db, $settings, $flow, $client, $contextKey) {
    if (empty($client['phone']) || empty($flow['templateName'])) return false;
    $check = $db->prepare("SELECT COUNT(*) FROM WhatsAppAutomationLog WHERE automationId=? AND clientId=? AND contextKey=?");
    $check->execute([$flow['id'], $client['id'], $contextKey]);
    if ($check->fetchColumn()) return false;
    $stmt = $db->prepare("SELECT * FROM WhatsAppConversation WHERE clinicId=? AND clientId=?");
    $stmt->execute([$flow['clinicId'], $client['id']]);
    $conversation = $stmt->fetch();
    if (!$conversation) {
        $conversation = ['id' => generate_uuid()];
        $db->prepare("INSERT INTO WhatsAppConversation(id,clinicId,clientId) VALUES(?,?,?)")->execute([$conversation['id'], $flow['clinicId'], $client['id']]);
    }
    $payload = ['type'=>'template','template'=>['name'=>$flow['templateName'],'language'=>['code'=>$flow['language'] ?: 'en']]];
    $sent = meta_whatsapp_send($settings, $client['phone'], $payload);
    $messageId = generate_uuid();
    $db->prepare("INSERT INTO WhatsAppMessage(id,clinicId,conversationId,clientId,direction,purpose,messageType,body,templateName,metaMessageId,deliveryStatus) VALUES(?,?,?,?,?,?,?,?,?,?,?)")->execute([$messageId,$flow['clinicId'],$conversation['id'],$client['id'],'outbound',$flow['purpose'],'template',$flow['name'],$flow['templateName'],$sent['messageId'],$sent['status']]);
    $db->prepare("INSERT INTO WhatsAppAutomationLog(id,clinicId,automationId,clientId,contextKey,messageId) VALUES(?,?,?,?,?,?)")->execute([generate_uuid(),$flow['clinicId'],$flow['id'],$client['id'],$contextKey,$messageId]);
    return true;
}

function whatsapp_automation_dispatch_trigger($clinicId, $triggerType, $contextKey, $clientId) {
    try {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT a.*,t.name templateName,t.language FROM WhatsAppAutomation a JOIN WhatsAppTemplate t ON t.id=a.templateId WHERE a.clinicId=? AND a.triggerType=? AND a.isActive=1");
        $stmt->execute([$clinicId,$triggerType]);
        $clientStmt = $db->prepare("SELECT * FROM Client WHERE id=? AND clinicId=?");
        $clientStmt->execute([$clientId,$clinicId]);
        $client = $clientStmt->fetch();
        if (!$client) return 0;
        $settingsStmt = $db->prepare("SELECT * FROM WhatsAppSetting WHERE clinicId=?");
        $settingsStmt->execute([$clinicId]);
        $settings = $settingsStmt->fetch() ?: ['simulationMode'=>1];
        $sent = 0;
        foreach ($stmt->fetchAll() as $flow) if (whatsapp_automation_dispatch_flow($db,$settings,$flow,$client,$contextKey)) $sent++;
        return $sent;
    } catch (Exception $e) {
        return 0;
    }
}
