import { useState, useEffect } from 'react'
import api from '../utils/api'
import styles from './ProfileTab.module.css'

export default function ProfileTab() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' })
  const [profileForm, setProfileForm] = useState({ 
    fullName: '', 
    email: '', 
    phoneNumber: '', 
    newPassword: '' 
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    try {
      const { data } = await api.get('/staff/me')
      setProfile(data)
      setProfileForm({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber || '',
        newPassword: ''
      })
    } catch (err) {
      console.error('Failed to fetch profile', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setLoading(true)
    setUpdateMsg({ type: '', text: '' })
    try {
      await api.put('/staff/me', profileForm)
      
      // Fetch latest profile to ensure we have the computed/saved values
      const { data } = await api.get('/staff/me')
      setProfile(data)
      
      // Update form state and CLEAR the password field for security/usability
      setProfileForm({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber || '',
        newPassword: ''
      })
      
      setUpdateMsg({ type: 'success', text: 'Profile updated successfully! Your identity has been synchronized.' })
      
      // Update local storage and tell the rest of the application to refresh
      const localUser = JSON.parse(localStorage.getItem('hb_user'))
      if (localUser) {
        localUser.name = data.fullName
        localStorage.setItem('hb_user', JSON.stringify(localUser))
        window.dispatchEvent(new Event('storage'))
      }
    } catch (err) {
      console.error('Update operation failed:', err)
      const errorMsg = err.response?.data?.message || 'Update failed. Please check your network connection.'
      setUpdateMsg({ type: 'error', text: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !profile) {
    return <div className={styles.loading}>Loading your secure profile...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.header}>
          <div className={styles.avatarLarge}>{profile?.fullName?.charAt(0)}</div>
          <div className={styles.titleInfo}>
            <h3>{profile?.fullName}</h3>
            <div className={styles.meta}>
              <span className={styles.roleBadge}>{profile?.role}</span>
              <span className={styles.emailText}>{profile?.email}</span>
            </div>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleUpdate}>
          <div className={styles.inputGrid}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input 
                type="text" 
                value={profileForm.fullName} 
                onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input 
                type="email" 
                value={profileForm.email} 
                onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Phone Number</label>
              <input 
                type="tel" 
                value={profileForm.phoneNumber} 
                onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                placeholder="+250..."
              />
            </div>
            <div className={styles.formGroup}>
              <label>New Password (Optional)</label>
              <input 
                type="password" 
                value={profileForm.newPassword} 
                onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})}
                placeholder="Leave blank to keep current"
              />
            </div>
          </div>

          {updateMsg.text && (
            <div className={updateMsg.type === 'success' ? styles.successMsg : styles.errorMsg}>
              {updateMsg.text}
            </div>
          )}

          <button type="submit" className={styles.saveBtn} disabled={loading}>
            {loading ? 'Saving Changes...' : 'Update Profile Information'}
          </button>
        </form>
      </div>
    </div>
  )
}
