import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  HelpCircle,
  Layers,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { projectsService } from '@/services/projects'
import type { DependencyDetail, DependencyDetailReference, ManifestDepRow, ManifestResponse, Task } from '@/types'

const CATEGORY_CONFIG: Record<string, { name: string; order: number }> = {
  'npm':            { name: 'npm packages',    order: 0 },
  'azure-sdk':      { name: 'Azure SDKs',      order: 1 },
  'ai-model':       { name: 'AI models',       order: 2 },
  'third-party-api':{ name: 'Third-party APIs',order: 3 },
  'azure-service':  { name: 'Azure services',  order: 4 },
  'orphaned':       { name: 'Orphaned code',   order: 5 },
  'other':          { name: 'Other',           order: 6 },
}

const STATUS_ORDER = ['critical', 'deprecated', 'warning', 'unknown', 'info', 'healthy']

function worstStatus(deps: ManifestDepRow[]): string {
  for (const s of STATUS_ORDER) {
    if (deps.some(d => d.status === s)) return s
  }
  return 'healthy'
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy:    'var(--color-success)',
    warning:    'var(--color-warning)',
    critical:   'var(--color-danger)',
    deprecated: 'var(--color-deprecated)',
    unknown:    'var(--color-neutral)',
    info:       'var(--color-info)',
  }
  return (
    <span className="status-dot" style={{ background: colors[status] ?? colors.unknown }} />
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string; Icon: typeof CheckCircle }> = {
    healthy:    { c: 'status-healthy',    label: 'Healthy',    Icon: CheckCircle },
    warning:    { c: 'status-warning',    label: 'Warning',    Icon: AlertTriangle },
    critical:   { c: 'status-critical',   label: 'Critical',   Icon: XCircle },
    deprecated: { c: 'status-deprecated', label: 'Deprecated', Icon: Clock },
    unknown:    { c: 'status-unknown',    label: 'Unknown',    Icon: HelpCircle },
    info:       { c: 'status-info',       label: 'Cleanup',    Icon: Archive },
  }
  const m = map[status] ?? map.unknown
  const Icon = m.Icon
  return (
    <span className={`badge ${m.c}`}>
      <Icon size={12} strokeWidth={2} />
      {m.label}
    </span>
  )
}

function DepDetail({
  dep,
  relatedTasks,
  onClose,
  onViewTask,
}: {
  dep: DependencyDetail
  relatedTasks: Task[]
  onClose: () => void
  onViewTask: (taskId: string) => void
}) {
  const catLabel = CATEGORY_CONFIG[dep.category]?.name ?? dep.category

  const refsByFile = useMemo(() => {
    const map: Record<string, { lines: (number | null)[]; parentFunction: string | null }> = {}
    for (const r of dep.references) {
      const key = r.file_path ?? '(unknown file)'
      if (!map[key]) map[key] = { lines: [], parentFunction: r.parent_function }
      if (r.line_number != null) map[key].lines.push(r.line_number)
    }
    return map
  }, [dep.references])

  const chainsWithEntries = useMemo(
    () => dep.references.filter(r => r.call_chain.length > 0),
    [dep.references],
  )

  return (
    <>
      <div className="panel-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title">{dep.name}</h2>
          <div className="panel-sub">
            {catLabel}
            {dep.current_version && (
              <>
                {' · v'}{dep.current_version}
                {dep.latest_version && dep.latest_version !== dep.current_version && (
                  <> → v{dep.latest_version}</>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={dep.status} />
            {relatedTasks.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ height: 22, fontSize: 11, padding: '0 8px', gap: 4 }}
                onClick={() => onViewTask(relatedTasks[0].task_id)}
              >
                <ClipboardList size={11} strokeWidth={2} />
                {relatedTasks.length === 1 ? '1 open task' : `${relatedTasks.length} open tasks`}
                <span style={{ color: 'var(--text-muted)' }}>· {relatedTasks[0].severity}</span>
              </button>
            )}
          </div>
        </div>
        <button className="x-btn" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">References ({dep.references.length})</h3>
        <ul className="refs-list" style={{ padding: 0, margin: 0 }}>
          {Object.entries(refsByFile).map(([file, { lines }]) => (
            <li key={file}>
              <span>{file}</span>
              {lines.length > 0 && (
                <span className="lineno">
                  line{lines.length > 1 ? 's' : ''} {lines.join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {chainsWithEntries.length > 0 && (
        <div className="panel-section">
          <h3 className="panel-section-title">Call chain</h3>
          {chainsWithEntries.map((ref: DependencyDetailReference) => (
            <div key={ref.reference_id} style={{ marginBottom: 12 }}>
              {ref.file_path && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                  {ref.file_path}{ref.line_number != null ? `:${ref.line_number}` : ''}
                </div>
              )}
              <div className="tree">
                {ref.call_chain
                  .slice()
                  .sort((a, b) => a.chain_depth - b.chain_depth)
                  .map((c, i, arr) => (
                    <div
                      key={i}
                      className={`tree-line ${i === arr.length - 1 ? 'curr' : ''}`}
                      style={{ paddingLeft: i * 16 }}
                    >
                      {i > 0 && <span className="conn">└── </span>}
                      {c.caller_file ?? '(unknown)'}
                      {c.caller_function ? `  →  ${c.caller_function}` : ''}
                      {i === arr.length - 1 && <span className="conn">  ← import site</span>}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

interface ManifestTabProps {
  projectId: string
  lastScannedAt: string | null
  refreshKey?: number
  onNavigateToTask: (taskId: string) => void
}

export function ManifestTab({ projectId, lastScannedAt, refreshKey, onNavigateToTask }: ManifestTabProps) {
  const [manifest, setManifest] = useState<ManifestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedDepId, setSelectedDepId] = useState<string | null>(null)
  const [depDetail, setDepDetail] = useState<DependencyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [depTasks, setDepTasks] = useState<Task[]>([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    projectsService
      .getManifest(projectId)
      .then(data => {
        setManifest(data)
        setExpanded(Object.fromEntries(Object.keys(data.categories).map(k => [k, true])))
      })
      .catch(() => setError('Failed to load manifest'))
      .finally(() => setLoading(false))
  }, [projectId, refreshKey])

  useEffect(() => {
    if (!selectedDepId) { setDepDetail(null); setDepTasks([]); return }
    setDetailLoading(true)
    setDepTasks([])
    Promise.all([
      projectsService.getDependencyDetail(projectId, selectedDepId),
      projectsService.getTasks(projectId, undefined, selectedDepId),
    ])
      .then(([detail, tasks]) => { setDepDetail(detail); setDepTasks(tasks) })
      .catch(() => { setDepDetail(null); setDepTasks([]) })
      .finally(() => setDetailLoading(false))
  }, [projectId, selectedDepId])

  const sortedCategories = useMemo(() => {
    if (!manifest) return []
    return Object.entries(manifest.categories)
      .sort(([a], [b]) => {
        const oa = CATEGORY_CONFIG[a]?.order ?? 99
        const ob = CATEGORY_CONFIG[b]?.order ?? 99
        return oa - ob
      })
  }, [manifest])

  const allDeps = useMemo(
    () => sortedCategories.flatMap(([, g]) => g.dependencies),
    [sortedCategories],
  )

  const filteredByCat = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return Object.fromEntries(sortedCategories.map(([k, g]) => [k, g.dependencies]))
    const result: Record<string, ManifestDepRow[]> = {}
    for (const [k, g] of sortedCategories) {
      result[k] = g.dependencies.filter(d => d.name.toLowerCase().includes(term))
    }
    return result
  }, [sortedCategories, q])

  const hasResults = Object.values(filteredByCat).some(list => list.length > 0)

  if (loading) {
    return (
      <div className="empty" style={{ flex: 1 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !manifest) {
    return (
      <div className="empty">
        <div className="empty-icon"><Layers size={28} /></div>
        <p className="empty-h">{error ?? 'No scan data'}</p>
        <p className="empty-p">Run a scan to map this project's dependencies</p>
      </div>
    )
  }

  if (manifest.total === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><Layers size={28} /></div>
        <p className="empty-h">{lastScannedAt ? 'No dependencies found' : 'No scan data'}</p>
        <p className="empty-p">
          {lastScannedAt
            ? 'The last scan completed but found no dependencies.'
            : "Run a scan to map this project's dependencies"}
        </p>
      </div>
    )
  }

  return (
    <div className={`split ${selectedDepId ? 'has-panel' : ''}`} style={{ flex: 1, minHeight: 0 }}>
      <div className="split-list">
        <div className="tab-toolbar">
          <div className="tab-toolbar-left">
            <h2>Manifest</h2>
            <span className="tab-toolbar-meta">
              {sortedCategories.filter(([, g]) => g.count > 0).length} categories · {allDeps.length} dependencies
            </span>
          </div>
          <div className="search-input toolbar-input">
            <Search size={14} />
            <input
              className="input"
              placeholder="Search dependencies…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>

        {!hasResults ? (
          <div className="empty" style={{ paddingTop: 40 }}>
            <div className="empty-icon" style={{ marginBottom: 8 }}><Search size={24} /></div>
            <p className="empty-h">No matches</p>
            <p className="empty-p">Try a different search term or clear the filter.</p>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setQ('')}>Clear filter</button>
            </div>
          </div>
        ) : (
          sortedCategories.map(([catKey, group]) => {
            const list = filteredByCat[catKey] ?? []
            if (list.length === 0) return null
            const open = expanded[catKey] ?? true
            const catName = CATEGORY_CONFIG[catKey]?.name ?? catKey
            return (
              <div key={catKey} className="cat-group">
                <div
                  className={`cat-head ${open ? 'expanded' : ''}`}
                  onClick={() => setExpanded(e => ({ ...e, [catKey]: !e[catKey] }))}
                >
                  <span className="cat-chev"><ChevronRight size={14} /></span>
                  <span className="cat-name">{catName}</span>
                  <span className="cat-count">
                    {list.length} {list.length === 1 ? 'dependency' : 'dependencies'}
                  </span>
                  <span className="cat-spacer" />
                  <StatusBadge status={worstStatus(list)} />
                </div>
                {open && (
                  <div className="dep-rows">
                    {list.map(dep => (
                      <div
                        key={dep.dependency_id}
                        className={`dep-row ${selectedDepId === dep.dependency_id ? 'selected' : ''}`}
                        onClick={() => setSelectedDepId(
                          selectedDepId === dep.dependency_id ? null : dep.dependency_id
                        )}
                      >
                        <StatusDot status={dep.status} />
                        <div className="dep-cell">
                          <span className="dep-name">{dep.name}</span>
                          <span className="dep-refs">
                            {dep.reference_count} {dep.reference_count === 1 ? 'reference' : 'references'}
                          </span>
                        </div>
                        <div className="dep-version">
                          {!dep.current_version ? (
                            <span className="muted">no version</span>
                          ) : (
                            <>
                              <span>{dep.current_version}</span>
                              {dep.latest_version && dep.latest_version !== dep.current_version && (
                                <>
                                  <span className="arrow">→</span>
                                  <span className="new">{dep.latest_version}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                        <StatusBadge status={dep.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="split-panel">
        <div className="split-panel-inner" style={{ padding: '20px 20px 40px' }}>
          {selectedDepId && (
            detailLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : depDetail ? (
              <DepDetail
                dep={depDetail}
                relatedTasks={depTasks}
                onClose={() => setSelectedDepId(null)}
                onViewTask={onNavigateToTask}
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  )
}
