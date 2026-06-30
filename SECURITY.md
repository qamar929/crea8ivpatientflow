# Security Policy

Crea8iv PatientFlow handles clinic and patient data, so security is a first-class concern. This document covers how to report issues, the controls in place, and known items an auditor should be aware of.

## Reporting a Vulnerability

**Please do not open public GitHub issues for security problems.**

Report privately to the maintainers (Crea8iv Media) with:
- A description and impact assessment,
- Steps to reproduce or proof of concept,
- Affected component(s) and version/commit.

You can expect an acknowledgement and a remediation plan. Please allow reasonable time to fix before any disclosure.

## Security Controls in Place

| Area | Control |
| --- | --- |
| **Authentication** | JWT HS256 verified with constant-time `hash_equals` (no algorithm-confusion); short-lived access tokens + rotating refresh tokens stored in `RefreshToken`. |
| **Passwords** | bcrypt, cost 12. |
| **Throttling** | Login attempts limited per email and per IP (`LOGIN_MAX_ATTEMPTS_*`); password-reset links expire (`PASSWORD_RESET_TTL`). |
| **Authorization** | Per-route guards (`false` / `'auth'` / `true` / `'admin'` / role array) + per-tenant data isolation by `clinicId` + package-level API gating (`require_package_feature`). |
| **Secrets at rest** | Stored third-party AI keys encrypted with AES-256-CBC (key derived from `JWT_SECRET`). |
| **Transport & headers** | HSTS, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, Referrer-Policy, CSP; CORS allowlist via `cors_origin_allowed()`. |
| **SQL** | PDO prepared statements throughout — no string-interpolated SQL. |
| **Audit logging** | Sensitive actions (deletes, refunds, impersonation, package changes) recorded in `AuditLog`. |
| **Secret hygiene** | Only `.env.example` templates are tracked; `.env` / `.env.production` are gitignored. |

## Secrets Management

- All secrets live in environment files (`.env`, `backend-php/.env`) that are **never committed**.
- Generate JWT secrets with: `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`.
- Rotate `JWT_SECRET` / `JWT_REFRESH_SECRET` if compromise is suspected (note: rotating `JWT_SECRET` invalidates AES-encrypted AI keys and active sessions).

## Known Items / Hardening Backlog

These are **disclosed for transparency** to an external auditor. None are silently changed by the documentation pass.

1. **Legacy dev database tracked in git history.** `backend/prisma/dev.db` (SQLite) is tracked and present in history; it may contain non-production sample data.
   - *Recommendation:* after confirming no production PHI is present, remove it from tracking (`git rm --cached`) and scrub it from history (e.g. `git filter-repo`) in a dedicated, coordinated change. Not done here because history rewriting is destructive and out of scope for a docs pass.
2. **No automated security testing / dependency scanning** yet.
   - *Recommendation:* add dependency audit (`npm audit`, Composer audit if Composer is introduced) and a SAST step.
3. **Tokens stored in `localStorage`** on the client (standard for this SPA).
   - *Note:* mitigated by short access-token TTL and refresh rotation; consider `httpOnly` cookies if the threat model requires it.
4. **Manual deployment** (no signed/automated pipeline).
   - *Recommendation:* introduce CI/CD with environment protection.
5. **`sslProvider.php` Cloudflare path is a stub** and must remain disabled (`SSL_PROVIDER=manual`).

## Supported Versions

This is a single continuously-deployed production application; security fixes are applied to `main` and deployed. There is no separate LTS branch.

## Data Handling Notes

- Patient uploads live in `backend-php/uploads/` (gitignored) — never commit them.
- Database backups are produced as gzipped dumps in the server-side `pf-safe/` safety net; treat them as sensitive.
