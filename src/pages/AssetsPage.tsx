import { useEffect, useState } from 'react'
import { supabase } from "../lib/supabase"
import type { Site, Asset } from "../lib/types"
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, Package, X } from 'lucide-react'

const TYPES = ['drill', 'truck', 'excavator', 'crusher', 'conveyor', 'pump', 'generator', 'other'] as const

type AssetForm = {
  name: string
  asset_type: string
  site_id: string
  status: 'active' | 'maintenance' | 'faulty'
  last_maintenance: string
}

const empty: AssetForm = { name: '', asset_type: 'drill', site_id: '', status: 'active', last_maintenance: '' }

export default function AssetsPage() {
  const { user, logActivity } = useAuthStore()
  const [assets, setAssets] = useState<Asset[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState<AssetForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const canWrite = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => { fetchAssets(); fetchSites() }, [])

  async function fetchAssets() {
    const { data } = await supabase.from('assets').select('*, sites(id, name)').order('created_at', { ascending: false })
    setAssets(data as Asset[] || [])
    setLoading(false)
  }

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('id, name').eq('status', 'active')
    setSites(data as Site[] || [])
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(a: Asset) {
    setEditing(a)
    setForm({ name: a.name, asset_type: a.asset_type, site_id: a.site_id || '', status: a.status, last_maintenance: a.last_maintenance || '' })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      name: form.name,
      asset_type: form.asset_type,
      site_id: form.site_id || null,
      status: form.status,
      last_maintenance: form.last_maintenance || null,
      updated_at: new Date().toISOString()
    }
    if (editing) {
      await supabase.from('assets').update(payload).eq('id', editing.id)
      await logActivity('updated', 'asset', editing.id, { name: form.name })
    } else {
      const { data } = await supabase.from('assets').insert(payload).select().single()
      await logActivity('created', 'asset', data?.id, { name: form.name })
    }
    setSaving(false); setModal(false); fetchAssets()
  }

  async function handleDelete(id: string) {
    await supabase.from('assets').delete().eq('id', id)
    await logActivity('deleted', 'asset', id)
    setDeleteId(null); fetchAssets()
  }

  const filtered = assets.filter(a => {
    const q = search.toLowerCase()
    return (!q || a.name.toLowerCase().includes(q) || a.asset_type.toLowerCase().includes(q)) &&
      (!statusFilter || a.status === statusFilter) &&
      (!siteFilter || a.site_id === siteFilter)
  })

  const statusClass = (s: string) => s === 'active' ? 'badge-green' : s === 'maintenance' ? 'badge-yellow' : 'badge-red'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Assets</div>
          <div className="page-subtitle">{assets.length} total assets</div>
        </div>
        {canWrite && <button className="btn-primary" onClick={openCreate}><Plus size={15} />Add Asset</button>}
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." />
        </div>
        <select className="input" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="faulty">Faulty</option>
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
                <th>Asset Name</th><th>Type</th><th>Site</th><th>Status</th><th>Last Maintenance</th>
                {canWrite && <th></th>}
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No assets found</td></tr>
                ) : filtered.map(asset => (
                  <tr key={asset.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={15} color="#7C3AED" /><span style={{ fontWeight: 500 }}>{asset.name}</span></div></td>
                    <td><span className="badge badge-purple">{asset.asset_type}</span></td>
                    <td style={{ color: '#6B7280' }}>{(asset as any).sites?.name || '—'}</td>
                    <td><span className={`badge ${statusClass(asset.status)}`}>{asset.status}</span></td>
                    <td style={{ color: '#6B7280' }}>{asset.last_maintenance ? new Date(asset.last_maintenance).toLocaleDateString() : '—'}</td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(asset)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                          <button onClick={() => setDeleteId(asset.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Asset' : 'Add Asset'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Asset Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. CAT 785D Truck" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Type</label>
                  <select className="input" value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AssetForm['status'] }))}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="faulty">Faulty</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Assign to Site</label>
                <select className="input" value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                  <option value="">Not assigned</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Last Maintenance Date</label>
                <input className="input" type="date" value={form.last_maintenance} onChange={e => setForm(f => ({ ...f, last_maintenance: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.name || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Add asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Asset?</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>This will permanently remove the asset and its maintenance history.</div>
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
