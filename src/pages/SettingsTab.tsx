import { useState } from 'react'
import { CheckCircle, Eye, EyeOff, Sparkles } from 'lucide-react'

export function SettingsTab() {
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [repo, setRepo] = useState('')
  const [orphan, setOrphan] = useState(true)
  const [maxKb, setMaxKb] = useState(500)
  const [exclude, setExclude] = useState('node_modules/\ndist/\n*.min.js')
  const [minScore, setMinScore] = useState(70)
  const [issueLabel, setIssueLabel] = useState('rapidscan')
  const [weights, setWeights] = useState({ npm: 7, azsdk: 8, ai: 9, tpapi: 8, azsvc: 9, orphan: 5 })

  function setW(k: string, v: number) {
    setWeights(w => ({ ...w, [k]: Math.max(1, Math.min(10, v)) }))
  }

  return (
    <div className="content">
      <div className="settings-wrap">
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Settings</h2>
        <div className="page-sub">Project-scoped configuration. Changes apply to future scans.</div>

        {/* GitHub */}
        <div className="card" style={{ marginTop: 8 }}>
          <div className="settings-card-head">
            <h3>GitHub connection</h3>
            <p>Connect a GitHub token to enable automatic issue creation.</p>
          </div>
          <div className="settings-card-body">
            <div>
              <label className="field-label">Personal access token</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input mono"
                  type={showPat ? 'text' : 'password'}
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  placeholder="ghp_••••••••••••••••"
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
              <div className="field-help">
                Scopes required: <code className="kbd">repo</code> <code className="kbd">issues</code>
              </div>
            </div>
            <div>
              <label className="field-label">Repository (for issue creation)</label>
              <input
                className="input mono"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                placeholder="owner/repo"
              />
            </div>
          </div>
          <div className="settings-card-foot">
            {repo ? (
              <span className="row" style={{ color: 'var(--accent-text)', fontSize: 13 }}>
                <CheckCircle size={14} strokeWidth={2.25} />
                {repo}
              </span>
            ) : (
              <span className="muted" style={{ fontSize: 13 }}>Not connected</span>
            )}
            <button className="btn btn-primary btn-sm">Save</button>
          </div>
        </div>

        {/* Scan config */}
        <div className="card">
          <div className="settings-card-head">
            <h3>Scan configuration</h3>
            <p>Tune what RapidScan looks at and how thoroughly.</p>
          </div>
          <div className="settings-card-body">
            <div className="checkbox-row">
              <button
                type="button"
                className={`toggle ${orphan ? 'on' : ''}`}
                onClick={() => setOrphan(v => !v)}
                aria-pressed={orphan}
              />
              <div>
                <div className="ck-text">Run orphan detection after each scan</div>
                <div className="ck-help">Adds ~30% to scan time. Identifies code with no inbound references.</div>
              </div>
            </div>
            <div>
              <label className="field-label">Maximum file size to scan</label>
              <div className="row">
                <input
                  className="num-input"
                  type="number"
                  value={maxKb}
                  onChange={e => setMaxKb(+e.target.value)}
                />
                <span className="muted">KB</span>
              </div>
            </div>
            <div>
              <label className="field-label">File patterns to exclude</label>
              <textarea
                className="textarea"
                rows={4}
                value={exclude}
                onChange={e => setExclude(e.target.value)}
              />
              <div className="field-help">One glob pattern per line.</div>
            </div>
          </div>
        </div>

        {/* Issue creation */}
        <div className="card">
          <div className="settings-card-head">
            <h3>Issue creation</h3>
            <p>Automatically create GitHub issues for high-risk findings.</p>
          </div>
          <div className="settings-card-body">
            <div>
              <label className="field-label">
                Minimum score to create issue:{' '}
                <span className="mono" style={{ color: 'var(--accent-text)' }}>{minScore}</span>
              </label>
              <input
                className="range"
                type="range"
                min={0}
                max={100}
                value={minScore}
                onChange={e => setMinScore(+e.target.value)}
              />
              <div className="field-help">Findings scoring below this threshold won't open an issue.</div>
            </div>
            <div>
              <label className="field-label">Issue label</label>
              <input
                className="input mono"
                value={issueLabel}
                onChange={e => setIssueLabel(e.target.value)}
                style={{ maxWidth: 240 }}
              />
            </div>
          </div>
          <div className="settings-card-foot">
            <span className="muted" style={{ fontSize: 12 }}>No issues created yet</span>
            <button className="btn btn-primary btn-sm">Save</button>
          </div>
        </div>

        {/* Scoring weights */}
        <div className="card">
          <div className="settings-card-head">
            <h3>Scoring weights</h3>
            <p>Adjust how much each dependency category contributes to the overall score. Values 1–10, relative.</p>
          </div>
          <div className="settings-card-body">
            <div className="weight-grid">
              {([
                ['npm',    'npm packages'],
                ['azsdk',  'Azure SDKs'],
                ['ai',     'AI models'],
                ['tpapi',  'Third-party APIs'],
                ['azsvc',  'Azure services'],
                ['orphan', 'Orphaned code'],
              ] as [keyof typeof weights, string][]).map(([k, lbl]) => (
                <>
                  <div key={`${k}-l`} className="wlabel">{lbl}</div>
                  <input
                    key={`${k}-i`}
                    className="num-input"
                    type="number"
                    min={1}
                    max={10}
                    value={weights[k]}
                    onChange={e => setW(k, +e.target.value || 1)}
                  />
                </>
              ))}
            </div>
          </div>
          <div className="settings-card-foot">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setWeights({ npm: 7, azsdk: 8, ai: 9, tpapi: 8, azsvc: 9, orphan: 5 })}
            >
              Reset to defaults
            </button>
            <button className="btn btn-primary btn-sm">Save</button>
          </div>
        </div>

        {/* Scoring explanation */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div className="settings-card-head">
            <h3 className="row" style={{ gap: 8 }}>
              <Sparkles size={16} />
              How scores are calculated
            </h3>
            <p>Scores (0–100) are generated by gpt-5.4-mini based on:</p>
          </div>
          <div className="settings-card-body" style={{ gap: 14 }}>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
              <li>Severity of the dependency issue</li>
              <li>Version currency — how out-of-date</li>
              <li>Exposure — number of files referencing it</li>
              <li>Category weight — configured above</li>
              <li>Known CVEs or deprecation notices</li>
            </ul>
            <div>
              <div className="field-label">Score ranges</div>
              <div className="legend">
                <span className="score sev-low">0–29</span><span className="muted" style={{ alignSelf: 'center', marginRight: 12 }}>Low</span>
                <span className="score sev-medium">30–59</span><span className="muted" style={{ alignSelf: 'center', marginRight: 12 }}>Medium</span>
                <span className="score sev-high">60–79</span><span className="muted" style={{ alignSelf: 'center', marginRight: 12 }}>High</span>
                <span className="score sev-critical">80–100</span><span className="muted" style={{ alignSelf: 'center' }}>Critical</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
