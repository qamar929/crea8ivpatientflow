<?php
// Hourly WhatsApp automation runner — fires appointment reminders (2h / 24h),
// birthdays, inactive-patient win-backs and review requests for every active
// clinic that has automations enabled. Schedule HOURLY in hPanel:
//   0 * * * * /usr/bin/php /home/.../public_html/app/cron/run-automations.php
//
// The 2h reminder relies on this running at least hourly (it matches
// appointments starting ~90–150 min from "now").

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/metaWhatsAppService.php';
require_once __DIR__ . '/../services/whatsappAutomationService.php';
require_once __DIR__ . '/../services/tenantFeatureService.php';

$db = DB::getConnection();
$totalSent = 0; $clinicsRun = 0;

// WhatsApp tables only exist once the WhatsApp Center has been set up. If they
// aren't present yet, there is nothing to run — exit cleanly (never fatal).
try {
    $db->query("SELECT 1 FROM WhatsAppAutomation LIMIT 1");
} catch (Exception $e) {
    echo date('Y-m-d H:i:s') . " run-automations: WhatsApp not set up yet — nothing to do\n";
    exit(0);
}

$clinics = $db->query("SELECT id FROM Clinic WHERE status IN ('active','trial','grace')")->fetchAll();
foreach ($clinics as $row) {
  try {
    $c = $row['id'];
    $features = tenant_features_get($db, $c);
    if (empty($features['whatsappAutomationEnabled'])) continue;
    $clinicsRun++;

    $sStmt = $db->prepare("SELECT * FROM WhatsAppSetting WHERE clinicId=?");
    $sStmt->execute([$c]);
    $settings = $sStmt->fetch() ?: ['clinicId'=>$c,'simulationMode'=>1,'apiVersion'=>'v23.0'];

    $stmt = $db->prepare("SELECT a.*,t.name templateName,t.language FROM WhatsAppAutomation a JOIN WhatsAppTemplate t ON t.id=a.templateId WHERE a.clinicId=? AND a.isActive=1 AND a.triggerType IN ('appointment_upcoming','birthday','inactive_days','treatment_completed')");
    $stmt->execute([$c]);

    foreach ($stmt->fetchAll() as $flow) {
        $clients = []; $context = date('Y-m-d');
        if ($flow['triggerType'] === 'birthday') {
            $q = $db->prepare("SELECT * FROM Client WHERE clinicId=? AND status='active' AND substr(dob,6,5)=?");
            $q->execute([$c, date('m-d')]); $clients = $q->fetchAll();
        } elseif ($flow['triggerType'] === 'inactive_days') {
            $days = max(1, intval($flow['triggerValue']));
            $q = $db->prepare("SELECT * FROM Client WHERE clinicId=? AND status='active' AND lastVisit IS NOT NULL AND lastVisit < ?");
            $q->execute([$c, date('Y-m-d', strtotime("-$days days"))]); $clients = $q->fetchAll(); $context .= ":$days";
        } else {
            $is2h = $flow['triggerType'] === 'appointment_upcoming' && $flow['triggerValue'] === '2h';
            $target = ($flow['triggerType'] === 'appointment_upcoming' && $flow['triggerValue'] === '24h') ? date('Y-m-d', strtotime('+1 day')) : date('Y-m-d');
            $status = $flow['triggerType'] === 'treatment_completed' ? 'completed' : 'confirmed';
            if ($is2h) {
                $from = date('H:i', strtotime('+90 minutes')); $to = date('H:i', strtotime('+150 minutes'));
                $q = $db->prepare("SELECT DISTINCT c.* FROM Client c JOIN Appointment a ON a.clientId=c.id WHERE c.clinicId=? AND c.status='active' AND a.date=? AND a.status=? AND a.startTime BETWEEN ? AND ?");
                $q->execute([$c, $target, $status, $from, $to]); $context = $target . ':2h:' . date('H');
            } else {
                $q = $db->prepare("SELECT DISTINCT c.* FROM Client c JOIN Appointment a ON a.clientId=c.id WHERE c.clinicId=? AND c.status='active' AND a.date=? AND a.status=?");
                $q->execute([$c, $target, $status]); $context = $target . ':' . $flow['triggerValue'];
            }
            $clients = $q->fetchAll();
        }
        foreach ($clients as $client) {
            if (whatsapp_automation_dispatch_flow($db, $settings, $flow, $client, $context)) $totalSent++;
        }
    }
  } catch (Exception $e) {
    // One clinic's bad data/config must not abort the whole run.
    error_log('run-automations clinic ' . ($row['id'] ?? '?') . ': ' . $e->getMessage());
  }
}

$line = date('Y-m-d H:i:s') . " run-automations: clinics=$clinicsRun sent=$totalSent\n";
@file_put_contents(__DIR__ . '/../logs/automations.log', $line, FILE_APPEND);
echo $line;
