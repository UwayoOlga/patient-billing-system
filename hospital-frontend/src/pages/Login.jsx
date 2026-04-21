import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { setUser } from '../utils/auth'
import styles from './Login.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const normalizedRole = String(data.role || '').trim()
      setUser({ token: data.token, role: normalizedRole, name: data.name })
      const roleRoutes = {
        Doctor: '/doctor',
        LabTech: '/lab',
        Pharmacist: '/pharmacy',
        Nurse: '/nurse',
        Cashier: '/billing',
        Admin: '/admin',
        Receptionist: '/reception',
      }
      navigate(roleRoutes[normalizedRole] ?? '/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg className={styles.logoIcon} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <h1>Hospital Billing</h1>
          <p>Staff Portal</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. sarah@hospital.com"
              required
            />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className={styles.switchLink}>
            Account creation is managed by Admin.
          </p>
        </form>
      </div>
    </div>
  )
}
