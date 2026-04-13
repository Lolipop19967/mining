import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Asset, MaintenanceLog } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, Wrench, X, CheckCircle } from 'lucide-react'

type MaintenanceForm = {
  asset_id: string
  maintenance_type: string
  scheduled_date: string
  status: 'pending' | 'completed'
  notes: string
}
const empty: MaintenanceForm = { asset_id: '', maintenance_type: '', scheduled_date: new Date().toISOString().split('T')[0], status: 'pending', notes: '' }

export default function MaintenancePage() {
  const { user, logActivity } = useAuthStore()
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<MaintenanceLog | null>(null)
  const [form, setForm] = useState<MaintenanceForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const canWrite = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: logsData } = await supabase.from('maintenance_logs').select('*, assets(id, name, asset_type)').order('scheduled_date', { ascending: false })
    const { data: assetsData } = await supabase.from('assets').select('id, site_id, name, asset_type, status, last_maintenance, created_at')
    setLogs(logsData as MaintenanceLog[] || [])
    setAssets(assetsData as Asset[] || [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(l: MaintenanceLog) {
    setEditing(l)
    setForm({ asset_id: l.asset_id, maintenance_type: l.maintenance_type, scheduled_date: l.scheduled_date.split('T')[0], status: l.status, notes: l.notes || '' })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { asset_id: form.asset_id, maintenance_type: form.maintenance_type, scheduled_date: form.scheduled_date, status: form.status, notes: form.notes || null, updated_at: new Date().toISOString() }
    if (editing) {
      await supabase.from('maintenance_logs').update(payload).eq('id', editing.id)
      if (form.status === 'completed') {
        await supabase.from('assets').update({ last_maintenance: form.scheduled_date }).eq('id', form.asset_id)
      }
      await logActivity('updated', 'maintenance_log', editing.id, { maintenance_type: form.maintenance_type })
    } else {
      const { data } = await supabase.from('maintenance_logs').insert(payload).select().single()
      if (form.status === 'completed') {
        await supabase.from('assets').update({ last_maintenance: form.scheduled_date }).eq('id', form.asset_id)
      }
      await logActivity('created', 'maintenance_log', data?.id, { maintenance_type: form.maintenance_type })
    }
    setSaving(false); setModal(false); fetchData()
  }

  async function handleDelete(id: string) {
    await supabase.from('maintenance_logs').delete().eq('id', id)
    await logActivity('deleted', 'maintenance_log', id)
    setDeleteId(null); fetchData()
  }

  async function toggleComplete(log: MaintenanceLog) {
    const newStatus = log.status === 'pending' ? 'completed' : 'pending'
    await supabase.from('maintenance_logs').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', log.id)
    if (newStatus === 'completed') {
      await supabase.from('assets').update({ last_maintenance: log.scheduled_date }).eq('id', log.asset_id)
    }
    await logActivity('updated', 'maintenance_log', log.id, { status: newStatus })
    fetchData()
  }

  const filtered = logs.filter(l => {
    const q = search.toLowerCase()
    const assetName = (l as any).assets?.name?.toLowerCase() || ''
    return (!q || l.maintenance_type.toLowerCase().includes(q) || assetName.includes(q)) &&
      (!statusFilter || l.status === statusFilter)
  })

  const pendingCount = logs.filter(l => l.status === 'pending').length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Maintenance</div>
          <div className="page-subtitle">{pendingCount} pending · {logs.length} total</div>
        </div>
        {canWrite && <button className="btn-primary" onClick={openCreate}><Plus size={15} />Schedule Maintenance</button>}
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search maintenance..." />
        </div>
        <select className="input" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Type</th><th>Asset</th><th>Scheduled Date</th><th>Status</th><th>Notes</th>
                <th></th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No maintenance logs found</td></tr>
                ) : filtered.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Wrench size={15} color="#7C3AED" />
                        <span style={{ fontWeight: 500 }}>{log.maintenance_type}</span>
                      </div>
                    </td>
                    <td style={{ color: '#6B7280' }}>{(log as any).assets?.name || '—'}</td>
                    <td style={{ color: '#6B7280' }}>{new Date(log.scheduled_date).toLocaleDateString()}</td>
                    <td><span className={`badge ${log.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>{log.status}</span></td>
                    <td style={{ color: '#6B7280', fontSize: 13 }}>{log.notes ? log.notes.slice(0, 50) + (log.notes.length > 50 ? '…' : '') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => toggleComplete(log)} style={{ background: log.status === 'pending' ? '#ECFDF5' : '#F9FAFB', border: `1px solid ${log.status === 'pending' ? '#D1FAE5' : '#E5E7EB'}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: log.status === 'pending' ? '#065F46' : '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} />{log.status === 'pending' ? 'Complete' : 'Reopen'}
                        </button>
                        {canWrite && <>
                          <button onClick={() => openEdit(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                          {user?.role === 'admin' && <button onClick={() => setDeleteId(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>}
                        </>}
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Maintenance' : 'Schedule Maintenance'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Maintenance Type *</label>
                <input className="input" value={form.maintenance_type} onChange={e => setForm(f => ({ ...f, maintenance_type: e.target.value }))} placeholder="e.g. Oil change, Filter replacement" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Asset *</label>
                <select className="input" value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}>
                  <option value="">Select asset</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_type})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Scheduled Date *</label>
                  <input className="input" type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'pending' | 'completed' }))}>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Notes</label>
                <textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="Optional notes..." />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.maintenance_type || !form.asset_id || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Maintenance Log?</div>
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
