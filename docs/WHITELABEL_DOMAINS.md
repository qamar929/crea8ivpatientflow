# Crea8iv PatientFlow — White-Label Domain Playbook

How the platform serves one portal app to many clinics, each on their own domain.

## The topology

| Piece | Domain | What it is |
|---|---|---|
| Marketing site | `crea8ivmedia.com/patientflow` | Static HTML in `website/`, uploaded into a `patientflow/` folder under the agency site |
| Portal (default) | `clinic.crea8ivmedia.com` | The built React app (`dist/`) |
| Portal (per clinic) | `portal.thesmilexperts.com`, `app.brightsmile.pk`, … | **The same `dist/`** — branded at runtime by domain |
| API (shared) | `app.crea8ivmedia.com` | The PHP API in `backend-php/`. One instance serves every clinic. |

There is exactly **one** copy of the portal and **one** API. Adding a clinic domain never means deploying new code — it's DNS + an SSL cert + one row update.

## How branding-by-domain works

1. A browser loads the portal from `portal.thesmilexperts.com`.
2. On boot, the app calls `GET https://app.crea8ivmedia.com/api/v1/public/branding?domain=portal.thesmilexperts.com`.
3. The API runs `find_clinic_by_domain()`:
   - exact match on `Clinic.customDomain` → that clinic, else
   - `{slug}.crea8ivmedia.com` subdomain → match by `Clinic.slug`, else
   - `matched:false` (app keeps its neutral default).
4. The matched clinic's logo, name, colors and font theme the login screen — before anyone signs in.
5. Login itself resolves the clinic from the user's email, so auth is domain-independent and safe.

CORS allows the API to be called from: `crea8ivmedia.com` + any subdomain, the legacy `crea8ivpatientflow.com`, and **any host registered as a clinic's `customDomain`** (checked against the DB per request).

## Onboarding a clinic's custom domain — operator steps

### 1. Set the domain in the Owner Portal
Clinics → the clinic row → **Domain** → enter `portal.thesmilexperts.com` → Save.
(Validates format, blocks platform domains, enforces uniqueness. Leave blank to remove.)

### 2. The clinic adds a DNS record (their side)
In their domain registrar / DNS:

```
Type: CNAME
Host: portal              (the subdomain they chose)
Value: clinic.crea8ivmedia.com.
TTL: 3600
```

> If the host is an apex/root domain (e.g. `theirclinic.com` with no subdomain), CNAME isn't allowed — use an A record pointing at the server IP, or have them use a subdomain. Subdomains are strongly recommended.

### 3. Make the server answer for that domain
On Hostinger (or any host fronting the portal):

- **Easiest — Cloudflare in front (recommended):** add the portal origin to Cloudflare, enable *Cloudflare for SaaS / Custom Hostnames*. Cloudflare issues SSL for each clinic domain automatically and proxies to `clinic.crea8ivmedia.com`. Zero per-domain server config.
- **Hostinger directly:** in hPanel add the domain (or "park"/alias it onto the portal site), then issue a free SSL (Let's Encrypt) for it. Point its document root at the same `dist/` as the portal. Because the portal is a SPA, the existing `.htaccess` (rewrite all to `index.html`) already handles deep links.

### 4. Verify
- `https://portal.thesmilexperts.com` loads and shows **their** logo/colors on the login screen.
- `curl "https://app.crea8ivmedia.com/api/v1/public/branding?domain=portal.thesmilexperts.com"` returns `matched:true` with their brand.

## Deploying the three pieces

### Marketing site → `crea8ivmedia.com/patientflow`
Upload the **contents** of `website/` into a `patientflow/` folder in the agency site's document root. All links are relative, so they resolve under the subpath. Ensure visitors hit `/patientflow/` (with trailing slash) so `index.html` loads — add a redirect if needed.

### Portal → `clinic.crea8ivmedia.com` (+ clinic domains)
`npm run build` → upload `dist/`. `.env.production` already points the build at `https://app.crea8ivmedia.com/api/v1`. The `.htaccess` SPA rewrite must be present so `/dashboard`, `/admin`, `/reset-password` etc. work on refresh.

### API → `app.crea8ivmedia.com`
Upload `backend-php/`. In its `.env` set:

```
APP_ENV=production
DB_DRIVER=mysql
DB_HOST=... DB_NAME=... DB_USER=... DB_PASS=...
JWT_SECRET=...            # freshly generated, never the old committed value
JWT_REFRESH_SECRET=...
CLIENT_URL=https://clinic.crea8ivmedia.com
WEBSITE_URL=https://crea8ivmedia.com
```

Run the migrations in order (phpMyAdmin):
`2026-06-10-auth-security.sql`, `2026-06-10-tenant-lifecycle.sql`.
Create the superadmin: `php scripts/setup-superadmin.php you@crea8ivmedia.com '<strong-pass>'`.
Add the daily cron: `php /path/to/backend-php/cron/subscription-check.php`.

## Notes & limits
- A clinic's data is keyed to its `clinicId`, never to its domain — changing or removing a domain never touches their data.
- The legacy `api.thesmilexperts.com` / `portal.thesmilexperts.com` keep working: set Smile Xperts' `customDomain` to `portal.thesmilexperts.com` and CORS + branding resolve it automatically.
- SSL is the one genuinely per-domain step. Cloudflare for SaaS removes the manual cert work entirely and is the recommended path past ~5 clinics.
