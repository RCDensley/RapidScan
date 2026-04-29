import { calculateScore, recalculateProjectScores, ScoringSettings } from './scoring'

jest.mock('mssql', () => ({
  UniqueIdentifier: 'UNIQUEIDENTIFIER',
  Int: 'INT',
}))

const PROJECT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TASK_1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const TASK_2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function buildPool(responses: Array<{ recordset: unknown[] }>) {
  const mockQuery = jest.fn()
  responses.forEach(r => mockQuery.mockResolvedValueOnce(r))
  const mockRequest = { input: jest.fn().mockReturnThis(), query: mockQuery }
  const mockPool = { request: jest.fn().mockReturnValue(mockRequest) }
  return { mockPool, mockQuery }
}

const DEFAULT_SETTINGS: Required<ScoringSettings> = {
  severity_critical: 4, severity_high: 3, severity_medium: 2, severity_low: 1,
  type_security: 4, type_deprecation: 3, type_version_update: 2, type_orphaned_code: 1,
  complexity_negligible: 4, complexity_low: 3, complexity_medium: 2, complexity_high: 1,
}

describe('calculateScore', () => {
  it('returns max score of 12 with default weights (critical + security + negligible)', () => {
    expect(calculateScore('critical', 'security', 'negligible', {})).toBe(12)
  })

  it('returns min score of 3 with default weights (low + orphaned-code + high)', () => {
    expect(calculateScore('low', 'orphaned-code', 'high', {})).toBe(3)
  })

  it('returns correct score for mid-range combination (high + deprecation + medium = 8)', () => {
    expect(calculateScore('high', 'deprecation', 'medium', {})).toBe(8)
  })

  it('returns correct score for version-update + low complexity (medium + version-update + low = 7)', () => {
    expect(calculateScore('medium', 'version-update', 'low', {})).toBe(7)
  })

  it('applies custom weights correctly', () => {
    const settings: ScoringSettings = { severity_critical: 10, type_security: 5, complexity_negligible: 3 }
    expect(calculateScore('critical', 'security', 'negligible', settings)).toBe(18)
  })

  it('falls back to defaults when only some settings are provided', () => {
    // Override severity only; type and complexity use defaults
    // critical(5) + security(4) + negligible(4) = 13
    const settings: ScoringSettings = { severity_critical: 5 }
    expect(calculateScore('critical', 'security', 'negligible', settings)).toBe(13)
  })

  it('falls back to defaults when settings is omitted', () => {
    // critical(4) + security(4) + negligible(4) = 12
    expect(calculateScore('critical', 'security', 'negligible')).toBe(12)
  })

  it("assigns weight 1 to type 'other' (not configurable)", () => {
    // low(1) + other(1) + high(1) = 3
    expect(calculateScore('low', 'other', 'high', {})).toBe(3)
  })

  it('scores correctly with all default weights explicitly provided', () => {
    expect(calculateScore('critical', 'security', 'negligible', DEFAULT_SETTINGS)).toBe(12)
    expect(calculateScore('low', 'orphaned-code', 'high', DEFAULT_SETTINGS)).toBe(3)
  })
})

describe('recalculateProjectScores', () => {
  it('fetches settings and tasks, then updates score for each open task', async () => {
    const { mockPool, mockQuery } = buildPool([
      { recordset: [DEFAULT_SETTINGS] },           // settings
      { recordset: [                                // open tasks
        { task_id: TASK_1, severity: 'critical', type: 'security', complexity: 'negligible' },   // 12
        { task_id: TASK_2, severity: 'low', type: 'orphaned-code', complexity: 'high' },         // 3
      ]},
      { recordset: [] },                            // UPDATE task 1
      { recordset: [] },                            // UPDATE task 2
    ])

    await recalculateProjectScores(mockPool as any, PROJECT_ID)

    expect(mockQuery).toHaveBeenCalledTimes(4)
    const sqls: string[] = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls[0]).toContain('project_settings')
    expect(sqls[1]).toContain('tasks')
    expect(sqls[2]).toContain('UPDATE tasks')
    expect(sqls[3]).toContain('UPDATE tasks')
  })

  it('falls back to default weights when no settings row exists for the project', async () => {
    const { mockPool, mockQuery } = buildPool([
      { recordset: [] },  // no settings row
      { recordset: [{ task_id: TASK_1, severity: 'critical', type: 'security', complexity: 'negligible' }] },
      { recordset: [] },  // UPDATE
    ])

    await recalculateProjectScores(mockPool as any, PROJECT_ID)

    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  it('performs no UPDATE queries when there are no open tasks', async () => {
    const { mockPool, mockQuery } = buildPool([
      { recordset: [DEFAULT_SETTINGS] },
      { recordset: [] }, // no open tasks
    ])

    await recalculateProjectScores(mockPool as any, PROJECT_ID)

    expect(mockQuery).toHaveBeenCalledTimes(2)
    const sqls: string[] = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls.some(s => s.includes('UPDATE'))).toBe(false)
  })
})
