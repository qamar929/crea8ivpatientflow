# Crea8iv PatientFlow — Go-Live Runbook

Deploying the three pieces to production on **crea8ivmedia.com**. Follow top to bottom.

| Piece | Lives at | Source |
|---|---|---|
| Marketing site | `crea8ivmedia.com/patientflow` | `website/` (static) |
| Clinic portal | `clinic.crea8ivmedia.com` (+ clinic custom domains) | `dist/` (built) |
| API | `app.crea8ivmedia.com` | `backend-php/` |

One app, one API, one MySQL database. Adding clinics never means new deployments.

---

## 0. Before you touch the server

- [ ] **Rotate the secrets that are in git history.** The old `JWT_SECRET`, `JWT_REFRESH_SECRET`, and the MySQL password (`Thesmilexperts@2026`) were committed earlier — treat them as burned. Fresh JWT secrets are already in `backend-php/.env.production.example`. Set a **new** MySQL password in hPanel.
- [ ] Decide the email sender (Hostinger mailbox `no-reply@crea8ivmedia.com` is simplest).

---

## 1. Database (Hostinger MySQL)

1. In hPanel → MySQL Databases, create the database + user, note the name/user/**new password**.
2. Import the base schema, then the migrations **in this order** (phpMyAdmin → SQL tab):
   1. `backend-php/schema.sql` (only on a fresh DB — skip if the Smile Xperts data already lives there)
   2. `backend-php/migrations/2026-06-10-auth-security.sql`
   3. `backend-php/migrations/2026-06-10-tenant-lifecycle.sql`
   4. `backend-php/migrations/2026-06-11-domain-management.sql`
   - (Plus any earlier WhatsApp/branding migrations if this is a brand-new DB.)
3. Confirm the `Clinic` table now has: `slug, customDomain, status, clinicType, domainStatus, domainToken, domainVerifiedAt, domainLastError, sslStatus`.

---

## 2. API → `app.crea8ivmedia.com`

1. Create the subdomain `app.crea8ivmedia.com` in hPanel; point its document root at an `api/` folder.
2. Upload the contents of `backend-php/` there (`index.php`, `config.php`, `controllers/`, `services/`, `migrations/`, `cron/`, `scripts/`, `uploads/`, `.htaccess`).
3. Create `.env` from `.env.production.example`; fill `DB_*` and `SMTP_*`. The JWT secrets are pre-filled.
4. Make `uploads/` and `logs/` writable (755). **Do not** expose `.env` — the bundled `.htaccess` already denies dotfiles/SQL/logs.
5. Smoke test:
   - `https://app.crea8ivmedia.com/api/v1/health` → `{"status":"ok"}`
   - `curl -X POST .../auth/login` with a known user → returns a token.
6. Create the platform superadmin (SSH, or a one-off script run):
   `php scripts/setup-superadmin.php you@crea8ivmedia.com 'a-strong-12+char-password'`
7. **Cron** (hPanel → Cron Jobs, daily, e.g. 09:00):
   `php /home/USER/domains/app.crea8ivmedia.com/public_html/cron/subscription-check.php`

---

## 3. Portal → `clinic.crea8ivmedia.com`

1. The build is already done with `VITE_API_URL=https://app.crea8ivmedia.com/api/v1` baked in.
   (To rebuild: `npm run build`.)
2. Create subdomain `clinic.crea8ivmedia.com`; upload the **contents of `dist/`** to its root:
   `index.html`, `assets/`, `icon.svg`, `manifest.webmanifest`, `sw.js`, and **`.htaccess`** (the SPA rewrite — required so `/dashboard`, `/admin`, `/reset-password` work on refresh).
3. Smoke test: open `https://clinic.crea8ivmedia.com` → login screen loads, no console/CORS errors.

---

## 4. Marketing → `crea8ivmedia.com/patientflow`

1. Upload the **contents of `website/`** into a `patientflow/` folder under the main site's document root.
2. Visit `https://crea8ivmedia.com/patientflow/` (trailing slash) → home loads.
3. Submit the **Register Clinic** form → confirm a lead appears in the owner portal (Leads).
   (`website/js/site.js` already targets `app.crea8ivmedia.com` in production.)

---

## 5. Email — the one true blocker (verify it works)

Password resets and clinic set-password invites **depend on email**.
- With `SMTP_HOST` set, the API sends via SMTP (STARTTLS:587 or SSL:465 + AUTH LOGIN).
- Test: trigger **Forgot password** for a real address and confirm the email arrives.
- If it doesn't: check `logs/mail.log` (the message is captured there as a fallback) and verify SMTP creds/port. Hostinger SMTP: `smtp.hostinger.com:587`.

---

## 6. Make The Smile Xperts tenant #1

1. In the owner portal → Clinics, confirm The Smile Xperts shows `connected` for `portal.thesmilexperts.com` (the migration set this).
2. Point/keep `portal.thesmilexperts.com` working: ensure its DNS + SSL resolve to the portal (alias in hPanel + Let's Encrypt cert), same as any custom domain (see `WHITELABEL_DOMAINS.md`).
3. The legacy `api.thesmilexperts.com` can stay as an alias of the API during transition, but the build now points at `app.crea8ivmedia.com`.

---

## 7. Production smoke-test checklist

- [ ] `app.crea8ivmedia.com/api/v1/health` ok
- [ ] Superadmin logs in → lands on `/admin`
- [ ] A clinic owner logs in → lands on `/dashboard`, sees only their data
- [ ] Forgot-password email **actually arrives**
- [ ] Public website Register form → lead in owner portal
- [ ] Owner: convert lead → clinic gets invite email → owner sets password → logs in
- [ ] Clinic Settings → Custom Domain: set domain, see DNS instructions, Verify works
- [ ] Suspend a test clinic → its login shows the renewal screen (402)
- [ ] WhatsApp webhook URL (if used) set to `https://app.crea8ivmedia.com/api/v1/whatsapp/webhook`

---

## 8. First-week guardrails

- **Back up nightly** (DB dump + `uploads/`) off-server. This is the next task to build — do it before onboarding real patient data.
- Watch `logs/` for errors (display_errors is OFF in production by design).
- Keep `SSL_PROVIDER=manual` until volume justifies Cloudflare for SaaS; the abstraction means flipping it later needs no portal/app changes.
