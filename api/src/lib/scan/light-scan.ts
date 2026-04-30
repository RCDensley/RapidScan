import * as sql from 'mssql'
import type { InvocationContext } from '@azure/functions'
import { getRegisteredHandlers } from '../monitoring/registry'
import { runTaskGeneration } from './task-generation'

export async function runLightScan(
  pool: sql.ConnectionPool,
  projectId: string,
  scanId: string,
  ctx: InvocationContext
): Promise<void> {
  let totalChanged = 0
  const handlers = getRegisteredHandlers()

  try {
    for (const [category, handler] of handlers) {
      ctx.log(`Light scan: running ${category} handler`)
      try {
        const changed = await handler(pool, projectId, ctx)
        totalChanged += changed
        ctx.log(`Light scan: ${category} handler done — ${changed} changed`)
      } catch (err) {
        ctx.log(`Light scan: ${category} handler failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    await pool.request()
      .input('scanId', sql.UniqueIdentifier, scanId)
      .input('findingsCount', sql.Int, totalChanged)
      .query(`
        UPDATE scan_history
        SET completed_at = GETUTCDATE(), findings_count = @findingsCount
        WHERE scan_id = @scanId
      `)

    if (totalChanged > 0) {
      await runTaskGeneration(pool, projectId, 'auto-followup', ctx)
    }
  } catch (err) {
    ctx.log(`Light scan failed: ${err instanceof Error ? err.message : String(err)}`)
    try {
      await pool.request()
        .input('scanId', sql.UniqueIdentifier, scanId)
        .input('errorMessage', sql.NVarChar(4000), err instanceof Error ? err.message : String(err))
        .query(`
          UPDATE scan_history
          SET error_message = @errorMessage, completed_at = GETUTCDATE()
          WHERE scan_id = @scanId
        `)
    } catch { /* best effort */ }
  }
}
