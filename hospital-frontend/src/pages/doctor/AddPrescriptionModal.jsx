import { useState } from 'react'
import api from '../../utils/api'
import styles from './AddChargeModal.module.css' // Reuse the same styles for simplicity

export default function AddPrescriptionModal({ bill, onClose, onAdded }) {
  const [items, setItems] = useState([{ id: Date.now(), drugName: '', dosage: '', frequency: '', duration: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addItem() {
    setItems([...items, { id: Date.now(), drugName: '', dosage: '', frequency: '', duration: '' }])
  }

  function removeItem(id) {
    setItems(items.filter(item => item.id !== id))
  }

  function updateItem(id, field, value) {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await Promise.all(items.map(item => 
        api.post('/prescriptions', {
          billId: bill.id,
          drugName: item.drugName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration
        })
      ))
      onAdded()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to prescribe medication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: '600px' }}>
        <div className={styles.header}>
          <h3>Prescribe Medication</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.field}>
            <label>Patient</label>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{bill.patientName}</div>
          </div>

          <div className={styles.itemsList}>
            {items.map((item, index) => (
              <div key={item.id} className={styles.itemBox}>
                <div className={styles.itemHeader}>
                  <h4>Medication {index + 1}</h4>
                  {items.length > 1 && (
                    <button type="button" className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className={styles.gridRows}>
                  <div className={styles.field} style={{ flex: 2 }}>
                    <label>Drug Name</label>
                    <input 
                      className={styles.input}
                      type="text"
                      placeholder="e.g., Paracetamol"
                      value={item.drugName}
                      onChange={e => updateItem(item.id, 'drugName', e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.field} style={{ flex: 1 }}>
                    <label>Dosage</label>
                    <input 
                      className={styles.input}
                      type="text"
                      placeholder="e.g., 500mg"
                      value={item.dosage}
                      onChange={e => updateItem(item.id, 'dosage', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.gridRows} style={{ marginTop: '1rem' }}>
                  <div className={styles.field} style={{ flex: 1 }}>
                    <label>Frequency</label>
                    <input 
                      className={styles.input}
                      placeholder="e.g., 3 times/day"
                      value={item.frequency}
                      onChange={e => updateItem(item.id, 'frequency', e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field} style={{ flex: 1 }}>
                    <label>Duration</label>
                    <input 
                      className={styles.input}
                      placeholder="e.g., 5 days"
                      value={item.duration}
                      onChange={e => updateItem(item.id, 'duration', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className={styles.addAnotherBtn} onClick={addItem}>
            + Add Another Drug
          </button>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Prescribing...' : `Prescribe ${items.length} Drug${items.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
