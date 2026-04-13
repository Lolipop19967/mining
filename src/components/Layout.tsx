import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Package, AlertTriangle,
  ClipboardCheck, Wrench, BarChart3, Activity,
  LogOut, Bell, ChevronDown, Menu, X, HardHat,
  TrendingUp, AlertCircle, BookOpen, FileCheck,
  AlertOctagon
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import AlertsPanel from './AlertsPanel'

const navGroups = [
  {
    label: 'Operations',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/sites', icon: MapPin, label: 'Sites' },
      { to: '/assets', icon: Package, label: 'Assets' },
      { to: '/production', icon: TrendingUp, label: 'Production' },
    ]
  },
  {
    label: 'Safety',
    items: [
      { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
      { to: '/hazards', icon: AlertCircle, label: 'Hazard Register' },
      { to: '/near-misses', icon: AlertOctagon, label: 'Near Misses' },
      { to: '/toolbox', icon: BookOpen, label: 'Toolbox Talks' },
      { to: '/permits', icon: FileCheck, label: 'Permit to Work' },
    ]
  },
  {
    label: 'Compliance',
    items: [
      { to: '/compliance', icon: ClipboardCheck, label: 'Compliance' },
      { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
    ]
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
      { to: '/activity', icon: Activity, label: 'Activity Log' },
    ]
  },
]

export default function Layout() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleBadgeClass = user?.role === 'admin' ? 'badge-purple' : user?.role === 'manager' ? 'badge-blue' : 'badge-gray'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className="md:relative md:left-0"
        style={{
          width: 240, background: 'white', borderRight: '1px solid #F3F4F6',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          position: 'fixed', left: sidebarOpen ? 0 : -240, top: 0, bottom: 0,
          zIndex: 45, transition: 'left 0.2s ease',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#7C3AED', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HardHat size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>MineOps</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>Management System</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }} className="md:hidden">
            <X size={18} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
          {navGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 4px' }}>
                {group.label}
              </div>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FAFAFA', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
              {user?.full_name || user?.email?.split('@')[0]}
            </div>
            <span className={`badge ${roleBadgeClass}`}>{user?.role}</span>
          </div>
          <button onClick={handleSignOut} className="sidebar-link" style={{ width: '100%', color: '#EF4444' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{
          background: 'white', borderBottom: '1px solid #F3F4F6',
          padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
            <Menu size={20} />
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setAlertsOpen(!alertsOpen)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 6 }}>
            <Bell size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#7C3AED' }}>
              {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{user?.full_name || user?.email?.split('@')[0]}</span>
            <ChevronDown size={14} color="#9CA3AF" />
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>

      {alertsOpen && <AlertsPanel onClose={() => setAlertsOpen(false)} />}
    </div>
  )
}
