import { useState, useEffect } from 'react'
import api from '../../utils/api'
import styles from './AddChargeModal.module.css'

export default function AddChargeModal({ bill, onClose, onAdded }) {
  const [dbCategories, setDbCategories] = useState([])
  const [items, setItems] = useState([{ id: Date.now(), categoryId: '', description: '', quantity: 1, notes: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const { data } = await api.get('/servicecategory')
      const activeOnly = data.filter(c => c.isActive)
      setDbCategories(activeOnly)
      
      // Auto-select first category for the initial item
      if (activeOnly.length > 0) {
        setItems([{ id: Date.now(), categoryId: activeOnly[0].id, description: activeOnly[0].name, quantity: 1, notes: '' }])
      }
    } catch (err) { console.error('Failed to load categories') }
  }

  function addItem() {
    setItems([...items, { 
      id: Date.now(), 
      categoryId: dbCategories[0]?.id || '', 
      description: dbCategories[0]?.name || '', 
      quantity: 1, 
      notes: '' 
    }])
  }

  function removeItem(id) {
    setItems(items.filter(item => item.id !== id))
  }

  function updateItem(id, field, value) {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        // If category changed, update description to match the category name
        if (field === 'categoryId') {
          const cat = dbCategories.find(c => c.id === Number(value))
          if (cat) updated.description = cat.name
        }
        return updated
      }
      return item
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await Promise.all(items.map(item => {
        const catObj = dbCategories.find(c => c.id === Number(item.categoryId))
        
        // Map proper ENUM based on department responsible
        let targetCategory = 3 // default Procedure
        if (catObj) {
          // Foolproof check: either it matches role 1 (int), 'LabTech' (string), or contains test keywords
          const textName = (catObj.name || '').toLowerCase()
          const isLab = catObj.responsibleRole === 1 || 
                        catObj.responsibleRole === 'LabTech' || 
                        textName.includes('blood') || 
                        textName.includes('test') || 
                        textName.includes('urinalysis') || 
                        textName.includes('rdt')

          if (isLab) targetCategory = 4 // LabTest
          else if (catObj.responsibleRole === 2 || catObj.responsibleRole === 'Pharmacist') targetCategory = 5 // Medication
        }

        return api.post('/bills/items', {
          billId: bill.id,
          category: targetCategory,
          description: item.description,
          quantity: Number(item.quantity),
          notes: item.notes,
          unitPrice: 0 // Service uses PricingHelper to lookup DB price
        })
      }))
      onAdded()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add one or more charges.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Add Clinical Charge</h3>
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
                  <h4>Service {index + 1}</h4>
                  {items.length > 1 && (
                    <button type="button" className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className={styles.gridRows}>
                  <div className={styles.field}>
                    <label>Service Category (from Admin)</label>
                    <select 
                      className={styles.select}
                      value={item.categoryId}
                      onChange={e => updateItem(item.id, 'categoryId', e.target.value)}
                      required
                    >
                      {dbCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Action / Item Description</label>
                    <input 
                      className={styles.input}
                      type="text"
                      placeholder={item.category == 0 ? "General Consultation" : "e.g. Malaria Diagnosis, Blood Test"}
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className={styles.field} style={{ maxWidth: '100px' }}>
                    <label>Qty</label>
                    <input 
                      className={styles.input}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Clinical Notes (Optional)</label>
                  <input 
                    className={styles.input}
                    placeholder="Brief observations..."
                    value={item.notes}
                    onChange={e => updateItem(item.id, 'notes', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="button" className={styles.addAnotherBtn} onClick={addItem}>
            + Add Another Service
          </button>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Adding...' : `Add ${items.length} Charge${items.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
