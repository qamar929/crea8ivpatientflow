# Crea8iv PatientFlow — Project Documentation

> Deep technical reference for developers and auditors. For a quick start, see [README.md](README.md).
> This document describes the codebase **as it currently exists**. Where intent was inferred rather than stated in code, it is marked **(Assumption)**.

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Folder Explanations](#folder-explanations)
3. [Module Descriptions](#module-descriptions)
4. [Request Flow](#request-flow)
5. [Authentication Flow](#authentication-flow)
6. [Multi-Tenancy](#multi-tenancy)
7. [Database Relationships](#database-relationships)
8. [Business Logic Overview](#business-logic-overview)
9. [Deployment Process](#deployment-process)
10. [Legacy Backend](#legacy-backend)
11. [Development Guidelines](#development-guidelines)
12. [Documented Assumptions](#documented-assumptions)

---

## High-Level Architecture

Crea8iv PatientFlow is a **two-part system** plus a static marketing site:

1. **Frontend** — a React 18 single-page application (`src/`). Built with Vite into static assets and served by the web server. It is a pure client: it holds no secrets, talks to the API over HTTPS with a JWT, and renders the clinic portal and the super-admin console.

2. **Backend** — a custom PHP 8.3 application (`backend-php/`). A single **front controller** (`index.php`) handles every request: it sets CORS headers, resolves the JWT, matches the URL against a **route table**, runs the route's **guard**, and dispatches to a **controller** method. Controllers use **services** for cross-cutting logic and **PDO** for the database.

3. **Marketing website** — static HTML/CSS/JS (`website/`), independent of the app.

```
  React SPA  ──HTTPS/JSON+JWT──►  index.php (front controller)
                                     │  CORS → JWT → route match → guard → dispatch
                                     ▼
                                 Controller  ──►  Service(s)  ──►  PDO  ──►  MySQL
```

Design principles observed in the code:
- **No framework on the backend** — a small, explicit router keeps the dependency surface minimal.
- **One source of truth for routing** — the route table in `index.php`.
- **Defense in depth** — both the frontend (nav/route hiding) and backend (guards) enforce roles and packages.
- **Tenant isolation in the data layer** — every tenant query is scoped by `clinicId`.

---

## Folder Explanations

### `src/` — React clinic portal
| Path | Responsibility |
| --- | --- |
| `pages/` | Route-level screens (one file per major feature: `Dashboard.jsx`, `Invoices.jsx`, `Appointments.jsx`, …). |
| `pages/admin/` | Super-admin console screens (`AdminTenants.jsx`, `AdminPlatform.jsx`, …). |
| `components/ui/` | Generic primitives (Button, Modal, Badge, ColorPicker, PatientSearchSelect). |
| `components/layout/` | App shell — `LayoutNew`, `SidebarNew` (nav + feature gating). |
| `components/clinical/`, `charts/`, `dashboard/`, `settings/`, `branding/` | Feature-specific components. |
| `context/` | `ClinicContext` (tenant branding/features/hydration) and `ThemeContext` (light/dark). |
| `config/` | `api.js` (fetch wrapper + token handling), `roles.js` (`ROLE_ACCESS`), `portalPath.js` (slug→basename routing), `requiredSettings.js`. |
| `services/` | Thin API-call helpers. |
| `utils/` | Pure helpers (branding metadata sync, formatting). |
| `data/` | Static lookup data. |

### `backend-php/` — production API
| Path | Responsibility |
| --- | --- |
| `index.php` | Front controller: CORS, auth resolution, **route table**, guard dispatch. |
| `config.php` | Reads env into constants (DB, JWT, URLs, `TENANT_DOMAIN_SUFFIX`, SMTP, …). |
| `db.php` | `DB::getConnection()` — a single PDO connection (MySQL or SQLite). |
| `helpers.php` | JWT sign/verify, tenancy helpers (`find_clinic_by_domain`, `default_clinic_subdomain`), JSON responders, UUIDs, audit logging. |
| `controllers/` | 31 controllers, one per domain area. Autoloaded by class name. |
| `services/` | 11 services — `pdfService`, `packageService`, `tenantFeatureService`, `sslProvider`, etc. |
| `migrations/` | Idempotent SQL migrations. |
| `cron/` | `run-automations.php` — appointment reminders/recalls (invoked hourly). |
| `libs/` | Vendored FPDF + core fonts for invoice PDFs. |
| `schema.sql` | Canonical schema (26 tables). |
| `scripts/` | One-off maintenance/data scripts. |
| `uploads/`, `logs/`, `backups/` | Runtime data — **gitignored**. |

### Other top-level folders
| Path | Responsibility |
| --- | --- |
| `website/` | Static marketing site. |
| `backend/` | **Legacy** Node.js/Prisma backend — reference only, not deployed. See [Legacy Backend](#legacy-backend). |
| `public/` | Static assets bundled by Vite. |
| `docs/` | Supplementary docs (deployment runbook, white-label domains, original plan). |

---

## Module Descriptions

Each backend controller maps to a feature area. The frontend page of the same name consumes it.

| Controller | Responsibility |
| --- | --- |
| `AuthController` | Login, token refresh, password reset, session issuance. |
| `ClientController` | Patient records, documents, search. |
| `AppointmentController` | Scheduling, conflicts, today's list, reschedule. |
| `InvoiceController` | Invoices, PDF generation (via `pdfService`), refunds, balances. |
| `TreatmentController` / treatment-plan | Clinical procedures, per-procedure details and costs, treatment plans. |
| `FinancialController` / `ExpenseController` | Expenses, procedure costs, profit/margin reporting. |
| `InventoryController` | Stock items and transactions. |
| `ServiceController` | Service catalog and pricing. |
| `StaffController` / `UserController` | Staff records and user accounts/roles. |
| `PackageController` | Treatment packages and client package assignments. |
| `PublicSiteController` | Clinic settings, public branding (by domain or `?slug=`). |
| `WhatsApp*` controllers | Messaging, automation, reply suggestions *(AI plan)*. |
| `AIHubController` / `AIReceptionistController` | AI overview, persona, knowledge, memory *(AI plan)*. |
| `MarketingController` / `Campaign*` / Meta / Import | Campaigns, lead capture, bulk imports *(AI plan)*. |
| `AdminController` | Platform: tenants, impersonation, packages, platform settings *(super-admin)*. |
| `DomainController` | Custom-domain assignment and verification. |
| `FeedbackController`, `GalleryController`, `NotificationController`, `BranchController`, `LabController`, `SupportController` | Their respective feature areas. |

Key **services**:
- `pdfService.php` — renders invoice PDFs (FPDF), including the clinic payment-details block and stamp/signature.
- `packageService.php` — defines the Starter / AppointmentFlow AI packages as presets over feature flags.
- `tenantFeatureService.php` — reads/writes per-clinic feature flags.
- `sslProvider.php` — SSL provisioning abstraction; the Cloudflare path is a **stub** (not enabled).

---

## Request Flow

Every request enters through `backend-php/index.php`:

```
1. CORS         cors_origin_allowed($origin) → set Access-Control-* headers
                (OPTIONS preflight short-circuits here)
2. Auth resolve check_auth() decodes the Bearer JWT into $user (or null)
3. Route match  loop the route table; preg_match the PATTERN against the path
                (the row: [METHOD, PATTERN, Controller, action, guard])
4. Guard        based on the 5th element:
                  false              → public, no checks
                  'auth'             → must be authenticated
                  'admin'            → require_superadmin($user)
                  'client'           → require_client_portal($user)
                  true               → require_active_tenant + require_package_feature
                  ['owner','manager']→ require_clinic_role + require_package_feature
5. Dispatch     instantiate the controller, call the action with ($input, $user, …captures)
6. Respond      controller emits JSON via send_json()/send_error()
                (no route matched → 404 "Route not found")
```

This logic lives in `index.php` around lines 490–542. The guard helpers (`check_auth`, `require_active_tenant`, `require_superadmin`, `require_clinic_role`, `require_package_feature`, `require_client_portal`) are defined earlier in the same file.

---

## Authentication Flow

```
            ┌──────────────────────────── LOGIN ────────────────────────────┐
 Browser ──►│ POST /auth/login {email,password}                              │
            │   ↳ bcrypt verify (cost 12) + login throttle (per email & IP)  │
            │   ↳ issue: accessToken (JWT HS256, short TTL)                   │
            │            refreshToken (JWT, rotating, stored in RefreshToken) │
            └───────────────────────────────────────────────────────────────┘
 Browser stores tokens (localStorage) and sends:  Authorization: Bearer <access>

            ┌──────────────────────── AUTHENTICATED ────────────────────────┐
 Browser ──►│ any request → check_auth() verifies signature with hash_equals │
            │   ↳ JWT payload carries: id, clinicId, role, name              │
            │   ↳ guard checks role / tenant / package                       │
            └───────────────────────────────────────────────────────────────┘

            ┌──────────────────────────── REFRESH ──────────────────────────┐
 access     │ POST /auth/refresh {refreshToken}                              │
 expired ──►│   ↳ validate + rotate (old token invalidated, new pair issued) │
            └───────────────────────────────────────────────────────────────┘
```

- **Algorithm:** HS256, verified with constant-time `hash_equals` — no `alg:none` / algorithm-confusion.
- **Passwords:** bcrypt, cost 12.
- **Throttling:** `LOGIN_MAX_ATTEMPTS_EMAIL` / `LOGIN_MAX_ATTEMPTS_IP`; reset links expire after `PASSWORD_RESET_TTL`.
- **Super-admin impersonation:** `AdminController::impersonateTenant` mints a normal owner session for a target clinic so the platform operator can support a clinic; the action is audit-logged.
- **Terminal screens** (`/login`, `/subscription-inactive`, password reset) deliberately **do not** call tenant APIs, preventing redirect loops.

---

## Multi-Tenancy

A **tenant** is a `Clinic` row. Isolation is achieved by:

1. **Token-scoped identity** — the JWT carries `clinicId`; controllers scope every query to `$user['clinicId']`.
2. **Tenant resolution for branding** — the portal is identified by:
   - **Path slug** — `/clinic/<slug>` → `src/config/portalPath.js` computes the router basename and exposes `PORTAL_CLINIC_SLUG`; branding is fetched via `GET /public/branding?slug=<slug>`.
   - **Domain** — custom domains / subdomains resolve via `find_clinic_by_domain()` and `GET /public/branding?domain=<host>`.
3. **Feature/package gating** — `ClinicFeatureSetting` flags (presets applied by `packageService`) decide which modules a clinic sees; `require_package_feature()` enforces it at the API.

> **(Assumption)** The default platform domain suffix is `crea8ivmedia.com` (`TENANT_DOMAIN_SUFFIX`); it is overridable via env so the platform can be rebranded without code changes.

---

## Database Relationships

`Clinic` is the tenancy root. Most tables reference it via `clinicId`.

```
Clinic (tenant root)
├── User                ── RefreshToken
├── ClinicFeatureSetting / PublicSiteConfig / IndustryTemplate   (per-clinic config)
├── Branch
├── Staff
├── Client ─────────────┬── Appointment ── (Service, Staff)
│                       ├── Invoice ── InvoiceProcedureCost
│                       ├── ClientPackage ── Package ── PackageItem
│                       └── TreatmentProcedureDetail
├── Service
├── Expense ── ExpenseCategory
├── InventoryItem ── InventoryTransaction
├── GalleryItem / Feedback / Notification / Campaign
└── AuditLog            (security trail across the tenant)
```

- **`Invoice`** holds totals, status (`paid`/`pending`/`partial`/`refunded`), `amountPaid`, `balanceDue`, and a JSON `items` array; clinic-level bank/payment fields live on `Clinic` and are rendered onto every invoice PDF.
- **`TreatmentProcedureDetail`** stores FDI tooth selection (comma-separated for multi-tooth) and a permission-gated `cost`.
- **`AuditLog`** captures actor, action, entity, and before/after for sensitive operations.

The authoritative DDL is `backend-php/schema.sql`; incremental changes are in `backend-php/migrations/`.

---

## Business Logic Overview

- **Packages as feature presets** — A package (Starter / AppointmentFlow AI) is a named set of the existing `ClinicFeatureSetting` flags. Assigning a package writes the flag preset; nav, routes, and API gates all read those flags, so visibility updates instantly. Adding a package is a one-entry change in `packageService.php`.
- **Invoices** — Totals are computed from line items plus discount/tax/previous balance; status derives from `amountPaid` vs `grandTotal`. PDFs always reflect the latest clinic payment details (responses are `no-store`; the client cache-busts).
- **Appointments & automations** — Reminders/recalls run from `cron/run-automations.php` on an hourly schedule.
- **Industry templates** — `IndustryTemplate` swaps terminology (e.g. *patient* → *client*) across the portal per vertical, defaulting to healthcare.

---

## Deployment Process

Production = **Hostinger shared hosting (LiteSpeed)**, manual deploys over SSH. Full runbook: [docs/HOSTINGER_DEPLOYMENT.md](docs/HOSTINGER_DEPLOYMENT.md).

```
Frontend (built twice):
  npm run build -- --base=/clinic/   → rsync dist/ → public_html/clinic/
  npm run build -- --base=/          → rsync dist/ → <clinic-domain>/public_html/portal/

Backend:
  scp/rsync backend-php/ → public_html/app/   (exclude .env, uploads/, logs/, backups/)

Never touched by deploys: the MySQL database.

Safety net:
  pf-safe/ on the server keeps a self-heal copy of app/, clinic/, .htaccess
  + periodic gzipped DB dumps, so an accidental overwrite auto-recovers.
```

**Routing on the server** — `public_html/.htaccess` rewrites `<slug>.<domain>` style and path requests to the SPA / API; `clinic/.htaccess` provides the SPA fallback (`/clinic/... → /clinic/index.html`). Both are part of the safety net.

---

## Legacy Backend

The `backend/` directory contains an **older Node.js + Express + Prisma** implementation of the API. It is **not the production backend** and is **not deployed**. The live system is the PHP application in `backend-php/`.

It is retained because:
- `backend/prisma/schema.prisma` is a useful, readable model of the data relationships.
- `backend/prisma/dev.db` is the SQLite file used by the **local** PHP dev configuration (`DB_DRIVER=sqlite`, `DB_PATH` points here).

> **(Assumption / recommendation for auditors):** Treat `backend/src/**` as historical reference. If the Node backend is confirmed fully retired, it can be removed in a dedicated change — it is intentionally **not** deleted here to avoid disturbing the local dev database path and to keep this pass documentation-only.

---

## Development Guidelines

- **Match the surrounding code.** Naming, comment density, and idioms vary by file age — follow the local style of the file you are editing.
- **Backend:** add a route as a single row in the `index.php` table; put logic in a controller; share cross-cutting code via a service. Always scope tenant queries by `clinicId`. Run `php -l` on changed files.
- **Frontend:** gate new modules through `roles.js` (`ROLE_ACCESS`) and the sidebar feature map; read tenant info from `ClinicContext`, not globals.
- **Migrations:** write idempotent SQL; the app applies several `ensure*Columns` guards at runtime for backward compatibility.
- **No secrets in git.** Only `.env.example` templates are tracked.
- **Documentation-only changes** must not alter behavior; verify by diffing logic, not just running.
- **Testing:** there is currently **no automated test suite**. Until one exists, smoke-test affected screens/endpoints and verify against a non-production tenant (e.g. the Demo clinic).

---

## Documented Assumptions

These were inferred while preparing documentation; **no behavior was changed** to fit them. They are recorded here for auditors.

1. **License is proprietary** (commercial SaaS, © Crea8iv Media). No license file previously existed; a proprietary `LICENSE` was added. Swap it if open-sourcing is intended.
2. **`backend/` (Node/Prisma) is legacy/reference**, superseded by `backend-php/`. Confirmed by the live deployment target (`app/` = PHP) and the maintainer's workflow.
3. **Default platform domain** is `crea8ivmedia.com` via `TENANT_DOMAIN_SUFFIX`.
4. **`backend/prisma/dev.db` is tracked in git history** and may contain non-production sample data. Flagged in [SECURITY.md](SECURITY.md) as a remediation item; not rewritten here because history rewriting is destructive and out of scope for a docs pass.
