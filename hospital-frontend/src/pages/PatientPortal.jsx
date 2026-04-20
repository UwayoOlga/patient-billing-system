import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../utils/api'
import styles from './PatientPortal.module.css'

export default function PatientPortal() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('bill') ? 'current' : 'history')
  const [billNumber, setBillNumber] = useState(searchParams.get('bill') || '')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bill, setBill] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('bill')) {
      fetchBill(searchParams.get('bill'))
    }
  }, [])

  async function fetchBill(num) {
    if (!num) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/bills/view', `"${num}"`, {
        headers: { 'Content-Type': 'application/json' }
      })
      setBill(data)
      setActiveTab('current')
    } catch (err) {
      setError('Bill not found. Please check your Bill Number.')
      setBill(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchHistory(e) {
    if (e) e.preventDefault()
    if (!phoneNumber) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/bills/history/${encodeURIComponent(phoneNumber)}`)
      setHistory(data)
    } catch (err) {
      setError('Could not find any records for this phone number.')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    fetchBill(billNumber)
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}>
        <svg className={styles.logoIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <h1>HospitalBilling</h1>
      </div>

      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'current' ? styles.active : ''}`}
          onClick={() => { setActiveTab('current'); setError(''); }}
        >
          View Current Bill
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => { setActiveTab('history'); setError(''); }}
        >
          My History
        </button>
      </div>

      {activeTab === 'current' && !bill && (
        <div className={styles.authCard}>
          <h2>Hospital Invoice</h2>
          <p>Please enter the Bill Number to view your charges.</p>
          <form onSubmit={handleSearch} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. BILL-20240417-A1B2"
              value={billNumber}
              onChange={e => setBillNumber(e.target.value.toUpperCase())}
              required
            />
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Securing Data...' : 'Find My Bill'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'current' && bill && (
        <div className={styles.billContainer}>
          <div className={styles.billHeader}>
            <div className={styles.billInfo}>
              <span>Patient Invoice</span>
              <h2>{bill.patientName}</h2>
              <span>Bill #: {bill.billNumber}</span>
            </div>
            <div className={styles.status}>
              <span className={styles[`status-${bill.status}`]}>● {bill.status}</span>
              <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                {new Date(bill.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
            </div>
          </div>

          <div className={styles.billBody}>
            <h3 className={styles.sectionTitle}>Breakdown of Services</h3>
            <div className={styles.itemList}>
              {bill.items.map(item => (
                <div key={item.id} className={styles.itemRow} style={!item.isCompleted ? { opacity: 0.7, borderLeft: '3px solid #f59e0b', paddingLeft: '12px' } : {}}>
                  <div style={{ flex: 1 }}>
                    <div className={styles.itemName}>
                      {item.description} 
                      {!item.isCompleted && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PENDING</span>}
                    </div>
                    <div className={styles.itemSub}>{item.category} × {item.quantity} {item.isCompleted ? '' : '(Not yet billable)'}</div>
                    {item.isCompleted && (
                      <div className={styles.itemSub}>
                        Insurance ({item.coveragePercentage ?? 0}%): -RWF {item.insuranceAmount.toLocaleString()} | You Pay: RWF {item.patientAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className={styles.itemPrice} style={!item.isCompleted ? { color: '#94a3b8', textDecoration: 'line-through' } : {}}>
                    RWF {item.subtotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <h3 className={styles.sectionTitle}>Financial Summary</h3>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Visit Subtotal</span>
                <span>RWF {bill.totalAmount.toLocaleString()}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Insurance Coverage</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>- RWF {bill.totalInsurance.toLocaleString()}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Patient Liability</span>
                <span>RWF {bill.patientLiability.toLocaleString()}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Paid</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>- RWF {bill.totalPaid.toLocaleString()}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.total}`}>
                <span>Balance Due</span>
                <span>RWF {bill.balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className={styles.qrFooter}>
            This billing document is for information purposes. Final payment must be cleared at the accounts desk.
            <br />
            <button 
              onClick={() => setBill(null)} 
              className={styles.backBtn}
            >
              ← Different Bill?
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className={styles.historySection}>
          <div className={styles.authCard} style={{ maxWidth: '100%', marginBottom: '24px' }}>
            <h2>Patient History</h2>
            <p>Enter your phone number to see all your visits at our facility.</p>
            <form onSubmit={fetchHistory} className={styles.form} style={{ flexDirection: 'row', gap: '8px' }}>
              <input
                type="tel"
                className={styles.input}
                style={{ flex: 1, textAlign: 'left', fontFamily: 'inherit' }}
                placeholder="+250 78x xxx xxx"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
              />
              <button type="submit" className={styles.btn} style={{ padding: '0 24px' }} disabled={loading}>
                {loading ? '...' : 'Search'}
              </button>
            </form>
            {error && <div className={styles.error} style={{ marginTop: '12px' }}>{error}</div>}
          </div>

          {history.length > 0 && (
            <div className={styles.historyList}>
              {history.map(item => (
                <div 
                  key={item.id} 
                  className={styles.historyCard}
                  onClick={() => { setBill(item); setActiveTab('current'); }}
                >
                  <div className={styles.hCardDate}>
                   {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className={styles.hCardInfo}>
                    <div className={styles.hCardTitle}>{item.billNumber}</div>
                    <div className={styles.hCardStatus}>Status: {item.status}</div>
                  </div>
                  <div className={styles.hCardPrice}>
                    RWF {item.balanceDue.toLocaleString()}
                  </div>
                  <div className={styles.hCardArrow}>→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
