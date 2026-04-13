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
import { useAuthStore } from '../stores/authStore'
import { Plus, Search, Pencil, Trash2, ClipboardCheck, X, Clock } from 'lucide-react'

type ComplianceForm = { title: string; description: string; site_id: string; due_date: string; status: 'open' | 'resolved' }

const empty: ComplianceForm = { title: '', description: '', site_id: '', due_date: '', status: 'open' }

export default function CompliancePage() {
  const { user, logActivity } = useAuthStore()
  const [issues, setIssues] = useState<ComplianceIssue[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ComplianceIssue | null>(null)
  const [form, setForm] = useState<ComplianceForm>(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const canWrite = user?.role === 'admin' || user?.role === 'manager'
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchIssues(); fetchSites() }, [])

  async function fetchIssues() {
    const { data } = await supabase.from('compliance_issues').select('*, sites(id, name)').order('due_date', { ascending: true })
    setIssues(data as ComplianceIssue[] || [])
    setLoading(false)
  }

  async function fetchSites() {
    const { data } = await supabase.from('sites').select('id, name')
    setSites(data as Site[] || [])
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(i: ComplianceIssue) {
    setEditing(i)
    setForm({ title: i.title, description: i.description || '', site_id: i.site_id || '', due_date: i.due_date, status: i.status })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      title: form.title, description: form.description || null, site_id: form.site_id || null,
      due_date: form.due_date, status: form.status,
      resolved_at: form.status === 'resolved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }
    if (editing) {
      await supabase.from('compliance_issues').update(payload).eq('id', editing.id)
      await logActivity('updated', 'compliance_issue', editing.id, { title: form.title, status: form.status })
    } else {
      const { data } = await supabase.from('compliance_issues').insert({ ...payload, created_by: user?.id }).select().single()
      await logActivity('created', 'compliance_issue', data?.id, { title: form.title })
    }
    setSaving(false); setModal(false); fetchIssues()
  }

  async function handleDelete(id: string) {
    await supabase.from('compliance_issues').delete().eq('id', id)
    await logActivity('deleted', 'compliance_issue', id)
    setDeleteId(null); fetchIssues()
  }

  async function toggleStatus(issue: ComplianceIssue) {
    const newStatus = issue.status === 'open' ? 'resolved' : 'open'
    await supabase.from('compliance_issues').update({ status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', issue.id)
    await logActivity('updated', 'compliance_issue', issue.id, { status: newStatus })
    fetchIssues()
  }

  const isOverdue = (i: ComplianceIssue) => i.status === 'open' && i.due_date < today

  const filtered = issues.filter(i => {
    const q = search.toLowerCase()
    return (!q || i.title.toLowerCase().includes(q)) &&
      (!statusFilter || (statusFilter === 'overdue' ? isOverdue(i) : i.status === statusFilter)) &&
      (!siteFilter || i.site_id === siteFilter)
  })

  const overdueCount = issues.filter(isOverdue).length
  const openCount = issues.filter(i => i.status === 'open').length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Compliance</div>
          <div className="page-subtitle">{openCount} open · {overdueCount > 0 && <span style={{ color: '#EF4444' }}>{overdueCount} overdue</span>}</div>
        </div>
        {canWrite && <button className="btn-primary" onClick={openCreate}><Plus size={15} />Add Issue</button>}
      </div>

      {overdueCount > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} color="#EF4444" />
          <span style={{ fontSize: 14, color: '#991B1B', fontWeight: 500 }}>{overdueCount} compliance issue{overdueCount > 1 ? 's are' : ' is'} overdue</span>
        </div>
      )}

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search compliance issues..." />
        </div>
        <select className="input" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="overdue">Overdue</option>
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
                <th>Title</th><th>Site</th><th>Due Date</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No compliance issues found</td></tr>
                ) : filtered.map(issue => (
                  <tr key={issue.id} style={{ background: isOverdue(issue) ? '#FFFBEB' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ClipboardCheck size={15} color={isOverdue(issue) ? '#F59E0B' : '#7C3AED'} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{issue.title}</div>
                          {issue.description && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{issue.description.slice(0, 60)}{issue.description.length > 60 ? '…' : ''}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#6B7280' }}>{(issue as any).sites?.name || '—'}</td>
                    <td>
                      <span style={{ color: isOverdue(issue) ? '#EF4444' : '#374151', fontWeight: isOverdue(issue) ? 500 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOverdue(issue) && <Clock size={13} />}
                        {new Date(issue.due_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${issue.status === 'resolved' ? 'badge-green' : isOverdue(issue) ? 'badge-red' : 'badge-yellow'}`}>
                        {isOverdue(issue) && issue.status === 'open' ? 'overdue' : issue.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => toggleStatus(issue)} style={{ background: issue.status === 'open' ? '#ECFDF5' : '#F9FAFB', border: `1px solid ${issue.status === 'open' ? '#D1FAE5' : '#E5E7EB'}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: issue.status === 'open' ? '#065F46' : '#6B7280', cursor: 'pointer' }}>
                          {issue.status === 'open' ? 'Resolve' : 'Reopen'}
                        </button>
                        {canWrite && <>
                          <button onClick={() => openEdit(issue)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 4 }}><Pencil size={15} /></button>
                          <button onClick={() => setDeleteId(issue.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><Trash2 size={15} /></button>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{editing ? 'Edit Issue' : 'Add Compliance Issue'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Fire safety inspection" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
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
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Due Date *</label>
                  <input className="input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'open' | 'resolved' }))}>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!form.title || !form.due_date || saving}>
                {saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Create issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Delete Compliance Issue?</div>
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
