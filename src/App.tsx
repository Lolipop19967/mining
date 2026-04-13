import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SitesPage from './pages/SitesPage'
import AssetsPage from './pages/AssetsPage'
import IncidentsPage from './pages/IncidentsPage'
import CompliancePage from './pages/CompliancePage'
import MaintenancePage from './pages/MaintenancePage'
import ReportsPage from './pages/ReportsPage'
import ActivityPage from './pages/ActivityPage'
import ProductionPage from './pages/ProductionPage'
import HazardsPage from './pages/HazardsPage'
import NearMissesPage from './pages/NearMissesPage'
import ToolboxPage from './pages/ToolboxPage'
import PermitsPage from './pages/PermitsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F9FAFB' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

async function fetchAndSetProfile(userId: string, userEmail: string, setUser: any) {
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) { setUser(data); return }
    const { data: byEmail } = await supabase.from('profiles').select('*').eq('email', userEmail).single()
    if (byEmail) {
      await supabase.from('profiles').update({ id: userId }).eq('email', userEmail)
      setUser({ ...byEmail, id: userId })
      return
    }
    const newProfile = { id: userId, email: userEmail, full_name: userEmail.split('@')[0], role: 'operator' as const, created_at: new Date().toISOString() }
    await supabase.from('profiles').insert(newProfile)
    setUser(newProfile)
  } catch (e) {
    console.error('Profile error:', e)
    setUser(null)
  }
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // Use a flag so only the first resolution (getSession or onAuthStateChange) acts
    let resolved = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('Auth timeout')
        resolved = true
        setUser(null)
        setLoading(false)
      }
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (resolved && event === 'INITIAL_SESSION') return
      resolved = true
      clearTimeout(timeout)
      if (session?.user) {
        await fetchAndSetProfile(session.user.id, session.user.email || '', setUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      resolved = true
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="hazards" element={<HazardsPage />} />
          <Route path="near-misses" element={<NearMissesPage />} />
          <Route path="toolbox" element={<ToolboxPage />} />
          <Route path="permits" element={<PermitsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
