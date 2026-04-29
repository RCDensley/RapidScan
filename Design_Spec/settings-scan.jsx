// Settings tab
function SettingsTab() {
  const [pat, setPat] = useState('ghp_••••••••••••MwK2');
  const [showPat, setShowPat] = useState(false);
  const [repo, setRepo] = useState('acme-co/atlas-web');
  const [orphan, setOrphan] = useState(true);
  const [maxKb, setMaxKb] = useState(500);
  const [exclude, setExclude] = useState('node_modules/\ndist/\n*.min.js');
  const [minScore, setMinScore] = useState(70);
  const [issueLabel, setIssueLabel] = useState('rapidscan');
  const [w, setW] = useState({ npm: 7, azsdk: 8, ai: 9, tpapi: 8, azsvc: 9, orphan: 5 });

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
                <input className="input mono" type={showPat ? 'text' : 'password'} value={pat} onChange={(e) => setPat(e.target.value)} style={{ paddingRight: 40 }} />
                <button type="button" className="menu-btn" style={{ position: 'absolute', right: 4, top: 4 }} onClick={() => setShowPat(s => !s)}>
                  {showPat ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                </button>
              </div>
              <div className="field-help">Scopes required: <code className="kbd">repo</code> <code className="kbd">issues</code></div>
            </div>
            <div>
              <label className="field-label">Repository (for issue creation)</label>
              <input className="input mono" value={repo} onChange={(e) => setRepo(e.target.value)} />
            </div>
          </div>
          <div className="settings-card-foot">
            <span className="row" style={{ color: 'var(--accent-text)', fontSize: 13 }}>
              <Icons.CheckCircle size={14} strokeWidth={2.25} />
              Connected: {repo}
            </span>
            <Btn variant="primary" size="sm">Save</Btn>
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
              <Toggle on={orphan} onChange={setOrphan} />
              <div>
                <div className="ck-text">Run orphan detection after each scan</div>
                <div className="ck-help">Adds ~30% to scan time. Identifies code with no inbound references.</div>
              </div>
            </div>
            <div>
              <label className="field-label">Maximum file size to scan</label>
              <div className="row">
                <input className="num-input" type="number" value={maxKb} onChange={(e) => setMaxKb(+e.target.value)} />
                <span className="muted">KB</span>
              </div>
            </div>
            <div>
              <label className="field-label">File patterns to exclude</label>
              <textarea className="textarea" rows={4} value={exclude} onChange={(e) => setExclude(e.target.value)} />
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
              <label className="field-label">Minimum score to create issue: <span className="mono" style={{ color: 'var(--accent-text)' }}>{minScore}</span></label>
              <input className="range" type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(+e.target.value)} />
              <div className="field-help">Findings scoring below this threshold won't open an issue.</div>
            </div>
            <div>
              <label className="field-label">Issue label</label>
              <input className="input mono" value={issueLabel} onChange={(e) => setIssueLabel(e.target.value)} style={{ maxWidth: 240 }} />
            </div>
          </div>
          <div className="settings-card-foot">
            <span className="muted" style={{ fontSize: 12 }}>Last issue created 4 hours ago</span>
            <Btn variant="primary" size="sm">Save</Btn>
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
              {[
                ['npm', 'npm packages'],
                ['azsdk', 'Azure SDKs'],
                ['ai', 'AI models'],
                ['tpapi', 'Third-party APIs'],
                ['azsvc', 'Azure services'],
                ['orphan', 'Orphaned code'],
              ].map(([k, lbl]) => (
                <React.Fragment key={k}>
                  <div className="wlabel">{lbl}</div>
                  <input className="num-input" type="number" min={1} max={10} value={w[k]}
                    onChange={(e) => setW({ ...w, [k]: Math.max(1, Math.min(10, +e.target.value || 1)) })} />
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="settings-card-foot">
            <Btn variant="ghost" size="sm" onClick={() => setW({ npm: 7, azsdk: 8, ai: 9, tpapi: 8, azsvc: 9, orphan: 5 })}>Reset to defaults</Btn>
            <Btn variant="primary" size="sm">Save</Btn>
          </div>
        </div>

        {/* Scoring explanation */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div className="settings-card-head">
            <h3 className="row" style={{ gap: 8 }}><Icons.Sparkles size={16} /> How scores are calculated</h3>
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
  );
}

// ───── Scan overlay ─────
function ScanOverlay({ onClose }) {
  const [progress, setProgress] = useState(0);
  const [findings, setFindings] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const total = 213;

  useEffect(() => {
    const stages = [
      'src/api/client.ts', 'src/utils/httpClient.ts', 'src/auth/azure.ts',
      'src/ai/summarize.ts', 'src/ai/classify.ts', 'src/storage/blob.ts',
      'src/integrations/stripe.ts', 'src/storage/cosmos.ts', 'src/legacy/oldFetcher.ts',
      'src/utils/format.ts', 'src/queue/bus.ts', 'src/state/reducers.ts',
    ];
    const findingPool = [
      { name: 'axios', sev: 'high', score: 72 },
      { name: '@azure/storage-blob', sev: 'medium', score: 45 },
      { name: 'gpt-4o-mini', sev: 'high', score: 88 },
      { name: 'lodash', sev: 'medium', score: 42 },
      { name: '@azure/identity', sev: 'high', score: 74 },
    ];
    let p = 0;
    let stageIdx = 0;
    let findingIdx = 0;
    const timer = setInterval(() => {
      p = Math.min(total, p + Math.floor(3 + Math.random() * 8));
      setProgress(p);
      stageIdx = (stageIdx + 1) % stages.length;
      window.__scanFile = stages[stageIdx];
      if (Math.random() < 0.18 && findingIdx < findingPool.length) {
        setFindings(prev => [...prev.slice(-2), findingPool[findingIdx++]]);
      }
      if (p >= total) {
        clearInterval(timer);
        setDone(true);
      }
    }, 320);
    const tick = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { clearInterval(timer); clearInterval(tick); };
  }, []);

  const [currentFile, setCurrentFile] = useState('src/api/client.ts');
  useEffect(() => {
    const t = setInterval(() => { if (window.__scanFile) setCurrentFile(window.__scanFile); }, 320);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

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
          <div className="box carry" style={{ '--drop-to': '54px' }} />
        </div>

        <h2 className="scan-title">{done ? 'Scan complete' : 'Scanning your project…'}</h2>

        <div className="scan-stats">
          <div className="scan-stat-row">
            <span className="l">Files processed</span>
            <span className="v">{progress} / {total}</span>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${(progress / total) * 100}%` }} /></div>
          <div className="scan-current" title={currentFile}>{currentFile}</div>
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
                <SeverityBadge sev={f.sev} />
                <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>score {f.score}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ alignSelf: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>{done ? 'Close' : 'Cancel scan'}</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsTab, ScanOverlay });
