import { upsertDependency } from './upsert'
import { DependencyFinding } from '../../types/scan'

jest.mock('mssql', () => ({
  UniqueIdentifier: 'UNIQUEIDENTIFIER',
  NVarChar: (n: number) => `NVARCHAR(${n})`,
  Int: 'INT',
}))

const PROJECT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const FILE_PATH = 'src/utils/api.ts'
const DEP_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const REF_ID_1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const REF_ID_2 = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

function buildPool(responses: Array<{ recordset: unknown[] }>) {
  const mockQuery = jest.fn()
  responses.forEach(r => mockQuery.mockResolvedValueOnce(r))
  const mockRequest = { input: jest.fn().mockReturnThis(), query: mockQuery }
  const mockPool = { request: jest.fn().mockReturnValue(mockRequest) }
  return { mockPool, mockQuery }
}

const baseFinding: DependencyFinding = {
  category: 'npm',
  name: 'axios',
  version: '1.6.0',
  lineNumber: 3,
  parentFunction: 'fetchData',
  parentClass: null,
  callChain: [],
}

describe('upsertDependency', () => {
  it('inserts new dependency and reference when not previously seen', async () => {
    const { mockPool, mockQuery } = buildPool([
      { recordset: [] },                             // SELECT → not found
      { recordset: [{ dependency_id: DEP_ID }] },   // INSERT dep → new row
      { recordset: [{ reference_id: REF_ID_1 }] },  // INSERT ref
    ])

    await upsertDependency(mockPool as any, PROJECT_ID, FILE_PATH, baseFinding)

    expect(mockQuery).toHaveBeenCalledTimes(3)
    const sqls: string[] = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls[0]).toContain('SELECT dependency_id FROM dependencies')
    expect(sqls[1]).toContain('INSERT INTO dependencies')
    expect(sqls[2]).toContain('INSERT INTO dependency_references')
  })

  it('calling same dependency twice produces one dependency row and two reference rows', async () => {
    const { mockPool, mockQuery } = buildPool([
      // First call — new dependency:
      { recordset: [] },                             // SELECT → not found
      { recordset: [{ dependency_id: DEP_ID }] },   // INSERT dep
      { recordset: [{ reference_id: REF_ID_1 }] },  // INSERT ref 1
      // Second call — existing dependency:
      { recordset: [{ dependency_id: DEP_ID }] },   // SELECT → found
      { recordset: [] },                             // UPDATE dep
      { recordset: [{ reference_id: REF_ID_2 }] },  // INSERT ref 2
    ])

    await upsertDependency(mockPool as any, PROJECT_ID, FILE_PATH, baseFinding)
    await upsertDependency(mockPool as any, PROJECT_ID, FILE_PATH, baseFinding)

    expect(mockQuery).toHaveBeenCalledTimes(6)
    const sqls: string[] = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)

    // First call: INSERT dep, not UPDATE
    expect(sqls[1]).toContain('INSERT INTO dependencies')
    // Second call: UPDATE dep, not INSERT
    expect(sqls[4]).toContain('UPDATE dependencies')
    // Two reference inserts total
    const refInserts = sqls.filter(s => s.includes('INSERT INTO dependency_references'))
    expect(refInserts).toHaveLength(2)
  })

  it('updates current_version and last_updated_at on subsequent call', async () => {
    const { mockPool, mockQuery } = buildPool([
      { recordset: [{ dependency_id: DEP_ID }] },   // SELECT → found
      { recordset: [] },                             // UPDATE
      { recordset: [{ reference_id: REF_ID_1 }] },  // INSERT ref
    ])

    await upsertDependency(mockPool as any, PROJECT_ID, FILE_PATH, { ...baseFinding, version: '2.0.0' })

    const sqls: string[] = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls[1]).toContain('UPDATE dependencies')
    expect(sqls[1]).toContain('current_version = @version')
    expect(sqls[1]).toContain('last_updated_at = GETUTCDATE()')
  })

  it('persists all call chain entries with correct foreign key (reference_id)', async () => {
    const findingWithChain: DependencyFinding = {
      ...baseFinding,
      callChain: [
        { callerFunction: 'main', callerFile: 'src/index.ts', callerLine: 10, chainDepth: 1, confidence: 'high' },
        { callerFunction: 'init', callerFile: 'src/app.ts', callerLine: 5, chainDepth: 2, confidence: 'medium' },
      ],
    }

    const { mockPool, mockQuery } = buildPool([
      { recordset: [] },                             // SELECT → not found
      { recordset: [{ dependency_id: DEP_ID }] },   // INSERT dep
      { recordset: [{ reference_id: REF_ID_1 }] },  // INSERT ref
      { recordset: [] },                             // INSERT chain entry 1
      { recordset: [] },                             // INSERT chain entry 2
    ])

    await upsertDependency(mockPool as any, PROJECT_ID, FILE_PATH, findingWithChain)

    expect(mockQuery).toHaveBeenCalledTimes(5)
    const sqls: string[] = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)
    const chainInserts = sqls.filter(s => s.includes('INSERT INTO call_chains'))
    expect(chainInserts).toHaveLength(2)
  })

  it('inserts reference rows with correct file path and location', async () => {
    const { mockPool, mockQuery } = buildPool([
      { recordset: [] },
      { recordset: [{ dependency_id: DEP_ID }] },
      { recordset: [{ reference_id: REF_ID_1 }] },
    ])

    await upsertDependency(mockPool as any, PROJECT_ID, 'src/services/auth.ts', baseFinding)

    const sqls: string[] = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(sqls[2]).toContain('file_path')
    expect(sqls[2]).toContain('line_number')
    expect(sqls[2]).toContain('parent_function')
    expect(sqls[2]).toContain('parent_class')
  })
})
