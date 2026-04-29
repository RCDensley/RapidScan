import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { AppContext } from '@/contexts/AppContext'
import { ProjectsListPage } from '@/pages/ProjectsListPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'

function AppShell() {
  const [activeTab, setActiveTab] = useState('manifest')

  return (
    <AppContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="app">
        <Sidebar />
        <div className="main">
          <Routes>
            <Route path="/" element={<ProjectsListPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
          </Routes>
        </div>
      </div>
    </AppContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </BrowserRouter>
  )
}
