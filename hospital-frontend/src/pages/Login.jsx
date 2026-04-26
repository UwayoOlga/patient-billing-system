import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { setUser } from '../utils/auth'
import styles from './Login.module.css'
import logo from '../assets/logo.jpg'

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
        <div className={styles.loginHeader}>
          <img src={logo} alt="Hospital Logo" className={styles.logoImage} />
          <h2>Hospital Staff Portal</h2>
          <p>Secure access to hospital management system</p>
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
            Account management is handled by system administrators.
          </p>
        </form>
      </div>
    </div>
  )
}
