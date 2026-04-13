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
import { Activity, User, Box, MapPin, AlertTriangle, ClipboardCheck, Wrench } from 'lucide-react'

const entityIcon = (type: string) => {
  switch (type) {
    case 'site': return <MapPin size={14} color="#7C3AED" />
    case 'asset': return <Box size={14} color="#3B82F6" />
    case 'incident': return <AlertTriangle size={14} color="#EF4444" />
    case 'compliance_issue': return <ClipboardCheck size={14} color="#F59E0B" />
    case 'maintenance_log': return <Wrench size={14} color="#10B981" />
    default: return <Activity size={14} color="#6B7280" />
  }
}

const actionColor = (action: string) => {
  switch (action) {
    case 'created': return { bg: '#ECFDF5', color: '#065F46' }
    case 'updated': return { bg: '#EFF6FF', color: '#1E40AF' }
    case 'deleted': return { bg: '#FEF2F2', color: '#991B1B' }
    case 'completed': return { bg: '#F5F3FF', color: '#5B21B6' }
    default: return { bg: '#F9FAFB', color: '#374151' }
  }
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => { fetchLogs() }, [page, entityFilter, actionFilter])

  async function fetchLogs() {
    setLoading(true)
    let q = supabase.from('activity_logs').select('*, profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (entityFilter) q = q.eq('entity_type', entityFilter)
    if (actionFilter) q = q.eq('action', actionFilter)
    const { data } = await q
    setLogs(data as ActivityLog[] || [])
    setLoading(false)
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Activity Log</div>
          <div className="page-subtitle">Full audit trail of all actions</div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="input" style={{ width: 170 }} value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(0) }}>
          <option value="">All entities</option>
          <option value="site">Sites</option>
          <option value="asset">Assets</option>
          <option value="incident">Incidents</option>
          <option value="compliance_issue">Compliance</option>
          <option value="maintenance_log">Maintenance</option>
        </select>
        <select className="input" style={{ width: 150 }} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0) }}>
          <option value="">All actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Activity size={32} color="#E5E7EB" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: '#9CA3AF', fontSize: 14 }}>No activity recorded yet</div>
          </div>
        ) : (
          <div>
            {logs.map((log, i) => {
              const { bg, color } = actionColor(log.action)
              const name = (log as any).profiles?.full_name || (log as any).profiles?.email || 'Unknown user'
              const details = log.details as Record<string, string> | null
              return (
                <div key={log.id} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: i < logs.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={16} color="#7C3AED" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{name}</span>
                      <span style={{ background: bg, color, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }}>{log.action}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {entityIcon(log.entity_type)}
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{log.entity_type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    {details && Object.keys(details).length > 0 && (
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                        {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>{timeAgo(log.created_at)}</div>
                </div>
              )
            })}
          </div>
        )}
        {/* Pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13, opacity: page === 0 ? 0.5 : 1 }}>Previous</button>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Page {page + 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={logs.length < PAGE_SIZE} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13, opacity: logs.length < PAGE_SIZE ? 0.5 : 1 }}>Next</button>
        </div>
      </div>
    </div>
  )
}
