import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Upload, X } from 'lucide-react'
import { projectsService, type CreateProjectPayload } from '@/services/projects'
import type { InputType, Project } from '@/types'

interface NewProjectModalProps {
  onClose: () => void
  onCreated: (project: Project) => void
}

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<InputType>('github')
  const [url, setUrl] = useState('')
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [localPath, setLocalPath] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [over, setOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleFileSelect(file: File) {
    const n = file.name.toLowerCase()
    if (!n.endsWith('.zip') && !n.endsWith('.rar')) {
      setError('Only .zip and .rar files are accepted')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File must be under 100 MB')
      return
    }
    setError('')
    setZipFile(file)
  }

  const valid =
    !!name.trim() &&
    (type === 'github' ? !!url.trim() : true) &&
    (type === 'local'  ? !!localPath.trim() : true)

  async function handleCreate() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const payload: CreateProjectPayload = { name: name.trim(), input_type: type }
      if (type === 'github') { payload.repo_url = url.trim(); if (pat.trim()) payload.github_pat = pat.trim() }
      if (type === 'local')  { payload.repo_url = localPath.trim() }
      const project = await projectsService.create(payload)
      onCreated(project)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">New project</h2>
          <button className="x-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">
          <div className="col" style={{ gap: 18 }}>
            {/* Name */}
            <div>
              <label className="field-label">Project name</label>
              <input
                className="input"
                placeholder="e.g. Atlas Web"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Input type segmented */}
            <div>
              <label className="field-label">Input type</label>
              <div className="seg">
                {(['github', 'zip', 'local'] as InputType[]).map(t => (
                  <button
                    key={t}
                    className={type === t ? 'active' : ''}
                    onClick={() => setType(t)}
                  >
                    {t === 'github' ? 'GitHub repo' : t === 'zip' ? 'ZIP / RAR' : 'Local path'}
                  </button>
                ))}
              </div>
            </div>

            {/* GitHub */}
            {type === 'github' && (
              <>
                <div>
                  <label className="field-label">Repository URL or owner/repo</label>
                  <input
                    className="input mono"
                    placeholder="acme-co/atlas-web"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">
                    Personal access token{' '}
                    <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input mono"
                      type={showPat ? 'text' : 'password'}
                      placeholder="ghp_••••••••••••••••"
                      value={pat}
                      onChange={e => setPat(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="menu-btn"
                      style={{ position: 'absolute', right: 4, top: 4 }}
                      onClick={() => setShowPat(s => !s)}
                    >
                      {showPat ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="field-help">Leave blank for public repositories.</div>
                </div>
              </>
            )}

            {/* ZIP / RAR */}
            {type === 'zip' && (
              <div>
                <label className="field-label">Upload archive</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.rar"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                <div
                  className={`drop ${over ? 'over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setOver(true) }}
                  onDragLeave={() => setOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setOver(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                >
                  <Upload size={22} style={{ display: 'block', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13 }}>
                    {zipFile ? zipFile.name : 'Drag & drop a ZIP or RAR file here, or browse'}
                  </div>
                  <div className="field-help">.zip or .rar · max 100 MB</div>
                </div>
              </div>
            )}

            {/* Local */}
            {type === 'local' && (
              <div>
                <label className="field-label">Local directory path</label>
                <input
                  className="input mono"
                  placeholder="/srv/builds/my-project"
                  value={localPath}
                  onChange={e => setLocalPath(e.target.value)}
                />
                <div className="field-help">Absolute path accessible from the API server.</div>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 13, padding: '8px 12px', background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius-md)' }}>
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!valid || submitting}
            onClick={handleCreate}
          >
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  )
}
