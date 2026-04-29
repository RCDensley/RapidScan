# RapidScan

**Easing the anxiety of custom application adoption.**

RapidScan performs deep, deliberate dependency scanning and ongoing health monitoring for vibe-coded and AI-assisted applications. It discovers every dependency across six manifest categories, maps exactly where each one lives in the codebase, traces call chains, and monitors for vulnerabilities, deprecations, and version updates.

---

## What it does

- Exhaustive sequential file-by-file scan using a context heacy AI model
- Builds a living manifest of npm packages, Azure SDKs, AI models, third-party APIs, Azure services, and orphaned code
- Maps each dependency to its exact file, line, parent function, and call chain
- Generates one task per unique dependency (deduplicated automatically across files) with severity, type, complexity, and remediation suggestions via a light weight model
- Runs ongoing light-model monitoring for CVEs, deprecations, and new versions
- Creates in-app tasks for every finding, and conditionally raises GitHub issues above a configurable score threshold

Scans are designed to run overnight and be reviewed in the morning. This is not a fast tool - it is a thorough one.

---

## Pipeline

Each scan run is a sequence of three passes:

1. **Heavy scan (discovery)** - GPT-5.4-pro (or similar) reads every code file sequentially and writes findings to the manifest
2. **Orphan detection (optional)** - separate AI pass to identify dead files and unused exports (toggleable per project)
3. **Task generation** - GPT-5.4-mini (or similar) takes each unique dependency and produces a scored, actionable task with remediation suggestions

Light scan monitoring runs against the existing manifest on a manual trigger (or scheduled cadence), feeding any status changes back through the task generation pass.

---

## Stack

- **Frontend:** React + Vite + TypeScript
- **Hosting:** Azure Static Web Apps
- **API:** Azure Functions v4 (Node.js)
- **Database:** Azure SQL
- **Heavy scan:** GPT-5.4-pro via Azure OpenAI
- **Light scan + task generation:** GPT-5.4-mini via Azure OpenAI
- **GitHub integration:** Octokit (REST + GraphQL)

---

## Project structure

```
RapidScan/
├── docs/               # PRD and documentation
├── src/                # React frontend
│   ├── components/     # Shared UI components
│   ├── pages/          # Page-level components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API client functions
│   └── types/          # TypeScript type definitions
├── api/                # Azure Functions v4
│   └── src/
│       ├── functions/  # HTTP trigger functions
│       └── lib/        # Shared utilities
│           ├── ai/         # Azure OpenAI client
│           ├── monitoring/ # Light scan integrations
│           ├── prompts/    # Versioned AI prompts
│           ├── scan/       # Scan logic, upsert
│           ├── db.ts       # SQL connection pool
│           └── scoring.ts  # Score calculation
├── database/           # Azure SQL schema
├── ISSUES.md           # Build plan
└── staticwebapp.config.json
```

---

## Getting started

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools v4
- Azure SQL database (or local SQL Server)
- Azure OpenAI resource with GPT-5.4-pro and GPT-5.4-mini deployments

### Local development

```bash
# Install frontend dependencies
npm install

# Install API dependencies
cd api && npm install

# Start API locally
cd api && npm run start

# Start frontend (separate terminal)
npm run dev
```
## Documentation

See `docs/PRD.md` for the full product requirements document.  
See `ISSUES.md` for the phased build plan.
