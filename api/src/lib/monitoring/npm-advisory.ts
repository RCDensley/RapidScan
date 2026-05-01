import * as sql from 'mssql'
import type { InvocationContext } from '@azure/functions'
import { registerHandler } from './registry'

interface NpmDep {
  dependency_id: string
  name: string
  current_version: string | null
}

interface Advisory {
  severity: string
}

type BulkAdvisoryResponse = Record<string, Advisory[]>

async function fetchLatestVersion(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`)
    if (!res.ok) return null
    const data = await res.json() as { 'dist-tags'?: { latest?: string } }
    return data['dist-tags']?.latest ?? null
  } catch {
    return null
  }
}

function highestSeverityStatus(advisories: Advisory[]): 'critical' | 'warning' {
  const hasCritical = advisories.some(a => a.severity === 'critical')
  return hasCritical ? 'critical' : 'warning'
}

async function npmAdvisoryHandler(
  pool: sql.ConnectionPool,
  projectId: string,
  ctx: InvocationContext
): Promise<number> {
  const result = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<NpmDep>(
      `SELECT dependency_id, name, current_version
       FROM dependencies
       WHERE project_id = @projectId AND category = 'npm'`
    )

  const deps = result.recordset
  if (deps.length === 0) {
    ctx.log('npm advisory: no npm dependencies found')
    return 0
  }

  ctx.log(`npm advisory: checking ${deps.length} npm packages`)

  // Build body: { "name": ["version"] } — skip deps with no version
  const versionedDeps = deps.filter(d => d.current_version)
  const bulkBody: Record<string, string[]> = {}
  for (const dep of versionedDeps) {
    bulkBody[dep.name] = [dep.current_version!]
  }

  let advisories: BulkAdvisoryResponse = {}
  if (Object.keys(bulkBody).length > 0) {
    try {
      const res = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkBody),
      })
      if (res.ok) {
        advisories = await res.json() as BulkAdvisoryResponse
      } else {
        ctx.log(`npm advisory: bulk API returned ${res.status}`)
      }
    } catch (err) {
      ctx.log(`npm advisory: bulk API failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Fetch latest versions in parallel
  const latestVersions = await Promise.all(deps.map(d => fetchLatestVersion(d.name)))

  let changed = 0

  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i]
    const latestVersion = latestVersions[i]
    const depAdvisories = advisories[dep.name] ?? []

    const newStatus = depAdvisories.length > 0
      ? highestSeverityStatus(depAdvisories)
      : 'healthy'

    const updateResult = await pool.request()
      .input('depId', sql.UniqueIdentifier, dep.dependency_id)
      .input('status', sql.NVarChar(20), newStatus)
      .input('latestVersion', sql.NVarChar(100), latestVersion ?? null)
      .query(`
        UPDATE dependencies
        SET status = @status,
            latest_version = COALESCE(@latestVersion, latest_version),
            last_updated_at = GETUTCDATE()
        WHERE dependency_id = @depId
          AND (status != @status
            OR (@latestVersion IS NOT NULL AND (latest_version IS NULL OR latest_version != @latestVersion)))
      `)

    if (updateResult.rowsAffected[0] > 0) changed++
  }

  ctx.log(`npm advisory: ${deps.length} packages checked, ${changed} updated`)
  return changed
}

registerHandler('npm', npmAdvisoryHandler)
