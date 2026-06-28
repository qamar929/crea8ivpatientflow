<?php

const INDUSTRY_TEMPLATE_DEFAULT = 'healthcare';

function industry_template_builtins() {
    $base = [
        'terms' => [
            'appointment' => 'Appointment',
            'appointments' => 'Appointments',
            'patient' => 'Patient',
            'patients' => 'Patients',
            'client' => 'Patient',
            'clients' => 'Patients',
            'doctor' => 'Doctor',
            'doctors' => 'Doctors',
            'staff' => 'Staff',
            'service' => 'Treatment Service',
            'services' => 'Treatment Services',
            'treatment' => 'Treatment',
            'treatments' => 'Treatments',
            'clinical' => 'Clinical',
            'clinicalWorkspace' => 'Clinical Workspace',
            'clinicalNotes' => 'Clinical Notes',
            'recall' => 'Recall',
            'recalls' => 'Recalls',
            'visit' => 'Visit',
            'visits' => 'Visits',
            'campaign' => 'Campaign',
            'campaigns' => 'Campaigns',
            'reception' => 'Reception Desk',
            'packages' => 'Packages',
            'gallery' => 'Gallery',
            'feedback' => 'Feedback',
            'lab' => 'Lab',
        ],
        'dashboard' => [
            'todayAppointments' => "Today's Appointments",
            'activePatients' => 'Active Patients',
            'activeStaff' => 'Active Staff',
            'scheduleTitle' => "Today's Schedule",
            'topStaff' => 'Top Doctors',
            'servicesConfigured' => 'Services configured',
            'portalFeatures' => 'Portal Features',
        ],
        'modules' => [
            'reception' => ['label' => 'Reception Desk', 'desc' => 'Today appointments, invoices, check-in and handover', 'icon' => 'WalletCards'],
            'appointments' => ['label' => 'Appointments', 'desc' => 'Calendar, doctor availability and booking', 'icon' => 'Calendar'],
            'clients' => ['label' => 'Patients', 'desc' => 'Patient records, history, dues and follow-ups', 'icon' => 'Users'],
            'clinical' => ['label' => 'Clinical', 'desc' => 'Treatment notes and patient clinical workflow', 'icon' => 'Stethoscope'],
            'staff' => ['label' => 'Staff', 'desc' => 'Doctor profiles, salaries, commissions and access', 'icon' => 'UserCheck'],
            'services' => ['label' => 'Services', 'desc' => 'Treatment categories, durations and pricing', 'icon' => 'Stethoscope'],
        ],
    ];

    $templates = [
        'healthcare' => ['name' => 'Healthcare', 'config' => $base],
        'marketing_agency' => ['name' => 'Marketing Agency', 'config' => array_replace_recursive($base, [
            'terms' => [
                'appointment' => 'Meeting', 'appointments' => 'Meetings',
                'patient' => 'Client', 'patients' => 'Clients', 'client' => 'Client', 'clients' => 'Clients',
                'doctor' => 'Account Manager', 'doctors' => 'Account Managers',
                'service' => 'Service', 'services' => 'Services',
                'treatment' => 'Project', 'treatments' => 'Projects',
                'clinical' => 'Projects', 'clinicalWorkspace' => 'Project Workspace', 'clinicalNotes' => 'Task Notes',
                'recall' => 'Follow-up', 'recalls' => 'Follow-ups', 'visit' => 'Meeting', 'visits' => 'Meetings',
            ],
            'dashboard' => [
                'todayAppointments' => 'Meetings Scheduled',
                'activePatients' => 'Active Clients',
                'activeStaff' => 'Active Team',
                'scheduleTitle' => "Today's Meetings",
                'topStaff' => 'Top Account Managers',
                'servicesConfigured' => 'Services configured',
            ],
            'modules' => [
                'reception' => ['label' => 'Front Desk', 'desc' => 'Meetings, invoices, check-in and handover'],
                'appointments' => ['label' => 'Meetings', 'desc' => 'Calendar, account manager availability and booking'],
                'clients' => ['label' => 'Clients', 'desc' => 'Client records, history, dues and follow-ups'],
                'clinical' => ['label' => 'Projects', 'desc' => 'Project notes and client workflow'],
                'staff' => ['label' => 'Team', 'desc' => 'Account managers, salaries, commissions and access'],
                'services' => ['label' => 'Services', 'desc' => 'Service categories, durations and pricing'],
            ],
        ])],
        'real_estate' => ['name' => 'Real Estate', 'config' => array_replace_recursive($base, [
            'terms' => [
                'appointment' => 'Property Visit', 'appointments' => 'Property Visits',
                'patient' => 'Lead', 'patients' => 'Leads', 'client' => 'Lead', 'clients' => 'Leads',
                'doctor' => 'Agent', 'doctors' => 'Agents',
                'service' => 'Property', 'services' => 'Properties',
                'treatment' => 'Property', 'treatments' => 'Properties',
                'clinical' => 'Properties', 'clinicalWorkspace' => 'Property Workspace', 'clinicalNotes' => 'Visit Notes',
                'recall' => 'Lead Nurturing', 'recalls' => 'Lead Nurturing', 'visit' => 'Property Visit', 'visits' => 'Property Visits',
            ],
            'dashboard' => [
                'todayAppointments' => 'Property Visits',
                'activePatients' => 'New Leads',
                'activeStaff' => 'Active Agents',
                'scheduleTitle' => "Today's Visits",
                'topStaff' => 'Top Agents',
                'servicesConfigured' => 'Properties listed',
            ],
            'modules' => [
                'appointments' => ['label' => 'Property Visits', 'desc' => 'Calendar, agent availability and viewings'],
                'clients' => ['label' => 'Leads', 'desc' => 'Lead records, history, dues and nurturing'],
                'clinical' => ['label' => 'Properties', 'desc' => 'Property notes and lead workflow'],
                'staff' => ['label' => 'Agents', 'desc' => 'Agent profiles, commissions and access'],
                'services' => ['label' => 'Properties', 'desc' => 'Property categories, viewing duration and pricing'],
            ],
        ])],
        'beauty_salon' => ['name' => 'Beauty Salon', 'config' => array_replace_recursive($base, [
            'terms' => [
                'appointment' => 'Booking', 'appointments' => 'Bookings',
                'patient' => 'Client', 'patients' => 'Clients', 'client' => 'Client', 'clients' => 'Clients',
                'doctor' => 'Stylist', 'doctors' => 'Stylists',
                'service' => 'Service', 'services' => 'Services',
                'treatment' => 'Treatment', 'treatments' => 'Treatments',
                'clinical' => 'Client Notes', 'clinicalWorkspace' => 'Client Notes', 'clinicalNotes' => 'Service Notes',
                'recall' => 'Follow-up', 'recalls' => 'Follow-ups', 'visit' => 'Appointment', 'visits' => 'Appointments',
            ],
            'dashboard' => [
                'todayAppointments' => "Today's Bookings",
                'activePatients' => 'Active Clients',
                'activeStaff' => 'Active Stylists',
                'scheduleTitle' => "Today's Bookings",
                'topStaff' => 'Top Stylists',
            ],
            'modules' => [
                'appointments' => ['label' => 'Bookings', 'desc' => 'Calendar, stylist availability and booking'],
                'clients' => ['label' => 'Clients', 'desc' => 'Client records, history, dues and follow-ups'],
                'clinical' => ['label' => 'Client Notes', 'desc' => 'Service notes and client preferences'],
                'staff' => ['label' => 'Stylists', 'desc' => 'Stylist profiles, salaries, commissions and access'],
                'services' => ['label' => 'Services', 'desc' => 'Service categories, durations and pricing'],
            ],
        ])],
        'interior_design_studio' => ['name' => 'Interior Design Studio', 'config' => array_replace_recursive($base, [
            'terms' => [
                'appointment' => 'Consultation', 'appointments' => 'Consultations',
                'patient' => 'Client', 'patients' => 'Clients', 'client' => 'Client', 'clients' => 'Clients',
                'doctor' => 'Designer', 'doctors' => 'Designers',
                'service' => 'Project', 'services' => 'Projects',
                'treatment' => 'Project', 'treatments' => 'Projects',
                'clinical' => 'Design', 'clinicalWorkspace' => 'Design Workspace', 'clinicalNotes' => 'Design Notes',
                'recall' => 'Proposal Follow-up', 'recalls' => 'Proposal Follow-ups', 'visit' => 'Consultation', 'visits' => 'Consultations',
            ],
            'dashboard' => [
                'todayAppointments' => 'Consultations Today',
                'activePatients' => 'Active Clients',
                'activeStaff' => 'Active Designers',
                'scheduleTitle' => "Today's Consultations",
                'topStaff' => 'Top Designers',
                'servicesConfigured' => 'Projects configured',
            ],
            'modules' => [
                'appointments' => ['label' => 'Consultations', 'desc' => 'Calendar, designer availability and booking'],
                'clients' => ['label' => 'Clients', 'desc' => 'Client records, history, dues and proposal follow-ups'],
                'clinical' => ['label' => 'Design Workspace', 'desc' => 'Design notes and project workflow'],
                'staff' => ['label' => 'Designers', 'desc' => 'Designer profiles, commissions and access'],
                'services' => ['label' => 'Projects', 'desc' => 'Project categories, durations and pricing'],
            ],
        ])],
        'consultancy_firm' => ['name' => 'Consultancy Firm', 'config' => array_replace_recursive($base, [
            'terms' => [
                'appointment' => 'Session', 'appointments' => 'Sessions',
                'patient' => 'Client', 'patients' => 'Clients', 'client' => 'Client', 'clients' => 'Clients',
                'doctor' => 'Consultant', 'doctors' => 'Consultants',
                'service' => 'Service', 'services' => 'Services',
                'treatment' => 'Case', 'treatments' => 'Cases',
                'clinical' => 'Cases', 'clinicalWorkspace' => 'Case Workspace', 'clinicalNotes' => 'Case Notes',
                'recall' => 'Renewal Campaign', 'recalls' => 'Renewal Campaigns', 'visit' => 'Session', 'visits' => 'Sessions',
            ],
            'dashboard' => [
                'todayAppointments' => 'Sessions Scheduled',
                'activePatients' => 'Active Clients',
                'activeStaff' => 'Active Consultants',
                'scheduleTitle' => "Today's Sessions",
                'topStaff' => 'Top Consultants',
            ],
            'modules' => [
                'appointments' => ['label' => 'Sessions', 'desc' => 'Calendar, consultant availability and booking'],
                'clients' => ['label' => 'Clients', 'desc' => 'Client records, history, dues and renewals'],
                'clinical' => ['label' => 'Cases', 'desc' => 'Case notes and client workflow'],
                'staff' => ['label' => 'Consultants', 'desc' => 'Consultant profiles, commissions and access'],
                'services' => ['label' => 'Services', 'desc' => 'Service categories, durations and pricing'],
            ],
        ])],
        'generic_business' => ['name' => 'Generic Business', 'config' => array_replace_recursive($base, [
            'terms' => [
                'appointment' => 'Booking', 'appointments' => 'Bookings',
                'patient' => 'Customer', 'patients' => 'Customers', 'client' => 'Customer', 'clients' => 'Customers',
                'doctor' => 'Team Member', 'doctors' => 'Team Members',
                'service' => 'Service', 'services' => 'Services',
                'treatment' => 'Work Item', 'treatments' => 'Work Items',
                'clinical' => 'Work', 'clinicalWorkspace' => 'Work Workspace', 'clinicalNotes' => 'Notes',
                'recall' => 'Follow-up', 'recalls' => 'Follow-ups', 'visit' => 'Booking', 'visits' => 'Bookings',
            ],
            'dashboard' => [
                'todayAppointments' => 'Bookings Today',
                'activePatients' => 'Active Customers',
                'activeStaff' => 'Active Team',
                'scheduleTitle' => "Today's Bookings",
                'topStaff' => 'Top Team Members',
            ],
            'modules' => [
                'appointments' => ['label' => 'Bookings', 'desc' => 'Calendar, team availability and booking'],
                'clients' => ['label' => 'Customers', 'desc' => 'Customer records, history, dues and follow-ups'],
                'clinical' => ['label' => 'Work', 'desc' => 'Notes and customer workflow'],
                'staff' => ['label' => 'Team', 'desc' => 'Team profiles, commissions and access'],
                'services' => ['label' => 'Services', 'desc' => 'Service categories, durations and pricing'],
            ],
        ])],
    ];
    return $templates;
}

function industry_templates_ensure($db) {
    if (DB_DRIVER === 'sqlite') {
        $db->exec("CREATE TABLE IF NOT EXISTS IndustryTemplate (
            templateKey TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            configJson TEXT NOT NULL,
            isActive INTEGER DEFAULT 1,
            sortOrder INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )");
    } else {
        $db->exec("CREATE TABLE IF NOT EXISTS IndustryTemplate (
            templateKey VARCHAR(80) PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            configJson JSON NOT NULL,
            isActive TINYINT DEFAULT 1,
            sortOrder INT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    $sort = 0;
    foreach (industry_template_builtins() as $key => $template) {
        $json = json_encode($template['config'], JSON_UNESCAPED_SLASHES);
        if (DB_DRIVER === 'sqlite') {
            $sql = "INSERT INTO IndustryTemplate (templateKey, name, configJson, isActive, sortOrder)
                    VALUES (?, ?, ?, 1, ?)
                    ON CONFLICT(templateKey) DO UPDATE SET name=excluded.name, configJson=excluded.configJson, isActive=excluded.isActive, sortOrder=excluded.sortOrder, updatedAt=CURRENT_TIMESTAMP";
        } else {
            $sql = "INSERT INTO IndustryTemplate (templateKey, name, configJson, isActive, sortOrder)
                    VALUES (?, ?, ?, 1, ?)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), configJson=VALUES(configJson), isActive=VALUES(isActive), sortOrder=VALUES(sortOrder), updatedAt=CURRENT_TIMESTAMP";
        }
        $db->prepare($sql)->execute([$key, $template['name'], $json, $sort++]);
    }
}

function industry_template_normalize($key) {
    $key = strtolower(trim((string)$key));
    $key = preg_replace('/[^a-z0-9_]+/', '_', $key);
    return trim($key, '_') ?: INDUSTRY_TEMPLATE_DEFAULT;
}

function industry_templates_list($db) {
    industry_templates_ensure($db);
    $stmt = $db->query("SELECT templateKey, name, configJson, isActive, sortOrder FROM IndustryTemplate WHERE isActive = 1 ORDER BY sortOrder ASC, name ASC");
    $rows = $stmt ? $stmt->fetchAll() : [];
    return array_map(function ($row) {
        $row['config'] = json_decode($row['configJson'] ?? '{}', true) ?: [];
        $row['isActive'] = !empty($row['isActive']);
        unset($row['configJson']);
        return $row;
    }, $rows);
}

function industry_template_get($db, $key) {
    industry_templates_ensure($db);
    $key = industry_template_normalize($key ?: INDUSTRY_TEMPLATE_DEFAULT);
    $stmt = $db->prepare("SELECT templateKey, name, configJson, isActive, sortOrder FROM IndustryTemplate WHERE templateKey = ? AND isActive = 1");
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row && $key !== INDUSTRY_TEMPLATE_DEFAULT) {
        return industry_template_get($db, INDUSTRY_TEMPLATE_DEFAULT);
    }
    if (!$row) return null;
    $row['config'] = json_decode($row['configJson'] ?? '{}', true) ?: [];
    $row['isActive'] = !empty($row['isActive']);
    unset($row['configJson']);
    return $row;
}

function industry_template_exists($db, $key) {
    industry_templates_ensure($db);
    $stmt = $db->prepare("SELECT COUNT(*) FROM IndustryTemplate WHERE templateKey = ? AND isActive = 1");
    $stmt->execute([industry_template_normalize($key)]);
    return (int)$stmt->fetchColumn() > 0;
}
