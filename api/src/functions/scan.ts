import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import * as sql from 'mssql'
import * as fs from 'fs'
import * as path from 'path'
import { getPool } from '../lib/db'
import { upsertDependency } from '../lib/scan/upsert'
import { heavyComplete } from '../lib/ai/openai'
import { HEAVY_SCAN_SYSTEM, buildHeavyScanUser } from '../lib/prompts/heavy-scan'
import { ORPHAN_DETECTION_SYSTEM, buildOrphanDetectionUser, extractPatterns } from '../lib/prompts/orphan-detection'
import type { DependencyFinding, OrphanFinding } from '../types/scan'

async function runOrphanDetection(
  pool: sql.ConnectionPool,
  projectId: string,
  sourceBasePath: string,
  files: Array<{ file_path: string }>,
  ctx: InvocationContext
): Promise<void> {
  const settingResult = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<{ detect_orphaned_code: boolean }>(
      'SELECT detect_orphaned_code FROM project_settings WHERE project_id = @projectId'
    )

  if (settingResult.recordset.length === 0 || !settingResult.recordset[0].detect_orphaned_code) {
    ctx.log('Orphan detection skipped (setting disabled)')
    return
  }

  const scanRecord = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<{ scan_id: string }>(`
      INSERT INTO scan_history (project_id, scan_type, triggered_by)
      OUTPUT inserted.scan_id
      VALUES (@projectId, 'orphan-detection', 'auto-followup')
    `)

  const scanId = scanRecord.recordset[0].scan_id

  try {
    const filePatterns: Array<{ path: string; patterns: string[] }> = []
    for (const file of files) {
      const fullPath = path.join(sourceBasePath, file.file_path)
      try {
        const content = fs.readFileSync(fullPath, 'utf-8')
        filePatterns.push({ path: file.file_path, patterns: extractPatterns(content) })
      } catch {
        filePatterns.push({ path: file.file_path, patterns: [] })
      }
    }

    const filePaths = files.map(f => f.file_path)
    const userMsg = buildOrphanDetectionUser(filePaths, filePatterns)
    const rawJson = await heavyComplete(ORPHAN_DETECTION_SYSTEM, userMsg)

    let orphans: OrphanFinding[] = []
    try {
      const parsed: unknown = JSON.parse(rawJson)
      if (Array.isArray(parsed)) orphans = parsed as OrphanFinding[]
    } catch {
      ctx.log('JSON parse error in orphan detection, treating as no findings')
    }

    const confident = orphans.filter(o => o.confidence === 'high' || o.confidence === 'medium')
    let findingsCount = 0

    for (const orphan of confident) {
      const name = orphan.type === 'file' ? orphan.path : `${orphan.path}::${orphan.functionName}`
      const finding: DependencyFinding = {
        category: 'orphaned',
        name,
        version: null,
        lineNumber: orphan.type === 'function' ? (orphan.lineNumber ?? null) : null,
        parentFunction: orphan.type === 'function' ? (orphan.functionName ?? null) : null,
        parentClass: null,
        callChain: [],
      }
      await upsertDependency(pool, projectId, orphan.path, finding)
      findingsCount++
    }

    await pool.request()
      .input('scanId', sql.UniqueIdentifier, scanId)
      .input('findingsCount', sql.Int, findingsCount)
      .query(`
        UPDATE scan_history
        SET completed_at = GETUTCDATE(), findings_count = @findingsCount
        WHERE scan_id = @scanId
      `)
  } catch (err) {
    ctx.log(`Orphan detection failed: ${err instanceof Error ? err.message : String(err)}`)
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

async function runHeavyScan(
  pool: sql.ConnectionPool,
  projectId: string,
  scanId: string,
  sourceBasePath: string,
  files: Array<{ file_path: string }>,
  ctx: InvocationContext
): Promise<void> {
  const filesTotal = files.length
  let filesProcessed = 0
  let findingsCount = 0

  for (const file of files) {
    const fullPath = path.join(sourceBasePath, file.file_path)

    try {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const userMsg = buildHeavyScanUser(file.file_path, content)
      const rawJson = await heavyComplete(HEAVY_SCAN_SYSTEM, userMsg)

      let findings: DependencyFinding[] = []
      try {
        const parsed: unknown = JSON.parse(rawJson)
        if (Array.isArray(parsed)) findings = parsed as DependencyFinding[]
      } catch {
        ctx.log(`JSON parse error for ${file.file_path}, treating as no findings`)
      }

      for (const finding of findings) {
        await upsertDependency(pool, projectId, file.file_path, finding)
        findingsCount++
      }
    } catch (err) {
      ctx.log(`Error scanning ${file.file_path}: ${err instanceof Error ? err.message : String(err)}`)
    }

    filesProcessed++

    await pool.request()
      .input('scanId', sql.UniqueIdentifier, scanId)
      .input('currentFile', sql.NVarChar(1000), file.file_path)
      .input('filesProcessed', sql.Int, filesProcessed)
      .input('filesTotal', sql.Int, filesTotal)
      .query(`
        UPDATE scan_history
        SET current_file = @currentFile, files_processed = @filesProcessed, files_total = @filesTotal
        WHERE scan_id = @scanId
      `)
  }

  await pool.request()
    .input('scanId', sql.UniqueIdentifier, scanId)
    .input('findingsCount', sql.Int, findingsCount)
    .query(`
      UPDATE scan_history
      SET completed_at = GETUTCDATE(), findings_count = @findingsCount, current_file = NULL
      WHERE scan_id = @scanId
    `)

  await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query('UPDATE projects SET last_scanned_at = GETUTCDATE() WHERE project_id = @projectId')

  await runOrphanDetection(pool, projectId, sourceBasePath, files, ctx)
}

async function startHeavyScan(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const pool = await getPool()

  const projectResult = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<{ input_type: string; source_path: string | null }>(`
      SELECT input_type, source_path FROM projects WHERE project_id = @id
    `)

  if (projectResult.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  const project = projectResult.recordset[0]

  if (!project.source_path) {
    return { status: 400, jsonBody: { error: 'Project has not been ingested yet. Run ingestion first.' } }
  }

  const manifestResult = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<{ file_path: string }>('SELECT file_path FROM file_manifests WHERE project_id = @id')

  if (manifestResult.recordset.length === 0) {
    return { status: 400, jsonBody: { error: 'No file manifest found. Run ingestion first.' } }
  }

  const filesTotal = manifestResult.recordset.length

  const scanRecord = await pool.request()
    .input('projectId', sql.UniqueIdentifier, id)
    .input('filesTotal', sql.Int, filesTotal)
    .query<{ scan_id: string }>(`
      INSERT INTO scan_history (project_id, scan_type, triggered_by, files_total, files_processed)
      OUTPUT inserted.scan_id
      VALUES (@projectId, 'heavy', 'manual', @filesTotal, 0)
    `)

  const scanId = scanRecord.recordset[0].scan_id

  setImmediate(() => {
    runHeavyScan(pool, id, scanId, project.source_path!, manifestResult.recordset, ctx).catch(async err => {
      ctx.log(`Scan ${scanId} failed with unhandled error: ${err instanceof Error ? err.message : String(err)}`)
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
    })
  })

  return { status: 202, jsonBody: { scan_id: scanId, files_total: filesTotal } }
}

async function getScanHistory(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
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
    .query(`
      SELECT scan_id, project_id, scan_type, triggered_by, started_at, completed_at,
             findings_count, current_file, files_total, files_processed, error_message
      FROM scan_history
      WHERE project_id = @id
      ORDER BY started_at DESC
    `)

  return { status: 200, jsonBody: result.recordset }
}

async function getManifest(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
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
    .query(`
      SELECT file_path, extension, size_bytes
      FROM file_manifests
      WHERE project_id = @id
      ORDER BY file_path
    `)

  return { status: 200, jsonBody: { files: result.recordset, count: result.recordset.length } }
}

app.http('startHeavyScan', {
  methods: ['POST'],
  route: 'projects/{id}/scan/heavy',
  authLevel: 'anonymous',
  handler: startHeavyScan,
})

app.http('getScanHistory', {
  methods: ['GET'],
  route: 'projects/{id}/scan-history',
  authLevel: 'anonymous',
  handler: getScanHistory,
})

app.http('getManifest', {
  methods: ['GET'],
  route: 'projects/{id}/manifest',
  authLevel: 'anonymous',
  handler: getManifest,
})
