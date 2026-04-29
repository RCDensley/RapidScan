# RapidScan - Product Requirements Document

**Version:** 0.2  
**Status:** Pre-development  
**Author:** Rapid Circle  
**Companion product:** Rapid Build

---

## Overview

RapidScan is an internal Rapid Circle tool designed to support managed services delivery for vibe-coded and AI-assisted applications. It performs a deep, deliberate scan of a codebase to discover, map, and monitor all software dependencies - not just npm packages, but the full surface area of a modern Microsoft-stack application including Azure services, AI models, third-party APIs, and low-code components.

The output is a living manifest of everything an application depends on, where each dependency lives in the code, what calls it, and what its current health status is. RapidScan surfaces deprecation risks, security vulnerabilities, version updates, and orphaned code - and conditionally raises GitHub issues or surfaces in-app tasks in response.

RapidScan is not designed to be fast. It is designed to be thorough. Scans are expected to run overnight and be reviewed the next morning.

---

## Problem Statement

Managed services teams inheriting vibe-coded applications face a dependency monitoring gap that existing tools do not address:

- Standard SCA tools (Snyk, Dependabot) cover npm packages only
- Azure SDK versions, AI model versions, Logic App connectors, ADI/AVI usage, and third-party API integrations have no automated scanner
- Vibe-coded apps often lack the discipline of a manually maintained dependency register
- Orphaned files and functions are common in vibe-coded solutions and create silent risk
- When something breaks or is deprecated, there is no map of where in the code that dependency lives or what else depends on it

RapidScan fills this gap by using a large language model to do what a human senior engineer would do on an onboarding review - read through the entire codebase, identify every dependency across six manifest categories, map exactly where each one lives, trace what calls it, and then continuously monitor those dependencies for changes.

---

## Target Users

Rapid Circle managed services team members onboarding and maintaining vibe-coded client applications.

---

## Input Methods

### Zip Upload
- User uploads a zip archive of the application source
- RapidScan extracts and scans all files sequentially
- File size limits to be determined based on Azure Functions constraints
- Project is named by the user on first upload
- Subsequent uploads to the same project name update the existing manifest

### Local File Scan
- For codebases too large for zip upload
- User points RapidScan at a local directory path
- Requires the RapidScan Azure Functions host running locally
- Same sequential scan logic applies

### GitHub Repository
- User provides a GitHub repo URL and PAT
- RapidScan reads files via GitHub API (Octokit)
- Repo URL is the canonical project identifier
- Same PAT is reused for issue creation in the GitHub Issues integration

---

## Scan Architecture

The scan pipeline is a sequence of three distinct passes that run after ingestion:

1. **Heavy scan (discovery)** - sequential file-by-file analysis using GPT-5.4-pro
2. **Orphan detection (optional)** - post-scan pass to identify dead code (toggleable per project)
3. **Task generation** - per-dependency analysis using GPT-5.4-mini, producing scored tasks

Each pass is independent and can be re-run without re-running earlier passes (e.g. task generation can be re-run with an updated prompt without re-scanning the codebase).

### Heavy Scan (Discovery)

- **Model:** GPT-5.4-pro via Azure OpenAI
- **Approach:** Exhaustive sequential - every code file in the project is read and assessed, no entry-point traversal shortcuts
- **Purpose:** Build the manifest, map all dependency locations, trace call chains
- **Cadence:** Manually triggered, expected to run overnight
- **Output:** Populated `dependencies`, `dependency_references`, and `call_chains` tables

The heavy scan reads each file and for every dependency it finds, records:

1. The dependency identity (category + name)
2. Current version in use
3. File path and line number
4. Immediate parent function or class
5. Call chain - what calls the function that uses this dependency, and what calls that

When the same dependency is found across multiple files, references and call chains accumulate against the single deduplicated dependency record (composite key: `project_id + category + name`).

If the model cannot confidently determine a call chain, it records what it found and leaves the chain incomplete rather than hallucinating connections.

### Orphan Detection (Optional Post-Scan Pass)

- **Cadence:** Runs automatically after the heavy scan completes, gated by the `detect_orphaned_code` project setting (default: enabled)
- **Purpose:** Identify orphaned files (no inbound imports/references) and orphaned exported functions
- **Output:** Adds discovered orphans as dependencies in the `orphaned` category

This is a separate AI pass because it requires whole-project reasoning rather than per-file analysis. Disabling it saves model tokens for projects where orphaned code is not a concern.

### Task Generation

- **Model:** GPT-5.4-mini via Azure OpenAI
- **Approach:** Per-dependency, runs once per unique dependency record after both the heavy scan and orphan detection are complete
- **Purpose:** Assess each finding's severity, type, and complexity, and generate remediation suggestions and targeted test scripts
- **Output:** One task per unique dependency, written to the `tasks` table

Critically, task generation runs **after** the heavy scan finishes - not concurrently. The same dependency typically appears across multiple files, and we want one task per unique dependency that consolidates all references and call chains, not one task per file occurrence. Deduplication happens automatically via the composite key during the heavy scan, so by the time task generation runs, each row in `dependencies` is a unique finding ready for assessment.

The model receives:
- The dependency record (category, name, version, status)
- All references for that dependency (every file/line/parent function)
- All call chains
- The project context (other dependencies, project type)

And produces:
- Severity, type, complexity assessments
- A recommended fix as a code block
- Suggested test scripts targeting the affected functions identified in the call chain

### Light Scan (Ongoing Monitoring)

- **Model:** GPT-5.4-mini via Azure OpenAI
- **Approach:** Works against the existing manifest, checks each dependency for updates, CVEs, deprecations, and release notes
- **Cadence:** Manual trigger by default. Configurable automated schedule (every X days) available as a client-facing release feature
- **Data sources:**
  - npm advisory bulk API (`registry.npmjs.org/-/npm/v1/security/advisories/bulk`) for npm packages
  - Dependabot GraphQL API (`repositoryVulnerabilityAlerts`) for GitHub-connected projects
  - Azure SDK and service release notes and changelog pages
  - OpenAI and Azure OpenAI model deprecation notices
  - Third-party API changelog pages and release feeds

When the light scan finds a status change (new CVE, new deprecation, new version), it triggers a task generation pass for the affected dependencies. Existing open tasks are updated where applicable rather than duplicated.

---

## Manifest Categories

Six categories are tracked in the manifest. An "other" catch-all category captures anything the model finds that does not fit neatly into the six.

| # | Category | Detection Sources |
|---|----------|-------------------|
| 1 | **npm packages** | `package.json`, lock files |
| 2 | **Azure SDKs** | SDK imports, `host.json`, Bicep/ARM templates, connection strings |
| 3 | **AI models** | API calls, model name strings, OpenAI/Azure OpenAI SDK usage |
| 4 | **Third-party APIs** | Endpoint URLs, SDK initialisations, environment variable references |
| 5 | **Azure services** | Infrastructure files, Function App triggers, Logic App connectors, ADI/AVI usage, resource references |
| 6 | **Orphaned code** | Files and functions with no inbound references from any other file in the codebase |
| + | **Other** | Anything the model identifies that does not fit the above categories |

---

## Data Model

### Projects
```
project_id          (PK, UUID)
name                (user-assigned or repo name)
repo_url            (nullable, canonical key for GitHub projects)
input_type          (zip | local | github)
created_at
last_scanned_at
```

### Dependencies
```
dependency_id       (PK, UUID)
project_id          (FK)
category            (npm | azure-sdk | ai-model | third-party-api | azure-service | orphaned | other)
name                (composite key with category + project_id)
current_version
latest_version
status              (healthy | warning | critical | deprecated | unknown)
first_detected_at
last_updated_at
```

### Dependency References
```
reference_id        (PK, UUID)
dependency_id       (FK)
file_path
line_number
parent_function
parent_class
```

### Call Chains
```
chain_id            (PK, UUID)
reference_id        (FK)
caller_function
caller_file
caller_line
chain_depth         (integer, 1 = immediate caller)
confidence          (high | medium | low)
```

### Scan History
```
scan_id             (PK, UUID)
project_id          (FK)
scan_type           (heavy | light | task-generation | orphan-detection)
triggered_by        (manual | scheduled | auto-followup)
started_at
completed_at
findings_count
```

### Tasks
```
task_id             (PK, UUID)
project_id          (FK)
dependency_id       (FK)
title
description
severity            (critical | high | medium | low)
type                (security | deprecation | version-update | orphaned-code | other)
complexity          (negligible | low | medium | high)
score               (integer, calculated)
status              (open | in-progress | resolved | dismissed)
github_issue_url    (nullable)
location_map        (JSON snapshot of files, lines, functions, call chains at task creation time)
recommended_fix     (text)
suggested_tests     (text)
created_at
updated_at
```

The `location_map` JSON is a snapshot taken at task creation time. The relational tables (`dependency_references`, `call_chains`) reflect the current state of the codebase. They will diverge over time as the code changes between scans - this is intentional, so a task always points back at the location it referred to when raised.

### Project Settings
```
setting_id              (PK, UUID)
project_id              (FK, unique)
github_pat              (nullable, encrypted)
github_issue_threshold  (nullable integer; null = disabled)
detect_orphaned_code    (boolean, default true)
severity_critical       (default 4)
severity_high           (default 3)
severity_medium         (default 2)
severity_low            (default 1)
type_security           (default 4)
type_deprecation        (default 3)
type_version_update     (default 2)
type_orphaned_code      (default 1)
complexity_negligible   (default 4)
complexity_low          (default 3)
complexity_medium       (default 2)
complexity_high         (default 1)
```

---

## Scoring Model

Every task is scored across three dimensions. The overall score is the sum of all three dimension values. Higher score = act sooner.

### Default Values

| Dimension | Value | Score |
|-----------|-------|-------|
| **Severity** | Critical | 4 |
| | High | 3 |
| | Medium | 2 |
| | Low | 1 |
| **Type** | Security | 4 |
| | Deprecation | 3 |
| | Version Update | 2 |
| | Orphaned Code | 1 |
| **Complexity** | Negligible | 4 |
| | Low | 3 |
| | Medium | 2 |
| | High | 1 |

**Maximum score: 12** (act immediately)  
**Minimum score: 3** (review when convenient)

Complexity is inverted by design - a highly complex fix scores lower on that dimension because the effort and risk involved should not artificially elevate it above a simpler critical fix. Severity and type carry the weight; complexity provides the nuance.

All default values are configurable per project via the Settings page. The scoring formula and dimension values are documented inline in the UI so the model is never a black box to the team using it.

When a project's scoring weights are changed, all open tasks for that project have their scores recalculated automatically.

---

## Task and Issue Output

### In-App Tasks
- Created for every finding regardless of score
- One task per unique dependency (deduplication ensures multiple file occurrences map to one task)
- Managed directly within RapidScan with status, ID, score, and full detail
- Available for all project types including local and zip-only projects where no GitHub repo exists

### GitHub Issues
- Created automatically when a task's score meets or exceeds the project's `github_issue_threshold` setting
- Only available for GitHub-connected projects with a valid stored PAT
- If the threshold is null, GitHub issue creation is disabled for that project
- Issue body follows a structured four-section template:

```
## Summary
[Dependency name, category, score, severity, type, complexity]

## Location Map
[Files, line numbers, parent functions, call chain]

## Recommended Fix
[Model-generated replacement approach with code blocks]

## Suggested Tests
[Targeted test suggestions based on affected functions identified during scan]
```

- Labels applied automatically based on severity, type, and score range
- GitHub issue URL stored against the task record
- A task with an existing `github_issue_url` will not be re-issued

### Remediation Philosophy
RapidScan is an advisor, not an actor. It generates replacement suggestions and targeted test scripts as code blocks within tasks and issues. The developer chooses how to apply them - manually, via a coding agent, or any other method. RapidScan does not commit branches or modify code directly in v1.

---

## Configuration

A settings page allows users to configure, per project:

- **GitHub PAT** - encrypted token used for both repo ingestion and issue creation
- **GitHub issue threshold** - integer score above which GitHub issues are auto-created (null = disabled)
- **Detect orphaned code** - boolean toggle for the orphan detection pass (default on)
- **Scoring dimension weights** - override default values for any Severity, Type, or Complexity tier
- **Automated light scan schedule** - off by default, configurable to every X days (client release feature)

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite + TypeScript) |
| Hosting | Azure Static Web Apps |
| API | Azure Functions v4 (Node.js) |
| Database | Azure SQL |
| Heavy scan model | GPT-5.4-pro via Azure OpenAI |
| Light scan + task generation model | GPT-5.4-mini via Azure OpenAI |
| GitHub integration | Octokit (REST + GraphQL) |
| npm vulnerability data | npm advisory bulk API |
| Auth | None (v1) |

---

## Out of Scope - v1

- Authentication and user management
- Automated branch creation or code commits
- CI/CD pipeline triggering
- Configurable automated scan schedules (noted for client release)
- Multi-provider repo support (Azure DevOps, GitLab)
- Multi-user project access and permissions
- SBOM export

---

## Future Phases

- **Entra ID SSO** - when moving beyond internal RC use
- **Automated scan scheduling** - configurable cadence per project
- **CI/CD trigger integration** - optional, flexible, client-configurable per pipeline
- **Branch auto-creation** - model-proposed fix committed as a draft PR for developer review
- **SBOM export** - CycloneDX format for compliance use cases
- **Multi-provider repo support** - Azure DevOps, GitLab
- **Containerised deployment** - for client-hosted or on-premise scenarios
