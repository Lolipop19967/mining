import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Site, Incident } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, AlertTriangle, X } from 'lucide-react'

const INCIDENT_TYPES = ['equipment_failure', 'slip_trip_fall', 'explosion', 'fire', 'chemical_spill', 'electrical', 'structural', 'vehicle', 'other']

type IncidentForm = {
  incident_type: string
  description: string
  site_id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'resolved' | 'investigating'
  report_date: string
  injuries: string
  fatalities: string
  cause: string
  corrective_actions: string
}

const empty: IncidentForm = {
  incident_type: 'other', description: '', site_id: '',
  severity: 'low', status: 'open',
  report_date: new Date().toISOString().split('T')[0],
  injuries: '0', fatalities: '0', cause: '', corrective_actions: ''
}

export default function IncidentsPage() {
  const { user, logActivity } = useAuthStore()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Incident | null>(null)
  const [form, setForm] = useState<IncidentForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const canWrite = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'operator'

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: inc } = await supabase.from('incidents').select('*, sites(id, name)').order('report_date', { ascending: false })
    const { data: sit } = await supabase.from('sites').select('id, name')
    setIncidents(inc as Incident[] || [])
    setSites(sit as Site[] || [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(i: Incident) {
    setEditing(i)
    setForm({
      incident_type: i.incident_type, description: i.description || '',
      site_id: i.site_id || '', severity: i.severity, status: i.status,
      report_date: i.report_date.split('T')[0],
      injuries: String(i.injuries || 0), fatalities: String(i.fatalities || 0),
      cause: i.cause || '', corrective_actions: i.corrective_actions || ''
    })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      incident_type: form.incident_type, description: form.description || null,
      site_id: form.site_id || null, severity: form.severity, status: form.status,
      report_date: form.report_date, injuries: parseInt(form.injuries) || 0,
      fatalities: parseInt(form.fatalities) || 0, cause: form.cause || null,
      corrective_actions: form.corrective_actions || null,
      reported_by_email: user?.email || null
    }
    if (editing) {
      await supabase.from('incidents').update(payload).eq('id', editing.id)
      await logActivity('updated', 'incident', editing.id, { incident_type: form.incident_type })
    } else {
      const { data } = await supabase.from('incidents').insert(payload).select().single()
      await logActivity('created', 'incident', data?.id, { incident_type: form.incident_type })
    }
    setSaving(false); setModal(false); fetchData()
  }

  async function handleDelete(id: string) {
    await supabase.from('incidents').delete().eq('id', id)
    await logActivity('deleted', 'incident', id)
    setDeleteId(null); fetchData()
  }

  const severityClass = (s: string) => s === 'critical' ? 'badge-red' : s === 'high' ? 'badge-red' : s === 'medium' ? 'badge-yellow' : 'badge-green'

  const filtered = incidents.filter(i => {
    const q = search.toLowerCase()
    return (!q || i.incident_type.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)) &&
      (!severityFilter || i.severity === severityFilter) &&
      (!statusFilter || i.status === statusFilter) &&
      (!siteFilter || i.site_id === siteFilter)
  })

  const criticalCount = incidents.filter(i => (i.severity === 'critical' || i.severity === 'high') && i.status === 'open').length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Incidents</div>
          <div className="page-subtitle">{incidents.length} total · {criticalCount > 0 && <span style={{ color: '#EF4444' }}>{criticalCount} critical open</span>}</div>
        </div>
        {canWrite && <button className="btn-primary" onClick={openCreate}><Plus size={15} />Log Incident</button>}
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..." />
        </div>
        <select className="input" style={{ width: 140 }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select className="input" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
        <select className="input" style={{ width: 160 }} value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
          <option value="">All sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Type</th><th>Site</th><th>Date</th><th>Severity</th><th>Injuries/Fatalities</th><th>Status</th>
                {canWrite && <th></th>}
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No incidents found</td></tr>
                ) : filtered.map(incident => (
                  <tr key={incident.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={15} color={incident.severity === 'critical' || incident.severity === 'high' ? '#EF4444' : incident.severity === 'medium' ? '#F59E0B' : '#10B981'} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{incident.incident_type.replace(/_/g, ' ')}</div>
                          {incident.description && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{incident.description.slice(0, 60)}{incident.description.length > 60 ? '…' : ''}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#6B7280' }}>{(incident as any).sites?.name || '—'}</td>
                    <td style={{ color: '#6B7280' }}>{new Date(incident.report_date).toLocaleDateString()}</td>
                    <td><span className={`badge ${severityClass(incident.severity)}`}>{incident.severity}</span></td>
                    <td style={{ color: '#6B7280' }}>{incident.injuries || 0} / {incident.fatalities || 0}</td>
                    <td><span className={`badge ${incident.status === 'resolved' ? 'badge-green' : incident.status === 'investigating' ? 'badge-purple' : 'badge-yellow'}`}>{incident.status}</span></td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(incident)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                          {user?.role === 'admin' && <button onClick={() => setDeleteId(incident.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Incident' : 'Log Incident'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Incident Type *</label>
                  <select className="input" value={form.incident_type} onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}>
                    {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Site</label>
                  <select className="input" value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                    <option value="">No site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Severity</label>
                  <select className="input" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as IncidentForm['severity'] }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as IncidentForm['status'] }))}>
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Report Date</label>
                  <input className="input" type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Injuries</label>
                  <input className="input" type="number" min="0" value={form.injuries} onChange={e => setForm(f => ({ ...f, injuries: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Fatalities</label>
                  <input className="input" type="number" min="0" value={form.fatalities} onChange={e => setForm(f => ({ ...f, fatalities: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Cause</label>
                <input className="input" value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))} placeholder="Root cause of incident" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Corrective Actions</label>
                <textarea className="input" value={form.corrective_actions} onChange={e => setForm(f => ({ ...f, corrective_actions: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Log incident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Incident?</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>This action cannot be undone.</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
