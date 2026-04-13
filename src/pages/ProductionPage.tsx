import { useEffect, useState } from 'react'
import { supabase } from "../lib/supabase"

import type { Site } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, TrendingUp, X, BarChart3 } from 'lucide-react'

type ProductionForm = {
  site_id: string
  shift: 'day' | 'night' | 'afternoon'
  log_date: string
  tons_extracted: string
  ore_grade: string
  equipment_used: string
  workers_on_shift: string
  cost_per_ton: string
  notes: string
}

const empty: ProductionForm = {
  site_id: '', shift: 'day', log_date: new Date().toISOString().split('T')[0],
  tons_extracted: '', ore_grade: '', equipment_used: '', workers_on_shift: '', cost_per_ton: '', notes: ''
}

interface ProductionLog {
  id: string
  site_id: string | null
  shift: string
  log_date: string
  tons_extracted: number
  ore_grade: number
  equipment_used: string | null
  workers_on_shift: number
  cost_per_ton: number
  notes: string | null
  created_at: string
  sites?: { name: string }
}

export default function ProductionPage() {
  const { user, logActivity } = useAuthStore()
  const [logs, setLogs] = useState<ProductionLog[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ProductionLog | null>(null)
  const [form, setForm] = useState<ProductionForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('')

  useEffect(() => { fetchLogs(); fetchSites() }, [])

  async function fetchLogs() {
    const { data } = await supabase.from('production_logs')
      .select('*, sites(name)')
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
    setLogs(data as ProductionLog[] || [])
    setLoading(false)
  }

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('id, name').eq('status', 'active')
    setSites(data as Site[] || [])
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(l: ProductionLog) {
    setEditing(l)
    setForm({
      site_id: l.site_id || '', shift: l.shift as any, log_date: l.log_date,
      tons_extracted: String(l.tons_extracted), ore_grade: String(l.ore_grade),
      equipment_used: l.equipment_used || '', workers_on_shift: String(l.workers_on_shift),
      cost_per_ton: String(l.cost_per_ton), notes: l.notes || ''
    })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: form.site_id || null,
      shift: form.shift,
      log_date: form.log_date,
      tons_extracted: parseFloat(form.tons_extracted) || 0,
      ore_grade: parseFloat(form.ore_grade) || 0,
      equipment_used: form.equipment_used || null,
      workers_on_shift: parseInt(form.workers_on_shift) || 0,
      cost_per_ton: parseFloat(form.cost_per_ton) || 0,
      notes: form.notes || null,
      updated_at: new Date().toISOString()
    }
    if (editing) {
      await supabase.from('production_logs').update(payload).eq('id', editing.id)
      await logActivity('updated', 'production_log', editing.id, { date: form.log_date, tons: form.tons_extracted })
    } else {
      const { data } = await supabase.from('production_logs').insert({ ...payload, created_by: user?.id }).select().single()
      await logActivity('created', 'production_log', data?.id, { date: form.log_date, tons: form.tons_extracted })
    }
    setSaving(false); setModal(false); fetchLogs()
  }

  async function handleDelete(id: string) {
    await supabase.from('production_logs').delete().eq('id', id)
    setDeleteId(null); fetchLogs()
  }

  const filtered = logs.filter(l => {
    const q = search.toLowerCase()
    return (!q || (l.sites?.name || '').toLowerCase().includes(q) || l.shift.includes(q)) &&
      (!siteFilter || l.site_id === siteFilter)
  })

  const totalTons = filtered.reduce((a, l) => a + (l.tons_extracted || 0), 0)
  const avgGrade = filtered.length > 0 ? (filtered.reduce((a, l) => a + (l.ore_grade || 0), 0) / filtered.length).toFixed(3) : '0'
  const avgCostPerTon = filtered.length > 0 ? (filtered.reduce((a, l) => a + (l.cost_per_ton || 0), 0) / filtered.length).toFixed(2) : '0'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Production Logging</div>
          <div className="page-subtitle">{logs.length} shift logs recorded</div>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} />Log Shift</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Tons', value: `${totalTons.toFixed(1)}t`, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Avg Ore Grade', value: `${avgGrade}%`, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Avg Cost/Ton', value: `R${avgCostPerTon}`, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Shifts Logged', value: filtered.length, color: '#F59E0B', bg: '#FFFBEB' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." />
        </div>
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
                <th>Date</th><th>Site</th><th>Shift</th><th>Tons</th><th>Grade</th><th>Workers</th><th>Cost/Ton</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                    <BarChart3 size={32} color="#E5E7EB" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No production logs yet
                  </td></tr>
                ) : filtered.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 500 }}>{new Date(log.log_date).toLocaleDateString()}</td>
                    <td style={{ color: '#6B7280' }}>{log.sites?.name || '—'}</td>
                    <td><span className={`badge ${log.shift === 'day' ? 'badge-yellow' : log.shift === 'night' ? 'badge-purple' : 'badge-blue'}`}>{log.shift}</span></td>
                    <td style={{ fontWeight: 500 }}>{log.tons_extracted}t</td>
                    <td style={{ color: '#6B7280' }}>{log.ore_grade}%</td>
                    <td style={{ color: '#6B7280' }}>{log.workers_on_shift}</td>
                    <td style={{ color: '#6B7280' }}>R{log.cost_per_ton}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Production Log' : 'Log Shift Production'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Site</label>
                  <select className="input" value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                    <option value="">Select site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Shift</label>
                  <select className="input" value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value as any }))}>
                    <option value="day">Day</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Date *</label>
                <input className="input" type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Tons Extracted *</label>
                  <input className="input" type="number" value={form.tons_extracted} onChange={e => setForm(f => ({ ...f, tons_extracted: e.target.value }))} placeholder="e.g. 450" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Ore Grade (%)</label>
                  <input className="input" type="number" step="0.001" value={form.ore_grade} onChange={e => setForm(f => ({ ...f, ore_grade: e.target.value }))} placeholder="e.g. 2.4" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Workers on Shift</label>
                  <input className="input" type="number" value={form.workers_on_shift} onChange={e => setForm(f => ({ ...f, workers_on_shift: e.target.value }))} placeholder="e.g. 45" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Cost per Ton (R)</label>
                  <input className="input" type="number" value={form.cost_per_ton} onChange={e => setForm(f => ({ ...f, cost_per_ton: e.target.value }))} placeholder="e.g. 320" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Equipment Used</label>
                <input className="input" value={form.equipment_used} onChange={e => setForm(f => ({ ...f, equipment_used: e.target.value }))} placeholder="e.g. CAT 785D, Drill Rig #3" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Notes</label>
                <textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.tons_extracted || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Log shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Log?</div>
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
