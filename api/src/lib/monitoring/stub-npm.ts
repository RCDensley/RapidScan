import * as sql from 'mssql'
import type { InvocationContext } from '@azure/functions'
import { registerHandler } from './registry'

async function stubNpmHandler(
  pool: sql.ConnectionPool,
  projectId: string,
  ctx: InvocationContext
): Promise<number> {
  const result = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<{ dependency_id: string }>(
      `SELECT TOP 1 dependency_id FROM dependencies WHERE project_id = @projectId AND category = 'npm'`
    )

  if (result.recordset.length === 0) {
    ctx.log('Stub npm handler: no npm dependencies found')
    return 0
  }

  const depId = result.recordset[0].dependency_id
  await pool.request()
    .input('depId', sql.UniqueIdentifier, depId)
    .query(`UPDATE dependencies SET status = 'warning', last_updated_at = GETUTCDATE() WHERE dependency_id = @depId`)

  ctx.log(`Stub npm handler: marked ${depId} as warning`)
  return 1
}

registerHandler('npm', stubNpmHandler)
