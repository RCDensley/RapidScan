import * as sql from 'mssql'
import type { InvocationContext } from '@azure/functions'
import { lightComplete } from '../ai/openai'
import { TASK_GENERATION_SYSTEM, buildTaskGenerationUser } from '../prompts/task-generation'
import { calculateScore, type ScoringSettings, type Severity, type TaskType, type Complexity } from '../scoring'

interface TaskAiOutput {
  title: string
  description: string
  severity: Severity
  type: TaskType
  complexity: Complexity
  recommended_fix: string
  suggested_tests: string
}

interface RefRow {
  reference_id: string
  file_path: string
  line_number: number | null
  parent_function: string | null
  parent_class: string | null
}

interface ChainRow {
  reference_id: string
  caller_function: string | null
  caller_file: string | null
  caller_line: number | null
  chain_depth: number
  confidence: string
}

const VALID_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']
const VALID_TYPES: TaskType[] = ['security', 'deprecation', 'version-update', 'orphaned-code', 'other']
const VALID_COMPLEXITIES: Complexity[] = ['negligible', 'low', 'medium', 'high']

function isValidOutput(o: unknown): o is TaskAiOutput {
  if (!o || typeof o !== 'object') return false
  const t = o as Record<string, unknown>
  return (
    typeof t.title === 'string' && t.title.length > 0 &&
    typeof t.description === 'string' &&
    VALID_SEVERITIES.includes(t.severity as Severity) &&
    VALID_TYPES.includes(t.type as TaskType) &&
    VALID_COMPLEXITIES.includes(t.complexity as Complexity) &&
    typeof t.recommended_fix === 'string' &&
    typeof t.suggested_tests === 'string'
  )
}

export async function runTaskGeneration(
  pool: sql.ConnectionPool,
  projectId: string,
  triggeredBy: 'manual' | 'auto-followup',
  ctx: InvocationContext
): Promise<void> {
  const scanRecord = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .input('triggeredBy', sql.NVarChar(20), triggeredBy)
    .query<{ scan_id: string }>(`
      INSERT INTO scan_history (project_id, scan_type, triggered_by)
      OUTPUT inserted.scan_id
      VALUES (@projectId, 'task-generation', @triggeredBy)
    `)

  const scanId = scanRecord.recordset[0].scan_id

  try {
    // Load scoring settings (may not exist — falls back to defaults inside calculateScore)
    const settingsResult = await pool.request()
      .input('projectId', sql.UniqueIdentifier, projectId)
      .query<ScoringSettings>('SELECT * FROM project_settings WHERE project_id = @projectId')
    const settings: ScoringSettings = settingsResult.recordset[0] ?? {}

    // All non-healthy dependencies (orphaned deps always have status='unknown' so included)
    const depsResult = await pool.request()
      .input('projectId', sql.UniqueIdentifier, projectId)
      .query<{
        dependency_id: string
        category: string
        name: string
        current_version: string | null
        latest_version: string | null
        status: string
      }>(`
        SELECT dependency_id, category, name, current_version, latest_version, status
        FROM dependencies
        WHERE project_id = @projectId AND status != 'healthy'
      `)

    // Summarised project context for the AI prompt (all deps regardless of status)
    const contextResult = await pool.request()
      .input('projectId', sql.UniqueIdentifier, projectId)
      .query<{ category: string; name: string; status: string }>(
        'SELECT category, name, status FROM dependencies WHERE project_id = @projectId'
      )
    const projectContext = contextResult.recordset

    let tasksCreated = 0

    for (const dep of depsResult.recordset) {
      // Skip if an open task already exists for this dependency
      const existingTask = await pool.request()
        .input('depId', sql.UniqueIdentifier, dep.dependency_id)
        .query<{ task_id: string }>(
          `SELECT TOP 1 task_id FROM tasks WHERE dependency_id = @depId AND status = 'open'`
        )

      if (existingTask.recordset.length > 0) {
        ctx.log(`Task generation: skipping ${dep.name} — open task already exists`)
        continue
      }

      // Fetch all references for this dependency
      const refsResult = await pool.request()
        .input('depId', sql.UniqueIdentifier, dep.dependency_id)
        .query<RefRow>(`
          SELECT reference_id, file_path, line_number, parent_function, parent_class
          FROM dependency_references
          WHERE dependency_id = @depId
        `)

      // Fetch call chains for all of those references via the dependency join
      const chainResult = await pool.request()
        .input('depId', sql.UniqueIdentifier, dep.dependency_id)
        .query<ChainRow>(`
          SELECT cc.reference_id, cc.caller_function, cc.caller_file, cc.caller_line, cc.chain_depth, cc.confidence
          FROM call_chains cc
          INNER JOIN dependency_references dr ON cc.reference_id = dr.reference_id
          WHERE dr.dependency_id = @depId
          ORDER BY cc.reference_id, cc.chain_depth
        `)

      const chainsByRef: Record<string, ChainRow[]> = {}
      for (const chain of chainResult.recordset) {
        if (!chainsByRef[chain.reference_id]) chainsByRef[chain.reference_id] = []
        chainsByRef[chain.reference_id].push(chain)
      }

      const references = refsResult.recordset.map(r => ({
        file_path: r.file_path,
        line_number: r.line_number,
        parent_function: r.parent_function,
        parent_class: r.parent_class,
        call_chain: (chainsByRef[r.reference_id] ?? []).map(c => ({
          caller_function: c.caller_function,
          caller_file: c.caller_file,
          caller_line: c.caller_line,
          chain_depth: c.chain_depth,
          confidence: c.confidence,
        })),
      }))

      // Build context excluding the current dependency
      const context = projectContext
        .filter(c => !(c.name === dep.name && c.category === dep.category))
        .slice(0, 50)

      // Call AI
      let taskOutput: TaskAiOutput
      try {
        const userMsg = buildTaskGenerationUser(dep, references, context)
        const rawJson = await lightComplete(TASK_GENERATION_SYSTEM, userMsg)
        const parsed: unknown = JSON.parse(rawJson)
        if (!isValidOutput(parsed)) {
          ctx.log(`Task generation: invalid AI output for ${dep.name}, skipping`)
          continue
        }
        taskOutput = parsed
      } catch (err) {
        ctx.log(`Task generation: AI call failed for ${dep.name}: ${err instanceof Error ? err.message : String(err)}`)
        continue
      }

      const score = calculateScore(taskOutput.severity, taskOutput.type, taskOutput.complexity, settings)

      const locationMap = JSON.stringify({
        dependency: {
          category: dep.category,
          name: dep.name,
          current_version: dep.current_version,
          status: dep.status,
        },
        references,
      })

      await pool.request()
        .input('projectId', sql.UniqueIdentifier, projectId)
        .input('depId', sql.UniqueIdentifier, dep.dependency_id)
        .input('title', sql.NVarChar(500), taskOutput.title.slice(0, 500))
        .input('description', sql.NVarChar(sql.MAX), taskOutput.description)
        .input('severity', sql.NVarChar(10), taskOutput.severity)
        .input('type', sql.NVarChar(20), taskOutput.type)
        .input('complexity', sql.NVarChar(10), taskOutput.complexity)
        .input('score', sql.Int, score)
        .input('locationMap', sql.NVarChar(sql.MAX), locationMap)
        .input('recommendedFix', sql.NVarChar(sql.MAX), taskOutput.recommended_fix)
        .input('suggestedTests', sql.NVarChar(sql.MAX), taskOutput.suggested_tests)
        .query(`
          INSERT INTO tasks
            (project_id, dependency_id, title, description, severity, type, complexity, score, location_map, recommended_fix, suggested_tests)
          VALUES
            (@projectId, @depId, @title, @description, @severity, @type, @complexity, @score, @locationMap, @recommendedFix, @suggestedTests)
        `)

      tasksCreated++
      ctx.log(`Task generation: created task for ${dep.category}:${dep.name} (score: ${score})`)
    }

    await pool.request()
      .input('scanId', sql.UniqueIdentifier, scanId)
      .input('findingsCount', sql.Int, tasksCreated)
      .query(`
        UPDATE scan_history
        SET completed_at = GETUTCDATE(), findings_count = @findingsCount
        WHERE scan_id = @scanId
      `)

    ctx.log(`Task generation complete: ${tasksCreated} tasks created`)
  } catch (err) {
    ctx.log(`Task generation pipeline failed: ${err instanceof Error ? err.message : String(err)}`)
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
