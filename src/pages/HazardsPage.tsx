import { useEffect, useState } from 'react'
import { supabase } from "../lib/supabase"

import type { Site } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, AlertCircle, X, Shield } from 'lucide-react'

type HazardForm = {
  site_id: string
  title: string
  description: string
  category: 'mechanical' | 'electrical' | 'chemical' | 'physical' | 'biological' | 'ergonomic' | 'fire' | 'other'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  control_measures: string
  status: 'active' | 'mitigated' | 'closed'
}

const empty: HazardForm = {
  site_id: '', title: '', description: '', category: 'mechanical',
  risk_level: 'medium', control_measures: '', status: 'active'
}

interface Hazard {
  id: string
  site_id: string | null
  title: string
  description: string | null
  category: string
  risk_level: string
  control_measures: string | null
  status: string
  created_at: string
  sites?: { name: string }
}

export default function HazardsPage() {
  const { user, logActivity } = useAuthStore()
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Hazard | null>(null)
  const [form, setForm] = useState<HazardForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { fetchHazards(); fetchSites() }, [])

  async function fetchHazards() {
    const { data } = await supabase.from('hazards').select('*, sites(name)').order('created_at', { ascending: false })
    setHazards(data as Hazard[] || [])
    setLoading(false)
  }

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('id, name')
    setSites(data as Site[] || [])
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(h: Hazard) {
    setEditing(h)
    setForm({
      site_id: h.site_id || '', title: h.title, description: h.description || '',
      category: h.category as any, risk_level: h.risk_level as any,
      control_measures: h.control_measures || '', status: h.status as any
    })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: form.site_id || null, title: form.title, description: form.description || null,
      category: form.category, risk_level: form.risk_level,
      control_measures: form.control_measures || null, status: form.status,
      updated_at: new Date().toISOString()
    }
    if (editing) {
      await supabase.from('hazards').update(payload).eq('id', editing.id)
      await logActivity('updated', 'hazard', editing.id, { title: form.title })
    } else {
      const { data } = await supabase.from('hazards').insert({ ...payload, identified_by: user?.id }).select().single()
      await logActivity('created', 'hazard', data?.id, { title: form.title, risk: form.risk_level })
    }
    setSaving(false); setModal(false); fetchHazards()
  }

  async function handleDelete(id: string) {
    await supabase.from('hazards').delete().eq('id', id)
    setDeleteId(null); fetchHazards()
  }

  const filtered = hazards.filter(h => {
    const q = search.toLowerCase()
    return (!q || h.title.toLowerCase().includes(q) || h.category.toLowerCase().includes(q)) &&
      (!riskFilter || h.risk_level === riskFilter) &&
      (!statusFilter || h.status === statusFilter)
  })

  const riskClass = (r: string) => r === 'critical' ? 'badge-red' : r === 'high' ? 'badge-red' : r === 'medium' ? 'badge-yellow' : 'badge-green'
  const statusClass = (s: string) => s === 'active' ? 'badge-red' : s === 'mitigated' ? 'badge-yellow' : 'badge-green'

  const criticalCount = hazards.filter(h => h.risk_level === 'critical' && h.status === 'active').length
  const highCount = hazards.filter(h => h.risk_level === 'high' && h.status === 'active').length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Hazard Register</div>
          <div className="page-subtitle">{hazards.filter(h => h.status === 'active').length} active hazards</div>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} />Add Hazard</button>
      </div>

      {(criticalCount > 0 || highCount > 0) && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#EF4444" />
          <span style={{ fontSize: 14, color: '#991B1B', fontWeight: 500 }}>
            {criticalCount > 0 && `${criticalCount} critical`}{criticalCount > 0 && highCount > 0 && ' · '}{highCount > 0 && `${highCount} high`} risk hazards require immediate attention
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Critical', value: hazards.filter(h => h.risk_level === 'critical').length, color: '#EF4444', bg: '#FEF2F2' },
          { label: 'High Risk', value: hazards.filter(h => h.risk_level === 'high').length, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Mitigated', value: hazards.filter(h => h.status === 'mitigated').length, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Closed', value: hazards.filter(h => h.status === 'closed').length, color: '#10B981', bg: '#ECFDF5' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hazards..." />
        </div>
        <select className="input" style={{ width: 140 }} value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
          <option value="">All risks</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="input" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="mitigated">Mitigated</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Hazard</th><th>Category</th><th>Site</th><th>Risk Level</th><th>Status</th><th>Control Measures</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                    <Shield size={32} color="#E5E7EB" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No hazards recorded
                  </td></tr>
                ) : filtered.map(h => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={14} color={h.risk_level === 'critical' || h.risk_level === 'high' ? '#EF4444' : '#F59E0B'} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{h.title}</div>
                          {h.description && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{h.description.slice(0, 50)}{h.description.length > 50 ? '…' : ''}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-purple">{h.category}</span></td>
                    <td style={{ color: '#6B7280' }}>{h.sites?.name || '—'}</td>
                    <td><span className={`badge ${riskClass(h.risk_level)}`}>{h.risk_level}</span></td>
                    <td><span className={`badge ${statusClass(h.status)}`}>{h.status}</span></td>
                    <td style={{ color: '#6B7280', fontSize: 13 }}>{h.control_measures ? h.control_measures.slice(0, 50) + (h.control_measures.length > 50 ? '…' : '') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Hazard' : 'Add Hazard'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Unstable rock face in Section B" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}>
                    {['mechanical', 'electrical', 'chemical', 'physical', 'biological', 'ergonomic', 'fire', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Risk Level</label>
                  <select className="input" value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value as any }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
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
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                    <option value="active">Active</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Control Measures</label>
                <textarea className="input" value={form.control_measures} onChange={e => setForm(f => ({ ...f, control_measures: e.target.value }))} rows={2} placeholder="What controls are in place to manage this hazard?" style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.title || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Add hazard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Hazard?</div>
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
