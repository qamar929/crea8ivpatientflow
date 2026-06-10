<?php
// SSL provider abstraction.
//
// The rest of the app never talks SSL directly — it calls these two functions.
// Today SSL_PROVIDER=manual: provisioning just flags the domain for a human to
// finish (add the alias + issue Let's Encrypt in hPanel) and an admin marks it
// connected. Later, set SSL_PROVIDER=cloudflare and implement the API calls in
// the cloudflare branch — no other module changes.
//
// Returns one of: 'awaiting_activation' | 'active' | 'failed'.

if (!defined('SSL_PROVIDER')) {
    define('SSL_PROVIDER', getenv('SSL_PROVIDER') ?: 'manual');
}

// Kick off SSL provisioning for a freshly DNS-verified domain.
function ssl_provider_provision($domain) {
    switch (SSL_PROVIDER) {
        case 'cloudflare':
            return cloudflare_custom_hostname_create($domain);
        case 'manual':
        default:
            // No automation: a platform admin issues the cert and marks it
            // connected from the owner portal.
            return 'awaiting_activation';
    }
}

// Poll current SSL state for a domain.
function ssl_provider_status($domain) {
    switch (SSL_PROVIDER) {
        case 'cloudflare':
            return cloudflare_custom_hostname_status($domain);
        case 'manual':
        default:
            return 'awaiting_activation';
    }
}

function ssl_provider_is_automated() {
    return SSL_PROVIDER !== 'manual';
}

// ---------------------------------------------------------------------------
// Cloudflare for SaaS (Custom Hostnames) — implement when SSL_PROVIDER=cloudflare.
// Needs CF_API_TOKEN + CF_ZONE_ID in env. Stubbed so the abstraction is complete
// and the manual path keeps working until these are filled in.
// ---------------------------------------------------------------------------
function cloudflare_custom_hostname_create($domain) {
    $token = getenv('CF_API_TOKEN'); $zone = getenv('CF_ZONE_ID');
    if (!$token || !$zone) { error_log('Cloudflare SSL selected but CF_API_TOKEN/CF_ZONE_ID missing'); return 'failed'; }
    // TODO: POST https://api.cloudflare.com/client/v4/zones/{zone}/custom_hostnames
    //   body: { hostname, ssl: { method: 'http', type: 'dv' } }
    return 'awaiting_activation';
}

function cloudflare_custom_hostname_status($domain) {
    // TODO: GET .../custom_hostnames?hostname={domain} → map ssl.status:
    //   'active' => 'active', 'pending_validation' => 'awaiting_activation', else 'failed'
    return 'awaiting_activation';
}
