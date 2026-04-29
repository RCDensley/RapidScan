// Manifest tab + dependency side panel
function ManifestTab({ deps, categories, selectedId, onSelect, onClose, q, setQ }) {
  const [expanded, setExpanded] = useState(() => Object.fromEntries(categories.map(c => [c.id, true])));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return deps;
    return deps.filter(d => d.name.toLowerCase().includes(term) || d.refs.some(r => r.file.toLowerCase().includes(term)));
  }, [deps, q]);

  const byCat = useMemo(() => {
    const map = {};
    for (const c of categories) map[c.id] = [];
    for (const d of filtered) (map[d.cat] ||= []).push(d);
    return map;
  }, [filtered, categories]);

  const worstFor = (list) => {
    const order = ['critical', 'deprecated', 'warning', 'unknown', 'info', 'healthy'];
    for (const s of order) if (list.some(d => d.status === s)) return s;
    return 'healthy';
  };

  return (
    <div className={`split ${selectedId ? 'has-panel' : ''}`}>
      <div className="split-list">
        <div className="tab-toolbar">
          <div className="tab-toolbar-left">
            <h2>Manifest</h2>
            <span className="tab-toolbar-meta">{categories.length} categories · {deps.length} dependencies</span>
          </div>
          <div className="search-input toolbar-input">
            <Icons.Search size={14} />
            <input className="input" placeholder="Search dependencies or files…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty
            icon={<Icons.SearchX size={28} />}
            heading="No matches"
            support="Try a different search term or clear the filter."
            cta={<Btn variant="secondary" size="sm" onClick={() => setQ('')}>Clear filter</Btn>}
          />
        ) : (
          categories.map(c => {
            const list = byCat[c.id] || [];
            if (list.length === 0) return null;
            const open = expanded[c.id];
            return (
              <div key={c.id} className="cat-group">
                <div className={`cat-head ${open ? 'expanded' : ''}`} onClick={() => setExpanded(e => ({ ...e, [c.id]: !e[c.id] }))}>
                  <span className="cat-chev"><Icons.ChevronRight size={14} /></span>
                  <span className="cat-name">{c.name}</span>
                  <span className="cat-count">{list.length} {list.length === 1 ? 'dependency' : 'dependencies'}</span>
                  <span className="cat-spacer" />
                  <StatusBadge status={worstFor(list)} />
                </div>
                {open && (
                  <div className="dep-rows">
                    {list.map(d => (
                      <div key={d.id} className={`dep-row ${selectedId === d.id ? 'selected' : ''}`} onClick={() => onSelect(d.id)}>
                        <StatusDot status={d.status} />
                        <div className="dep-cell">
                          <span className="dep-name">{d.name}</span>
                          <span className="dep-refs">{d.refs[0]?.file}{d.refs.length > 1 ? ` +${d.refs.length - 1} more` : ''}</span>
                        </div>
                        <div className="dep-version">
                          {d.cur === '-' ? <span className="muted">no version</span> : (
                            <>
                              <span>{d.cur}</span>
                              {d.latest && d.latest !== '-' && d.latest !== d.cur && (
                                <><span className="arrow">→</span><span className="new">{d.latest}</span></>
                              )}
                            </>
                          )}
                        </div>
                        <div className="dep-badges">
                          <SeverityBadge sev={d.sev} />
                        </div>
                        <ScoreBadge score={d.score} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="split-panel">
        <div className="split-panel-inner">
          {selectedId && <DepDetail dep={deps.find(d => d.id === selectedId)} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function DepDetail({ dep, onClose }) {
  if (!dep) return null;
  const catLabel = (window.RS_DATA.CATEGORIES.find(c => c.id === dep.cat) || {}).name || dep.cat;
  return (
    <>
      <div className="panel-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title">{dep.name}</h2>
          <div className="panel-sub">
            {catLabel}
            {dep.cur !== '-' && <> · v{dep.cur}{dep.latest && dep.latest !== dep.cur && <> → v{dep.latest}</>}</>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <SeverityBadge sev={dep.sev} />
            <ScoreBadge score={dep.score} />
            <StatusBadge status={dep.status} />
          </div>
        </div>
        <button className="x-btn" onClick={onClose}><Icons.X size={14} /></button>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">References ({dep.refs.length})</h3>
        <ul className="refs-list" style={{ padding: 0, margin: 0 }}>
          {dep.refs.map((r, i) => (
            <li key={i}>
              <span>{r.file}</span>
              <span className="lineno">line {r.lines.join(', ')}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Call chain</h3>
        <div className="tree">
          {dep.chain.map((f, i) => (
            <div key={i} className={`tree-line ${i === dep.chain.length - 1 ? 'curr' : ''}`} style={{ paddingLeft: i * 16 }}>
              {i > 0 && <span className="conn">└── </span>}{f}
              {i === dep.chain.length - 1 && <span className="conn">  ← import site</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Description</h3>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{dep.desc}</p>
      </div>
    </>
  );
}

// ───── Tasks tab ─────
function TasksTab({ tasks, selectedId, onSelect, onClose, q, setQ, statusFilter, setStatusFilter, onChangeStatus }) {
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tasks.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (term && !t.title.toLowerCase().includes(term) && !t.dep.toLowerCase().includes(term) && !t.file.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [tasks, q, statusFilter]);

  const counts = useMemo(() => ({
    open: tasks.filter(t => t.status === 'open').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    resolved: tasks.filter(t => t.status === 'resolved').length,
  }), [tasks]);

  const sevToUrg = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };
  const isCleanup = (t) => t.cat === 'Orphaned code';

  return (
    <div className={`split ${selectedId ? 'has-panel' : ''}`}>
      <div className="split-list">
        <div className="tab-toolbar">
          <div className="tab-toolbar-left">
            <h2>Tasks</h2>
            <span className="tab-toolbar-meta">{counts.open} open · {counts.in_progress} in progress · {counts.resolved} resolved</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="search-input toolbar-input">
              <Icons.Search size={14} />
              <input className="input" placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="won_t_fix">Won't fix</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty
            icon={<Icons.FilterX size={28} />}
            heading="No matching tasks"
            support="Adjust your filters or search to see tasks."
            cta={<Btn variant="secondary" size="sm" onClick={() => { setQ(''); setStatusFilter('all'); }}>Clear filters</Btn>}
          />
        ) : (
          filtered.map(t => {
            const urg = isCleanup(t) ? 'info' : sevToUrg[t.sev];
            return (
              <div key={t.id} className={`task-row urg-${urg} ${selectedId === t.id ? 'selected' : ''}`} onClick={() => onSelect(t.id)}>
                <SeverityBadge sev={t.sev} />
                <div style={{ minWidth: 0 }}>
                  <div className="task-title">{t.title}</div>
                  <div className="task-sub">{t.dep} · {t.cat} · {t.file}</div>
                </div>
                <ScoreBadge score={t.score} />
                <TaskStatusBadge status={t.status} />
                <span className="task-time">{t.time}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="split-panel">
        <div className="split-panel-inner">
          {selectedId && <TaskDetail task={tasks.find(t => t.id === selectedId)} onClose={onClose} onChangeStatus={onChangeStatus} />}
        </div>
      </div>
    </div>
  );
}

function TaskDetail({ task, onClose, onChangeStatus }) {
  if (!task) return null;
  return (
    <>
      <div className="panel-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title" style={{ fontFamily: 'var(--font-sans)', fontSize: 17 }}>{task.title}</h2>
          <div className="panel-sub mono">{task.dep} · {task.cat}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SeverityBadge sev={task.sev} />
            <ScoreBadge score={task.score} />
            <select className="select" style={{ width: 'auto', height: 28, padding: '2px 8px', fontSize: 12 }}
              value={task.status} onChange={(e) => onChangeStatus(task.id, e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="won_t_fix">Won't fix</option>
            </select>
          </div>
        </div>
        <button className="x-btn" onClick={onClose}><Icons.X size={14} /></button>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Description</h3>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>{task.desc}</p>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Location map</h3>
        <ul className="refs-list" style={{ padding: 0, margin: 0 }}>
          {task.locations.map((l, i) => (
            <li key={i}><span>{l.file}</span><span className="lineno">lines {l.lines}</span></li>
          ))}
        </ul>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Suggested fix</h3>
        <pre className="codeblock">{task.fix}</pre>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Tests</h3>
        <pre className="codeblock">{task.test}</pre>
      </div>

      <div className="panel-section" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="secondary" size="sm" icon={<Icons.Github size={13} />} title="Connect GitHub in Settings to enable">Create GitHub issue</Btn>
        <Btn variant="primary" size="sm" icon={<Icons.CheckCircle size={13} />} onClick={() => onChangeStatus(task.id, 'resolved')}>Mark resolved</Btn>
      </div>
    </>
  );
}

Object.assign(window, { ManifestTab, TasksTab });
