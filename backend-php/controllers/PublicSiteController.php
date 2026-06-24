<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class PublicSiteController {
    // Additive, idempotent: clinic bank/account details shown on invoices.
    private function ensureClinicPaymentColumns($db) {
        // stampImage holds a base64 data URL (like logo) → needs a large text type.
        $cols = ['bankName', 'accountTitle', 'accountNumber', 'iban', 'paymentNote', 'stampImage'];
        if (DB_DRIVER === 'sqlite') {
            $existing = array_column($db->query("PRAGMA table_info(Clinic)")->fetchAll(), 'name');
            foreach ($cols as $c) {
                if (!in_array($c, $existing, true)) $db->exec("ALTER TABLE Clinic ADD COLUMN $c TEXT");
            }
        } else {
            foreach ($cols as $c) {
                $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Clinic' AND COLUMN_NAME = ?");
                $stmt->execute([$c]);
                if (!(int)$stmt->fetchColumn()) {
                    $type = $c === 'stampImage' ? 'MEDIUMTEXT' : ($c === 'paymentNote' ? 'TEXT' : 'VARCHAR(191)');
                    $db->exec("ALTER TABLE Clinic ADD COLUMN $c $type NULL");
                }
            }
        }
    }

    private function getClinic($db, $clinicId = null) {
        if ($clinicId) {
            $stmt = $db->prepare("SELECT * FROM Clinic WHERE id = ?");
            $stmt->execute([$clinicId]);
        } else {
            // Single-tenant fallback: oldest real clinic (skip the platform row)
            $stmt = $db->query("SELECT * FROM Clinic WHERE id != 'platform' ORDER BY createdAt ASC LIMIT 1");
        }
        $clinic = $stmt->fetch();
        if (!$clinic) send_error('Clinic configuration not found', 404);
        return $clinic;
    }

    // Which clinic owns this request? Resolve by the calling domain
    // (?domain=, then Origin/Referer host). Public booking endpoints must
    // match a configured clinic domain so traffic never falls through to a
    // different tenant by accident.
    private function resolveClinicByRequest($db, $required = false) {
        $host = $_GET['domain'] ?? '';
        if ($host === '') {
            $host = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
        }
        $clinic = find_clinic_by_domain($db, $host);
        if (!$clinic && $required) {
            send_error('Clinic domain not recognized. Please open the clinic public site from its assigned domain.', 404);
        }
        return $clinic ?: $this->getClinic($db);
    }

    private function defaults($clinic) {
        return [
            'announcement' => 'Now accepting online appointments',
            'eyebrow' => 'Trusted care. Thoughtful experience.',
            'heroTitle' => 'Modern healthcare, thoughtfully personal.',
            'heroSubtitle' => $clinic['tagline'] ?: 'General medicine, skin aesthetics, and dental care with transparent pricing and easy online booking.',
            'heroImage' => 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1200&q=85',
            'aboutTitle' => 'Care designed around you',
            'aboutText' => $clinic['mission'] ?: 'Our team brings clinical precision and a calm, personal experience to every appointment.',
            'hours' => 'Mon - Sat: 9:00 AM - 7:00 PM',
            'bookingNote' => 'Select one or more services. We will reserve a continuous appointment with your chosen doctor.',
            'googleMapsUrl' => 'https://maps.google.com/?q=' . urlencode($clinic['address'] ?? 'Lahore Pakistan'),
            'googleBusinessUrl' => '',
            'seoTitle' => ($clinic['name'] ?? 'Clinic') . ' | General Clinic, Skin Aesthetics & Dental Care',
            'seoDescription' => 'Book general clinic, skin aesthetics, and dental appointments online with transparent pricing.',
            'ogImage' => '',
            'socials' => ['facebook' => '', 'instagram' => '', 'tiktok' => '', 'youtube' => ''],
            'nav' => [
                ['label' => 'Services', 'href' => '#services'],
                ['label' => 'Doctors', 'href' => '#doctors'],
                ['label' => 'Gallery', 'href' => '#gallery'],
                ['label' => 'Reviews', 'href' => '#reviews'],
                ['label' => 'Book now', 'href' => '#book'],
            ],
            'sections' => [
                'offers' => true, 'services' => true, 'doctors' => true, 'gallery' => true,
                'testimonials' => true, 'about' => true, 'faq' => true, 'map' => true, 'booking' => true,
            ],
            'sectionOrder' => ['offers', 'services', 'doctors', 'gallery', 'testimonials', 'about', 'faq', 'map', 'booking'],
            'offers' => [],
            'faqs' => [
                ['question' => 'Can I book more than one service?', 'answer' => 'Yes. Choose multiple services and the portal will reserve one continuous visit.'],
                ['question' => 'Will I receive confirmation?', 'answer' => 'Your request is saved instantly and the clinic team can contact you using your submitted details.'],
                ['question' => 'Are prices shown before booking?', 'answer' => 'Yes. Service prices and your estimated total are visible before you submit your request.'],
                ['question' => 'Can I change or cancel my appointment?', 'answer' => 'Yes. Contact the clinic by phone or WhatsApp and quote your booking reference.'],
            ],
        ];
    }

    private function getConfig($db, $clinic) {
        $stmt = $db->prepare("SELECT configJson FROM PublicSiteConfig WHERE clinicId = ?");
        $stmt->execute([$clinic['id']]);
        $stored = $stmt->fetchColumn();
        $decoded = $stored ? json_decode($stored, true) : [];
        return array_merge($this->defaults($clinic), is_array($decoded) ? $decoded : []);
    }

    private function cleanClinic($clinic) {
        unset($clinic['createdAt']);
        return $clinic;
    }

    // Lightweight branding for the portal login screen — keyed to the domain.
    // Returns matched=false when no clinic owns the host so the app keeps its
    // neutral default (e.g. on clinic.crea8ivmedia.com or localhost).
    public function branding($input, $user = null) {
        $db = DB::getConnection();
        $host = $_GET['domain'] ?? ($_SERVER['HTTP_ORIGIN'] ?? '');
        $clinic = find_clinic_by_domain($db, $host);
        if (!$clinic) {
            send_json(['matched' => false]);
        }
        send_json([
            'matched' => true,
            'clinic' => [
                'id' => $clinic['id'],
                'name' => $clinic['name'],
                'tagline' => $clinic['tagline'],
                'logo' => $clinic['logo'],
                'primaryColor' => $clinic['primaryColor'],
                'secondaryColor' => $clinic['secondaryColor'],
                'font' => $clinic['font'],
                'slug' => $clinic['slug'],
                'status' => $clinic['status'],
                'website' => $clinic['website'],
            ],
        ]);
    }

    // Public marketing-site branding (PatientFlow website reads this). No auth,
    // no secrets — just the platform brand the super admin set in /admin/platform.
    public function platformBranding($input, $user = null) {
        $db = DB::getConnection();
        $defaults = [
            'brandName' => 'Crea8iv PatientFlow', 'tagline' => 'Clinic Management Platform',
            'logoText' => 'PF', 'logoUrl' => '', 'primaryColor' => '#f97316', 'secondaryColor' => '#ea580c',
            'heroTitle' => 'Run your whole clinic from one portal',
            'heroSubtitle' => 'Appointments, patients, billing, WhatsApp and reporting — built for modern clinics.',
            'supportEmail' => 'info@crea8ivmedia.com', 'supportPhone' => '+92 310 5704555', 'whatsapp' => '+92 310 5704555',
        ];
        try {
            $stmt = $db->query("SELECT settingValue FROM PlatformSetting WHERE settingKey = 'marketing_branding'");
            $saved = $stmt ? $stmt->fetchColumn() : null;
            if ($saved) $defaults = array_merge($defaults, json_decode($saved, true) ?: []);
        } catch (Exception $e) { /* table may not exist yet — return defaults */ }
        send_json(['branding' => $defaults]);
    }

    public function getSite($input, $user = null) {
        $db = DB::getConnection();
        $clinic = $this->resolveClinicByRequest($db, true);
        $config = $this->getConfig($db, $clinic);

        $stmt = $db->prepare("SELECT id, name, specialty, category, price, duration, description, popular FROM Service WHERE clinicId = ? AND isActive = 1 ORDER BY popular DESC, category ASC, name ASC");
        $stmt->execute([$clinic['id']]);
        $services = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT id, branchId, name, role, designation, specialty, avatar, avatarColor, qualifications, experience, bio, workingDays, workingHours, rating FROM Staff WHERE clinicId = ? AND status = 'active' ORDER BY rating DESC, name ASC");
        $stmt->execute([$clinic['id']]);
        $staff = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT id, name, address, phone FROM Branch WHERE clinicId = ? AND isActive = 1 ORDER BY createdAt ASC");
        $stmt->execute([$clinic['id']]);
        $branches = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT f.id, f.overallRating, f.comment, f.createdAt, c.name AS clientName, c.initials AS clientInitials, s.name AS staffName, srv.name AS serviceName FROM Feedback f LEFT JOIN Client c ON f.clientId = c.id AND c.clinicId = f.clinicId LEFT JOIN Staff s ON f.staffId = s.id AND s.clinicId = f.clinicId LEFT JOIN Appointment a ON f.appointmentId = a.id AND a.clinicId = f.clinicId LEFT JOIN Service srv ON a.serviceId = srv.id AND srv.clinicId = f.clinicId WHERE f.clinicId = ? AND f.isPublic = 1 AND f.comment IS NOT NULL ORDER BY f.createdAt DESC LIMIT 12");
        $stmt->execute([$clinic['id']]);
        $testimonials = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT g.id, g.type, g.imageUrl, g.service, g.notes FROM GalleryItem g JOIN Client c ON g.clientId = c.id WHERE c.clinicId = ? AND g.isPrivate = 0 ORDER BY g.createdAt DESC LIMIT 12");
        $stmt->execute([$clinic['id']]);
        $gallery = $stmt->fetchAll();

        send_json([
            'clinic' => $this->cleanClinic($clinic),
            'config' => $config,
            'services' => $services,
            'staff' => $staff,
            'branches' => $branches,
            'testimonials' => $testimonials,
            'gallery' => $gallery,
        ]);
    }

    public function getSettings($input, $user) {
        $db = DB::getConnection();
        $this->ensureClinicPaymentColumns($db);
        $clinic = $this->getClinic($db, $user['clinicId']);
        send_json(['clinic' => $this->cleanClinic($clinic), 'config' => $this->getConfig($db, $clinic)]);
    }

    public function updateSettings($input, $user) {
        $db = DB::getConnection();
        $this->ensureClinicPaymentColumns($db);
        $clinic = $this->getClinic($db, $user['clinicId']);
        $clinicInput = $input['clinic'] ?? [];
        $config = $input['config'] ?? [];
        $allowed = ['name', 'tagline', 'logo', 'address', 'phone', 'whatsapp', 'email', 'website', 'registrationNo', 'invoicePrefix', 'invoiceFooter', 'paymentTerms', 'mission', 'vision', 'servicesOverview', 'primaryColor', 'secondaryColor', 'font', 'bankName', 'accountTitle', 'accountNumber', 'iban', 'paymentNote', 'stampImage'];
        $fields = [];
        $params = [];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $clinicInput)) {
                $fields[] = "$key = ?";
                $params[] = $clinicInput[$key];
            }
        }
        if ($fields) {
            $params[] = $clinic['id'];
            $stmt = $db->prepare("UPDATE Clinic SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
        }

        $configJson = json_encode(array_merge($this->defaults($clinic), is_array($config) ? $config : []));
        $sql = DB_DRIVER === 'sqlite'
            ? "INSERT INTO PublicSiteConfig (clinicId, configJson) VALUES (?, ?) ON CONFLICT(clinicId) DO UPDATE SET configJson = excluded.configJson, updatedAt = CURRENT_TIMESTAMP"
            : "INSERT INTO PublicSiteConfig (clinicId, configJson) VALUES (?, ?) ON DUPLICATE KEY UPDATE configJson = VALUES(configJson), updatedAt = CURRENT_TIMESTAMP";
        $stmt = $db->prepare($sql);
        $stmt->execute([$clinic['id'], $configJson]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'update', 'PublicSiteConfig', $clinic['id'], null, $input);
        $this->getSettings([], $user);
    }

    public function availability($input, $user = null) {
        $staffId = $_GET['staffId'] ?? '';
        $date = $_GET['date'] ?? '';
        $duration = max(15, intval($_GET['duration'] ?? 30));
        $branchId = $_GET['branchId'] ?? '';
        if (!$staffId || !$date) send_error('staffId and date are required', 400);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            send_error('Invalid date format', 400);
        }

        $db = DB::getConnection();
        $clinic = $this->resolveClinicByRequest($db, true);
        $sql = "SELECT workingDays, workingHours FROM Staff WHERE id = ? AND clinicId = ? AND status = 'active'";
        $params = [$staffId, $clinic['id']];
        if ($branchId) { $sql .= " AND branchId = ?"; $params[] = $branchId; }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $staff = $stmt->fetch();
        if (!$staff) send_error('Doctor not found', 404);

        $day = date('D', strtotime($date));
        if (!in_array($day, array_map('trim', explode(',', $staff['workingDays'])))) send_json(['slots' => []]);
        list($open, $close) = array_pad(explode('-', $staff['workingHours']), 2, '');
        if (!$open || !$close) send_json(['slots' => []]);

        $stmt = $db->prepare("SELECT startTime, endTime FROM Appointment WHERE clinicId = ? AND staffId = ? AND date = ? AND status IN ('confirmed', 'pending')");
        $stmt->execute([$clinic['id'], $staffId, $date]);
        $booked = $stmt->fetchAll();
        $slots = [];
        $cursor = strtotime("$date $open");
        $endOfDay = strtotime("$date $close");
        while ($cursor + ($duration * 60) <= $endOfDay) {
            $slotEnd = $cursor + ($duration * 60);
            $available = $cursor > time();
            foreach ($booked as $appointment) {
                if ($cursor < strtotime("$date {$appointment['endTime']}") && $slotEnd > strtotime("$date {$appointment['startTime']}")) {
                    $available = false;
                    break;
                }
            }
            if ($available) $slots[] = ['startTime' => date('H:i', $cursor), 'endTime' => date('H:i', $slotEnd)];
            $cursor += 30 * 60;
        }
        send_json(['slots' => $slots]);
    }

    public function book($input, $user = null) {
        foreach (['name', 'phone', 'date', 'startTime', 'staffId', 'serviceIds'] as $required) {
            if (empty($input[$required])) send_error("$required is required", 400);
        }
        if (!is_array($input['serviceIds'])) send_error('serviceIds must be an array', 400);
        if (count($input['serviceIds']) === 0) send_error('At least one service is required', 400);

        $db = DB::getConnection();
        $clinic = $this->resolveClinicByRequest($db, true);
        $serviceIds = array_values(array_unique($input['serviceIds']));
        $marks = implode(',', array_fill(0, count($serviceIds), '?'));
        $stmt = $db->prepare("SELECT * FROM Service WHERE clinicId = ? AND isActive = 1 AND id IN ($marks)");
        $stmt->execute(array_merge([$clinic['id']], $serviceIds));
        $services = $stmt->fetchAll();
        if (count($services) !== count($serviceIds)) send_error('One or more selected services are unavailable', 400);

        $sql = "SELECT id FROM Staff WHERE id = ? AND clinicId = ? AND status = 'active'";
        $params = [$input['staffId'], $clinic['id']];
        if (!empty($input['branchId'])) { $sql .= " AND branchId = ?"; $params[] = $input['branchId']; }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        if (!$stmt->fetch()) send_error('Selected doctor is unavailable', 400);

        $duration = array_sum(array_map(function ($service) { return intval($service['duration']); }, $services));
        $price = array_sum(array_map(function ($service) { return floatval($service['price']); }, $services));
        $date = $input['date'];
        $startTime = $input['startTime'];
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^\d{2}:\d{2}$/', $startTime)) {
            send_error('Invalid date or startTime format', 400);
        }
        if (strtotime("$date $startTime") <= time()) {
            send_error('Please choose a future appointment slot.', 400);
        }
        $endTime = date('H:i', strtotime("$date $startTime") + ($duration * 60));

        $stmt = $db->prepare("SELECT COUNT(*) FROM Appointment WHERE clinicId = ? AND staffId = ? AND date = ? AND status IN ('confirmed', 'pending') AND startTime < ? AND endTime > ?");
        $stmt->execute([$clinic['id'], $input['staffId'], $date, $endTime, $startTime]);
        if (intval($stmt->fetchColumn()) > 0) send_error('This slot has just been booked. Please choose another time.', 409);

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT id FROM Client WHERE clinicId = ? AND (phone = ? OR (email IS NOT NULL AND email = ?)) LIMIT 1");
            $stmt->execute([$clinic['id'], $input['phone'], $input['email'] ?? '']);
            $clientId = $stmt->fetchColumn();
            if (!$clientId) {
                $clientId = generate_uuid();
                $stmt = $db->prepare("SELECT COUNT(*) FROM Client WHERE clinicId = ?");
                $stmt->execute([$clinic['id']]);
                $count = intval($stmt->fetchColumn()) + 1;
                $patientNo = 'WEB-' . str_pad($count, 4, '0', STR_PAD_LEFT);
                $parts = preg_split('/\s+/', trim($input['name']));
                $initials = strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));
                $stmt = $db->prepare("INSERT INTO Client (id, clinicId, patientNo, name, phone, email, dob, gender, specialty, medicalHistory, avatarColor, initials, notes, referredBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', '#0f766e', ?, ?, 'Public website')");
                $stmt->execute([$clientId, $clinic['id'], $patientNo, trim($input['name']), trim($input['phone']), trim($input['email'] ?? ''), $input['dob'] ?? null, $input['gender'] ?? null, substr($initials, 0, 2), $input['notes'] ?? null]);
            }

            $appointmentId = generate_uuid();
            $reference = 'WEB-' . strtoupper(substr(str_replace('-', '', $appointmentId), 0, 8));
            $serviceNames = implode(', ', array_map(function ($service) { return $service['name']; }, $services));
            $notes = trim(($input['notes'] ?? '') . "\nPublic booking $reference. Services: $serviceNames");
            $stmt = $db->prepare("INSERT INTO Appointment (id, clinicId, branchId, clientId, staffId, serviceId, date, startTime, endTime, duration, status, notes, price, specialty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)");
            $stmt->execute([$appointmentId, $clinic['id'], $input['branchId'] ?? null, $clientId, $input['staffId'], $services[0]['id'], $date, $startTime, $endTime, $duration, $notes, $price, $services[0]['specialty']]);
            $db->commit();
            send_json(['message' => 'Appointment request received', 'reference' => $reference, 'duration' => $duration, 'total' => $price], 201);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
