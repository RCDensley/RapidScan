// Sidebar with hover-to-expand
function Sidebar({ inProject, activeTab, onTab, onBack, pinned }) {
  const [hover, setHover] = useState(false);
  const tHover = useRef(null);
  const enter = () => {
    clearTimeout(tHover.current);
    tHover.current = setTimeout(() => setHover(true), 100);
  };
  const leave = () => {
    clearTimeout(tHover.current);
    tHover.current = setTimeout(() => setHover(false), 200);
  };
  const expanded = hover || pinned;

  const Tab = ({ id, label, icon }) => (
    <button className={`sidebar-tab ${activeTab === id ? 'active' : ''}`} onClick={() => onTab(id)}>
      {icon}
      <span className="label">{label}</span>
    </button>
  );

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''} ${pinned ? 'pinned' : ''}`} onMouseEnter={enter} onMouseLeave={leave}>
      <div className="sidebar-brand">
        <div className="logo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c1117" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 12h10" />
          </svg>
        </div>
        <span className="word">RapidScan</span>
      </div>

      {inProject ? (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-label">Project</div>
            <Tab id="manifest" label="Manifest" icon={<Icons.Layers size={18} />} />
            <Tab id="tasks"    label="Tasks"    icon={<Icons.CheckSquare size={18} />} />
            <Tab id="settings" label="Settings" icon={<Icons.Settings size={18} />} />
          </div>
          <div className="sidebar-spacer" />
          <div className="sidebar-foot">
            <button className="sidebar-tab" onClick={onBack}>
              <Icons.ArrowLeft size={18} />
              <span className="label">All projects</span>
            </button>
          </div>
        </>
      ) : (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Workspace</div>
          <Tab id="projects" label="Projects" icon={<Icons.Folder size={18} />} />
        </div>
      )}
    </aside>
  );
}

// ───── Projects List ─────
function ProjectsList({ projects, onOpen, onNew, onDelete }) {
  const [menuFor, setMenuFor] = useState(null);
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuFor]);

  return (
    <>
      <div className="page-header">
        <div className="page-row">
          <div>
            <h1 className="page-title">Projects</h1>
            <div className="page-sub">{projects.length} {projects.length === 1 ? 'project' : 'projects'} · last activity 2 hours ago</div>
          </div>
          <Btn variant="primary" icon={<Icons.Plus size={16} strokeWidth={2.25} />} onClick={onNew}>New project</Btn>
        </div>
      </div>
      <div className="content">
        {projects.length === 0 ? (
          <Empty
            icon={<Icons.FolderPlus size={28} />}
            heading="No projects yet"
            support="Scan an existing codebase to get started — connect a GitHub repo, upload a ZIP, or point at a local path."
            cta={<Btn variant="primary" icon={<Icons.Plus size={16} strokeWidth={2.25} />} onClick={onNew}>New project</Btn>}
          />
        ) : (
          <div className="proj-grid">
            {projects.map(p => (
              <div key={p.id} className="proj-card" onClick={() => onOpen(p.id)}>
                <div className="proj-card-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="proj-card-name">{p.name}</div>
                    <div className="proj-card-source">
                      {p.source === 'github' ? 'github · ' : p.source === 'zip' ? 'zip · ' : 'local · '}{p.identifier}
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button className="menu-btn" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === p.id ? null : p.id); }}>
                      <Icons.MoreVertical size={16} />
                    </button>
                    {menuFor === p.id && (
                      <div onClick={(e) => e.stopPropagation()} style={{
                        position: 'absolute', top: 32, right: 0, zIndex: 5,
                        background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                        minWidth: 140, padding: 4
                      }}>
                        <button className="sidebar-tab" style={{ height: 32 }}><Icons.Edit size={14} /><span className="label" style={{ opacity: 1 }}>Edit</span></button>
                        <button className="sidebar-tab" style={{ height: 32, color: '#f87171' }}
                          onClick={() => { setMenuFor(null); onDelete(p.id); }}>
                          <Icons.Trash size={14} /><span className="label" style={{ opacity: 1 }}>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="proj-card-meta">
                  <div className="proj-meta-row">
                    <span className="lbl">Last scanned</span>
                    <span className="val">{p.lastScanned}</span>
                  </div>
                  <div className="proj-meta-row">
                    <span className="lbl">Open tasks</span>
                    <span className={`badge sev-${p.openTasks > 15 ? 'critical' : p.openTasks > 8 ? 'high' : p.openTasks > 3 ? 'medium' : 'low'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                      {p.openTasks}
                    </span>
                  </div>
                  <div className="proj-meta-row">
                    <span className="lbl">Status</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>

                <div className="proj-card-actions">
                  <Btn variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}>View project</Btn>
                  <Btn variant="primary" size="sm" icon={<Icons.Play size={12} strokeWidth={2.5} />} onClick={(e) => { e.stopPropagation(); onOpen(p.id, true); }}>Run scan</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ───── New Project Modal ─────
function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('github');
  const [url, setUrl] = useState('');
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [path, setPath] = useState('');
  const [over, setOver] = useState(false);
  const [filename, setFilename] = useState('');

  const valid = name.trim() && (
    (type === 'github' && url.trim()) ||
    (type === 'zip' && filename) ||
    (type === 'local' && path.trim())
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">New project</h2>
          <button className="x-btn" onClick={onClose}><Icons.X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="col" style={{ gap: 18 }}>
            <div>
              <label className="field-label">Project name</label>
              <input className="input" placeholder="e.g. Atlas Web" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>

            <div>
              <label className="field-label">Input type</label>
              <div className="seg">
                <button className={type === 'github' ? 'active' : ''} onClick={() => setType('github')}>GitHub repo</button>
                <button className={type === 'zip' ? 'active' : ''} onClick={() => setType('zip')}>ZIP upload</button>
                <button className={type === 'local' ? 'active' : ''} onClick={() => setType('local')}>Local path</button>
              </div>
            </div>

            {type === 'github' && (
              <>
                <div>
                  <label className="field-label">Repository URL or owner/repo</label>
                  <input className="input mono" placeholder="acme-co/atlas-web" value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Personal access token <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                  <div style={{ position: 'relative' }}>
                    <input className="input mono" type={showPat ? 'text' : 'password'} placeholder="ghp_••••••••••••••••" value={pat} onChange={(e) => setPat(e.target.value)} style={{ paddingRight: 40 }} />
                    <button type="button" className="menu-btn" style={{ position: 'absolute', right: 4, top: 4 }} onClick={() => setShowPat(s => !s)}>
                      {showPat ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                    </button>
                  </div>
                  <div className="field-help">Leave blank for public repositories.</div>
                </div>
              </>
            )}

            {type === 'zip' && (
              <div>
                <label className="field-label">Upload ZIP file</label>
                <div
                  className={`drop ${over ? 'over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) setFilename(f.name); }}
                  onClick={() => setFilename('atlas-web-2026-04.zip')}
                >
                  <Icons.Upload size={22} />
                  <div style={{ marginTop: 8, fontSize: 13 }}>{filename || 'Drag & drop a ZIP file here, or browse'}</div>
                  <div className="field-help">Accepted: .zip only · Max size: 100 MB</div>
                </div>
              </div>
            )}

            {type === 'local' && (
              <div>
                <label className="field-label">Local directory path</label>
                <input className="input mono" placeholder="/srv/builds/my-project" value={path} onChange={(e) => setPath(e.target.value)} />
                <div className="field-help">Absolute path accessible from the API server.</div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!valid} onClick={() => valid && onCreate({ name: name.trim(), source: type, identifier: type === 'github' ? url.trim() : type === 'zip' ? filename : path.trim() })}>
            Create project
          </Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, ProjectsList, NewProjectModal });
