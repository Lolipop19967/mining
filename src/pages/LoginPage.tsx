import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from "../lib/supabase"
import { useAuthStore } from '../stores/authStore'
import { HardHat, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser, setLoading } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'operator' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLocalLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalLoading(true)
    setError('')

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) { setError(error.message); setLocalLoading(false); return }
      if (data.user) {
        // Manually fetch and set profile, then navigate
        try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
          if (profile) {
            setUser(profile)
          } else {
            const { data: byEmail } = await supabase.from('profiles').select('*').eq('email', data.user.email).single()
            if (byEmail) {
              setUser({ ...byEmail, id: data.user.id })
            }
          }
        } catch (e) {
          console.error(e)
        }
        setLoading(false)
        navigate('/dashboard', { replace: true })
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name, role: form.role } }
      })
      if (error) { setError(error.message); setLocalLoading(false); return }
      setError('Check your email to confirm your account.')
    }
    setLocalLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: '#7C3AED', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <HardHat size={26} color="white" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#111827' }}>MineOps</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Mining Operations Management</div>
        </div>

        <div className="card" style={{ padding: '32px 28px' }}>
          <div style={{ display: 'flex', background: '#F9FAFB', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#7C3AED' : '#6B7280',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}>
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Full Name</label>
                <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="John Smith" required />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required />
            </div>
            <div style={{ marginBottom: mode === 'register' ? 16 : 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Role</label>
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="operator">Operator</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 16px', fontSize: 15 }} disabled={loading}>
              {loading ? <div className="spinner" /> : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
