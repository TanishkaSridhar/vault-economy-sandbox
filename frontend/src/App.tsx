import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Timeline } from './components/ui/Timeline'
import { Overview } from './components/pages/Overview'
import { Towns } from './components/pages/Towns'
import { Agents } from './components/pages/Agents'
import { Economy } from './components/pages/Economy'
import { Decisions } from './components/pages/Decisions'
import { Runs } from './components/pages/Runs'

const PAGE_PATHS: Record<string, string> = {
  Overview: '/overview',
  Towns: '/towns',
  Agents: '/agents',
  Economy: '/economy',
  Decisions: '/decisions',
  Runs: '/runs',
}

const PATH_PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([k, v]) => [v, k])
)

function AppInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const activePage = PATH_PAGES[location.pathname] ?? 'Overview'

  const handlePageChange = (page: string) => {
    const path = PAGE_PATHS[page]
    if (path) navigate(path)
  }

  return (
    <>
      <AppLayout activePage={activePage} onPageChange={handlePageChange}>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/towns" element={<Towns />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/economy" element={<Economy />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </AppLayout>
      <Timeline />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
