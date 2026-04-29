# RapidScan - Claude Code Rules

## Session start checklist
1. Read this file
2. Read `docs/progress.md` for current status, completed issues, and lessons learned
3. Read the specific GitHub issue being worked on this session

---

## Working rules

### One issue per thread
Each working session focuses on a single issue. Do not begin work on the next issue in the same thread.

### Forward changes
Forward changes are permitted when implementation reveals a genuine need for them. When a forward change is made:
- Identify which future GitHub issue(s) are affected
- Update those issues (scope, acceptance criteria, or remove steps that are now done)
- Document the change and reasoning in `docs/progress.md` under "Forward Changes Log"

### Testing
Every issue must end with a test. There are two acceptable forms:
- **Automated:** run unit tests or API calls and include the output as proof
- **Manual:** provide step-by-step instructions for the user to verify the acceptance criteria

Use `Invoke-WebRequest` (PowerShell) for all HTTP test commands, not `curl`.

### Progress tracking
Update `docs/progress.md` at the end of every session with:
- The issue number and title that was completed
- Any lessons learned during implementation
- Any decisions made that are not obvious from the code
- Any forward changes made and which issues were updated as a result

---

## Technical conventions

### Stack
- **Frontend:** React + Vite + TypeScript — source in `/src`
- **API:** Azure Functions v4, Node.js, TypeScript — source in `/api`
- **Database:** Azure SQL, mssql driver
- **AI:** Azure OpenAI — GPT-5.4-pro (heavy scan), GPT-5.4-mini (light scan, task generation)
- **Hosting:** Azure Static Web Apps
- **GitHub integration:** Octokit

### Project structure
```
/src                          React frontend
/api/src/functions            Azure Function handlers
/api/src/lib/db.ts            SQL connection pool
/api/src/lib/ai/openai.ts     Azure OpenAI client wrapper
/api/src/lib/scan/            Scan pipeline utilities (upsert, orchestration)
/api/src/lib/prompts/         Versioned AI prompt files
/api/src/lib/scoring.ts       Score calculation utility
/api/src/lib/monitoring/      Light scan integration handlers and registry
/api/src/types/               Shared TypeScript types
/database/schema.sql          Azure SQL schema
/docs/design/DESIGN_SPEC.md   UI/UX design decisions (from Issue #4)
/docs/progress.md             Development progress and lessons learned
/docs/DEPLOYMENT.md           Deployment documentation (from Issue #30)
```

### Environment variables
- Local: `api/local.settings.json` (never committed)
- Production: set in Azure SWA configuration

### Testing commands
Use `Invoke-WebRequest` (PowerShell), not `curl`:
```powershell
Invoke-WebRequest -Uri "http://localhost:7071/api/health" -Method GET
Invoke-WebRequest -Uri "http://localhost:7071/api/projects" -Method POST -Body '{"name":"Test","input_type":"zip"}' -ContentType "application/json"
```

---

## Out of scope — v1
Do not implement any of the following, even if they seem like natural additions:
- Authentication or user management
- Automated branch creation or code commits
- CI/CD pipeline triggering
- Configurable automated scan schedules (noted for client release — not v1)
- Multi-provider repo support (Azure DevOps, GitLab)
- Multi-user access and permissions
- SBOM export
