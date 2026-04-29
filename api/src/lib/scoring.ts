import * as sql from 'mssql'

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type TaskType = 'security' | 'deprecation' | 'version-update' | 'orphaned-code' | 'other'
export type Complexity = 'negligible' | 'low' | 'medium' | 'high'

export interface ScoringSettings {
  severity_critical?: number
  severity_high?: number
  severity_medium?: number
  severity_low?: number
  type_security?: number
  type_deprecation?: number
  type_version_update?: number
  type_orphaned_code?: number
  complexity_negligible?: number
  complexity_low?: number
  complexity_medium?: number
  complexity_high?: number
}

const DEFAULTS: Required<ScoringSettings> = {
  severity_critical: 4,
  severity_high: 3,
  severity_medium: 2,
  severity_low: 1,
  type_security: 4,
  type_deprecation: 3,
  type_version_update: 2,
  type_orphaned_code: 1,
  complexity_negligible: 4,
  complexity_low: 3,
  complexity_medium: 2,
  complexity_high: 1,
}

export function calculateScore(
  severity: Severity,
  type: TaskType,
  complexity: Complexity,
  settings: ScoringSettings = {}
): number {
  const s = { ...DEFAULTS, ...settings }

  const sevMap: Record<Severity, number> = {
    critical: s.severity_critical,
    high: s.severity_high,
    medium: s.severity_medium,
    low: s.severity_low,
  }
  const typMap: Record<TaskType, number> = {
    security: s.type_security,
    deprecation: s.type_deprecation,
    'version-update': s.type_version_update,
    'orphaned-code': s.type_orphaned_code,
    other: 1,
  }
  const cmpMap: Record<Complexity, number> = {
    negligible: s.complexity_negligible,
    low: s.complexity_low,
    medium: s.complexity_medium,
    high: s.complexity_high,
  }

  return sevMap[severity] + typMap[type] + cmpMap[complexity]
}

export async function recalculateProjectScores(
  pool: sql.ConnectionPool,
  projectId: string
): Promise<void> {
  const settingsResult = await pool
    .request()
    .input('project_id', sql.UniqueIdentifier, projectId)
    .query<ScoringSettings>('SELECT * FROM project_settings WHERE project_id = @project_id')

  const settings: ScoringSettings = settingsResult.recordset[0] ?? {}

  const tasksResult = await pool
    .request()
    .input('project_id', sql.UniqueIdentifier, projectId)
    .query<{ task_id: string; severity: Severity; type: TaskType; complexity: Complexity }>(
      `SELECT task_id, severity, type, complexity FROM tasks WHERE project_id = @project_id AND status = 'open'`
    )

  for (const task of tasksResult.recordset) {
    const score = calculateScore(task.severity, task.type, task.complexity, settings)
    await pool
      .request()
      .input('task_id', sql.UniqueIdentifier, task.task_id)
      .input('score', sql.Int, score)
      .query('UPDATE tasks SET score = @score, updated_at = GETUTCDATE() WHERE task_id = @task_id')
  }
}
