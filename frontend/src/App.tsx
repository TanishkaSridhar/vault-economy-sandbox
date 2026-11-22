import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Timeline } from './components/ui/Timeline'
import { Overview } from './components/pages/Overview'
import { Towns } from './components/pages/Towns'
import { Agents } from './components/pages/Agents'
import { Economy } from './components/pages/Economy'
import { Decisions } from './components/pages/Decisions'
import { Runs } from './components/pages/Runs'
import { World } from './components/pages/World'
import { useTurn, NO_RUN } from './hooks/useTurn'
import { useRuns } from './hooks/useSimData'
import { useEffect } from 'react'

const PAGE_PATHS: Record<string, string> = {
  Overview: '/overview',
  World: '/world',
  Towns: '/towns',
  Agents: '/agents',
  Economy: '/economy',
  Decisions: '/decisions',
  Runs: '/runs',
}

const PATH_PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([k, v]) => [v, k])
)

function RunSyncer() {
  const { runs } = useRuns()
  const { runId, setRun, setMaxTurn } = useTurn()
  useEffect(() => {
    if (runs.length === 0) return
    const run = runs.find(r => r.id === runId)
    // Nothing selected yet, or the selected run vanished (e.g. live <-> demo switch): pick the latest
    if (runId === NO_RUN || !run) { setRun(runs[runs.length - 1].id); return }
    setMaxTurn(Math.max(run.turns_completed, 1))
  }, [runs, runId, setRun, setMaxTurn])
  return null
}

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
      <RunSyncer />
      <AppLayout activePage={activePage} onPageChange={handlePageChange} fullBleed={activePage === 'World'}>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/world" element={<World />} />
          <Route path="/towns" element={<Towns />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/economy" element={<Economy />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </AppLayout>
      {/* the World page has its own player */}
      {activePage !== 'World' && <Timeline />}
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
