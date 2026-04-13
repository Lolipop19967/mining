import { useEffect, useState } from 'react'
import { supabase } from "../lib/supabase"

import type { Site } from '../lib/types'
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, X, Users, BookOpen } from 'lucide-react'

type TalkForm = {
  site_id: string
  topic: string
  talk_date: string
  attendee_count: string
  duration_minutes: string
  notes: string
}

const empty: TalkForm = {
  site_id: '', topic: '', talk_date: new Date().toISOString().split('T')[0],
  attendee_count: '', duration_minutes: '15', notes: ''
}

interface ToolboxTalk {
  id: string
  site_id: string | null
  topic: string
  talk_date: string
  attendee_count: number
  duration_minutes: number
  notes: string | null
  created_at: string
  sites?: { name: string }
  profiles?: { full_name: string | null; email: string }
}

export default function ToolboxPage() {
  const { user, logActivity } = useAuthStore()
  const [talks, setTalks] = useState<ToolboxTalk[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ToolboxTalk | null>(null)
  const [form, setForm] = useState<TalkForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchTalks(); fetchSites() }, [])

  async function fetchTalks() {
    const { data } = await supabase.from('toolbox_talks')
      .select('*, sites(name), profiles(full_name, email)')
      .order('talk_date', { ascending: false })
    setTalks(data as ToolboxTalk[] || [])
    setLoading(false)
  }

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('id, name')
    setSites(data as Site[] || [])
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(t: ToolboxTalk) {
    setEditing(t)
    setForm({
      site_id: t.site_id || '', topic: t.topic, talk_date: t.talk_date,
      attendee_count: String(t.attendee_count), duration_minutes: String(t.duration_minutes),
      notes: t.notes || ''
    })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: form.site_id || null, topic: form.topic, talk_date: form.talk_date,
      attendee_count: parseInt(form.attendee_count) || 0,
      duration_minutes: parseInt(form.duration_minutes) || 15,
      notes: form.notes || null
    }
    if (editing) {
      await supabase.from('toolbox_talks').update(payload).eq('id', editing.id)
    } else {
      const { data } = await supabase.from('toolbox_talks').insert({ ...payload, conducted_by: user?.id }).select().single()
      await logActivity('created', 'toolbox_talk', data?.id, { topic: form.topic, attendees: form.attendee_count })
    }
    setSaving(false); setModal(false); fetchTalks()
  }

  async function handleDelete(id: string) {
    await supabase.from('toolbox_talks').delete().eq('id', id)
    setDeleteId(null); fetchTalks()
  }

  const filtered = talks.filter(t => {
    const q = search.toLowerCase()
    return !q || t.topic.toLowerCase().includes(q) || (t.sites?.name || '').toLowerCase().includes(q)
  })

  const totalAttendees = talks.reduce((a, t) => a + (t.attendee_count || 0), 0)
  const thisMonth = talks.filter(t => t.talk_date >= new Date(new Date().setDate(1)).toISOString().split('T')[0]).length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Toolbox Talks</div>
          <div className="page-subtitle">{talks.length} talks recorded</div>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} />Log Talk</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Talks', value: talks.length, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'This Month', value: thisMonth, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Total Attendees', value: totalAttendees, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Avg Attendees', value: talks.length > 0 ? Math.round(totalAttendees / talks.length) : 0, color: '#F59E0B', bg: '#FFFBEB' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics..." />
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Topic</th><th>Site</th><th>Date</th><th>Attendees</th><th>Duration</th><th>Conducted By</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                    <BookOpen size={32} color="#E5E7EB" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No toolbox talks recorded
                  </td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen size={14} color="#7C3AED" />
                        <span style={{ fontWeight: 500 }}>{t.topic}</span>
                      </div>
                    </td>
                    <td style={{ color: '#6B7280' }}>{t.sites?.name || '—'}</td>
                    <td style={{ color: '#6B7280' }}>{new Date(t.talk_date).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={13} color="#6B7280" />
                        <span style={{ fontWeight: 500 }}>{t.attendee_count}</span>
                      </div>
                    </td>
                    <td style={{ color: '#6B7280' }}>{t.duration_minutes} min</td>
                    <td style={{ color: '#6B7280', fontSize: 13 }}>{t.profiles?.full_name || t.profiles?.email || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Talk' : 'Log Toolbox Talk'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Topic *</label>
                <input className="input" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Working at Heights Safety" required />
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
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Date</label>
                  <input className="input" type="date" value={form.talk_date} onChange={e => setForm(f => ({ ...f, talk_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Number of Attendees</label>
                  <input className="input" type="number" value={form.attendee_count} onChange={e => setForm(f => ({ ...f, attendee_count: e.target.value }))} placeholder="e.g. 25" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Duration (minutes)</label>
                  <input className="input" type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="15" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Notes</label>
                <textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="Key points discussed, questions raised..." />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.topic || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Log talk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Talk?</div>
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
