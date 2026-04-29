import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckSquare, FolderOpen, FolderPlus, GitBranch, MoreHorizontal, Play, Upload } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { ScanOverlay } from '@/components/ScanOverlay'
import { ManifestTab } from '@/pages/ManifestTab'
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
  const [scanId, setScanId] = useState<string | null>(null)
  const [scanFilesTotal, setScanFilesTotal] = useState(0)
  const [scanError, setScanError] = useState<string | null>(null)
  const [manifestRefreshKey, setManifestRefreshKey] = useState(0)
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localPath, setLocalPath] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleLocalIngest() {
    if (!localPath.trim() || !id) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await projectsService.ingestLocal(id, localPath.trim())
      setFileCount(result.count)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Ingestion failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleGithubIngest() {
    if (!id) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await projectsService.ingestGithub(id)
      setFileCount(result.count)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Ingestion failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleRunScan() {
    if (!id) return
    setScanError(null)
    try {
      const result = await projectsService.startHeavyScan(id)
      setScanId(result.scan_id)
      setScanFilesTotal(result.files_total)
      setScanning(true)
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'Failed to start scan')
    }
  }

  async function handleUpload() {
    if (!selectedFile || !id) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await projectsService.ingestZip(id, selectedFile)
      setFileCount(result.count)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
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
              onClick={handleRunScan}
            >
              <Play size={13} strokeWidth={2.5} />
              Run scan
            </button>
            {scanError && (
              <span style={{ fontSize: 12, color: 'var(--color-danger)', alignSelf: 'center' }}>{scanError}</span>
            )}
            <button className="btn btn-secondary btn-icon" title="More actions">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      </div>

      {project.input_type === 'zip' && fileCount === null && (
        <div style={{
          padding: '14px 36px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}>
          <div className="row" style={{ gap: 10 }}>
            <Upload size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.rar"
              style={{ display: 'none' }}
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {selectedFile ? selectedFile.name : 'Choose ZIP file'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
            >
              {uploading ? 'Uploading…' : 'Upload and prepare for scan'}
            </button>
            {uploadError && (
              <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{uploadError}</span>
            )}
          </div>
        </div>
      )}

      {project.input_type === 'zip' && fileCount !== null && (
        <div style={{
          padding: '10px 36px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>{fileCount} files ready</span>
          <span>·</span>
          <span>Click <strong style={{ color: 'var(--text-primary)' }}>Run Scan</strong> to begin</span>
        </div>
      )}

      {project.input_type === 'local' && fileCount === null && (
        <div style={{
          padding: '14px 36px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}>
          <div className="row" style={{ gap: 10 }}>
            <FolderOpen size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              className="input"
              placeholder="C:\path\to\project"
              value={localPath}
              onChange={e => setLocalPath(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLocalIngest() }}
              disabled={uploading}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={!localPath.trim() || uploading}
              onClick={handleLocalIngest}
            >
              {uploading ? 'Scanning…' : 'Prepare local scan'}
            </button>
            {uploadError && (
              <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{uploadError}</span>
            )}
          </div>
        </div>
      )}

      {project.input_type === 'local' && fileCount !== null && (
        <div style={{
          padding: '10px 36px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>{fileCount} files ready</span>
          <span>·</span>
          <span>Click <strong style={{ color: 'var(--text-primary)' }}>Run Scan</strong> to begin</span>
        </div>
      )}

      {project.input_type === 'github' && fileCount === null && (
        <div style={{
          padding: '14px 36px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}>
          <div className="row" style={{ gap: 10 }}>
            <GitBranch size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <button
              className="btn btn-primary btn-sm"
              disabled={uploading}
              onClick={handleGithubIngest}
            >
              {uploading ? 'Fetching repo…' : 'Fetch repo and prepare scan'}
            </button>
            {uploadError && (
              <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{uploadError}</span>
            )}
          </div>
        </div>
      )}

      {project.input_type === 'github' && fileCount !== null && (
        <div style={{
          padding: '10px 36px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>{fileCount} files ready</span>
          <span>·</span>
          <span>Click <strong style={{ color: 'var(--text-primary)' }}>Run Scan</strong> to begin</span>
        </div>
      )}

      {activeTab === 'manifest' && (
        <ManifestTab
          projectId={id!}
          lastScannedAt={project.last_scanned_at}
          refreshKey={manifestRefreshKey}
        />
      )}
      {activeTab === 'tasks' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <TasksPlaceholder />
        </div>
      )}
      {activeTab === 'settings' && <SettingsTab />}

      {scanning && scanId && (
        <ScanOverlay
          onClose={() => { setScanning(false); setScanId(null); setManifestRefreshKey(k => k + 1) }}
          projectId={id!}
          scanId={scanId}
          filesTotal={scanFilesTotal}
        />
      )}
    </>
  )
}
