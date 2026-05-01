import * as sql from 'mssql'
import type { InvocationContext } from '@azure/functions'
import { Octokit } from '@octokit/rest'
import { registerHandler } from './registry'

interface ProjectRow {
  repo_url: string | null
  github_pat: string | null
}

interface VulnerabilityAlert {
  securityVulnerability: {
    package: { name: string; ecosystem: string }
    fixedIn: string | null
    severity: string
  }
}

interface AlertsPage {
  repository: {
    vulnerabilityAlerts: {
      nodes: VulnerabilityAlert[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }
}

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 }

const ALERTS_QUERY = `
  query($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      vulnerabilityAlerts(first: 100, after: $cursor, states: [OPEN]) {
        nodes {
          securityVulnerability {
            package { name ecosystem }
            fixedIn
            severity
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const httpsMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/)
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] }
  const shortMatch = repoUrl.match(/^([^/]+)\/([^/]+)$/)
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] }
  return null
}

async function dependabotHandler(
  pool: sql.ConnectionPool,
  projectId: string,
  ctx: InvocationContext
): Promise<number> {
  const result = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<ProjectRow>(`
      SELECT p.repo_url, ps.github_pat
      FROM projects p
      LEFT JOIN project_settings ps ON ps.project_id = p.project_id
      WHERE p.project_id = @projectId
    `)

  const row = result.recordset[0]

  if (!row?.repo_url) {
    ctx.log('dependabot: no repo_url — skipping')
    return 0
  }

  if (!row?.github_pat) {
    ctx.log('dependabot: no GitHub PAT configured — skipping')
    return 0
  }

  const parsed = parseRepoUrl(row.repo_url)
  if (!parsed) {
    ctx.log(`dependabot: could not parse repo_url: ${row.repo_url}`)
    return 0
  }

  const { owner, repo } = parsed
  const octokit = new Octokit({ auth: row.github_pat })

  // Collect all open npm alerts, keeping only the highest severity per package
  const alertsByPackage = new Map<string, { severity: string; fixedIn: string | null }>()

  let cursor: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    try {
      const data: AlertsPage = await octokit.graphql<AlertsPage>(ALERTS_QUERY, {
        owner,
        repo,
        cursor: cursor ?? undefined,
      })

      const alertsPage = data.repository.vulnerabilityAlerts
      const nodes = alertsPage.nodes
      const pageInfo = alertsPage.pageInfo

      for (const alert of nodes) {
        const { name, ecosystem } = alert.securityVulnerability.package
        if (ecosystem !== 'NPM') continue

        const incoming = SEVERITY_RANK[alert.securityVulnerability.severity] ?? 0
        const existing = alertsByPackage.get(name)
        const existingRank = existing ? (SEVERITY_RANK[existing.severity] ?? 0) : 0

        if (!existing || incoming > existingRank) {
          alertsByPackage.set(name, {
            severity: alert.securityVulnerability.severity,
            fixedIn: alert.securityVulnerability.fixedIn ?? null,
          })
        }
      }

      hasNextPage = pageInfo.hasNextPage
      cursor = pageInfo.endCursor
    } catch (err) {
      ctx.log(`dependabot: GraphQL query failed: ${err instanceof Error ? err.message : String(err)}`)
      return 0
    }
  }

  if (alertsByPackage.size === 0) {
    ctx.log('dependabot: no open npm alerts found')
    return 0
  }

  ctx.log(`dependabot: ${alertsByPackage.size} packages with open alerts`)

  let changed = 0

  for (const [pkgName, alert] of alertsByPackage) {
    const newStatus = (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') ? 'critical' : 'warning'

    const updateResult = await pool.request()
      .input('projectId', sql.UniqueIdentifier, projectId)
      .input('name', sql.NVarChar(500), pkgName)
      .input('status', sql.NVarChar(20), newStatus)
      .input('fixedIn', sql.NVarChar(100), alert.fixedIn)
      .query(`
        UPDATE dependencies
        SET status = @status,
            latest_version = COALESCE(@fixedIn, latest_version),
            last_updated_at = GETUTCDATE()
        WHERE project_id = @projectId
          AND name = @name
          AND category = 'npm'
          AND (status != @status
            OR (@fixedIn IS NOT NULL AND (latest_version IS NULL OR latest_version != @fixedIn)))
      `)

    if (updateResult.rowsAffected[0] > 0) changed++
  }

  ctx.log(`dependabot: ${alertsByPackage.size} alerts matched, ${changed} dependencies updated`)
  return changed
}

registerHandler('dependabot', dependabotHandler)
