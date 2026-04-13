import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from "../lib/supabase"

import type {
  Site,
  Asset,
  Profile,
  Incident,
  MaintenanceLog,
  ComplianceIssue,
  ActivityLog
} from "../lib/types"
import {
  Shield, AlertTriangle, ClipboardList, MapPin, Plus, TrendingUp,
  Wrench, HardHat, Activity, BarChart3, Clock, CheckCircle, AlertCircle
} from 'lucide-react'

interface DashboardData {
  activeSites: number
  totalAssets: number
  assetsInMaintenance: number
  assetsFaulty: number
  totalIncidents: number
  criticalIncidents: number
  openIncidents: number
  openCompliance: number
  overdueCompliance: number
  pendingMaintenance: number
  trifr: number
  ltifr: number
  totalHazards: number
  activeHazards: number
  nearMisses: number
  openPermits: number
  productionToday: number
  totalDowntimeHours: number
}

interface RecentIncident {
  id: string
  title: string
  severity: string
  status: string
  incident_date: string
  sites: { name: string } | null
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [incidents, setIncidents] = useState<RecentIncident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
    const sub = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compliance_issues' }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, fetchDashboard)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  async function fetchDashboard() {
    const today = new Date().toISOString().split('T')[0]

    const [sitesRes, assetsRes, incidentsRes, complianceRes, maintenanceRes,
      hazardsRes, nearMissRes, permitsRes, productionRes, downtimeRes] = await Promise.all([
      supabase.from('sites').select('id, status'),
      supabase.from('assets').select('id, status'),
      supabase.from('incidents').select('id, severity, status, incident_date'),
      supabase.from('compliance_issues').select('id, status, due_date'),
      supabase.from('maintenance_logs').select('id, status'),
      supabase.from('hazards').select('id, status').then(r => r, () => ({ data: [] })),
      supabase.from('near_misses').select('id').then(r => r, () => ({ data: [] })),
      supabase.from('permits').select('id, status').then(r => r, () => ({ data: [] })),
      supabase.from('production_logs').select('tons_extracted').eq('log_date', today).then(r => r, () => ({ data: [] })),
      supabase.from('downtime_logs').select('start_time, end_time').then(r => r, () => ({ data: [] })),
    ])

    const sites = sitesRes.data || []
    const assets = assetsRes.data || []
    const allIncidents = incidentsRes.data || []
    const compliance = complianceRes.data || []
    const maintenance = maintenanceRes.data || []
    const hazards = (hazardsRes as any).data || []
    const nearMisses = (nearMissRes as any).data || []
    const permits = (permitsRes as any).data || []
    const production = (productionRes as any).data || []
    const downtime = (downtimeRes as any).data || []

    // TRIFR = (Total Recordable Incidents × 1,000,000) / Hours Worked
    // Using estimated 200 workers × 8hrs × 365 days as denominator baseline
    const hoursWorked = 200 * 8 * 365
    const trifr = allIncidents.length > 0 ? parseFloat(((allIncidents.length * 1000000) / hoursWorked).toFixed(2)) : 0
    const lostTimeIncidents = allIncidents.filter((i: any) => i.severity === 'critical').length
    const ltifr = lostTimeIncidents > 0 ? parseFloat(((lostTimeIncidents * 1000000) / hoursWorked).toFixed(2)) : 0

    // Downtime hours
    const downtimeHours = downtime.reduce((acc: number, d: { start_time: string; end_time: string }) => {
      if (d.start_time && d.end_time) {
        return acc + (new Date(d.end_time).getTime() - new Date(d.start_time).getTime()) / 3600000
      }
      return acc
    }, 0)

    setData({
      activeSites: sites.filter((s: any) => s.status === 'active').length,
      totalAssets: assets.length,
      assetsInMaintenance: assets.filter((a: any) => a.status === 'maintenance').length,
      assetsFaulty: assets.filter((a: any) => a.status === 'faulty').length,
      totalIncidents: allIncidents.length,
      criticalIncidents: allIncidents.filter((i: any) => i.severity === 'critical' && i.status === 'open').length,
      openIncidents: allIncidents.filter((i: any) => i.status === 'open').length,
      openCompliance: compliance.filter((c: any) => c.status === 'open').length,
      overdueCompliance: compliance.filter((c: any) => c.status === 'open' && c.due_date < today).length,
      pendingMaintenance: maintenance.filter((m: any) => m.status === 'pending').length,
      trifr,
      ltifr,
      totalHazards: hazards.length,
      activeHazards: hazards.filter((h: any) => h.status === 'active').length,
      nearMisses: nearMisses.length,
      openPermits: permits.filter((p: any) => ['pending', 'approved', 'active'].includes(p.status)).length,
      productionToday: production.reduce((acc: number, p: any) => acc + (p.tons_extracted || 0), 0),
      totalDowntimeHours: parseFloat(downtimeHours.toFixed(1)),
    })

    const { data: recentData } = await supabase.from('incidents')
      .select('id, title, severity, status, incident_date, sites(name)')
      .order('incident_date', { ascending: false })
      .limit(6)
    setIncidents((recentData as unknown as RecentIncident[]) || [])
    setLoading(false)
  }

  const sevClass = (s: string) => s === 'critical' ? 'badge-red' : s === 'medium' ? 'badge-yellow' : 'badge-green'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Live overview of your mining operations</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => navigate('/incidents')}><Plus size={15} /> Log Incident</button>
          <button className="btn-primary" onClick={() => navigate('/production')}><Plus size={15} /> Log Production</button>
        </div>
      </div>

      {/* TRIFR / LTIFR Banner */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', borderRadius: 12, padding: '16px 20px', color: 'white' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>TRIFR</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{data.trifr}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Total Recordable Injury Frequency Rate</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>per 1,000,000 hours worked</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 12, padding: '16px 20px', color: 'white' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>LTIFR</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{data.ltifr}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Lost Time Injury Frequency Rate</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>per 1,000,000 hours worked</div>
          </div>
        </div>
      )}

      {/* Main stat cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="stat-card" style={{ height: 100, background: '#F9FAFB' }} />)}
        </div>
      ) : data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active Sites', value: data.activeSites, icon: MapPin, color: '#7C3AED', bg: '#F5F3FF', sub: 'Operational' },
            { label: 'Total Assets', value: data.totalAssets, icon: Wrench, color: '#3B82F6', bg: '#EFF6FF', sub: `${data.assetsFaulty} faulty` },
            { label: 'Open Incidents', value: data.openIncidents, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', sub: `${data.criticalIncidents} critical` },
            { label: 'Compliance', value: data.openCompliance, icon: ClipboardList, color: '#F59E0B', bg: '#FFFBEB', sub: `${data.overdueCompliance} overdue` },
            { label: 'Maintenance', value: data.pendingMaintenance, icon: Clock, color: '#8B5CF6', bg: '#F5F3FF', sub: 'Pending tasks' },
            { label: 'Active Hazards', value: data.activeHazards, icon: AlertCircle, color: '#DC2626', bg: '#FEF2F2', sub: `${data.totalHazards} total` },
            { label: 'Near Misses', value: data.nearMisses, icon: Shield, color: '#D97706', bg: '#FFFBEB', sub: 'Reported' },
            { label: "Today's Production", value: `${data.productionToday}t`, icon: TrendingUp, color: '#10B981', bg: '#ECFDF5', sub: 'Tons extracted' },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Status + Open Permits row */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wrench size={15} color="#7C3AED" /> Equipment Status
            </div>
            {[
              { label: 'Active', value: data.totalAssets - data.assetsInMaintenance - data.assetsFaulty, color: '#10B981', bg: '#ECFDF5' },
              { label: 'In Maintenance', value: data.assetsInMaintenance, color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Faulty', value: data.assetsFaulty, color: '#EF4444', bg: '#FEF2F2' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: bg, borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={15} color="#7C3AED" /> Operations Summary
            </div>
            {[
              { label: 'Downtime (hrs)', value: data.totalDowntimeHours, color: '#EF4444' },
              { label: 'Open Permits', value: data.openPermits, color: '#3B82F6' },
              { label: 'Total Incidents', value: data.totalIncidents, color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Incidents */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Recent Incidents</div>
          <button className="btn-secondary" onClick={() => navigate('/incidents')} style={{ padding: '6px 12px', fontSize: 13 }}>View all</button>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: '#9CA3AF', fontSize: 14 }}>
            <CheckCircle size={32} color="#E5E7EB" style={{ margin: '0 auto 8px', display: 'block' }} />
            No incidents recorded
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Site</th><th>Severity</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {incidents.map(i => (
                  <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/incidents')}>
                    <td style={{ fontWeight: 500 }}>{i.title}</td>
                    <td style={{ color: '#6B7280' }}>{i.sites?.name || '—'}</td>
                    <td><span className={`badge ${sevClass(i.severity)}`}>{i.severity}</span></td>
                    <td><span className={`badge ${i.status === 'open' ? 'badge-yellow' : 'badge-green'}`}>{i.status}</span></td>
                    <td style={{ color: '#6B7280' }}>{new Date(i.incident_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { label: 'Log Production', to: '/production', color: '#10B981', bg: '#ECFDF5' },
          { label: 'Hazard Register', to: '/hazards', color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Near Miss Report', to: '/near-misses', color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Permit to Work', to: '/permits', color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Toolbox Talks', to: '/toolbox', color: '#8B5CF6', bg: '#F5F3FF' },
          { label: 'View Reports', to: '/reports', color: '#7C3AED', bg: '#F5F3FF' },
        ].map(({ label, to, color, bg }) => (
          <button key={to} onClick={() => navigate(to)} style={{
            background: bg, border: `1px solid ${color}22`, borderRadius: 10, padding: '12px 14px',
            textAlign: 'left', cursor: 'pointer', color, fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Plus size={14} />{label}
          </button>
        ))}
      </div>
    </div>
  )
}
