# Changelog

All notable changes to Crea8iv PatientFlow are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Because the platform is continuously deployed to a single production environment, dates reflect when changes landed on `main`.

## [Unreleased]

### Added
- Project documentation suite for external audit: `README.md`, `PROJECT_DOCUMENTATION.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, and a proprietary `LICENSE`.
- `docs/` folder consolidating the deployment runbook, white-label domain playbook, and original architecture plan.
- `TENANT_DOMAIN_SUFFIX` documented in `backend-php/.env.example`.

### Changed
- `.gitignore` hardened (editor/IDE/coverage/log artifacts).

> Documentation/organization only — no application behavior was changed.

## [1.0.0] — 2026-06-30

The platform's first consolidated production release. Highlights by area:

### Billing & Invoices
- Clinic **bank/payment account details** on every invoice (PDF + on-screen), owner-editable in Settings; stamp/signature upload; professional payment-details layout.
- Invoice PDFs are no longer cached (server `no-store` + client cache-busting) so they always reflect the latest details across all statuses.

### Tenancy & Portal URLs
- **Path-based clinic portals**: every clinic reachable at `/clinic/<slug>` with valid SSL and zero per-clinic setup (`src/config/portalPath.js`, branding by `?slug=`).
- Custom-domain and white-label support retained (`portal.<clinic>.com`).
- Fixed the "Subscription Inactive" page refresh loop / unclickable state (terminal screens no longer trigger tenant API redirects).

### Clinical
- Multi-tooth **FDI tooth picker** (comma-separated storage, backward compatible).
- Per-procedure **cost** with permission-gated visibility.
- Treatment plans and per-procedure details.

### Financials
- Expenses, expense categories, procedure costs, and profit/margin (P&L) reporting.

### Platform & Packages
- Package-based feature access (**Starter** / **AppointmentFlow AI**) as presets over feature flags, with super-admin assignment and centralized API gating.
- Super-admin console: tenant management, impersonation ("manage clinic"), subscription controls, shared platform AI key, marketing-site branding.

### AI & Growth
- AI Receptionist foundation (per-clinic persona, knowledge, memory).
- WhatsApp Center (messaging, automation, reply suggestions).
- Marketing campaigns, Meta leads, and bulk imports (AI plan).

### Operations
- Lab management, inventory, gallery, feedback, multi-branch, reports.
- "What's New" feature-update notifications for owners/managers.
- Industry templates (terminology per vertical, healthcare default).

### Security & Hardening
- JWT HS256 with `hash_equals`, bcrypt cost 12, refresh-token rotation.
- AES-256-CBC encryption for stored AI keys; security headers; CORS allowlist.
- Audit logging for sensitive actions; receptionist-role hardening.
- Server-side `pf-safe` self-heal safety net + periodic DB dumps.

### Marketing
- Redesigned marketing website; pricing aligned to the two packages.

---

[Unreleased]: https://github.com/qamar929/crea8ivpatientflow/compare/main...HEAD
[1.0.0]: https://github.com/qamar929/crea8ivpatientflow/releases/tag/v1.0.0
