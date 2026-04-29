import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckSquare, FolderPlus, Layers, MoreHorizontal, Play } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { ScanOverlay } from '@/components/ScanOverlay'
import { SettingsTab } from '@/pages/SettingsTab'
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

function ManifestPlaceholder() {
  return (
    <div className="empty">
      <div className="empty-icon"><Layers size={28} /></div>
      <p className="empty-h">No scan data</p>
      <p className="empty-p">Run a scan to map this project's dependencies</p>
    </div>
  )
}

function TasksPlaceholder() {
  return (
    <div className="empty">
      <div className="empty-icon"><CheckSquare size={28} /></div>
      <p className="empty-h">No tasks yet</p>
      <p className="empty-p">Run a scan to generate tasks</p>
    </div>
  )
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeTab } = useAppContext()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!id) { navigate('/'); return }
    setLoading(true)
    setLoadError(false)
    projectsService
      .get(id)
      .then(setProject)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return (
      <div className="empty" style={{ flex: 1 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (loadError || !project) {
    return (
      <div className="empty" style={{ flex: 1 }}>
        <div className="empty-icon"><FolderPlus size={28} /></div>
        <p className="empty-h">Could not load project</p>
        <p className="empty-p">Make sure the API is running, then try again.</p>
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to projects</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header compact">
        <div className="page-row">
          <div style={{ minWidth: 0 }}>
            <h1 className="page-title">{project.name}</h1>
            <div className="page-sub mono">
              {project.input_type}{project.repo_url ? ` · ${project.repo_url}` : ''}
              <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>
                · last scanned {formatRelativeTime(project.last_scanned_at)}
              </span>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-primary"
              disabled={scanning}
              onClick={() => setScanning(true)}
            >
              <Play size={13} strokeWidth={2.5} />
              Run scan
            </button>
            <button className="btn btn-secondary btn-icon" title="More actions">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'manifest' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <ManifestPlaceholder />
        </div>
      )}
      {activeTab === 'tasks' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <TasksPlaceholder />
        </div>
      )}
      {activeTab === 'settings' && <SettingsTab />}

      {scanning && <ScanOverlay onClose={() => setScanning(false)} />}
    </>
  )
}
