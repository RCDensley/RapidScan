import { useEffect, useState } from 'react'
import { projectsService } from '@/services/projects'
import type { ScanHistoryEntry } from '@/types'

interface ScanOverlayProps {
  onClose: () => void
  projectId: string
  scanId: string
  filesTotal: number
}

export function ScanOverlay({ onClose, projectId, scanId, filesTotal }: ScanOverlayProps) {
  const [scan, setScan] = useState<ScanHistoryEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tickTimer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(tickTimer)
  }, [])

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const history = await projectsService.getScanHistory(projectId)
        const entry = history.find(h => h.scan_id === scanId) ?? null
        if (active) setScan(entry)
        if (entry?.completed_at && active) return
      } catch { /* ignore poll errors */ }
      if (active) setTimeout(poll, 5000)
    }

    poll()
    return () => { active = false }
  }, [projectId, scanId])

  const done = !!scan?.completed_at
  const filesProcessed = scan?.files_processed ?? 0
  const total = scan?.files_total ?? filesTotal
  const currentFile = scan?.current_file ?? ''

  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="scan-overlay">
      <div className="scan-card">
        <div className="robot-stage">
          <div className="ground" />
          <div className="robot">
            <div className="robot-antenna" />
            <div className="robot-head">
              <span className="robot-eye l" />
              <span className="robot-eye r" />
            </div>
            <div className="robot-body" />
            <div className="robot-arm" />
            <div className="robot-arm r" />
          </div>
          <div className="box s1" />
          <div className="box s2" />
          <div className="box s3" />
          <div className="box carry" style={{ '--drop-to': '54px' } as React.CSSProperties} />
        </div>

        <h2 className="scan-title">{done ? 'Scan complete' : 'Scanning your project…'}</h2>

        <div className="scan-stats">
          <div className="scan-stat-row">
            <span className="l">Files processed</span>
            <span className="v">{filesProcessed} / {total}</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: total > 0 ? `${(filesProcessed / total) * 100}%` : '0%' }} />
          </div>
          {currentFile && <div className="scan-current">{currentFile}</div>}
          <div className="scan-stat-row">
            <span className="l">Elapsed</span>
            <span className="v">{mm}:{ss}</span>
          </div>
          {done && scan?.findings_count != null && (
            <div className="scan-stat-row">
              <span className="l">Findings</span>
              <span className="v" style={{ color: 'var(--accent-text)' }}>{scan.findings_count}</span>
            </div>
          )}
          {scan?.error_message && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-danger)' }}>
              {scan.error_message}
            </div>
          )}
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            {done ? 'Close' : 'Cancel scan'}
          </button>
        </div>
      </div>
    </div>
  )
}
