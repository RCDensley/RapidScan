import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import * as sql from 'mssql'
import { getPool } from '../lib/db'

async function getTasks(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const pool = await getPool()

  const projectExists = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT 1 AS exists_flag FROM projects WHERE project_id = @id')

  if (projectExists.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<{
      task_id: string
      project_id: string
      dependency_id: string | null
      title: string
      description: string | null
      severity: string
      type: string
      complexity: string
      score: number
      status: string
      github_issue_url: string | null
      location_map: string | null
      recommended_fix: string | null
      suggested_tests: string | null
      created_at: Date
      updated_at: Date
    }>(`
      SELECT
        task_id, project_id, dependency_id, title, description,
        severity, type, complexity, score, status, github_issue_url,
        location_map, recommended_fix, suggested_tests, created_at, updated_at
      FROM tasks
      WHERE project_id = @id
      ORDER BY score DESC, created_at DESC
    `)

  return { status: 200, jsonBody: result.recordset }
}

app.http('getTasks', {
  methods: ['GET'],
  route: 'projects/{id}/tasks',
  authLevel: 'anonymous',
  handler: getTasks,
})
