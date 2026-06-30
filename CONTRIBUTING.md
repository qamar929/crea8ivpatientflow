# Contributing to Crea8iv PatientFlow

Thank you for helping improve PatientFlow. This guide explains how to set up, make changes, and submit them. It applies to internal contributors and any authorized external reviewers.

> This is **proprietary software** (see [LICENSE](LICENSE)). Contributions are accepted only from authorized contributors.

## Getting Started

1. Read the [README](README.md) and [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md).
2. Follow [Installation](README.md#installation) to run the frontend and PHP API locally.
3. Use the SQLite dev configuration (`DB_DRIVER=sqlite`) so you never touch production data.

## Branching & Workflow

- Create a **feature branch** off `main`: `feature/<short-name>` or `fix/<short-name>`.
- Keep changes focused — one logical concern per branch/PR.
- Open a Pull Request against `main` with a clear description and screenshots for UI changes.
- Do **not** push directly to `main` for non-trivial work.

## Commit Messages

- **Imperative mood, scoped subject:** `Invoices: show payment details on all statuses`.
- Explain the *why* in the body when the change isn't obvious.
- Group related edits into a single commit; avoid noise commits.
- AI-assisted commits include a `Co-Authored-By:` trailer.

## Coding Standards

**General**
- Match the style of the file you're editing (naming, indentation, comment density).
- Don't reformat unrelated code in a feature PR.
- No commented-out code, no debug `console.log` / `var_dump` / `print_r` in committed code. (`console.error` in catch blocks is fine.)

**Frontend (React)**
- Functional components and hooks. Tailwind for styling.
- Read tenant state from `ClinicContext`; never hardcode clinic data.
- Gate new modules through `src/config/roles.js` (`ROLE_ACCESS`) **and** the sidebar feature map.
- Keep `src/config/api.js` as the single fetch/token wrapper.

**Backend (PHP)**
- Add an API endpoint as one row in the route table in `backend-php/index.php`.
- Put logic in a controller; share cross-cutting code via a service.
- **Always scope tenant queries by `clinicId`** (`$user['clinicId']`). Use prepared statements (PDO) — never string-interpolate SQL.
- Run `php -l` on every changed PHP file before committing.
- Write idempotent migrations in `backend-php/migrations/`.

## Security Rules (non-negotiable)

- Never commit secrets. Only `.env.example` templates belong in git.
- Never weaken auth guards, CORS, or tenant scoping to "make something work."
- Validate and sanitize all input; rely on PDO parameter binding.
- Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## Testing & Verification

There is currently **no automated test suite**. Until one exists:
- Smoke-test the screens/endpoints you touched.
- Verify against a **non-production tenant** (the Demo clinic), never live patient data.
- For PDFs, hard-refresh to avoid cached artifacts.
- For backend changes, confirm `php -l` passes and the affected routes return expected JSON.

Adding automated tests is welcome and tracked on the [roadmap](README.md#future-roadmap).

## Pull Request Checklist

- [ ] Scoped to one concern; no unrelated reformatting.
- [ ] No secrets, no debug code, no commented-out blocks.
- [ ] Tenant queries scoped by `clinicId`; PDO prepared statements used.
- [ ] Roles/packages respected on both frontend and backend.
- [ ] `php -l` passes for changed PHP; frontend builds (`npm run build`).
- [ ] Docs updated if behavior, env vars, routes, or schema changed.
- [ ] Manually verified on a non-production tenant.
