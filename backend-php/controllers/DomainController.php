<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/sslProvider.php';

// Self-service custom domain management for clinic OWNERS.
// Status flow: none → pending → dns_verified → awaiting_ssl → connected (or failed)
class DomainController {

    private function ownerOnly($user) {
        if (($user['role'] ?? '') !== 'owner') {
            send_error('Only the clinic owner can manage the custom domain', 403);
        }
    }

    private function normalizeDomain($domain) {
        $domain = strtolower(trim($domain));
        if (strpos($domain, '://') !== false) $domain = parse_url($domain, PHP_URL_HOST) ?: $domain;
        $domain = preg_replace('/[\/:].*$/', '', $domain);
        return preg_replace('/^www\./', '', $domain);
    }

    private function instructions($clinic) {
        $domain = $clinic['customDomain'];
        if (!$domain) return null;
        $host = explode('.', $domain)[0]; // e.g. "portal"
        return [
            'cname' => [
                'type' => 'CNAME',
                'host' => $host,
                'value' => portal_host(),
                'ttl' => 3600,
            ],
            'txt' => [
                'type' => 'TXT',
                'host' => $domain,
                'value' => 'crea8iv-verify=' . ($clinic['domainToken'] ?? ''),
            ],
        ];
    }

    private function payload($clinic) {
        return [
            'customDomain' => $clinic['customDomain'],
            'domainStatus' => $clinic['domainStatus'] ?? 'none',
            'sslStatus' => $clinic['sslStatus'] ?? 'none',
            'domainVerifiedAt' => $clinic['domainVerifiedAt'] ?? null,
            'domainLastError' => $clinic['domainLastError'] ?? null,
            'portalHost' => portal_host(),
            'instructions' => $this->instructions($clinic),
        ];
    }

    private function clinic($db, $clinicId) {
        $stmt = $db->prepare("SELECT * FROM Clinic WHERE id = ?");
        $stmt->execute([$clinicId]);
        $c = $stmt->fetch();
        if (!$c) send_error('Clinic not found', 404);
        return $c;
    }

    public function get($input, $user) {
        $db = DB::getConnection();
        send_json($this->payload($this->clinic($db, $user['clinicId'])));
    }

    public function set($input, $user) {
        $this->ownerOnly($user);
        $domain = $this->normalizeDomain($input['customDomain'] ?? '');

        if ($domain === '') send_error('Enter a domain like portal.yourclinic.com', 400);
        if (!preg_match('/^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/', $domain)) {
            send_error('Enter a valid domain like portal.yourclinic.com', 400);
        }
        // Block platform domains
        $reserved = ['crea8ivmedia.com', 'app.crea8ivmedia.com', 'clinic.crea8ivmedia.com', portal_host()];
        if (in_array($domain, $reserved, true) || str_ends_with($domain, '.crea8ivmedia.com')) {
            send_error('Platform domains cannot be used. Use a subdomain of your own domain.', 400);
        }

        $db = DB::getConnection();
        // Uniqueness across all clinics
        $stmt = $db->prepare("SELECT id FROM Clinic WHERE LOWER(customDomain) = ? AND id != ?");
        $stmt->execute([$domain, $user['clinicId']]);
        if ($stmt->fetch()) send_error('That domain is already connected to another clinic', 409);

        $token = bin2hex(random_bytes(16));
        $db->prepare("UPDATE Clinic SET customDomain = ?, domainStatus = 'pending', domainToken = ?, domainVerifiedAt = NULL, domainLastError = NULL, sslStatus = 'none' WHERE id = ?")
           ->execute([$domain, $token, $user['clinicId']]);

        log_audit($user['clinicId'], $user['id'], 'domain_set', 'Clinic', $user['clinicId'], null, ['customDomain' => $domain]);
        send_json($this->payload($this->clinic($db, $user['clinicId'])));
    }

    public function verify($input, $user) {
        $this->ownerOnly($user);
        $db = DB::getConnection();
        $clinic = $this->clinic($db, $user['clinicId']);

        if (empty($clinic['customDomain'])) send_error('Set a domain first', 400);

        list($ok, $detail) = verify_domain_dns($clinic['customDomain'], $clinic['domainToken']);

        if (!$ok) {
            $db->prepare("UPDATE Clinic SET domainStatus = 'failed', domainLastError = ? WHERE id = ?")
               ->execute([$detail, $user['clinicId']]);
            log_audit($user['clinicId'], $user['id'], 'domain_verify_failed', 'Clinic', $user['clinicId']);
            send_json($this->payload($this->clinic($db, $user['clinicId'])));
        }

        // DNS verified → hand off to the SSL provider
        $ssl = ssl_provider_provision($clinic['customDomain']);
        $domainStatus = $ssl === 'active' ? 'connected' : 'awaiting_ssl';

        $db->prepare("UPDATE Clinic SET domainStatus = ?, sslStatus = ?, domainVerifiedAt = ?, domainLastError = NULL WHERE id = ?")
           ->execute([$domainStatus, $ssl, date('Y-m-d H:i:s'), $user['clinicId']]);

        log_audit($user['clinicId'], $user['id'], 'domain_verified', 'Clinic', $user['clinicId'], null, ['method' => $detail, 'ssl' => $ssl]);
        send_json($this->payload($this->clinic($db, $user['clinicId'])));
    }

    public function remove($input, $user) {
        $this->ownerOnly($user);
        $db = DB::getConnection();
        $db->prepare("UPDATE Clinic SET customDomain = NULL, domainStatus = 'none', domainToken = NULL, domainVerifiedAt = NULL, domainLastError = NULL, sslStatus = 'none' WHERE id = ?")
           ->execute([$user['clinicId']]);
        log_audit($user['clinicId'], $user['id'], 'domain_removed', 'Clinic', $user['clinicId']);
        send_json(['message' => 'Custom domain removed']);
    }
}
