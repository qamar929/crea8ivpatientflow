# The Smile Xperts Hostinger Deployment

Live domains:

- Portal: `https://portal.thesmilexperts.com`
- API: `https://api.thesmilexperts.com`

This project deploys as two separate uploads:

- `portal-thesmilexperts-hostinger.zip` contains the built React/Vite portal.
- `api-thesmilexperts-hostinger.zip` contains the PHP API.

## Portal Upload

Upload and extract `portal-thesmilexperts-hostinger.zip` into the document root for:

```text
portal.thesmilexperts.com
```

The extracted folder must contain:

```text
.htaccess
index.html
assets/
icon.svg
manifest.webmanifest
sw.js
```

The portal build is configured with:

```env
VITE_API_URL=https://api.thesmilexperts.com/api/v1
```

The `.htaccess` file is required so refreshes on `/dashboard`, `/patients`, `/appointments`, `/invoices`, and other React routes keep working.

## API Upload

Upload and extract `api-thesmilexperts-hostinger.zip` into the document root for:

```text
api.thesmilexperts.com
```

The extracted folder must contain:

```text
.htaccess
index.php
config.php
schema.sql
hostinger-go-live.sql
controllers/
services/
migrations/
uploads/
```

The API `.htaccess` rewrites requests to `index.php`, so URLs like this work:

```text
https://api.thesmilexperts.com/api/v1/health
```

## Database Setup

In Hostinger hPanel/phpMyAdmin:

1. Create the MySQL database and user.
2. Confirm the production `.env` matches the database credentials:
   - DB name: `u700603111_thesmilexperts`
   - DB user: `u700603111_thesmilexperts`
   - DB password: use the fresh hPanel password, not any value previously committed to git.
3. Import `schema.sql`.
4. Import these MySQL migration files from `migrations/`:
   - `2026-06-02-logo-branding.sql`
   - `2026-06-02-public-site.sql`
   - `2026-06-02-whatsapp-center.sql`
   - `2026-06-02-whatsapp-connectivity.sql`
   - `2026-06-02-whatsapp-automation-log.sql`
5. Import `hostinger-go-live.sql`.

Important: `hostinger-go-live.sql` clears demo/old operational data. Run it only when you want the live database reset for The Smile Xperts.

## Default Logins

Change these passwords after first login:

```text
Owner:     owner@thesmilexperts.com / owner123
Reception: reception@thesmilexperts.com / reception123
Staff:     staff@thesmilexperts.com / staff123
```

## Go-Live Checks

After SSL is active on both subdomains:

1. Open `https://api.thesmilexperts.com/api/v1/health`.
2. Open `https://portal.thesmilexperts.com/login`.
3. Log in as owner.
4. Check dashboard, patients, appointments, services, staff, branches, invoices, public site, WhatsApp center, AI hub, Meta leads, and import center.
5. Open `https://portal.thesmilexperts.com/public`.

## Notes

- Do not upload `src/`, `node_modules/`, or the raw React project to the portal subdomain.
- Do not upload the old Node `backend/` folder for the API. The live API package is `backend-php`.
- Keep PHP version at 8.1+ if Hostinger lets you choose.
- Keep both subdomains on HTTPS for login, PWA install, media uploads, and API security.
