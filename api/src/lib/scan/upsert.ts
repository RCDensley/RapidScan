import * as sql from 'mssql'
import { DependencyFinding } from '../../types/scan'

/**
 * Upserts a single dependency finding into the database.
 * Composite key for deduplication: project_id + category + name.
 * References and call chains always accumulate — they are never deduped.
 */
export async function upsertDependency(
  pool: sql.ConnectionPool,
  projectId: string,
  filePath: string,
  finding: DependencyFinding
): Promise<void> {
  const existing = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .input('category', sql.NVarChar(30), finding.category)
    .input('name', sql.NVarChar(500), finding.name)
    .query<{ dependency_id: string }>(`
      SELECT dependency_id FROM dependencies
      WHERE project_id = @projectId AND category = @category AND name = @name
    `)

  let dependencyId: string

  if (existing.recordset.length > 0) {
    dependencyId = existing.recordset[0].dependency_id
    await pool.request()
      .input('dependencyId', sql.UniqueIdentifier, dependencyId)
      .input('version', sql.NVarChar(100), finding.version)
      .query(`
        UPDATE dependencies
        SET current_version = @version, last_updated_at = GETUTCDATE()
        WHERE dependency_id = @dependencyId
      `)
  } else {
    const inserted = await pool.request()
      .input('projectId', sql.UniqueIdentifier, projectId)
      .input('category', sql.NVarChar(30), finding.category)
      .input('name', sql.NVarChar(500), finding.name)
      .input('version', sql.NVarChar(100), finding.version)
      .query<{ dependency_id: string }>(`
        INSERT INTO dependencies (project_id, category, name, current_version)
        OUTPUT inserted.dependency_id
        VALUES (@projectId, @category, @name, @version)
      `)
    dependencyId = inserted.recordset[0].dependency_id
  }

  const ref = await pool.request()
    .input('dependencyId', sql.UniqueIdentifier, dependencyId)
    .input('filePath', sql.NVarChar(1000), filePath)
    .input('lineNumber', sql.Int, finding.lineNumber)
    .input('parentFunction', sql.NVarChar(500), finding.parentFunction)
    .input('parentClass', sql.NVarChar(500), finding.parentClass)
    .query<{ reference_id: string }>(`
      INSERT INTO dependency_references (dependency_id, file_path, line_number, parent_function, parent_class)
      OUTPUT inserted.reference_id
      VALUES (@dependencyId, @filePath, @lineNumber, @parentFunction, @parentClass)
    `)
  const referenceId = ref.recordset[0].reference_id

  for (const entry of finding.callChain) {
    await pool.request()
      .input('referenceId', sql.UniqueIdentifier, referenceId)
      .input('callerFunction', sql.NVarChar(500), entry.callerFunction)
      .input('callerFile', sql.NVarChar(1000), entry.callerFile)
      .input('callerLine', sql.Int, entry.callerLine)
      .input('chainDepth', sql.Int, entry.chainDepth)
      .input('confidence', sql.NVarChar(10), entry.confidence)
      .query(`
        INSERT INTO call_chains (reference_id, caller_function, caller_file, caller_line, chain_depth, confidence)
        VALUES (@referenceId, @callerFunction, @callerFile, @callerLine, @chainDepth, @confidence)
      `)
  }
}
