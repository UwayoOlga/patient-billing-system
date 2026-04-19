import { useState } from 'react'
import api from '../../utils/api'
import styles from './NewVisitModal.module.css'

export default function NewVisitModal({ onClose, onCreated }) {
  const [step, setStep] = useState('patient') // 'patient' | 'done'
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '', phoneNumber: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // 1. Register patient
      const { data: patient } = await api.post('/patient', {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        phoneNumber: form.phoneNumber,
      })

      // 2. Open a bill for them
      const { data } = await api.post('/bills', { patientId: patient.id })
      setResult(data)
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>New Patient Visit</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {step === 'patient' && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label>Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="Patient full name"
                required
              />
            </div>
            <div className={styles.field}>
              <label>Date of Birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Phone Number</label>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={e => set('phoneNumber', e.target.value)}
                placeholder="+254 700 000 000"
                required
              />
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Creating...' : 'Register & Open Bill'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && result && (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h4>Visit Created!</h4>
            <p>Patient registered and bill opened successfully.</p>
            <div className={styles.billInfo}>
              <div className={styles.billRow}>
                <span>Bill Number</span>
                <strong>{result.bill?.billNumber}</strong>
              </div>
              <div className={styles.billRow}>
                <span>Patient</span>
                <strong>{result.bill?.patientName}</strong>
              </div>
            </div>
            <div className={styles.qrNote}>
              Share this Bill Number with the patient so they can view their bill.
            </div>
            <div className={styles.doneActions}>
              <button className={styles.cancelBtn} onClick={onCreated}>Done</button>
              <button className={styles.submitBtn} onClick={() => onCreated(result.bill)}>
                Add Charges Now →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
