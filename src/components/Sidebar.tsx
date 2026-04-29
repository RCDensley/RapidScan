import { useRef, useState } from 'react'
import { useNavigate, useMatch } from 'react-router-dom'
import {
  ArrowLeft, CheckSquare, Folder, Layers, Settings,
} from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'

export function Sidebar() {
  const navigate = useNavigate()
  const match = useMatch('/projects/:id')
  const inProject = !!match

  const { activeTab, setActiveTab } = useAppContext()

  const [hover, setHover] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function enter() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setHover(true), 100)
  }
  function leave() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setHover(false), 200)
  }

  const expanded = hover

  return (
    <aside
      className={`sidebar ${expanded ? 'expanded' : ''}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <div className="sidebar-brand">
        <div className="logo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c1117" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            {[
              { id: 'manifest', label: 'Manifest',  Icon: Layers },
              { id: 'tasks',    label: 'Tasks',     Icon: CheckSquare },
              { id: 'settings', label: 'Settings',  Icon: Settings },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`sidebar-tab ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={18} />
                <span className="label">{label}</span>
              </button>
            ))}
          </div>
          <div className="sidebar-spacer" />
          <div className="sidebar-foot">
            <button className="sidebar-tab" onClick={() => navigate('/')}>
              <ArrowLeft size={18} />
              <span className="label">All projects</span>
            </button>
          </div>
        </>
      ) : (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Workspace</div>
          <button
            className="sidebar-tab active"
            onClick={() => navigate('/')}
          >
            <Folder size={18} />
            <span className="label">Projects</span>
          </button>
        </div>
      )}
    </aside>
  )
}
