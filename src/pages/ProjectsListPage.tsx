import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle, Clock, FolderPlus, HelpCircle,
  MoreVertical, Plus, XCircle,
} from 'lucide-react'
import { NewProjectModal } from '@/components/NewProjectModal'
import { projectsService } from '@/services/projects'
import type { Project } from '@/types'

function formatRelativeTime(date: string | null): string {
  if (!date) return 'never'
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function sourceLabel(type: string) {
  return { github: 'github', zip: 'zip', local: 'local' }[type] ?? type
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  healthy:    <CheckCircle size={12} strokeWidth={2} />,
  warning:    <AlertTriangle size={12} strokeWidth={2} />,
  critical:   <XCircle size={12} strokeWidth={2} />,
  deprecated: <Clock size={12} strokeWidth={2} />,
  unknown:    <HelpCircle size={12} strokeWidth={2} />,
}
const STATUS_LABELS: Record<string, string> = {
  healthy: 'Healthy', warning: 'Warning', critical: 'Critical',
  deprecated: 'Deprecated', unknown: 'Unknown',
}

function StatusBadge({ status }: { status: string }) {
  const cls = `badge status-${status in STATUS_LABELS ? status : 'unknown'}`
  const label = STATUS_LABELS[status] ?? 'Unknown'
  const icon = STATUS_ICONS[status] ?? STATUS_ICONS.unknown
  return <span className={cls}>{icon}{label}</span>
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: Project
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    await projectsService.delete(project.project_id).catch(() => null)
    onDelete(project.project_id)
  }

  return (
    <div className="proj-card" onClick={() => onOpen(project.project_id)}>
      <div className="proj-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="proj-card-name">{project.name}</div>
          <div className="proj-card-source">
            {sourceLabel(project.input_type)}{project.repo_url ? ` · ${project.repo_url}` : ''}
          </div>
        </div>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="menu-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: 32, right: 0, zIndex: 5,
                background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                minWidth: 140, padding: 4,
              }}
            >
              <button
                className="sidebar-tab"
                style={{ height: 32 }}
                onClick={e => { e.stopPropagation(); onOpen(project.project_id) }}
              >
                <span className="label" style={{ opacity: 1, fontSize: 13 }}>Edit</span>
              </button>
              <button
                className="sidebar-tab"
                style={{ height: 32, color: '#f87171' }}
                onClick={handleDelete}
              >
                <span className="label" style={{ opacity: 1, fontSize: 13 }}>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="proj-card-meta">
        <div className="proj-meta-row">
          <span className="lbl">Last scanned</span>
          <span className="val">{formatRelativeTime(project.last_scanned_at)}</span>
        </div>
        <div className="proj-meta-row">
          <span className="lbl">Open tasks</span>
          <span className="badge status-unknown">—</span>
        </div>
        <div className="proj-meta-row">
          <span className="lbl">Status</span>
          <StatusBadge status="unknown" />
        </div>
      </div>

      <div className="proj-card-actions">
        <button
          className="btn btn-secondary btn-sm"
          onClick={e => { e.stopPropagation(); onOpen(project.project_id) }}
        >
          View project
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={e => { e.stopPropagation(); onOpen(project.project_id) }}
        >
          Run scan
        </button>
      </div>
    </div>
  )
}

export function ProjectsListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  const [showNew, setShowNew] = useState(false)

  function loadProjects() {
    setLoading(true)
    setApiError(false)
    projectsService
      .list()
      .then(data => { setProjects(data); setApiError(false) })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadProjects() }, [])

  function handleOpen(id: string) {
    navigate(`/projects/${id}`)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-row">
          <div>
            <h1 className="page-title">Projects</h1>
            <div className="page-sub">
              {loading ? 'Loading…' : apiError ? 'Could not connect to API' : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={16} strokeWidth={2.25} />
            New project
          </button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="empty">
            <div
              style={{
                width: 28, height: 28,
                borderRadius: '50%',
                border: '2px solid var(--border-subtle)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        ) : apiError ? (
          <div className="empty">
            <div className="empty-icon">
              <AlertTriangle size={28} />
            </div>
            <p className="empty-h">Could not connect to API</p>
            <p className="empty-p">
              Make sure the Azure Functions host is running on port 7071.
            </p>
            <div style={{ marginTop: 8 }}>
              <code style={{
                display: 'block',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: '6px 12px',
                color: 'var(--text-secondary)', marginBottom: 12,
              }}>
                cd api &amp;&amp; func start
              </code>
              <button className="btn btn-secondary" onClick={loadProjects}>Retry</button>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><FolderPlus size={28} /></div>
            <p className="empty-h">No projects yet</p>
            <p className="empty-p">
              Scan an existing codebase to get started — connect a GitHub repo, upload a ZIP, or point at a local path.
            </p>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                <Plus size={16} strokeWidth={2.25} />
                New project
              </button>
            </div>
          </div>
        ) : (
          <div className="proj-grid">
            {projects.map(p => (
              <ProjectCard
                key={p.project_id}
                project={p}
                onOpen={handleOpen}
                onDelete={id => setProjects(prev => prev.filter(x => x.project_id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={p => {
            setProjects(prev => [p, ...prev])
            setShowNew(false)
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
