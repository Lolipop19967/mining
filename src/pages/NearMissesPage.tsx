import { useEffect, useState } from 'react'
import { supabase } from "../lib/supabase"

import type { Site } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, X, AlertOctagon } from 'lucide-react'

type NearMissForm = {
  site_id: string
  description: string
  location_detail: string
  potential_severity: 'low' | 'medium' | 'high' | 'critical'
  immediate_action: string
  report_date: string
  status: 'open' | 'investigated' | 'closed'
}

const emptyNM: NearMissForm = {
  site_id: '', description: '', location_detail: '', potential_severity: 'medium',
  immediate_action: '', report_date: new Date().toISOString().split('T')[0], status: 'open'
}

interface NearMiss {
  id: string
  site_id: string | null
  description: string
  location_detail: string | null
  potential_severity: string
  immediate_action: string | null
  report_date: string
  status: string
  created_at: string
  sites?: { name: string }
  profiles?: { full_name: string | null; email: string }
}

export default function NearMissesPage() {
  const { user, logActivity } = useAuthStore()
  const [items, setItems] = useState<NearMiss[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<NearMiss | null>(null)
  const [form, setForm] = useState<NearMissForm>(emptyNM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { fetch(); fetchSites() }, [])

  async function fetch() {
    const { data } = await supabase.from('near_misses')
      .select('*, sites(name), profiles(full_name, email)')
      .order('report_date', { ascending: false })
    setItems(data as NearMiss[] || [])
    setLoading(false)
  }

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('id, name')
    setSites(data as Site[] || [])
  }

  function openCreate() { setEditing(null); setForm(emptyNM); setModal(true) }
  function openEdit(i: NearMiss) {
    setEditing(i)
    setForm({
      site_id: i.site_id || '', description: i.description, location_detail: i.location_detail || '',
      potential_severity: i.potential_severity as any, immediate_action: i.immediate_action || '',
      report_date: i.report_date, status: i.status as any
    })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: form.site_id || null, description: form.description,
      location_detail: form.location_detail || null, potential_severity: form.potential_severity,
      immediate_action: form.immediate_action || null, report_date: form.report_date,
      status: form.status, updated_at: new Date().toISOString()
    }
    if (editing) {
      await supabase.from('near_misses').update(payload).eq('id', editing.id)
    } else {
      const { data } = await supabase.from('near_misses').insert({ ...payload, reported_by: user?.id }).select().single()
      await logActivity('created', 'near_miss', data?.id, { severity: form.potential_severity })
    }
    setSaving(false); setModal(false); fetch()
  }

  async function handleDelete(id: string) {
    await supabase.from('near_misses').delete().eq('id', id)
    setDeleteId(null); fetch()
  }

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return (!q || i.description.toLowerCase().includes(q)) &&
      (!statusFilter || i.status === statusFilter)
  })

  const sevClass = (s: string) => s === 'critical' ? 'badge-red' : s === 'high' ? 'badge-red' : s === 'medium' ? 'badge-yellow' : 'badge-green'
  const statClass = (s: string) => s === 'open' ? 'badge-yellow' : s === 'investigated' ? 'badge-blue' : 'badge-green'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Near Miss Reports</div>
          <div className="page-subtitle">{items.filter(i => i.status === 'open').length} open · {items.length} total</div>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} />Report Near Miss</button>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#92400E' }}>
        Near misses are leading indicators of safety culture. Every report helps prevent future incidents.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Open', value: items.filter(i => i.status === 'open').length, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Investigated', value: items.filter(i => i.status === 'investigated').length, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Closed', value: items.filter(i => i.status === 'closed').length, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Critical Potential', value: items.filter(i => i.potential_severity === 'critical').length, color: '#EF4444', bg: '#FEF2F2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search near misses..." />
        </div>
        <select className="input" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="investigated">Investigated</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Description</th><th>Site</th><th>Potential Severity</th><th>Date</th><th>Status</th><th>Immediate Action</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                    <AlertOctagon size={32} color="#E5E7EB" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No near misses reported
                  </td></tr>
                ) : filtered.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 500, maxWidth: 200 }}>{i.description.slice(0, 60)}{i.description.length > 60 ? '…' : ''}</td>
                    <td style={{ color: '#6B7280' }}>{i.sites?.name || '—'}</td>
                    <td><span className={`badge ${sevClass(i.potential_severity)}`}>{i.potential_severity}</span></td>
                    <td style={{ color: '#6B7280' }}>{new Date(i.report_date).toLocaleDateString()}</td>
                    <td><span className={`badge ${statClass(i.status)}`}>{i.status}</span></td>
                    <td style={{ color: '#6B7280', fontSize: 13 }}>{i.immediate_action ? i.immediate_action.slice(0, 40) + '…' : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>
                      </div>
                    </td>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Near Miss' : 'Report Near Miss'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Description *</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe what happened and what could have gone wrong" style={{ resize: 'vertical' }} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Site</label>
                  <select className="input" value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                    <option value="">No site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Potential Severity</label>
                  <select className="input" value={form.potential_severity} onChange={e => setForm(f => ({ ...f, potential_severity: e.target.value as any }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Location Detail</label>
                  <input className="input" value={form.location_detail} onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))} placeholder="e.g. Level 3, Section B" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Date</label>
                  <input className="input" type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Immediate Action Taken</label>
                <textarea className="input" value={form.immediate_action} onChange={e => setForm(f => ({ ...f, immediate_action: e.target.value }))} rows={2} style={{ resize: 'vertical' }} placeholder="What was done immediately after the near miss?" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="open">Open</option>
                  <option value="investigated">Investigated</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.description || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Report?</div>
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
