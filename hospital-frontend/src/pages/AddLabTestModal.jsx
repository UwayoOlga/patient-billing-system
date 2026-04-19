import { useState, useEffect } from 'react'
import api from '../utils/api'
import styles from './AddLabTestModal.module.css'

export default function AddLabTestModal({ onClose, onAdded }) {
  const [bills, setBills] = useState([])
  const [selectedBillId, setSelectedBillId] = useState('')
  const [description, setDescription] = useState('Full Blood Count (CBC)')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [dbCategories, setDbCategories] = useState([])

  useEffect(() => {
    fetchActiveVisits()
  }, [])

  async function fetchActiveVisits() {
    try {
      const respBills = await api.get('/bills/summary')
      setBills(respBills.data.filter(b => b.status === 'Open'))

      const respCats = await api.get('/servicecategory')
      // Only show categories managed by LabTech (Role 1)
      const labCats = respCats.data.filter(c => c.isActive && c.responsibleRole === 1)
      setDbCategories(labCats)
      if (labCats.length > 0) setDescription(labCats[0].name)
    } catch (err) {
      setError('Failed to fetch hospital infrastructure data.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedBillId) {
      setError('Please select a patient visit.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const catObj = dbCategories.find(c => c.name === description)
      await api.post('/bills/items', {
        billId: Number(selectedBillId),
        category: 4, // 4 = LabTest Enum in backend
        description: description,
        quantity: Number(quantity),
        notes: notes,
        unitPrice: catObj ? catObj.basePrice : 0 
      })
      onAdded()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to queue lab test.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Queue New Lab Test</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.field}>
            <label>Patient Visit (Open Bills Only)</label>
            <select 
              className={styles.select}
              value={selectedBillId}
              onChange={e => setSelectedBillId(e.target.value)}
              required
            >
              <option value="">-- Select Patient --</option>
              {bills.map(b => (
                <option key={b.id} value={b.id}>
                  {b.patientName} (Bill: {b.billNumber})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Lab Test Type (from Admin Master List)</label>
            <select 
              className={styles.select}
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            >
              {dbCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {description === 'Other' && (
            <div className={styles.field}>
              <label>Custom Test Name</label>
              <input 
                className={styles.input}
                type="text"
                placeholder="Enter exact test name for pricing"
                autoFocus
                required
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          )}

          <div className={styles.field}>
            <label>Priority / Clinical Notes</label>
            <textarea 
              className={styles.textarea}
              placeholder="e.g. URGENT, Fasting required..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading || !selectedBillId}>
              {loading ? 'Queueing...' : 'Add to Pending List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
