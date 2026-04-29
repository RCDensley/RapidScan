import { useEffect, useRef, useState } from 'react'

interface ScanOverlayProps {
  onClose: () => void
}

const STAGES = [
  'src/api/client.ts', 'src/utils/httpClient.ts', 'src/auth/azure.ts',
  'src/ai/summarize.ts', 'src/ai/classify.ts', 'src/storage/blob.ts',
  'src/integrations/stripe.ts', 'src/storage/cosmos.ts',
]

const FINDING_POOL = [
  { name: 'axios', sev: 'high', score: 72 },
  { name: '@azure/storage-blob', sev: 'medium', score: 45 },
  { name: 'gpt-4o-mini', sev: 'high', score: 88 },
  { name: 'lodash', sev: 'medium', score: 42 },
  { name: '@azure/identity', sev: 'high', score: 74 },
]

const TOTAL = 213

export function ScanOverlay({ onClose }: ScanOverlayProps) {
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState(STAGES[0])
  const [findings, setFindings] = useState<typeof FINDING_POOL>([])
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const findingIdx = useRef(0)
  const stageIdx = useRef(0)

  useEffect(() => {
    const scanTimer = setInterval(() => {
      setProgress(p => {
        const next = Math.min(TOTAL, p + Math.floor(3 + Math.random() * 8))
        stageIdx.current = (stageIdx.current + 1) % STAGES.length
        setCurrentFile(STAGES[stageIdx.current])
        if (Math.random() < 0.18 && findingIdx.current < FINDING_POOL.length) {
          const f = FINDING_POOL[findingIdx.current++]
          setFindings(prev => [...prev.slice(-2), f])
        }
        if (next >= TOTAL) { clearInterval(scanTimer); setDone(true) }
        return next
      })
    }, 320)
    const tickTimer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearInterval(scanTimer); clearInterval(tickTimer) }
  }, [])

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
            <span className="v">{progress} / {TOTAL}</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${(progress / TOTAL) * 100}%` }} />
          </div>
          <div className="scan-current">{currentFile}</div>
          <div className="scan-stat-row">
            <span className="l">Elapsed</span>
            <span className="v">{mm}:{ss}</span>
          </div>
        </div>

        {findings.length > 0 && (
          <div className="findings">
            <div className="findings-title">Recent findings</div>
            {findings.map((f, i) => (
              <div key={`${f.name}-${i}`} className="finding-row">
                <span className="nm">{f.name}</span>
                <span className="ar">→</span>
                <span className={`sev-badge sev-${f.sev}`}>{f.sev}</span>
                <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  score {f.score}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ alignSelf: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            {done ? 'Close' : 'Cancel scan'}
          </button>
        </div>
      </div>
    </div>
  )
}
