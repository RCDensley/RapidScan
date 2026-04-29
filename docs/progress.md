# RapidScan - Development Progress

**Last updated:** 2026-04-29
**Current phase:** Phase 1 — Foundation
**Next issue:** #5 — Projects list page (UI)

---

## Completed Issues

| Issue | Title | Date |
| --- | --- | --- |
| Setup | Repo initialised, CLAUDE.md, ISSUES.md (30 issues), docs/progress.md, all GitHub issues created with labels and tests | 2026-04-29 |
| #1 | Initialise Azure SWA project structure | 2026-04-29 |
| #2 | Provision Azure SQL and apply schema | 2026-04-29 |
| #3 | Projects CRUD API | 2026-04-29 |
| #4 | UI/UX design and component system | 2026-04-29 |

---

## In Progress

None — ready to begin Issue #5.

---

## Lessons Learned

| Issue | Lesson |
| --- | --- |
| #1 | `multer@^1.4.5` doesn't resolve — the last 1.x release is `1.4.5-lts.1` (prerelease tag breaks semver range). Pinned explicitly. |
| #1 | Add `-UseBasicParsing` to all `Invoke-WebRequest` test commands to suppress PowerShell's script-execution security prompt. |
| #2 | `tasks.dependency_id ON DELETE SET NULL` causes a multiple cascade paths error in Azure SQL. Fixed to `ON DELETE NO ACTION` — safe because the project cascade already deletes all tasks before the dependency FK is evaluated. |
| #2 | `Authentication="Active Directory Default"` in a connection string is .NET-specific and not supported by mssql/tedious. Use contained database users with SQL auth (`User Id` / `Password`) for local dev. |
| #2 | `func start` will overwrite and encrypt `local.settings.json` if the JSON is invalid when it starts — always validate JSON before running. |
| #3 | `new sql.Transaction(pool)` is the correct v4 pattern for transactions in mssql — `pool.transaction()` is not a function. |
| #3 | A stale `func` process from a prior session will hold port 7071 and silently return 404 on all routes. Kill it with `Stop-Process` before restarting. |
| #4 | Side panel chosen as split-view (not drawer) to preserve list context while viewing details. Bottom sheet on narrow viewports. |
| #4 | Lottie chosen for scan animation — higher quality playful motion vs CSS; `scan-animation.json` to be committed to `src/assets/` when designed. CSS spinner fallback documented in spec. |
| #4 | Sidebar expand triggered on hover (not click) with 100ms delay — prevents flicker on cursor pass-through without needing a click toggle. |

---

## Decisions Made

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-04-29 | UI/UX Design added as Issue #4, shifting old #4–#29 to #5–#30 (30 issues total) | Frontend issues need agreed design before implementation begins |
| 2026-04-29 | Testing approach: `Invoke-WebRequest` (PowerShell) for backend, manual steps for frontend | User runs tests from PowerShell |
| 2026-04-29 | Component library: shadcn/ui + Tailwind CSS v4 | Fully customisable tokens, dark mode first-class, Radix primitives, React + Vite + TS exact fit |
| 2026-04-29 | No auth in v1 | Internal tool only; Entra ID SSO noted as a future phase item |
| 2026-04-29 | All project-specific env vars prefixed `RAPIDSCAN_` | Avoids collisions with other Azure projects sharing the same shell |

---

## Forward Changes Log

| Date | Issue worked | Forward change made | Issues updated |
| --- | --- | --- | --- |
| 2026-04-29 | #1 | All project env vars prefixed `RAPIDSCAN_` (e.g. `RAPIDSCAN_SQL_CONNECTION_STRING`) | #2, #6, #7, #8, #9 |
