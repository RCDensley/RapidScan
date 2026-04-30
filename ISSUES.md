# RapidScan - Build Plan

This file documents the phased GitHub issues for the RapidScan v1 build.

**Total issues:** 30 across 8 phases.  
**Sequencing principle:** every issue can be completed using only what was built in earlier issues. When forward changes are made during implementation, review and update the affected future issues to reflect what changed.

---

## Phase 1 - Foundation

---

### Issue #1 - Initialise Azure SWA project structure

**Labels:** phase-1, setup

**Description:**
Scaffold the full RapidScan project structure as already laid out in the repo. Initialise the React + Vite + TypeScript frontend and the Azure Functions v4 Node.js API. Confirm local dev run with `npm run dev` (frontend) and `func start` (API) working in parallel with the Vite proxy routing `/api/*` to `localhost:7071`.

**Acceptance criteria:**
- Frontend runs on localhost with a placeholder homepage
- API runs locally and responds to a test HTTP GET at `/api/health`
- Vite proxy correctly forwards `/api/*` requests to the Functions host
- `.gitignore` excludes `node_modules`, `dist`, `local.settings.json`, and `uploads/`

**Test:**
Run `func start` in the `api/` directory and `npm run dev` in the root (two separate terminals). Then:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/health" -Method GET
```
Expected: HTTP 200 with a JSON body. Also confirm the Vite dev server loads in a browser at `localhost:5173`.

---

### Issue #2 - Provision Azure SQL and apply schema

**Labels:** phase-1, database

**Description:**
Provision an Azure SQL database for RapidScan. Apply the schema from `database/schema.sql` to create all tables: `projects`, `dependencies`, `dependency_references`, `call_chains`, `scan_history`, `tasks`, and `project_settings`. Confirm local connectivity via `local.settings.json` connection string. Build a reusable SQL connection pool module at `api/src/lib/db.ts`.

**Acceptance criteria:**
- All tables created in Azure SQL with correct columns, constraints, defaults, and indexes
- Cascade delete relationships work correctly (deleting a project removes all related data)
- API can connect to Azure SQL from `local.settings.json`
- `api/src/lib/db.ts` exposes a reusable SQL connection pool

**Test:**
Build a temporary `GET /api/db-health` endpoint that runs `SELECT 1 AS connected` and returns the result:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/db-health" -Method GET
```
Expected: HTTP 200 with `{ "connected": 1 }`. Remove the endpoint after verification.

---

### Issue #3 - Projects CRUD API

**Labels:** phase-1, api

**Description:**
Build the core projects API endpoints. These are the foundation everything else hangs off.

Endpoints:
- `GET /api/projects` - list all projects with task counts
- `GET /api/projects/:id` - get a single project with its settings
- `POST /api/projects` - create a new project (name, input_type, optional repo_url, optional github_pat)
- `DELETE /api/projects/:id` - delete a project (cascade handled by FK constraints)

When a project is created, automatically create the corresponding `project_settings` row with default values. If a `github_pat` is provided at creation time, store it on the settings row.

**Acceptance criteria:**
- All four endpoints respond correctly
- POST validates that project name is unique and returns a 409 on duplicate
- DELETE removes all related data via cascade
- Project settings row is auto-created with defaults on project creation
- GET project includes settings inline

**Test:**
```powershell
# Create a project
Invoke-WebRequest -Uri "http://localhost:7071/api/projects" -Method POST -Body '{"name":"TestProject","input_type":"zip"}' -ContentType "application/json"

# List projects
Invoke-WebRequest -Uri "http://localhost:7071/api/projects" -Method GET

# Attempt duplicate (expect 409)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects" -Method POST -Body '{"name":"TestProject","input_type":"zip"}' -ContentType "application/json"

# Delete (use ID from create response)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>" -Method DELETE

# Confirm list is empty
Invoke-WebRequest -Uri "http://localhost:7071/api/projects" -Method GET
```
Expected: create returns 201, list returns the project, duplicate returns 409, delete returns 204, final list is empty.

---

### Issue #4 - UI/UX design and component system

**Labels:** phase-1, design

**Description:**
Design the full UI/UX of RapidScan before any frontend code is written. This issue produces the visual design decisions and component system that all subsequent frontend issues (#5, #14, #18, #25) will implement.

Work to complete and commit to `docs/design/DESIGN_SPEC.md`.

**Design direction:**
- Dark mode only — dusk palette (deep dark backgrounds, not pure black)
- Blurred backdrop when modals/popups are open
- Emerald green as the primary accent colour
- Flat design with muted, desaturated colours
- Subtle rounded edges and soft shadows throughout for a floaty feel
- Rounded Helvetica-inspired typography (e.g. Inter, Geist)
- Left-hand collapsible sidebar: icon-only when collapsed, smooth hover animation expands to show the title (game-like feel)
- Scan progress: AI character animation lifting and stacking boxes in a loop while any scan runs
- Task row urgency highlights: muted red (critical), amber (high/medium), green (low), blue (orphaned/cleanup)

**Screen inventory (annotated wireframes or detailed descriptions for each):**
- Projects list: empty state, populated state (name, input type, last scanned, open task count)
- New Project modal: all three input type variants (zip / local / github), PAT field conditional display, blurred backdrop
- Project detail: header layout, collapsible left sidebar navigation with icon tabs
- Manifest tab: category group list, dependency row layout, side panel (references + call chain hierarchy)
- Tasks tab: scored task list with urgency highlight rows, task side panel (description, location map, fix/tests as code blocks, status control)
- Settings tab: all five sections (GitHub connection, scan config, issue creation, scoring weights, scoring explanation)
- Scan progress overlay: AI box-lifting animation, file counter, current file, elapsed time, recent findings preview
- All empty states across the user journey

**Decisions to document:**
- Component library selection (with rationale)
- Full colour token set: background layers, surface, border, accent (emerald), text hierarchy
- Status visual tokens: colour, icon, and label for `healthy / warning / critical / deprecated / unknown`
- Severity badges: colour and label for `critical / high / medium / low`
- Score display convention (numeric badge, colour thresholds if any)
- Side panel pattern (drawer vs split view)
- Sidebar animation spec (easing, duration, trigger)
- Scan animation approach (CSS, Lottie, or similar)

**Acceptance criteria:**
- `docs/design/DESIGN_SPEC.md` covers all screens listed above with no ambiguous gaps
- Component library is chosen and documented with rationale
- Status, severity, and score visual tokens are fully defined
- Layout and side panel pattern is decided
- A developer could implement any screen from the spec without requiring further design decisions

**Test:**
Design review: user confirms `docs/design/DESIGN_SPEC.md` is present, covers all screens, and contains no open design questions before frontend work begins in #5.

---

### Issue #5 - Projects list, create, and detail page shell

**Labels:** phase-1, frontend

**Description:**
Build two pages: the Projects list (homepage) and the Project detail page (shell). Implement using the component library and design tokens chosen in #4.

**Projects list:**
- Shows all projects with name, input type, last scanned date, open task count
- "New Project" flow capturing project name, input type (zip / local / GitHub), optional repo URL, optional GitHub PAT (only shown when input type is GitHub)

**Project detail page (shell):**
- Header showing project name, input type, repo URL (if applicable), last scanned timestamp
- Three tabs: Manifest, Tasks, Settings — all with empty placeholder content
- A header action area for input/scan controls (populated by Phase 2 issues)

**Acceptance criteria:**
- Projects list renders correctly with empty state
- New Project modal validates required fields and conditionally shows the PAT field for GitHub input types
- Creating a project calls `POST /api/projects` and refreshes the list
- Clicking a project navigates to the detail page
- Detail page renders the three tab placeholders
- React Router is configured for `/` (list) and `/projects/:id` (detail)

**Test:**
Manual steps:
1. Open the app. Confirm the empty state is visible.
2. Click "New Project", fill in a name, select "zip". Confirm the PAT field is not shown. Submit.
3. Confirm the project appears in the list with correct name and input type.
4. Open a second New Project modal, switch to "github". Confirm the PAT field appears. Cancel.
5. Click the first project. Confirm navigation to the detail page with three tab placeholders.
6. Paste `/projects/<id>` directly in the browser. Confirm deep-link works.

---

## Phase 2 - Ingestion

Each ingestion issue includes both the API endpoint and the corresponding header UI control on the project detail page. Each one delivers an end-to-end working flow for that input type, even though the heavy scan itself is not built until Phase 3.

For now, the ingestion endpoints produce and persist a file manifest (list of file paths and metadata) that the heavy scan in Phase 3 will consume. Store the ingested file list to a temp directory keyed by project_id.

---

### Issue #6 - Zip upload ingestion

**Labels:** phase-2, scan-engine

**Description:**
Build the zip upload endpoint and file extraction pipeline, plus the upload UI control on the project detail page.

**API:** `POST /api/projects/:id/ingest/zip`
- Accepts a multipart zip file upload up to 50MB
- Extracts cleanly to a temp directory scoped to the project ID
- Returns a structured file manifest: path, extension, size in bytes
- Filters out: binary assets (images, fonts), `node_modules/`, `.git/`, lock files, `.env*`, build outputs (`dist/`, `build/`, `.next/`), and any file >1MB

**UI:** On the project detail page header (when input_type is zip), show a file picker with an "Upload and prepare for scan" button. After upload, show the file count and a "Run Scan" button (non-functional until Phase 3 #11).

**Acceptance criteria:**
- Endpoint accepts and extracts zip files up to 50MB
- File manifest is filtered correctly and persisted
- Temp directory is cleaned up if extraction fails
- Upload UI works end-to-end and shows the file count after extraction

**Test:**
Prepare a zip containing a mix of code files and files that should be filtered (an image, a `node_modules/` entry). Then:
```powershell
$form = @{ file = Get-Item ".\test.zip" }
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/ingest/zip" -Method POST -Form $form
```
Expected: HTTP 200 with a JSON manifest containing only code files. Confirm images and node_modules entries are absent.

---

### Issue #7 - Local directory scan ingestion

**Labels:** phase-2, scan-engine

**Description:**
Build a local scan endpoint and corresponding UI for codebases too large for zip upload.

**API:** `POST /api/projects/:id/ingest/local`
- Accepts a `directoryPath` string in the request body
- Walks the directory tree recursively
- Same filtering rules as zip ingestion
- Returns the same file manifest format

**UI:** On the project detail page header (when input_type is local), show a text input for the directory path and a "Prepare local scan" button. Show file count after the manifest is built.

**Acceptance criteria:**
- Endpoint walks the directory tree and produces a filtered manifest
- Returns a clear error if the path does not exist or is not accessible
- Manifest format matches zip ingestion exactly
- UI works end-to-end

**Test:**
```powershell
# Valid path
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/ingest/local" -Method POST -Body '{"directoryPath":"C:\\Users\\ChrisDensley\\Projects\\RapidScan"}' -ContentType "application/json"

# Invalid path (expect 400)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/ingest/local" -Method POST -Body '{"directoryPath":"C:\\does\\not\\exist"}' -ContentType "application/json"
```
Expected: valid path returns HTTP 200 with file manifest; invalid path returns HTTP 400 with a clear error message.

---

### Issue #8 - GitHub repo ingestion

**Labels:** phase-2, scan-engine

**Description:**
Build a GitHub ingestion path that uses Octokit to fetch the file tree and contents of a connected repo. The PAT is read from `project_settings.github_pat`. If no PAT is stored, the endpoint returns a clear error directing the user to set one (the proper Settings UI is built in Phase 6, but the PAT can also be set at project creation time per #5).

**API:** `POST /api/projects/:id/ingest/github`
- Reads `repo_url` from the project record and `github_pat` from settings
- Uses `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` to fetch the tree
- Retrieves file contents for each code file (respecting filter rules from #6)
- Returns the standard file manifest

**UI:** On the project detail page header (when input_type is github), show a "Fetch repo and prepare scan" button. Show file count after fetch. Show a clear error state if no PAT is stored, with guidance to add one.

**Acceptance criteria:**
- Repo tree fetched correctly
- File contents retrieved and stored in the same temp pattern as zip/local
- Handles repos up to ~1,000 files without timing out
- Falls back gracefully on individual file fetch failures (logs and skips)
- Clear error if PAT is missing or invalid

**Test:**
Create a test project with `input_type=github`, a valid repo URL, and a PAT. Then:
```powershell
# Should succeed
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/ingest/github" -Method POST

# Missing PAT case (expect 400)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id-no-pat>/ingest/github" -Method POST
```
Expected: HTTP 200 with file manifest for the first project; HTTP 400 with a PAT-guidance message for the second.

---

## Phase 3 - Heavy Scan and Manifest

---

### Issue #9 - Heavy scan AI prompt design

**Labels:** phase-3, scan-engine, ai

**Description:**
Design and validate the GPT-5.4-pro prompt used for per-file dependency extraction. Store the prompt as a versioned file at `api/src/lib/prompts/heavy-scan.ts` so it can be iterated independently of the orchestration logic.

The prompt instructs the model to identify all dependencies in a file across the six manifest categories (npm, azure-sdk, ai-model, third-party-api, azure-service, other). It must NOT attempt to identify orphaned code at this stage — that is a separate pass.

For each dependency found, return:
- Category
- Name
- Version (if detectable, else null)
- Line number where it appears
- Parent function or class (if applicable)
- Outbound calls from that function/class for call chain mapping
- Confidence level (high/medium/low) for the call chain entries

The response must be structured JSON. The prompt explicitly instructs the model to:
- Return an empty array if no dependencies are found
- Leave call chain fields null rather than guessing
- Not include orphan-related findings

Also build the Azure OpenAI client wrapper at `api/src/lib/ai/openai.ts` for both pro and mini deployments.

**Acceptance criteria:**
- Prompt reliably returns valid JSON across TS, JS, JSON, Bicep, ARM, YAML files
- Empty and non-code files return an empty findings array
- Response schema is documented in `api/src/types/scan.ts` and matches the frontend types
- Azure OpenAI client wrapper supports both deployments via env vars

**Test:**
Build a temporary `POST /api/debug/heavy-scan-prompt` endpoint that accepts a file path, reads the file, passes it to the heavy scan prompt, and returns the raw model response:
```powershell
# File with known dependencies
Invoke-WebRequest -Uri "http://localhost:7071/api/debug/heavy-scan-prompt" -Method POST -Body '{"filePath":"api/package.json"}' -ContentType "application/json"

# File with no dependencies
Invoke-WebRequest -Uri "http://localhost:7071/api/debug/heavy-scan-prompt" -Method POST -Body '{"filePath":"api/host.json"}' -ContentType "application/json"
```
Expected: valid JSON array of findings for the first file; empty array for the second. Remove the debug endpoint after validation.

---

### Issue #10 - Dependency upsert logic

**Labels:** phase-3, database

**Description:**
Implement the upsert logic that takes the heavy scan output and writes it to the database. This is called once per file by the orchestration loop in #11.

The composite key is `project_id + category + name`:
- If a dependency already exists for this project+category+name, update `current_version` and `last_updated_at`, do NOT create a new row
- If new, insert it
- For each finding, append a row to `dependency_references` (these always accumulate, never deduped)
- For each call chain item against a reference, append a row to `call_chains`

This deduplication is what allows task generation later to produce one task per unique dependency, even when the same dependency appears across many files.

Implement as a reusable function at `api/src/lib/scan/upsert.ts`.

**Acceptance criteria:**
- Calling upsert with the same dependency name+category twice produces one dependency row and two reference rows
- Version updates correctly on subsequent calls
- All references and call chains are persisted with correct foreign keys
- Function is unit tested with a mock SQL pool

**Test:**
Run the unit tests:
```powershell
cd api && npm test -- --testPathPattern=upsert
```
Expected: all upsert unit tests pass, covering the deduplication and accumulation behaviour. Include the test output as proof.

---

### Issue #11 - Heavy scan orchestration loop

**Labels:** phase-3, scan-engine

**Description:**
Build the heavy scan orchestration that ties together the file manifest from Phase 2, the prompt from #9, and the upsert logic from #10. This is the core of RapidScan.

**API:** `POST /api/projects/:id/scan/heavy`

The loop:
- Creates a `scan_history` record with `scan_type='heavy'` on start
- Reads the file manifest from the project's temp area (produced by Phase 2 ingestion)
- Processes files one at a time, sequentially, no parallelism
- For each file, calls the heavy scan prompt and parses the response
- Calls the upsert logic to persist the findings
- Updates the scan_history record with `current_file`, `files_processed`, `files_total` periodically (for the progress UI in Phase 8)
- On a per-file error: logs the failure, sets that file's findings to empty, continues to the next file
- On completion: sets `completed_at`, `findings_count`, and updates `projects.last_scanned_at`

**UI:** Wire up the "Run Scan" button on the project detail page (added by Phase 2 issues) to call this endpoint. Show a basic "Scan in progress..." state with a polling mechanism that hits the scan_history record every 5 seconds. Detailed progress UI is built in Phase 8.

**Acceptance criteria:**
- Scan processes every file in the manifest sequentially
- Per-file errors do not abort the full scan
- scan_history is updated correctly throughout
- `projects.last_scanned_at` updates on completion
- "Run Scan" button works end-to-end
- Basic in-progress indicator shows in the UI

**Test:**
Ingest RapidScan's own codebase via local ingestion (#7), then trigger the heavy scan:
```powershell
# Start the scan
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/heavy" -Method POST

# Poll while running
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan-history" -Method GET

# Confirm completion and findings
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/manifest" -Method GET
```
Expected: scan starts, progress updates are visible in scan_history, scan completes with a non-zero `findings_count`, and the manifest returns populated dependencies.

---

### Issue #12 - Orphan detection pass

**Labels:** phase-3, scan-engine

**Description:**
Implement the optional post-heavy-scan pass that detects orphaned files and functions. Only runs when `project_settings.detect_orphaned_code = 1`. Triggered automatically as the final step of #11 if enabled.

A file is orphaned if no other file in the project imports or references it. A function is orphaned if it is exported but never called from any other file.

This is implemented as a separate AI pass (GPT-5.4-pro for cross-file reasoning capability, but with a tighter prompt scope). Stored prompt at `api/src/lib/prompts/orphan-detection.ts`.

The prompt receives the full project file list and a sample of import/export patterns from each file (not full content). It returns a list of orphaned files and functions with confidence scores. Conservative behaviour: if uncertain, do not flag.

Findings are written via the same upsert logic from #10, with `category='orphaned'`. Naming convention:
- Orphaned file: `name = <filepath>`
- Orphaned function: `name = <filepath>::<functionName>`

A `scan_history` record is created with `scan_type='orphan-detection'`.

**Acceptance criteria:**
- Pass runs automatically after heavy scan completion if setting is enabled, skipped if disabled
- Orphaned items are written as dependencies in the `orphaned` category
- Conservative detection — low-confidence items are not flagged
- scan_history record created and updated correctly
- Setting toggle is respected (test by toggling and re-scanning)

**Test:**
```powershell
# With detect_orphaned_code = true, run scan and check history
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/heavy" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan-history" -Method GET
```
Step 1: confirm scan_history shows two entries (heavy + orphan-detection). Then update `detect_orphaned_code = false` in settings, re-run, and confirm only one scan_history entry (heavy only) is created.

---

### Issue #13 - Manifest API

**Labels:** phase-3, api

**Description:**
Build the manifest API endpoints that expose scan results to the frontend.

Endpoints:
- `GET /api/projects/:id/manifest` - all dependencies grouped by category, with reference counts
- `GET /api/projects/:id/manifest/:dependencyId` - single dependency detail with all references and call chains
- `GET /api/projects/:id/scan-history` - list of past scans for the project (all types)

**Acceptance criteria:**
- Manifest groups by category with counts per category
- Each dependency includes status, versions, and reference count
- Detail endpoint returns full reference list with file paths, lines, parent functions, and call chains
- Scan history returns all scan types ordered by `started_at` desc

**Test:**
After a completed scan:
```powershell
# List manifest grouped by category
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/manifest" -Method GET

# Get single dependency detail (use a dependency_id from above)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/manifest/<dependencyId>" -Method GET

# Scan history
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan-history" -Method GET
```
Expected: manifest groups by category with counts; detail includes references with file/line/function and call chains; scan-history returns scans in descending order.

---

### Issue #14 - Manifest UI tab

**Labels:** phase-3, frontend

**Description:**
Build the Manifest tab content on the project detail page. Show all discovered dependencies grouped by category. Each category is expandable to show individual dependencies with status, current version, and reference count. Clicking a dependency opens a side panel showing all references, line numbers, parent functions, and the call chain hierarchy.

**Acceptance criteria:**
- Six category groups (plus "other" if non-empty) render with counts
- Status is indicated visually using the tokens defined in #4 (healthy / warning / critical / deprecated / unknown)
- Detail panel shows the full location map
- Call chain renders as a readable hierarchy showing depth and confidence
- Empty state renders cleanly when no scan has been run yet

**Test:**
Manual steps (after a completed scan):
1. Open the Manifest tab. Confirm categories appear with dependency counts.
2. Expand a category. Confirm dependency rows show name, status badge, version, and reference count.
3. Click a dependency. Confirm the side panel opens with file paths, line numbers, parent functions, and call chain.
4. Navigate to a project with no completed scan. Confirm the empty state renders cleanly with a next-action prompt.

---

## Phase 4 - Scoring and Tasks

---

### Issue #15 - Score calculation utility

**Labels:** phase-4, api

**Description:**
Implement the score calculation logic at `api/src/lib/scoring.ts`. Score = severity value + type value + complexity value, using the project's configured weights from `project_settings`.

This utility is called whenever a task is created or settings are updated. When settings change, recalculate scores across all open tasks for that project.

**Acceptance criteria:**
- `calculateScore(severity, type, complexity, settings)` returns the correct sum
- Falls back to defaults if a setting value is missing
- Unit tested across all combinations
- Recalculation function correctly updates all open tasks for a project when settings change

**Test:**
Run the unit tests:
```powershell
cd api && npm test -- --testPathPattern=scoring
```
Expected: all scoring unit tests pass, covering max score (12), min score (3), custom weights, and default fallbacks. Include the test output as proof.

---

### Issue #16 - Task generation pipeline

**Labels:** phase-4, scan-engine, ai

**Description:**
Implement the task generation pipeline. This runs after both the heavy scan and orphan detection are complete (or is manually re-triggerable via API).

**API:** `POST /api/projects/:id/scan/generate-tasks` (auto-triggered as the final pipeline step after orphan detection completes)

The pipeline iterates through every dependency for the project where `status` is not `healthy` (and all orphaned-code findings) and calls the GPT-5.4-mini task generation prompt for each one. Stored prompt at `api/src/lib/prompts/task-generation.ts`.

The task generation prompt receives:
- The full dependency record (category, name, version, status)
- All references for that dependency (every file/line/parent function)
- All call chains for those references
- The project context (other dependencies in summary)

It returns:
- Title (one-line summary of the finding)
- Description (paragraph)
- Severity (critical | high | medium | low)
- Type (security | deprecation | version-update | orphaned-code | other)
- Complexity (negligible | low | medium | high)
- Recommended fix (markdown with code blocks)
- Suggested tests (markdown with code blocks targeting the affected functions)

For each generated task:
- Skip if an open task already exists for this dependency_id (prevents duplication on re-runs)
- Calculate score using #15
- Snapshot the location_map (files, lines, functions, call chains) into the JSON column
- Insert into `tasks`

A `scan_history` record is created with `scan_type='task-generation'`.

**Acceptance criteria:**
- Pipeline auto-runs after orphan detection completes
- One task generated per unique dependency, never duplicated for re-runs on the same dependency
- All task fields are populated correctly
- Score is calculated and stored
- Location map JSON includes the full reference + call chain snapshot
- scan_history records the task-generation pass

**Test:**
After a full scan pipeline completes:
```powershell
# Confirm tasks were created
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks" -Method GET

# Re-trigger task generation and confirm no duplicates
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/generate-tasks" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks" -Method GET
```
Expected: first call returns tasks sorted by score desc; re-triggering does not increase the task count (idempotent).

---

### Issue #17 - Tasks API

**Labels:** phase-4, api

**Description:**
Build the tasks API endpoints.

Endpoints:
- `GET /api/projects/:id/tasks` - list tasks, sortable by score desc (default), filterable by status/severity/type
- `GET /api/projects/:id/tasks/:taskId` - single task detail
- `PATCH /api/projects/:id/tasks/:taskId` - update task status (open / in-progress / resolved / dismissed)

**Acceptance criteria:**
- List returns tasks sorted by score descending by default
- Filtering by status, severity, type works correctly
- Status update persists and returns the updated task
- Resolved and dismissed tasks excluded from default view, accessible via filter

**Test:**
```powershell
# List tasks (default - open only, score desc)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks" -Method GET

# Filter by severity
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks?severity=critical" -Method GET

# Update task status
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks/<taskId>" -Method PATCH -Body '{"status":"in-progress"}' -ContentType "application/json"

# Dismiss a task and confirm it is excluded from default list
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks/<taskId>" -Method PATCH -Body '{"status":"dismissed"}' -ContentType "application/json"
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks" -Method GET

# Include dismissed via filter
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks?status=dismissed" -Method GET
```
Expected: all operations return correct results per the description above.

---

### Issue #18 - Tasks UI tab

**Labels:** phase-4, frontend

**Description:**
Build the Tasks tab on the project detail page. Show all open tasks sorted by score descending. Each task shows score, severity badge, type badge, complexity indicator, and title. Clicking a task opens a side panel with full description, location map, recommended fix (formatted code block), and suggested tests (formatted code block). Status can be updated from the panel.

**Acceptance criteria:**
- List renders sorted by score descending
- Score, severity, type, complexity all visually distinguished using tokens from #4
- Detail panel renders fix and tests as formatted code blocks (Markdown rendering)
- Status updates work from the panel
- Resolved and dismissed tasks hidden by default, with a toggle to show them

**Test:**
Manual steps:
1. Open the Tasks tab on a project with completed tasks.
2. Confirm tasks are sorted by score descending, with score/severity/type/complexity all visible.
3. Click a task. Confirm the side panel shows description, location map, recommended fix (code block), and suggested tests (code block).
4. Change status to "in-progress". Confirm it updates without a page reload.
5. Change status to "dismissed". Confirm the task disappears from the default list.
6. Toggle "show dismissed". Confirm the task reappears.

---

## Phase 5 - Light Scan Monitoring

---

### Issue #19 - Light scan orchestration framework

**Labels:** phase-5, monitoring

**Description:**
Build the light scan orchestration framework and manual trigger endpoint. The integrations in #20-23 plug into this framework.

**API:** `POST /api/projects/:id/scan/light`

The framework:
- Creates a `scan_history` record with `scan_type='light'`
- Iterates through each manifest category sequentially
- Dispatches each category to its registered integration handler (handlers added in #20-23)
- After all integrations complete, auto-triggers the task generation pipeline (#16) for any dependencies whose status changed
- Updates scan_history on completion

Build a registry pattern at `api/src/lib/monitoring/registry.ts` so each integration can register itself for a category.

**UI:** Add a "Run Light Scan" button to the project detail page header (separate from "Run Heavy Scan"). Same polling-based progress as heavy scan.

**Acceptance criteria:**
- Framework processes all categories sequentially via the registry
- Status changes trigger task generation automatically
- Manual trigger UI works end-to-end
- Registry pattern allows clean addition of future integrations

**Test:**
Register a stub handler for one category that always marks one dependency as changed. Trigger the light scan:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/light" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan-history" -Method GET
```
Expected: scan_history shows a `light` scan entry followed by a `task-generation` entry triggered automatically.

---

### Issue #20 - npm advisory API integration

**Labels:** phase-5, monitoring

**Description:**
Implement the npm category handler. Extracts all npm dependencies for the project, batches them into a request to `registry.npmjs.org/-/npm/v1/security/advisories/bulk`, and updates each dependency's `status` and `latest_version` based on the response.

Register the handler with the framework from #19.

**Acceptance criteria:**
- All npm dependencies for a project are checked in a single bulk API call
- CVE findings update status to `warning` or `critical` based on severity
- Latest version updated from registry response
- Status changes propagate through to task generation

**Test:**
Scan a project that includes a known-vulnerable npm package (e.g. an older version of `lodash`). Run a light scan:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/light" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/manifest" -Method GET
```
Expected: the known-vulnerable package shows `status: "critical"` or `"warning"` after the light scan completes.

---

### Issue #21 - Dependabot GraphQL integration

**Labels:** phase-5, monitoring

**Description:**
Implement an additional layer for GitHub-connected projects. Queries Dependabot's `repositoryVulnerabilityAlerts` GraphQL API via Octokit to retrieve active vulnerability alerts and cross-references them with the manifest.

This handler runs alongside #20 for npm dependencies on GitHub projects, providing richer alert data (CVE IDs, recommended versions).

**Acceptance criteria:**
- Query runs only for projects with `repo_url` and a stored PAT
- Alerts matched to manifest dependencies by name
- CVE details written back to the dependency record
- No-op (with a clear log) if PAT is missing

**Test:**
With a GitHub-connected project that has Dependabot alerts enabled on its repo:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/light" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/manifest" -Method GET
```
Expected: Dependabot alerts appear as enriched status on matching npm dependencies. Also test with a project missing a PAT and confirm no error is thrown — only a log entry.

---

### Issue #22 - Azure SDK and AI model monitoring

**Labels:** phase-5, monitoring

**Description:**
Implement the handlers for `azure-sdk`, `azure-service`, and `ai-model` categories. Uses GPT-5.4-mini to fetch and summarise relevant changelog or deprecation notice pages and determine whether the current version is supported, deprecated, or has a newer version.

Stored prompt at `api/src/lib/prompts/azure-monitoring.ts`. Maintain a reference lookup of known changelog URLs per Azure SDK package and per AI model provider at `api/src/lib/monitoring/azure-sources.ts`.

**Acceptance criteria:**
- GPT-5.4-mini retrieves and summarises changelog content
- Returns structured: current status, latest version, deprecation date if known
- Dependency records updated with monitoring results
- Status changes propagate to task generation

**Test:**
Ensure the project manifest contains at least one `azure-sdk` or `ai-model` dependency. Run a light scan:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/light" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/manifest/<dependencyId>" -Method GET
```
Expected: `latest_version` is populated and `status` reflects any deprecation findings.

---

### Issue #23 - Third-party API monitoring

**Labels:** phase-5, monitoring

**Description:**
Implement the handler for the `third-party-api` category. Uses GPT-5.4-mini to check the relevant provider's changelog or API versioning page for breaking changes, deprecations, or new major versions.

Maintain a reference lookup of known changelog URLs (Stripe, SendGrid, Twilio, etc.) at `api/src/lib/monitoring/third-party-sources.ts`. For unknown APIs, fall back to a model-driven web search.

**Acceptance criteria:**
- Known APIs use direct changelog lookups
- Unknown APIs fall back to web search via the model
- Findings update dependency records and propagate to task generation

**Test:**
Ensure the project manifest contains a known `third-party-api` dependency. Run a light scan:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/light" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/manifest/<dependencyId>" -Method GET
```
Expected: dependency record shows updated `latest_version` and `status` reflecting the current API version state.

---

## Phase 6 - Settings

---

### Issue #24 - Project settings API

**Labels:** phase-6, api

**Description:**
Build the settings API endpoints.

Endpoints:
- `GET /api/projects/:id/settings` - retrieve current settings (mask github_pat in response)
- `PATCH /api/projects/:id/settings` - update one or more fields

When any scoring weight changes, trigger the score recalculation utility from #15 across all open tasks.

When `detect_orphaned_code` changes, no immediate effect — takes effect on next heavy scan.

**Acceptance criteria:**
- GET returns settings with github_pat masked (e.g. `ghp_****1234`)
- PATCH accepts partial updates
- Score recalculation triggered when scoring weights change
- github_issue_threshold accepts null (disabled) or any positive integer
- light_scan_interval accepts null (manual) or positive integer (days)

**Test:**
```powershell
# Get settings (confirm PAT is masked)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/settings" -Method GET

# Update a scoring weight
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/settings" -Method PATCH -Body '{"severity_critical":5}' -ContentType "application/json"

# Confirm task scores recalculated
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks" -Method GET

# Set threshold to null
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/settings" -Method PATCH -Body '{"github_issue_threshold":null}' -ContentType "application/json"
```
Expected: PAT appears masked; task scores update after weight change; null threshold accepted without error.

---

### Issue #25 - Settings UI tab

**Labels:** phase-6, frontend

**Description:**
Build the Settings tab on the project detail page. Sections:

1. **GitHub connection** — PAT input (masked), connection status indicator, test button (calls #26)
2. **Scan configuration** — "Detect orphaned code" toggle, light scan interval input
3. **Issue creation** — GitHub issue score threshold input with explanatory text
4. **Scoring weights** — editable values for all three dimensions, with defaults shown and a "reset to defaults" link
5. **Scoring explanation** — inline documentation of how the score is calculated

**Acceptance criteria:**
- All five sections render correctly
- PAT is masked after entry; "test" button validates against GitHub API via #26
- Numeric inputs validate correctly
- Save calls `PATCH /api/projects/:id/settings`
- Reset to defaults works for scoring weights
- Inline scoring explanation is present and accurate

**Test:**
Manual steps:
1. Open the Settings tab. Confirm all five sections are visible.
2. Enter a GitHub PAT and save. Confirm it is masked (e.g. `ghp_****1234`) after save. Click "test" and confirm the validation result is shown.
3. Change `severity_critical` to 5 and save. Open the Tasks tab and confirm scores have updated.
4. Click "Reset to defaults" on scoring weights. Confirm values return to defaults and task scores revert.
5. Clear `github_issue_threshold` (set to disabled). Save. Confirm no error.

---

## Phase 7 - GitHub Issues

---

### Issue #26 - GitHub PAT validation

**Labels:** phase-7, github

**Description:**
Build the PAT validation logic that the Settings UI test button calls. Validates the stored PAT has the required scopes (`repo`, `issues:write`) by making a test API call.

**API:** `POST /api/projects/:id/github/validate`
- Reads PAT from settings
- Calls GitHub API to verify the PAT and its scopes
- Returns `{ valid: bool, scopes: string[], error?: string }`

**Acceptance criteria:**
- Validation correctly identifies valid PATs with required scopes
- Returns clear error messages for: invalid PAT, missing scopes, network errors
- No side effects (does not store anything; pure validation)

**Test:**
```powershell
# Valid PAT with correct scopes
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/github/validate" -Method POST

# Invalid PAT (update settings first)
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/settings" -Method PATCH -Body '{"github_pat":"invalid_token"}' -ContentType "application/json"
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/github/validate" -Method POST
```
Expected: valid PAT returns `{ valid: true, scopes: [...] }` including `repo` and `issues:write`; invalid PAT returns `{ valid: false, error: "..." }`.

---

### Issue #27 - GitHub issue creation

**Labels:** phase-7, github

**Description:**
Implement automated GitHub issue creation. After task generation completes, for each newly created task whose score >= the project's `github_issue_threshold`:
- Create a GitHub issue using the four-section template (Summary, Location Map, Recommended Fix, Suggested Tests)
- Apply labels: severity, type, score range, and `rapidscan`
- Store the issue URL on `tasks.github_issue_url`

Idempotency: if a task already has a `github_issue_url`, do not create a new issue. If the threshold is null, skip GitHub issue creation entirely.

Label creation: ensure all required labels exist in the repo on first issue creation. Create them if missing.

**Acceptance criteria:**
- Issues created only when score >= threshold and PAT is valid
- Issue body matches the four-section template
- All labels created in the repo if they did not exist
- `github_issue_url` written back to the task record
- Re-running task generation does not create duplicate issues
- Threshold = null skips creation entirely

**Test:**
Set `github_issue_threshold` to a value that at least one task will meet. Trigger task generation:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/scan/generate-tasks" -Method POST
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks" -Method GET
```
Confirm a `github_issue_url` is populated on qualifying tasks. Visit the URL in a browser and confirm the issue body follows the four-section template and the correct labels are applied. Re-trigger task generation and confirm no duplicate issues are created.

---

## Phase 8 - Polish and Internal Release

---

### Issue #28 - Detailed scan progress UI

**Labels:** phase-8, frontend

**Description:**
Replace the basic in-progress indicator from #11 with a polished progress experience. Heavy scans on real projects can take 30+ minutes, so good progress feedback is essential.

For all four scan types (heavy, orphan-detection, task-generation, light):
- Show current pipeline stage
- Show file counter (e.g. "Scanning file 47 of 213")
- Show current file being processed
- Show elapsed time
- Show recent findings preview (last 5 dependencies discovered)
- Show clear error state if a scan fails
- Auto-refresh manifest and tasks views on scan completion

Polling interval: every 5 seconds against `/api/projects/:id/scan-history?latest=true`.

**Acceptance criteria:**
- All four scan types show progress correctly
- File counter, current file, elapsed time all update during the scan
- Recent findings preview surfaces during the scan
- Error state is clear and actionable
- Manifest and tasks tabs auto-refresh on scan completion

**Test:**
Manual steps:
1. Trigger a heavy scan on a project with 20+ files.
2. Confirm the progress overlay shows: file counter incrementing, current file name updating, elapsed time incrementing, recent findings appearing.
3. Wait for completion. Confirm the Manifest and Tasks tabs auto-refresh without a manual page reload.
4. Corrupt the temp manifest for a project and trigger a scan. Confirm the error state is shown clearly with a useful message.

---

### Issue #29 - Empty states and onboarding flow

**Labels:** phase-8, frontend

**Description:**
Ensure every page and state has a clean empty state with clear next-action guidance.

Specific states to cover:
- No projects yet → "Create your first project"
- Project created but not ingested → "Upload a zip / Set a path / Connect a repo"
- Files ingested but not scanned → "Run scan to discover dependencies"
- Scan in progress → progress UI from #28
- Scan completed with no findings → "No issues detected - your project is clean"
- Scan completed with findings → manifest and tasks populated

**Acceptance criteria:**
- Every empty state has a clear message and a primary action
- First-time user can go from landing page to completed scan without confusion
- No blank or broken UI states remain

**Test:**
Manual walkthrough of the full first-use journey:
1. Open the app with no projects. Confirm "Create your first project" state.
2. Create a project. Confirm the ingestion call-to-action is shown (appropriate for input type).
3. Complete ingestion. Confirm "Run scan" state appears.
4. Run a scan. Confirm the progress overlay from #28 is shown.
5. After scan completes with findings, confirm manifest and tasks tabs are populated.
6. Create a second project, run a scan on a codebase with zero dependency findings. Confirm the "No issues detected" empty state.

---

### Issue #30 - Deploy to Azure SWA

**Labels:** phase-8, infrastructure

**Description:**
Deploy RapidScan to Azure Static Web Apps connected to the GitHub repo. Configure the SWA build pipeline for the React frontend and Azure Functions API. Confirm the deployed app connects correctly to Azure SQL and Azure OpenAI.

Document the deployment process and required environment variables in `docs/DEPLOYMENT.md`.

**Acceptance criteria:**
- SWA deploys automatically on push to `main`
- Frontend and API both serve correctly from the SWA URL
- Azure SQL and Azure OpenAI connections work in deployed environment
- All env vars are set in SWA configuration (not committed to repo)
- `docs/DEPLOYMENT.md` exists and is accurate

**Test:**
After deployment:
```powershell
# Health check against deployed API
Invoke-WebRequest -Uri "https://<swa-url>/api/health" -Method GET

# Confirm projects API works end-to-end
Invoke-WebRequest -Uri "https://<swa-url>/api/projects" -Method GET
```
Also open the SWA URL in a browser and confirm the full app loads and a new project can be created successfully against the live database.

---

## Phase 4 Extension

---

### Issue #31 - Task resolution notes and audit log

**Labels:** phase-4, api, frontend

**Description:**
Extend the task workflow with resolution notes and an audit log. Every status change is automatically recorded in a chronological log. Users can also attach freeform notes at any time — to explain a decision, document what was tried, or record why a task was dismissed.

**Schema addition:**
Add a `task_notes` table to `database/schema.sql`:

```sql
CREATE TABLE task_notes (
  note_id       UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
  task_id       UNIQUEIDENTIFIER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  note          NVARCHAR(MAX) NOT NULL,
  status_at_time NVARCHAR(20) NULL,   -- snapshot of task status when note was written
  is_auto       BIT NOT NULL DEFAULT 0, -- 1 = auto-generated by status change, 0 = user note
  created_at    DATETIME2 DEFAULT GETUTCDATE()
);
CREATE INDEX IX_task_notes_task_id ON task_notes(task_id);
```

Run `ALTER TABLE` / `CREATE TABLE` on existing databases.

**API changes:**

Extend `PATCH /api/projects/:id/tasks/:taskId`:

- Accept an optional `note` string in the request body alongside `status`
- When `status` changes, always auto-insert a `task_notes` row with `is_auto = 1` and the text `"Status changed to <new-status>"`, plus the user-supplied note (if any) as a second row with `is_auto = 0`

New endpoint:

- `POST /api/projects/:id/tasks/:taskId/notes` — insert a freeform note (body: `{ note: string }`); `status_at_time` is read from the current task status

Extend `GET /api/projects/:id/tasks/:taskId`:

- Include a `notes` array in the response, ordered `created_at ASC`

**UI changes (task side panel in `TasksTab`):**

- Add a "Notes" section below "Suggested tests"
- Show each note as a row: timestamp, note text, and a subtle "auto" indicator for system-generated entries
- Input area (textarea + "Add note" button) at the bottom of the section
- Auto-generated entries styled more subtly (muted colour) than user notes
- Section hidden when no notes exist yet

**Acceptance criteria:**

- Every status change generates an auto audit entry
- Freeform notes can be added independently of a status change
- Notes persist across page reloads
- `GET /api/projects/:id/tasks/:taskId` includes the full notes array
- UI renders notes in chronological order with timestamps and distinguishes auto vs user entries

**Test:**

```powershell
# Add a freeform note
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks/<taskId>/notes" -Method POST -Body '{"note":"Checked with team — confirmed this dependency is used only in tests."}' -ContentType "application/json"

# Change status with an optional note
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks/<taskId>" -Method PATCH -Body '{"status":"resolved","note":"Upgraded to v4.18.2. All tests pass."}' -ContentType "application/json"

# Confirm notes appear in task detail
Invoke-WebRequest -Uri "http://localhost:7071/api/projects/<id>/tasks/<taskId>" -Method GET
```

Expected: task detail includes a `notes` array with: the freeform note, the auto-generated "Status changed to resolved" entry, and the user note attached to the status change — in chronological order.

Manual UI steps:

1. Open a task panel. Confirm there is no notes section.
2. Change status to "in-progress". Confirm an auto entry appears: "Status changed to in-progress".
3. Type a note and click "Add note". Confirm it appears below the auto entry with a timestamp.
4. Refresh the page, reopen the panel. Confirm all notes persist.
5. Change status to "resolved" with a note. Confirm both the auto entry and the user note appear in order.
