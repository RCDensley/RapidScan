# RapidScan - Development Progress

**Last updated:** 2026-04-30
**Current phase:** Phase 3 — Scan Engine
**Next issue:** #14

---

## Completed Issues

| Issue | Title | Date |
| --- | --- | --- |
| Setup | Repo initialised, CLAUDE.md, ISSUES.md (30 issues), docs/progress.md, all GitHub issues created with labels and tests | 2026-04-29 |
| #1 | Initialise Azure SWA project structure | 2026-04-29 |
| #2 | Provision Azure SQL and apply schema | 2026-04-29 |
| #3 | Projects CRUD API | 2026-04-29 |
| #4 | UI/UX design and component system | 2026-04-29 |
| #5 | Projects list, create, and detail page shell | 2026-04-29 |
| #6 | Zip upload ingestion | 2026-04-29 |
| #7 | Local directory scan ingestion | 2026-04-29 |
| #8 | GitHub repo ingestion | 2026-04-29 |
| #9 | Heavy scan AI prompt design | 2026-04-29 |
| #10 | Dependency upsert logic | 2026-04-29 |
| #11 | Scan orchestration loop | 2026-04-29 |
| #12 | Orphan detection pass | 2026-04-29 |
| #13 | Manifest API | 2026-04-30 |

---

## In Progress

None — ready to begin Issue #13.

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
| #5 | `@tailwindcss/vite` is ESM-only; the project package.json must include `"type": "module"` or the Vite config bundler step fails at build time. |
| #5 | The Design_Spec folder (added by user) is the authoritative reference for implementation — it takes precedence over docs/design/DESIGN_SPEC.md as the visual source of truth. Always check for reference files before starting a UI issue. |
| #5 | CSS class-based component system (Design_Spec/styles.css) coexists fine with Tailwind v4 alongside it — no conflicts, use the named classes for components and Tailwind only for one-off layout utilities if needed. |
| #6 | `unzipper.Extract({ path })` fires 'finish'/'close' before all disk writes complete — use `unzipper.Open.file()` + per-entry `stream().pipe(createWriteStream())` with individual 'finish' awaits instead. |
| #6 | Azure SQL serverless tier can be unavailable on cold start; retry with a longer Connection Timeout (60s) and add the dev machine IP to the SQL firewall (resource group is rg-crashcam, server is crashcam). |
| #6 | `busboy` is already present as a transitive dep of multer, but must be listed in api/package.json explicitly so `@types/busboy` resolves correctly. |
| #7 | `func start` invoked directly bypasses `prestart: npm run build` — always run `npm run build` before restarting the host after TypeScript edits, or use `npm start` instead. |
| #7 | A stale `func` process can hold port 7071 even after `Stop-Process -Name "func"` if the process was started under a different name. Use `netstat -ano \| findstr :7071` to find and kill the actual PID. |
| #8 | GitHub ingestion uses a stable per-project tempDir (`os.tmpdir()/rapidscan/{id}`) rather than a timestamped one, so the scan engine (Issue #11) can locate files without needing the path stored anywhere. The dir is cleared and rewritten on each ingest call. |
| #8 | GitHub contents API only works for files ≤1 MB — safe here because `isExcluded` already filters those out using the tree API's size field before any content fetch. |
| #9 | Azure AI Foundry Responses API (`/openai/responses`) uses `input` (not `messages`) and `max_output_tokens` (not `max_tokens`). Auth header is `api-key`, not `Authorization: Bearer`. |
| #9 | The Foundry non-streaming response `output` array includes a `reasoning` item before the `message` item when using a reasoning model (gpt-5.4-pro). Must find by `type === 'message'`, not `output[0]`. |
| #9 | `func start` runs from the `api/` directory, so file paths passed to the debug endpoint resolve relative to there (e.g. `package.json` not `api/package.json`). |
| #10 | Jest 30 renamed `--testPathPattern` to `--testPathPatterns` (plural). The GitHub issue test command uses the old name and will error — use `npm test -- --testPathPatterns=upsert` instead. |
| #10 | ts-jest 29.x supports Jest 30.x via peer dependency range `^29.0.0 \|\| ^30.0.0` — no version downgrade needed. |
| #10 | The mssql fluent API (`pool.request().input(...).query(...)`) mocks cleanly with `{ input: jest.fn().mockReturnThis(), query: mockQueue }` — a single shared mockRequest per pool.request() call works because each SQL operation reads the next queued `mockResolvedValueOnce` response. |
| #8 | Sequential per-file content fetches scale to ~1,000 files within the Azure Functions default 5-min timeout (assuming ~200 ms/call). Repos significantly larger than that may time out. |
| #11 | Azure Functions v4 Node.js worker stays alive after returning an HTTP response in local dev (`func start`), so `setImmediate` fire-and-forget works for the background scan loop. In production, the host may kill the worker — Durable Functions would be needed for guaranteed execution. |
| #11 | The scan engine needs a base directory to resolve relative `file_manifests.file_path` values. Added `source_path NVARCHAR(1000) NULL` to the `projects` table; all three ingest handlers now save it after a successful ingest. Run `ALTER TABLE projects ADD source_path NVARCHAR(1000) NULL` on existing databases. |
| #11 | Zip ingestion now uses the same stable tempDir pattern as GitHub ingestion (`os.tmpdir()/rapidscan/{id}`), clearing and re-extracting on each ingest. The old timestamped-and-deleted pattern was incompatible with the scan engine needing to read files after the ingest response. |
| #11 | DB progress updates fire on every file (not every N files) — acceptable because the per-file cost is dominated by the ~2–5 s AI round-trip. Revisit if files with no AI content (binary, skipped) are ever added to the loop. |
| #12 | Orphan detection is a single AI call (not per-file), so `files_total`/`files_processed` are omitted from its `scan_history` row — both columns are nullable in the schema. |
| #12 | Low-confidence orphan findings are filtered out in code before upsert (only `high`/`medium` pass through), rather than relying solely on the prompt instruction. Defence-in-depth. |
| #12 | RAR support was decided in #5 but never wired up — `unzipper` throws silently on RAR magic bytes, producing a 500. Fixed by adding `node-unrar-js` (WASM-based, no system deps) with magic-byte detection to dispatch ZIP vs RAR. |
| #12 | `lucide-react` no longer exports `Github` — removed at some point. Use `GitBranch` as the closest replacement for source-control context. |
| #12 | GPT-5.4-pro (reasoning model) takes ~60s per file for heavy scan analysis. 25 files ≈ 25–40 minutes end-to-end. Progress bar shows 0 until the first AI call returns — this is expected, not a bug. |
| #12 | SQL queries cannot be run directly in PowerShell (`SELECT` is parsed as `Select-Object`). Use Azure Data Studio or `sqlcmd` for ad-hoc DB checks. |
| #13 | The MSI-installed Azure Functions Core Tools (v4.9.0) fails with "Could not load file or assembly 'Yarp.ReverseProxy, Version=2.0.1.0'" due to a version mismatch between the installed DLL (June 2023) and what the binary expects. Workaround: install `azure-functions-core-tools@4` as a local devDependency and change the `start` script to `node node_modules/azure-functions-core-tools/lib/main.js start` — this uses the local bin with its own matching Yarp DLL. |
| #13 | `getManifest` was previously returning `file_manifests` rows (the ingested file list). Issue #13 repurposed the route to return `dependencies` grouped by category with reference counts — the file-manifest data remains accessible via the `file_manifests` table but is no longer exposed via API (not needed by any frontend issue). |

---

## Decisions Made

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-04-29 | UI/UX Design added as Issue #4, shifting old #4–#29 to #5–#30 (30 issues total) | Frontend issues need agreed design before implementation begins |
| 2026-04-29 | Testing approach: `Invoke-WebRequest` (PowerShell) for backend, manual steps for frontend | User runs tests from PowerShell |
| 2026-04-29 | Component library: shadcn/ui + Tailwind CSS v4 | Fully customisable tokens, dark mode first-class, Radix primitives, React + Vite + TS exact fit |
| 2026-04-29 | No auth in v1 | Internal tool only; Entra ID SSO noted as a future phase item |
| 2026-04-29 | All project-specific env vars prefixed `RAPIDSCAN_` | Avoids collisions with other Azure projects sharing the same shell |
| 2026-04-29 | CSS implementation follows Design_Spec/ reference files (not just docs/design/DESIGN_SPEC.md) | User provided working reference implementation with exact look/feel; sidebar always present, CSS class system, CSS robot animation |
| 2026-04-29 | RAR archive support added alongside ZIP | User confirmed need during #5 testing; same `input_type: 'zip'` used at API level since both are archives |
| 2026-04-30 | RAR extraction implemented via `node-unrar-js` | Patch applied during #12 testing when upload of a real RAR file hit a 500. Magic-byte detection dispatches to ZIP or RAR extractor. |

---

## Forward Changes Log

| Date | Issue worked | Forward change made | Issues updated |
| --- | --- | --- | --- |
| 2026-04-29 | #1 | All project env vars prefixed `RAPIDSCAN_` (e.g. `RAPIDSCAN_SQL_CONNECTION_STRING`) | #2, #6, #7, #8, #9 |
| 2026-04-29 | #5 | Settings tab UI shell fully implemented (all 5 sections: GitHub connection, scan config, issue creation, scoring weights, scoring explanation). API wiring, PAT validation, and save/reset functionality still required. | #25 — remove UI layout work from scope, focus remaining work on `PATCH /api/projects/:id/settings` integration and GitHub PAT test button |
