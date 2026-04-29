import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import * as sql from 'mssql'
import { getPool } from '../lib/db'

async function listProjects(_req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const pool = await getPool()
  const result = await pool.request().query(`
    SELECT p.project_id, p.name, p.repo_url, p.input_type, p.created_at, p.last_scanned_at,
           COUNT(t.task_id) AS task_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.project_id
    GROUP BY p.project_id, p.name, p.repo_url, p.input_type, p.created_at, p.last_scanned_at
    ORDER BY p.created_at DESC
  `)
  return { status: 200, jsonBody: result.recordset }
}

async function getProject(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const pool = await getPool()
  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT p.project_id, p.name, p.repo_url, p.input_type, p.created_at, p.last_scanned_at,
             ps.setting_id, ps.github_pat, ps.github_issue_threshold, ps.detect_orphaned_code,
             ps.light_scan_interval, ps.severity_critical, ps.severity_high, ps.severity_medium,
             ps.severity_low, ps.type_security, ps.type_deprecation, ps.type_version_update,
             ps.type_orphaned_code, ps.complexity_negligible, ps.complexity_low,
             ps.complexity_medium, ps.complexity_high
      FROM projects p
      LEFT JOIN project_settings ps ON ps.project_id = p.project_id
      WHERE p.project_id = @id
    `)

  if (result.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  const row = result.recordset[0]
  return {
    status: 200,
    jsonBody: {
      project_id: row.project_id,
      name: row.name,
      repo_url: row.repo_url,
      input_type: row.input_type,
      created_at: row.created_at,
      last_scanned_at: row.last_scanned_at,
      settings: row.setting_id ? {
        setting_id: row.setting_id,
        github_pat: row.github_pat,
        github_issue_threshold: row.github_issue_threshold,
        detect_orphaned_code: row.detect_orphaned_code,
        light_scan_interval: row.light_scan_interval,
        severity_critical: row.severity_critical,
        severity_high: row.severity_high,
        severity_medium: row.severity_medium,
        severity_low: row.severity_low,
        type_security: row.type_security,
        type_deprecation: row.type_deprecation,
        type_version_update: row.type_version_update,
        type_orphaned_code: row.type_orphaned_code,
        complexity_negligible: row.complexity_negligible,
        complexity_low: row.complexity_low,
        complexity_medium: row.complexity_medium,
        complexity_high: row.complexity_high,
      } : null
    }
  }
}

async function createProject(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const body = await req.json() as Record<string, unknown>
  const { name, input_type, repo_url, github_pat } = body

  if (!name || typeof name !== 'string') {
    return { status: 400, jsonBody: { error: 'name is required' } }
  }
  if (!input_type || !['zip', 'local', 'github'].includes(input_type as string)) {
    return { status: 400, jsonBody: { error: 'input_type must be zip, local, or github' } }
  }

  const pool = await getPool()
  const tx = new sql.Transaction(pool)
  await tx.begin()

  try {
    const projectResult = await new sql.Request(tx)
      .input('name', sql.NVarChar(255), name)
      .input('input_type', sql.NVarChar(20), input_type)
      .input('repo_url', sql.NVarChar(500), (repo_url as string) ?? null)
      .query(`
        INSERT INTO projects (name, input_type, repo_url)
        OUTPUT INSERTED.*
        VALUES (@name, @input_type, @repo_url)
      `)

    const project = projectResult.recordset[0]

    await new sql.Request(tx)
      .input('project_id', sql.UniqueIdentifier, project.project_id)
      .input('github_pat', sql.NVarChar(500), (github_pat as string) ?? null)
      .query(`
        INSERT INTO project_settings (project_id, github_pat)
        VALUES (@project_id, @github_pat)
      `)

    await tx.commit()
    return { status: 201, jsonBody: project }
  } catch (err: unknown) {
    await tx.rollback()
    const sqlErr = err as { number?: number }
    if (sqlErr.number === 2627 || sqlErr.number === 2601) {
      return { status: 409, jsonBody: { error: 'A project with that name already exists' } }
    }
    throw err
  }
}

async function deleteProject(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const pool = await getPool()
  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM projects WHERE project_id = @id`)

  if (result.rowsAffected[0] === 0) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  return { status: 204 }
}

app.http('listProjects', {
  methods: ['GET'],
  route: 'projects',
  authLevel: 'anonymous',
  handler: listProjects
})

app.http('getProject', {
  methods: ['GET'],
  route: 'projects/{id}',
  authLevel: 'anonymous',
  handler: getProject
})

app.http('createProject', {
  methods: ['POST'],
  route: 'projects',
  authLevel: 'anonymous',
  handler: createProject
})

app.http('deleteProject', {
  methods: ['DELETE'],
  route: 'projects/{id}',
  authLevel: 'anonymous',
  handler: deleteProject
})
