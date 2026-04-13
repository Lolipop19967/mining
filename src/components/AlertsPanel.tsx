import { useEffect, useState } from 'react'
import { X, AlertTriangle, Clock, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Alert {
  id: string
  type: 'critical' | 'overdue' | 'faulty'
  title: string
  detail: string
  time: string
}

export default function AlertsPanel({ onClose }: { onClose: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      const all: Alert[] = []

      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, title, incident_date')
        .eq('severity', 'critical')
        .eq('status', 'open')
        .order('incident_date', { ascending: false })
        .limit(5)

      incidents?.forEach(i => all.push({
        id: `inc-${i.id}`, type: 'critical',
        title: 'Critical Incident',
        detail: i.title,
        time: new Date(i.incident_date).toLocaleDateString()
      }))

      const today = new Date().toISOString().split('T')[0]
      const { data: compliance } = await supabase
        .from('compliance_issues')
        .select('id, title, due_date')
        .eq('status', 'open')
        .lt('due_date', today)
        .limit(5)

      compliance?.forEach(c => all.push({
        id: `comp-${c.id}`, type: 'overdue',
        title: 'Overdue Compliance',
        detail: c.title,
        time: `Due ${new Date(c.due_date).toLocaleDateString()}`
      }))

      const { data: assets } = await supabase
        .from('assets')
        .select('id, name')
        .eq('status', 'faulty')
        .limit(5)

      assets?.forEach(a => all.push({
        id: `asset-${a.id}`, type: 'faulty',
        title: 'Faulty Asset',
        detail: a.name,
        time: 'Needs attention'
      }))

      setAlerts(all)
      setLoading(false)
    }

    fetchAlerts()
  }, [])

  const iconMap = {
    critical: <AlertTriangle size={15} color="#EF4444" />,
    overdue: <Clock size={15} color="#F59E0B" />,
    faulty: <Zap size={15} color="#F59E0B" />,
  }
  const colorMap = {
    critical: '#FEF2F2',
    overdue: '#FFFBEB',
    faulty: '#FFFBEB',
  }

  return (
    <div style={{
      position: 'fixed', top: 60, right: 0, width: 340, bottom: 0,
      background: 'white', borderLeft: '1px solid #F3F4F6',
      zIndex: 40, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.06)'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Alerts</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>}
        {!loading && alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontSize: 14 }}>
            No active alerts
          </div>
        )}
        {alerts.map(alert => (
          <div key={alert.id} style={{
            background: colorMap[alert.type], borderRadius: 10,
            padding: '12px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <div style={{ paddingTop: 1 }}>{iconMap[alert.type]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 2 }}>{alert.title}</div>
              <div style={{ fontSize: 13, color: '#111827', marginBottom: 4, wordBreak: 'break-word' }}>{alert.detail}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{alert.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
