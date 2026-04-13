import { useEffect, useState } from 'react'
import { supabase } from "../lib/supabase"

import type { Site } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, X, FileCheck, CheckCircle, Clock } from 'lucide-react'

type PermitForm = {
  site_id: string
  title: string
  work_type: 'hot_work' | 'confined_space' | 'electrical' | 'excavation' | 'height' | 'general'
  description: string
  location_detail: string
  start_datetime: string
  end_datetime: string
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled'
}

const now = new Date()
const tomorrow = new Date(now.getTime() + 86400000)
const empty: PermitForm = {
  site_id: '', title: '', work_type: 'general', description: '', location_detail: '',
  start_datetime: now.toISOString().slice(0, 16),
  end_datetime: tomorrow.toISOString().slice(0, 16),
  status: 'pending'
}

interface Permit {
  id: string
  site_id: string | null
  title: string
  work_type: string
  description: string | null
  location_detail: string | null
  start_datetime: string
  end_datetime: string
  status: string
  created_at: string
  sites?: { name: string }
  profiles?: { full_name: string | null; email: string }
}

export default function PermitsPage() {
  const { user, logActivity } = useAuthStore()
  const [permits, setPermits] = useState<Permit[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Permit | null>(null)
  const [form, setForm] = useState<PermitForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const canApprove = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => { fetchPermits(); fetchSites() }, [])

  async function fetchPermits() {
    const { data } = await supabase.from('permits')
      .select('*, sites(name), profiles(full_name, email)')
      .order('created_at', { ascending: false })
    setPermits(data as Permit[] || [])
    setLoading(false)
  }

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('id, name')
    setSites(data as Site[] || [])
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(p: Permit) {
    setEditing(p)
    setForm({
      site_id: p.site_id || '', title: p.title, work_type: p.work_type as any,
      description: p.description || '', location_detail: p.location_detail || '',
      start_datetime: p.start_datetime.slice(0, 16), end_datetime: p.end_datetime.slice(0, 16),
      status: p.status as any
    })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: form.site_id || null, title: form.title, work_type: form.work_type,
      description: form.description || null, location_detail: form.location_detail || null,
      start_datetime: new Date(form.start_datetime).toISOString(),
      end_datetime: new Date(form.end_datetime).toISOString(),
      status: form.status, updated_at: new Date().toISOString()
    }
    if (editing) {
      await supabase.from('permits').update(payload).eq('id', editing.id)
      await logActivity('updated', 'permit', editing.id, { title: form.title, status: form.status })
    } else {
      const { data } = await supabase.from('permits').insert({ ...payload, requested_by: user?.id }).select().single()
      await logActivity('created', 'permit', data?.id, { title: form.title, type: form.work_type })
    }
    setSaving(false); setModal(false); fetchPermits()
  }

  async function approvePermit(id: string) {
    await supabase.from('permits').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', id)
    await logActivity('approved', 'permit', id)
    fetchPermits()
  }

  async function handleDelete(id: string) {
    await supabase.from('permits').delete().eq('id', id)
    setDeleteId(null); fetchPermits()
  }

  const filtered = permits.filter(p => {
    const q = search.toLowerCase()
    return (!q || p.title.toLowerCase().includes(q) || p.work_type.includes(q)) &&
      (!statusFilter || p.status === statusFilter)
  })

  const statusClass = (s: string) => {
    switch (s) {
      case 'pending': return 'badge-yellow'
      case 'approved': return 'badge-blue'
      case 'active': return 'badge-green'
      case 'completed': return 'badge-green'
      case 'cancelled': return 'badge-gray'
      default: return 'badge-gray'
    }
  }

  const workTypeLabel = (t: string) => t.replace('_', ' ')

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Permit to Work</div>
          <div className="page-subtitle">{permits.filter(p => p.status === 'pending').length} pending approval</div>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} />New Permit</button>
      </div>

      {permits.filter(p => p.status === 'pending').length > 0 && canApprove && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} color="#3B82F6" />
          <span style={{ fontSize: 14, color: '#1E40AF', fontWeight: 500 }}>
            {permits.filter(p => p.status === 'pending').length} permit(s) awaiting your approval
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Pending', value: permits.filter(p => p.status === 'pending').length, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Approved', value: permits.filter(p => p.status === 'approved').length, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Active', value: permits.filter(p => p.status === 'active').length, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Completed', value: permits.filter(p => p.status === 'completed').length, color: '#6B7280', bg: '#F9FAFB' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search permits..." />
        </div>
        <select className="input" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Title</th><th>Type</th><th>Site</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                    <FileCheck size={32} color="#E5E7EB" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No permits found
                  </td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.title}</td>
                    <td><span className="badge badge-purple">{workTypeLabel(p.work_type)}</span></td>
                    <td style={{ color: '#6B7280' }}>{p.sites?.name || '—'}</td>
                    <td style={{ color: '#6B7280', fontSize: 13 }}>{new Date(p.start_datetime).toLocaleDateString()}</td>
                    <td style={{ color: '#6B7280', fontSize: 13 }}>{new Date(p.end_datetime).toLocaleDateString()}</td>
                    <td><span className={`badge ${statusClass(p.status)}`}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.status === 'pending' && canApprove && (
                          <button onClick={() => approvePermit(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ECFDF5', border: '1px solid #D1FAE5', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#065F46', cursor: 'pointer', fontWeight: 500 }}>
                            <CheckCircle size={12} /> Approve
                          </button>
                        )}
                        <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Permit' : 'New Permit to Work'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Welding repair on conveyor belt" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Work Type</label>
                  <select className="input" value={form.work_type} onChange={e => setForm(f => ({ ...f, work_type: e.target.value as any }))}>
                    <option value="general">General</option>
                    <option value="hot_work">Hot Work</option>
                    <option value="confined_space">Confined Space</option>
                    <option value="electrical">Electrical</option>
                    <option value="excavation">Excavation</option>
                    <option value="height">Working at Height</option>
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Location Detail</label>
                <input className="input" value={form.location_detail} onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))} placeholder="e.g. Level 2, North shaft" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Start Date/Time *</label>
                  <input className="input" type="datetime-local" value={form.start_datetime} onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>End Date/Time *</label>
                  <input className="input" type="datetime-local" value={form.end_datetime} onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} placeholder="Work to be performed..." />
              </div>
              {canApprove && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.title || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Submit permit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Permit?</div>
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
