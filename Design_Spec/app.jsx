// Main App
const { PROJECTS: INITIAL_PROJECTS, CATEGORIES: CATS, DEPS: DEP_LIST, TASKS: INITIAL_TASKS } = window.RS_DATA;

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 152,
  "density": "comfortable",
  "sidebarPinned": false,
  "tintIntensity": 1
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);

  // Apply accent hue dynamically
  useEffect(() => {
    const h = tweaks.accentHue;
    const root = document.documentElement;
    // base emerald is hue 152. Express in oklch-equivalent HSL approximation.
    root.style.setProperty('--accent', `hsl(${h} 70% 40%)`);
    root.style.setProperty('--accent-hover', `hsl(${h} 75% 32%)`);
    root.style.setProperty('--accent-subtle', `hsla(${h}, 70%, 45%, 0.12)`);
    root.style.setProperty('--accent-text', `hsl(${h} 65% 55%)`);
    root.style.setProperty('--bg-selected', `hsla(${h}, 70%, 45%, 0.10)`);
  }, [tweaks.accentHue]);

  useEffect(() => {
    document.documentElement.style.setProperty('--row-h', tweaks.density === 'compact' ? '44px' : '52px');
  }, [tweaks.density]);

  useEffect(() => {
    const root = document.documentElement;
    const i = tweaks.tintIntensity;
    root.style.setProperty('--row-tint-mult', i);
  }, [tweaks.tintIntensity]);

  // Routing
  const [view, setView] = useState('projects'); // 'projects' | 'project'
  const [projectId, setProjectId] = useState(null);
  const [tab, setTab] = useState('manifest');
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [showNew, setShowNew] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Manifest state
  const [depQuery, setDepQuery] = useState('');
  const [selectedDep, setSelectedDep] = useState(null);

  // Tasks state
  const [taskQuery, setTaskQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

  const project = projects.find(p => p.id === projectId);

  // Reset selections when changing tabs
  useEffect(() => { setSelectedDep(null); setSelectedTask(null); }, [tab, projectId]);

  // Esc closes side panels
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selectedDep) setSelectedDep(null);
        else if (selectedTask) setSelectedTask(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedDep, selectedTask]);

  const openProject = (id, andScan = false) => {
    setProjectId(id);
    setView('project');
    setTab('manifest');
    if (andScan) setTimeout(() => setScanning(true), 200);
  };

  const createProject = (data) => {
    const np = { id: `p${Date.now()}`, name: data.name, source: data.source, identifier: data.identifier, lastScanned: 'never', openTasks: 0, status: 'unknown' };
    setProjects(p => [np, ...p]);
    setShowNew(false);
    openProject(np.id, true);
  };

  const deleteProject = (id) => {
    setProjects(p => p.filter(x => x.id !== id));
  };

  const onChangeTaskStatus = (id, status) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t));
  };

  return (
    <div className="app">
      <Sidebar
        inProject={view === 'project'}
        activeTab={view === 'project' ? tab : 'projects'}
        onTab={(t) => view === 'project' ? setTab(t) : setView('projects')}
        onBack={() => setView('projects')}
        pinned={tweaks.sidebarPinned}
      />
      <div className="main">
        {view === 'projects' && (
          <ProjectsList
            projects={projects}
            onOpen={openProject}
            onNew={() => setShowNew(true)}
            onDelete={deleteProject}
          />
        )}

        {view === 'project' && project && (
          <>
            <div className="page-header compact">
              <button className="crumb" onClick={() => setView('projects')}>
                <Icons.ArrowLeft size={14} /> Projects
              </button>
              <div className="page-row">
                <div>
                  <h1 className="page-title">{project.name}</h1>
                  <div className="page-sub mono">
                    {project.source} · {project.identifier}
                    <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>· last scanned {project.lastScanned}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Btn variant="primary" icon={<Icons.Play size={13} strokeWidth={2.5} />} disabled={scanning} onClick={() => setScanning(true)}>
                    Run scan
                  </Btn>
                  <Btn variant="secondary" icon={<Icons.MoreHorizontal size={14} />} title="More actions" />
                </div>
              </div>
            </div>

            {tab === 'manifest' && (
              <ManifestTab
                deps={DEP_LIST}
                categories={CATS}
                selectedId={selectedDep}
                onSelect={(id) => setSelectedDep(id === selectedDep ? null : id)}
                onClose={() => setSelectedDep(null)}
                q={depQuery} setQ={setDepQuery}
              />
            )}
            {tab === 'tasks' && (
              <TasksTab
                tasks={tasks}
                selectedId={selectedTask}
                onSelect={(id) => setSelectedTask(id === selectedTask ? null : id)}
                onClose={() => setSelectedTask(null)}
                q={taskQuery} setQ={setTaskQuery}
                statusFilter={taskStatusFilter} setStatusFilter={setTaskStatusFilter}
                onChangeStatus={onChangeTaskStatus}
              />
            )}
            {tab === 'settings' && <SettingsTab />}

            {scanning && <ScanOverlay onClose={() => setScanning(false)} />}
          </>
        )}

        {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={createProject} />}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Accent">
          <TweakSlider label="Hue" value={tweaks.accentHue} min={0} max={360} step={1}
            onChange={(v) => setTweak('accentHue', v)} />
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            {[152, 200, 270, 330, 25].map(h => (
              <button key={h} onClick={() => setTweak('accentHue', h)}
                style={{
                  width: 22, height: 22, borderRadius: 999,
                  border: tweaks.accentHue === h ? '2px solid var(--text-primary)' : '1px solid var(--border-default)',
                  background: `hsl(${h} 70% 45%)`, cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
        </TweakSection>

        <TweakSection title="Layout">
          <TweakRadio label="Density" value={tweaks.density} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }]}
            onChange={(v) => setTweak('density', v)} />
          <TweakToggle label="Pin sidebar open" value={tweaks.sidebarPinned} onChange={(v) => setTweak('sidebarPinned', v)} />
        </TweakSection>

        <TweakSection title="Severity tint">
          <TweakSlider label="Row tint intensity" value={tweaks.tintIntensity} min={0} max={2} step={0.1}
            onChange={(v) => setTweak('tintIntensity', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
