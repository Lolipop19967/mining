import { useEffect, useState } from 'react'
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
import { Download, BarChart3, FileText, Shield, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'

type Tab = 'safety' | 'production' | 'assets' | 'compliance' | 'roi'

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('safety')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const today = new Date().toISOString().split('T')[0]
    const [sites, incidents, assets, compliance, maintenance, production, hazards, nearMisses, toolbox, downtime] = await Promise.all([
      supabase.from('sites').select('id, name, status'),
      supabase.from('incidents').select('id, site_id, severity, status, incident_date'),
      supabase.from('assets').select('id, name, type, site_id, status, last_maintenance_date, sites(name)'),
      supabase.from('compliance_issues').select('id, site_id, status, due_date'),
      supabase.from('maintenance_logs').select('id, asset_id, status, scheduled_date'),
      supabase.from('production_logs').select('*').then(r => r, () => ({ data: [] })),
      supabase.from('hazards').select('id, risk_level, status').then(r => r, () => ({ data: [] })),
      supabase.from('near_misses').select('id, potential_severity').then(r => r, () => ({ data: [] })),
      supabase.from('toolbox_talks').select('id, attendee_count, talk_date').then(r => r, () => ({ data: [] })),
      supabase.from('downtime_logs').select('*').then(r => r, () => ({ data: [] })),
    ])

    const inc = incidents.data || []
    const ass = assets.data || []
    const comp = compliance.data || []
    const maint = maintenance.data || []
    const prod = (production as any).data || []
    const haz = (hazards as any).data || []
    const nm = (nearMisses as any).data || []
    const tb = (toolbox as any).data || []
    const dt = (downtime as any).data || []
    const s = sites.data || []

    const hoursWorked = 200 * 8 * 365
    const trifr = parseFloat(((inc.length * 1000000) / hoursWorked).toFixed(2))
    const ltifr = parseFloat(((inc.filter((i: any) => i.severity === 'critical').length * 1000000) / hoursWorked).toFixed(2))

    const nmReportingRate = nm.length > 0 ? Math.min(100, nm.length * 5) : 0
    const toolboxParticipation = tb.length > 0 ? Math.min(100, (tb.reduce((a: number, t: any) => a + t.attendee_count, 0) / tb.length)) : 0
    const safetyCultureScore = Math.round((nmReportingRate * 0.4) + (toolboxParticipation * 0.3) + ((100 - Math.min(100, inc.length * 10)) * 0.3))

    const siteReports = s.map((site: any) => ({
      site: site.name,
      totalIncidents: inc.filter((i: any) => i.site_id === site.id).length,
      criticalIncidents: inc.filter((i: any) => i.site_id === site.id && i.severity === 'critical').length,
      resolvedIncidents: inc.filter((i: any) => i.site_id === site.id && i.status === 'resolved').length,
      openCompliance: comp.filter((c: any) => c.site_id === site.id && c.status === 'open').length,
      totalAssets: ass.filter((a: any) => a.site_id === site.id).length,
      faultyAssets: ass.filter((a: any) => a.site_id === site.id && a.status === 'faulty').length,
    }))

    const downtimeHours = dt.reduce((acc: number, d: any) => {
      if (d.start_time && d.end_time) return acc + (new Date(d.end_time).getTime() - new Date(d.start_time).getTime()) / 3600000
      return acc
    }, 0)

    const overdueComp = comp.filter((c: any) => c.status === 'open' && c.due_date < today).length
    const complianceScore = comp.length > 0 ? Math.round(((comp.length - overdueComp) / comp.length) * 100) : 100

    setData({
      trifr, ltifr, safetyCultureScore, nmReportingRate, toolboxParticipation,
      siteReports, totalIncidents: inc.length,
      criticalIncidents: inc.filter((i: any) => i.severity === 'critical').length,
      resolvedIncidents: inc.filter((i: any) => i.status === 'resolved').length,
      activeHazards: haz.filter((h: any) => h.status === 'active').length,
      criticalHazards: haz.filter((h: any) => h.risk_level === 'critical').length,
      nearMissCount: nm.length, toolboxCount: tb.length,
      totalTons: prod.reduce((a: number, p: any) => a + (p.tons_extracted || 0), 0),
      avgGrade: prod.length > 0 ? (prod.reduce((a: number, p: any) => a + (p.ore_grade || 0), 0) / prod.length).toFixed(3) : 0,
      avgCost: prod.length > 0 ? (prod.reduce((a: number, p: any) => a + (p.cost_per_ton || 0), 0) / prod.length).toFixed(2) : 0,
      totalShifts: prod.length,
      downtimeHours: downtimeHours.toFixed(1), downtimeCost: Math.round(downtimeHours * 15000),
      assetsActive: ass.filter((a: any) => a.status === 'active').length,
      assetsMaintenance: ass.filter((a: any) => a.status === 'maintenance').length,
      assetsFaulty: ass.filter((a: any) => a.status === 'faulty').length,
      pendingMaintenance: maint.filter((m: any) => m.status === 'pending').length,
      completedMaintenance: maint.filter((m: any) => m.status === 'completed').length,
      openCompliance: comp.filter((c: any) => c.status === 'open').length,
      overdueCompliance: overdueComp, complianceScore,
    })
    setLoading(false)
  }

  function exportCSV(rows: any[], filename: string) {
    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'safety', label: 'Safety', icon: Shield },
    { key: 'production', label: 'Production', icon: TrendingUp },
    { key: 'assets', label: 'Assets', icon: BarChart3 },
    { key: 'compliance', label: 'Compliance', icon: FileText },
    { key: 'roi', label: 'ROI', icon: DollarSign },
  ]

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Reports & Analytics</div>
          <div className="page-subtitle">DMRE-compliant safety metrics and operational insights</div>
        </div>
        <button className="btn-primary" onClick={() => exportCSV(data.siteReports || [], 'safety-report')}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#F9FAFB', borderRadius: 8, padding: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: tab === key ? 'white' : 'transparent',
            color: tab === key ? '#7C3AED' : '#6B7280',
            boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div> : (

        tab === 'safety' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'TRIFR', value: data.trifr, sub: 'per 1M hours', color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'LTIFR', value: data.ltifr, sub: 'per 1M hours', color: '#EF4444', bg: '#FEF2F2' },
                { label: 'Safety Culture', value: `${data.safetyCultureScore}%`, sub: 'Engagement score', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Active Hazards', value: data.activeHazards, sub: `${data.criticalHazards} critical`, color: '#F59E0B', bg: '#FFFBEB' },
              ].map(({ label, value, sub, color, bg }) => (
                <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginTop: 4 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Safety Culture Metrics</div>
                {[
                  { label: 'Near Miss Reporting Rate', value: Math.round(data.nmReportingRate), color: '#F59E0B' },
                  { label: 'Toolbox Participation', value: Math.round(data.toolboxParticipation), color: '#3B82F6' },
                  { label: 'Incident Resolution Rate', value: data.totalIncidents > 0 ? Math.round((data.resolvedIncidents / data.totalIncidents) * 100) : 100, color: '#10B981' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}%</span>
                    </div>
                    <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Incident Summary</div>
                {[
                  { label: 'Total Incidents', value: data.totalIncidents, color: '#374151' },
                  { label: 'Critical', value: data.criticalIncidents, color: '#EF4444' },
                  { label: 'Resolved', value: data.resolvedIncidents, color: '#10B981' },
                  { label: 'Near Misses', value: data.nearMissCount, color: '#F59E0B' },
                  { label: 'Toolbox Talks', value: data.toolboxCount, color: '#3B82F6' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F9FAFB', fontWeight: 600, fontSize: 15 }}>Safety by Site</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Site</th><th>Total</th><th>Critical</th><th>Resolved</th><th>Open Compliance</th><th>Faulty Assets</th></tr></thead>
                  <tbody>
                    {(data.siteReports || []).length === 0
                      ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No data yet</td></tr>
                      : (data.siteReports || []).map((r: any) => (
                        <tr key={r.site}>
                          <td style={{ fontWeight: 500 }}>{r.site}</td>
                          <td>{r.totalIncidents}</td>
                          <td><span style={{ color: r.criticalIncidents > 0 ? '#EF4444' : '#374151', fontWeight: r.criticalIncidents > 0 ? 600 : 400 }}>{r.criticalIncidents}</span></td>
                          <td><span style={{ color: '#10B981' }}>{r.resolvedIncidents}</span></td>
                          <td><span style={{ color: r.openCompliance > 0 ? '#F59E0B' : '#374151' }}>{r.openCompliance}</span></td>
                          <td><span style={{ color: r.faultyAssets > 0 ? '#EF4444' : '#374151' }}>{r.faultyAssets}</span></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </>

        ) : tab === 'production' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Tons', value: `${Number(data.totalTons).toFixed(1)}t`, color: '#7C3AED' },
                { label: 'Avg Ore Grade', value: `${data.avgGrade}%`, color: '#10B981' },
                { label: 'Avg Cost/Ton', value: `R${data.avgCost}`, color: '#3B82F6' },
                { label: 'Shifts Logged', value: data.totalShifts, color: '#F59E0B' },
                { label: 'Downtime (hrs)', value: data.downtimeHours, color: '#EF4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Production Summary</div>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
                <strong>{Number(data.totalTons).toFixed(1)} tons</strong> extracted across <strong>{data.totalShifts} shifts</strong>. 
                Average ore grade: <strong>{data.avgGrade}%</strong>. Average cost per ton: <strong>R{data.avgCost}</strong>.
                Total downtime: <strong>{data.downtimeHours} hours</strong> (est. cost impact: <strong>R{Number(data.downtimeCost).toLocaleString()}</strong>).
              </p>
            </div>
          </>

        ) : tab === 'assets' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Active', value: data.assetsActive, color: '#10B981' },
                { label: 'In Maintenance', value: data.assetsMaintenance, color: '#F59E0B' },
                { label: 'Faulty', value: data.assetsFaulty, color: '#EF4444' },
                { label: 'Pending Tasks', value: data.pendingMaintenance, color: '#8B5CF6' },
                { label: 'Tasks Completed', value: data.completedMaintenance, color: '#3B82F6' },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Downtime Cost Analysis</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FEF2F2', borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#374151' }}>Total downtime tracked</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#EF4444' }}>{data.downtimeHours} hrs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FFFBEB', borderRadius: 8 }}>
                <span style={{ fontSize: 14, color: '#374151' }}>Estimated cost (@ R15,000/hr)</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>R{Number(data.downtimeCost).toLocaleString()}</span>
              </div>
            </div>
          </>

        ) : tab === 'compliance' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Compliance Score', value: `${data.complianceScore}%`, color: data.complianceScore >= 80 ? '#10B981' : '#EF4444' },
                { label: 'Open Issues', value: data.openCompliance, color: '#F59E0B' },
                { label: 'Overdue', value: data.overdueCompliance, color: '#EF4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Compliance Scorecard</div>
              {[
                { label: 'DMRE Safety Compliance', score: data.complianceScore },
                { label: 'Hazard Management', score: data.activeHazards === 0 ? 100 : Math.max(0, 100 - data.activeHazards * 10) },
                { label: 'Maintenance Schedule', score: (data.completedMaintenance + data.pendingMaintenance) > 0 ? Math.round((data.completedMaintenance / (data.completedMaintenance + data.pendingMaintenance)) * 100) : 100 },
                { label: 'Incident Reporting', score: 100 },
              ].map(({ label, score }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: score >= 80 ? '#10B981' : '#EF4444' }}>{score}%</span>
                    <span className={`badge ${score >= 80 ? 'badge-green' : 'badge-red'}`}>{score >= 80 ? 'Compliant' : 'At Risk'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>

        ) : (
          <>
            <div style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', borderRadius: 12, padding: 24, color: 'white', marginBottom: 20 }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Estimated Annual ROI</div>
              <div style={{ fontSize: 40, fontWeight: 700 }}>1,500%</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>R600K/year cost · R9.6M/year savings · 23-day payback</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#EF4444' }}>Annual Losses Without MineOps</div>
                {[['Safety incidents','R1.3M'],['DMRE penalties','R600K'],['Equipment downtime','R3.4M'],['Production delays','R2.5M'],['Admin overhead','R8.8M']].map(([l,v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F9FAFB' }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700 }}>
                  <span>Total</span><span style={{ color: '#EF4444' }}>R16.6M</span>
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#10B981' }}>Annual Savings With MineOps</div>
                {[['Incident reduction 40%','R1.3M'],['Zero DMRE penalties','R600K'],['30% less downtime','R3.4M'],['Better scheduling','R2.5M'],['Compliance automation','R1.8M']].map(([l,v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F9FAFB' }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700 }}>
                  <span>Total Savings</span><span style={{ color: '#10B981' }}>R9.6M</span>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}
