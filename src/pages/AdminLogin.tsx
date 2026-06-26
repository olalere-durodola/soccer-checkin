import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/admin')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="kicker">Matchday</div>
      <h1 style={{ fontSize: 34, textTransform: 'uppercase', margin: '4px 0 22px' }}>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  )
}
