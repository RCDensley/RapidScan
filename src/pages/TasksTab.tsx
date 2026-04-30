import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, FilterX, Search, X } from 'lucide-react'
import { projectsService } from '@/services/projects'
import type { Task, TaskStatus } from '@/types'

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function scoreCls(score: number): string {
  if (score >= 10) return 'sev-critical'
  if (score >= 7) return 'sev-high'
  if (score >= 5) return 'sev-medium'
  return 'sev-low'
}

function ScoreBadge({ score }: { score: number }) {
  return <span className={`score ${scoreCls(score)}`}>{score}</span>
}

function SeverityBadge({ severity }: { severity: string }) {
  return <span className={`sev-badge sev-${severity}`}>{severity}</span>
}

const TYPE_LABELS: Record<string, string> = {
  'security':       'Security',
  'deprecation':    'Deprecation',
  'version-update': 'Version update',
  'orphaned-code':  'Orphaned code',
  'other':          'Other',
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  'open':        { label: 'Open',        cls: 'status-warning' },
  'in-progress': { label: 'In progress', cls: 'status-accent' },
  'resolved':    { label: 'Resolved',    cls: 'status-healthy' },
  'dismissed':   { label: 'Dismissed',   cls: 'status-unknown' },
}

function TaskStatusBadge({ status }: { status: string }) {
  const m = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  return <span className={`badge ${m.cls}`}>{m.label}</span>
}

function urgClass(task: Task): string {
  if (task.type === 'orphaned-code') return 'urg-info'
  const map: Record<string, string> = {
    critical: 'urg-critical',
    high:     'urg-high',
    medium:   'urg-medium',
    low:      'urg-low',
  }
  return map[task.severity] ?? 'urg-low'
}

function parseMarkdown(text: string): Array<{ type: 'text' | 'code'; text: string }> {
  const segments: Array<{ type: 'text' | 'code'; text: string }> = []
  const lines = text.split('\n')
  let inCode = false
  let current: string[] = []

  for (const line of lines) {
    if (!inCode && line.startsWith('```')) {
      if (current.length > 0) segments.push({ type: 'text', text: current.join('\n') })
      current = []
      inCode = true
    } else if (inCode && line.startsWith('```')) {
      segments.push({ type: 'code', text: current.join('\n') })
      current = []
      inCode = false
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) segments.push({ type: inCode ? 'code' : 'text', text: current.join('\n') })
  return segments
}

function MarkdownContent({ content }: { content: string }) {
  const segments = parseMarkdown(content)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <pre key={i} className="codeblock">{seg.text}</pre>
        ) : seg.text.trim() ? (
          <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            {seg.text.trim()}
          </p>
        ) : null
      )}
    </div>
  )
}

function TaskDetailPanel({
  task,
  onClose,
  onStatusChange,
}: {
  task: Task
  onClose: () => void
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)

  async function handleStatusChange(status: string) {
    setUpdating(true)
    await onStatusChange(task.task_id, status as TaskStatus)
    setUpdating(false)
  }

  const firstFile = task.location_map?.references?.[0]?.file ?? null

  return (
    <>
      <div className="panel-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title" style={{ fontFamily: 'var(--font-sans)', fontSize: 17 }}>
            {task.title}
          </h2>
          {firstFile && (
            <div className="panel-sub mono" style={{ marginTop: 4, fontSize: 12 }}>{firstFile}</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SeverityBadge severity={task.severity} />
            <ScoreBadge score={task.score} />
            <span className="badge status-unknown" style={{ fontSize: 11 }}>
              {TYPE_LABELS[task.type] ?? task.type}
            </span>
            <span className="badge status-unknown" style={{ fontSize: 11 }}>
              {task.complexity}
            </span>
            <select
              className="select"
              style={{ width: 'auto', height: 28, padding: '2px 8px', fontSize: 12 }}
              value={task.status}
              disabled={updating}
              onChange={e => handleStatusChange(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="in-progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
        <button className="x-btn" onClick={onClose}><X size={14} /></button>
      </div>

      {task.description && (
        <div className="panel-section">
          <h3 className="panel-section-title">Description</h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            {task.description}
          </p>
        </div>
      )}

      {(task.location_map?.references?.length ?? 0) > 0 && (
        <div className="panel-section">
          <h3 className="panel-section-title">
            Location map ({task.location_map!.references.length})
          </h3>
          <ul className="refs-list" style={{ padding: 0, margin: 0 }}>
            {task.location_map!.references.map((ref, i) => (
              <li key={i}>
                <span>{ref.file}</span>
                {ref.line != null && (
                  <span className="lineno">line {ref.line}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {task.recommended_fix && (
        <div className="panel-section">
          <h3 className="panel-section-title">Recommended fix</h3>
          <MarkdownContent content={task.recommended_fix} />
        </div>
      )}

      {task.suggested_tests && (
        <div className="panel-section">
          <h3 className="panel-section-title">Suggested tests</h3>
          <MarkdownContent content={task.suggested_tests} />
        </div>
      )}
    </>
  )
}

interface TasksTabProps {
  projectId: string
  lastScannedAt: string | null
  taskNav?: { key: number; taskId: string } | null
}

export function TasksTab({ projectId, lastScannedAt, taskNav }: TasksTabProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hiddenLoaded, setHiddenLoaded] = useState(false)
  const [hiddenLoading, setHiddenLoading] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelectedTaskId(null)
    setShowHidden(false)
    setHiddenLoaded(false)
    setAllTasks([])
    projectsService
      .getTasks(projectId)
      .then(setAllTasks)
      .catch(() => setError('Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (taskNav?.taskId) setSelectedTaskId(taskNav.taskId)
  }, [taskNav])

  async function toggleShowHidden() {
    const next = !showHidden
    setShowHidden(next)
    if (next && !hiddenLoaded) {
      setHiddenLoading(true)
      try {
        const [resolved, dismissed] = await Promise.all([
          projectsService.getTasks(projectId, 'resolved'),
          projectsService.getTasks(projectId, 'dismissed'),
        ])
        setAllTasks(prev => {
          const existingIds = new Set(prev.map(t => t.task_id))
          const incoming = [...resolved, ...dismissed].filter(t => !existingIds.has(t.task_id))
          return [...prev, ...incoming]
        })
        setHiddenLoaded(true)
      } finally {
        setHiddenLoading(false)
      }
    }
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      const updated = await projectsService.updateTaskStatus(projectId, taskId, status)
      setAllTasks(prev => prev.map(t => t.task_id === taskId ? updated : t))
    } catch {
      // ignore — panel still shows last known state
    }
  }

  const displayedTasks = useMemo(() => {
    let list = showHidden
      ? allTasks
      : allTasks.filter(t => t.status === 'open' || t.status === 'in-progress')

    const term = q.trim().toLowerCase()
    if (term) list = list.filter(t => t.title.toLowerCase().includes(term))

    return [...list].sort((a, b) => b.score - a.score)
  }, [allTasks, showHidden, q])

  const selectedTask = useMemo(
    () => allTasks.find(t => t.task_id === selectedTaskId) ?? null,
    [allTasks, selectedTaskId],
  )

  const counts = useMemo(() => ({
    open:       allTasks.filter(t => t.status === 'open').length,
    inProgress: allTasks.filter(t => t.status === 'in-progress').length,
  }), [allTasks])

  if (loading) {
    return (
      <div className="empty" style={{ flex: 1 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="empty">
        <div className="empty-icon"><CheckSquare size={28} /></div>
        <p className="empty-h">{error}</p>
        <p className="empty-p">Make sure the API is running and try again.</p>
      </div>
    )
  }

  const activeTasks = allTasks.filter(t => t.status === 'open' || t.status === 'in-progress')

  if (activeTasks.length === 0 && !showHidden) {
    return (
      <div className="empty">
        <div className="empty-icon"><CheckSquare size={28} /></div>
        <p className="empty-h">{lastScannedAt ? 'No open tasks' : 'No tasks yet'}</p>
        <p className="empty-p">
          {lastScannedAt
            ? 'All tasks have been resolved or dismissed.'
            : 'Run a scan to generate tasks.'}
        </p>
        {lastScannedAt && (
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={toggleShowHidden} disabled={hiddenLoading}>
              {hiddenLoading ? 'Loading…' : 'Show resolved & dismissed'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`split ${selectedTaskId ? 'has-panel' : ''}`} style={{ flex: 1, minHeight: 0 }}>
      <div className="split-list">
        <div className="tab-toolbar">
          <div className="tab-toolbar-left">
            <h2>Tasks</h2>
            <span className="tab-toolbar-meta">
              {counts.open} open · {counts.inProgress} in progress
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="search-input toolbar-input">
              <Search size={14} />
              <input
                className="input"
                placeholder="Search tasks…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <button
              className={`btn btn-sm ${showHidden ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleShowHidden}
              disabled={hiddenLoading}
            >
              {hiddenLoading ? 'Loading…' : showHidden ? 'Hide resolved' : 'Show resolved'}
            </button>
          </div>
        </div>

        {displayedTasks.length === 0 ? (
          <div className="empty" style={{ paddingTop: 40 }}>
            <div className="empty-icon" style={{ marginBottom: 8 }}><FilterX size={24} /></div>
            <p className="empty-h">No matching tasks</p>
            <p className="empty-p">Try a different search term or clear the filter.</p>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setQ('')}>Clear search</button>
            </div>
          </div>
        ) : (
          displayedTasks.map(task => (
            <div
              key={task.task_id}
              className={`task-row ${urgClass(task)} ${selectedTaskId === task.task_id ? 'selected' : ''}`}
              onClick={() => setSelectedTaskId(selectedTaskId === task.task_id ? null : task.task_id)}
            >
              <SeverityBadge severity={task.severity} />
              <div style={{ minWidth: 0 }}>
                <div className="task-title">{task.title}</div>
                <div className="task-sub">
                  {TYPE_LABELS[task.type] ?? task.type} · {task.complexity}
                </div>
              </div>
              <ScoreBadge score={task.score} />
              <TaskStatusBadge status={task.status} />
              <span className="task-time">{formatRelativeTime(task.created_at)}</span>
            </div>
          ))
        )}
      </div>

      <div className="split-panel">
        <div className="split-panel-inner">
          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              onClose={() => setSelectedTaskId(null)}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}
