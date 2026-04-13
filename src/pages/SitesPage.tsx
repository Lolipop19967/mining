import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Site } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, MapPin, X } from 'lucide-react'

type SiteForm = { name: string; location: string; status: 'active' | 'inactive'; manager_email: string }
const empty: SiteForm = { name: '', location: '', status: 'active', manager_email: '' }

export default function SitesPage() {
  const { user, logActivity } = useAuthStore()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Site | null>(null)
  const [form, setForm] = useState<SiteForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const canWrite = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => { fetchSites() }, [])

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('*').order('created_at', { ascending: false })
    setSites(data as Site[] || [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(s: Site) {
    setEditing(s)
    setForm({ name: s.name, location: s.location, status: s.status, manager_email: s.manager_email || '' })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { name: form.name, location: form.location, status: form.status, manager_email: form.manager_email || null, updated_at: new Date().toISOString() }
    if (editing) {
      await supabase.from('sites').update(payload).eq('id', editing.id)
      await logActivity('updated', 'site', editing.id, { name: form.name })
    } else {
      const { data } = await supabase.from('sites').insert(payload).select().single()
      await logActivity('created', 'site', data?.id, { name: form.name })
    }
    setSaving(false); setModal(false); fetchSites()
  }

  async function handleDelete(id: string) {
    await supabase.from('sites').delete().eq('id', id)
    await logActivity('deleted', 'site', id)
    setDeleteId(null); fetchSites()
  }

  const filtered = sites.filter(s => {
    const q = search.toLowerCase()
    return (!q || s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)) &&
      (!statusFilter || s.status === statusFilter)
  })

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Sites</div>
          <div className="page-subtitle">{sites.length} total sites</div>
        </div>
        {canWrite && <button className="btn-primary" onClick={openCreate}><Plus size={15} />Add Site</button>}
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sites..." />
        </div>
        <select className="input" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Site Name</th><th>Location</th><th>Manager</th><th>Status</th>
                {canWrite && <th></th>}
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No sites found</td></tr>
                ) : filtered.map(site => (
                  <tr key={site.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={15} color="#7C3AED" /><span style={{ fontWeight: 500 }}>{site.name}</span></div></td>
                    <td style={{ color: '#6B7280' }}>{site.location}</td>
                    <td style={{ color: '#6B7280' }}>{site.manager_email || '—'}</td>
                    <td><span className={`badge ${site.status === 'active' ? 'badge-green' : 'badge-red'}`}>{site.status}</span></td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(site)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                          {user?.role === 'admin' && <button onClick={() => setDeleteId(site.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>}
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Site' : 'Add Site'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Site Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. North Shaft Mine" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Location *</label>
                <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Limpopo, South Africa" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Manager Email</label>
                  <input className="input" type="email" value={form.manager_email} onChange={e => setForm(f => ({ ...f, manager_email: e.target.value }))} placeholder="manager@company.com" />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.name || !form.location || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Add site'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Site?</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>This will permanently remove the site and all associated data.</div>
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
