import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import * as sql from 'mssql'
import { getPool } from '../lib/db'

const VALID_STATUSES = ['open', 'in-progress', 'resolved', 'dismissed'] as const
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
const VALID_TYPES = ['security', 'deprecation', 'version-update', 'orphaned-code', 'other'] as const

type TaskRow = {
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
}

const SELECT_COLS = `
  task_id, project_id, dependency_id, title, description,
  severity, type, complexity, score, status, github_issue_url,
  location_map, recommended_fix, suggested_tests, created_at, updated_at`

async function projectExists(pool: sql.ConnectionPool, id: string): Promise<boolean> {
  const r = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT 1 AS f FROM projects WHERE project_id = @id')
  return r.recordset.length > 0
}

async function getTasks(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const pool = await getPool()

  if (!(await projectExists(pool, id))) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status')
  const severityParam = url.searchParams.get('severity')
  const typeParam = url.searchParams.get('type')

  if (statusParam && !VALID_STATUSES.includes(statusParam as typeof VALID_STATUSES[number])) {
    return { status: 400, jsonBody: { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` } }
  }
  if (severityParam && !VALID_SEVERITIES.includes(severityParam as typeof VALID_SEVERITIES[number])) {
    return { status: 400, jsonBody: { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` } }
  }
  if (typeParam && !VALID_TYPES.includes(typeParam as typeof VALID_TYPES[number])) {
    return { status: 400, jsonBody: { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` } }
  }

  const conditions: string[] = ['project_id = @id']
  const request = pool.request().input('id', sql.UniqueIdentifier, id)

  if (statusParam) {
    conditions.push('status = @status')
    request.input('status', sql.NVarChar(20), statusParam)
  } else {
    conditions.push("status IN ('open', 'in-progress')")
  }

  if (severityParam) {
    conditions.push('severity = @severity')
    request.input('severity', sql.NVarChar(10), severityParam)
  }

  if (typeParam) {
    conditions.push('type = @type')
    request.input('type', sql.NVarChar(20), typeParam)
  }

  const where = conditions.join(' AND ')
  const result = await request.query<TaskRow>(
    `SELECT ${SELECT_COLS} FROM tasks WHERE ${where} ORDER BY score DESC, created_at DESC`
  )

  return { status: 200, jsonBody: result.recordset }
}

async function getTask(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const { id, taskId } = req.params
  const pool = await getPool()

  if (!(await projectExists(pool, id))) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .input('taskId', sql.UniqueIdentifier, taskId)
    .query<TaskRow>(
      `SELECT ${SELECT_COLS} FROM tasks WHERE project_id = @id AND task_id = @taskId`
    )

  if (result.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Task not found' } }
  }

  return { status: 200, jsonBody: result.recordset[0] }
}

async function patchTask(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const { id, taskId } = req.params
  const pool = await getPool()

  if (!(await projectExists(pool, id))) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
  }

  const { status } = body as { status?: unknown }

  if (!status || typeof status !== 'string') {
    return { status: 400, jsonBody: { error: 'status is required' } }
  }
  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return { status: 400, jsonBody: { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` } }
  }

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .input('taskId', sql.UniqueIdentifier, taskId)
    .input('status', sql.NVarChar(20), status)
    .query<TaskRow>(`
      UPDATE tasks
      SET status = @status, updated_at = GETUTCDATE()
      WHERE project_id = @id AND task_id = @taskId;

      SELECT ${SELECT_COLS} FROM tasks WHERE task_id = @taskId
    `)

  if (result.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Task not found' } }
  }

  return { status: 200, jsonBody: result.recordset[0] }
}

app.http('getTasks', {
  methods: ['GET'],
  route: 'projects/{id}/tasks',
  authLevel: 'anonymous',
  handler: getTasks,
})

app.http('getTask', {
  methods: ['GET'],
  route: 'projects/{id}/tasks/{taskId}',
  authLevel: 'anonymous',
  handler: getTask,
})

app.http('patchTask', {
  methods: ['PATCH'],
  route: 'projects/{id}/tasks/{taskId}',
  authLevel: 'anonymous',
  handler: patchTask,
})
