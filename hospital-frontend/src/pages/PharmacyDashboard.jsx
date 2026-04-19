import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './LabDashboard.module.css' // Reusing styles for consistency

export default function PharmacyDashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [allVisits, setAllVisits] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [dispensedHistory, setDispensedHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ message: '', type: 'success', icon: '' })
  
  const [dispenseModal, setDispenseModal] = useState({ isOpen: false, item: null, qty: 1 })

  const showNotification = (message, type = 'success', icon = '✨') => {
    setNotification({ message, type, icon })
    setTimeout(() => setNotification({ message: '', type: 'success', icon: '' }), 4000)
  }

  useEffect(() => { 
    fetchOrders() 
    showNotification('Pharmacy Portal Synchronized', 'success', '🛰️')
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/summary')
      
      // Filter visits that have Medication orders
      const visitsWithMeds = data.filter(b => 
        (b.status === 'Open' || b.status === 'Finalized') && 
        b.items.some(i => i.category === 'Medication')
      )
      setAllVisits(visitsWithMeds)
      
      const pending = []
      const completed = []
      data.forEach(bill => {
        bill.items.forEach(item => {
          if (item.category === 'Medication') {
            const t = { ...item, patientName: bill.patientName, billNumber: bill.billNumber }
            if (item.isCompleted) completed.push(t)
            else pending.push(t)
          }
        })
      })
      setPendingOrders(pending)
      setDispensedHistory(completed)
      
      // Update selected visit if it exists
      if (selectedVisit) {
        const updated = visitsWithMeds.find(v => v.id === selectedVisit.id)
        if (updated) setSelectedVisit(updated)
      }
    } finally { setLoading(false) }
  }

  const filteredVisits = allVisits.filter(b => 
    b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function selectVisit(visit) {
    setSelectedVisit(visit)
    setSearchQuery('')
    showNotification(`${visit.patientName} Loaded`, 'success', '🔍')
  }

  async function handleDispense() {
    if (!dispenseModal.item) return
    try {
      await api.patch(`/bills/items/${dispenseModal.item.id}/dispense`, {
        quantity: Number(dispenseModal.qty)
      })
      await fetchOrders()
      showNotification(`Dispensed: ${dispenseModal.item.description}`, 'success', '💊')
      setDispenseModal({ isOpen: false, item: null, qty: 1 })
    } catch (err) {
      showNotification('Failed to dispense medication', 'error', '🛑')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.2 7.8l-7.1 7.1c-.8.8-2.2.8-3 0l-7.1-7.1c-.8-.8-.8-2.2 0-3l7.1-7.1c.8-.8 2.2-.8 3 0l7.1 7.1c.8.8.8 2.2 0 3z"/><path d="M12 7l1.5 1.5c.8.8.8 2.2 0 3L12 13l-1.5-1.5c-.8-.8-.8-2.2 0-3L12 7z"/></svg>
          <span>PharmaNet</span>
        </div>
        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${tab === 'pending' ? styles.active : ''}`} onClick={() => setTab('pending')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            Pending Prescriptions
          </a>
          <a className={`${styles.navItem} ${tab === 'completed' ? styles.active : ''}`} onClick={() => setTab('completed')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Dispense History
          </a>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main} style={{ position: 'relative' }}>
        
        {/* Advanced Notification System */}
        {notification.message && (
          <div style={{
            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
            background: notification.type === 'success' ? '#059669' : '#dc2626', 
            color: 'white', padding: '12px 32px', 
            borderRadius: '12px', fontWeight: '700', fontSize: '14px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 10000, 
            display: 'flex', alignItems: 'center', gap: '12px',
            animation: 'fadeInDown 0.4s cubic-bezier(0, 0, 0.2, 1)'
          }}>
            <span style={{ fontSize: '20px' }}>{notification.icon}</span> {notification.message}
          </div>
        )}

        <header className={styles.header}>
          <div className={styles.searchWrapper}>
            <input 
              type="text" 
              className={styles.searchInput}
              placeholder="Search Prescription / Bill ID..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && filteredVisits.length > 0) {
                  selectVisit(filteredVisits[0])
                }
              }}
            />
            {searchQuery && (
              <div className={styles.searchResults}>
                {filteredVisits.length > 0 ? filteredVisits.map(v => (
                  <div key={v.id} className={styles.searchResultItem} onClick={() => selectVisit(v)}>
                    <div className={styles.vInfo}>
                      <strong>{v.patientName}</strong>
                      <small>{v.billNumber}</small>
                    </div>
                    <span className={styles.statusBadge}>{v.status}</span>
                  </div>
                )) : <div className={styles.noResults}>No matching prescriptions found</div>}
              </div>
            )}
          </div>

          <div className={styles.headerActions}>
            <div className={styles.userInfo}>
              <div className={styles.avatar} style={{ background: '#7c3aed' }}>{user?.name?.charAt(0) ?? 'P'}</div>
              <div className={styles.userName}>{user?.name ?? 'Pharmacist'}</div>
            </div>
          </div>
        </header>

        {selectedVisit ? (
          <div className={styles.visitWorkspace}>
            <div className={styles.workspaceHeader}>
              <button className={styles.backBtn} onClick={() => setSelectedVisit(null)}>← Back to Queue</button>
              <h2 style={{color: '#7c3aed'}}>Dispense Drugs: {selectedVisit.patientName} <br/><small>({selectedVisit.billNumber})</small></h2>
            </div>

            <div className={styles.visitDetailsRow}>
              <div className={styles.activeBillSection}>
                <h3>Doctor's Prescription</h3>
                <div className={styles.billTable}>
                  {selectedVisit.items.filter(i => i.category === 'Medication').length === 0 ? (
                    <div className={styles.empty}>No drugs prescribed for this visit.</div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Drug Name</th>
                          <th>Prescribed Qty</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVisit.items.filter(i => i.category === 'Medication').map(item => (
                          <tr key={item.id}>
                            <td style={{fontWeight: 700}}>{item.description}</td>
                            <td>{item.quantity}</td>
                            <td>
                              <span className={item.isCompleted ? styles.activeBadge : styles.inactiveBadge} style={item.isCompleted ? {background: '#7c3aed'} : {}}>
                                {item.isCompleted ? 'Dispensed' : 'Authorized'}
                              </span>
                            </td>
                            <td>
                              {!item.isCompleted && (
                                <button 
                                  className={styles.miniCompleteBtn} 
                                  onClick={() => setDispenseModal({ isOpen: true, item, qty: item.quantity })}
                                  style={{background: '#7c3aed'}}
                                >
                                  Dispense to Patient
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Pending Dispensing</div>
                <div className={styles.statValue} style={{color: '#7c3aed'}}>{pendingOrders.length}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Patients Waiting</div>
                <div className={styles.statValue}>{allVisits.length}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <section className={styles.testSection}>
                <h3 className={styles.sectionTitle}>Patient Queue (Click to Pull Prescriptions)</h3>
                <div className={styles.testGrid} style={{ gridTemplateColumns: '1fr' }}>
                  {allVisits.length > 0 ? allVisits.map(visit => (
                    <div key={visit.id} className={styles.testCard} onClick={() => selectVisit(visit)} style={{ cursor: 'pointer', borderLeft: '4px solid #7c3aed' }}>
                      <div className={styles.testHeader}>
                        <span className={styles.patientName}>{visit.patientName}</span>
                        <span className={styles.statusBadge}>{visit.status}</span>
                      </div>
                      <div className={styles.patientDate}>Bill ID: {visit.billNumber}</div>
                      <div className={styles.testDesc} style={{color: '#64748b'}}>
                        {visit.items?.filter(i => i.category === 'Medication').length || 0} Medications Prescribed
                      </div>
                    </div>
                  )) : (
                    <div className={styles.empty}>No active drug prescriptions found.</div>
                  )}
                </div>
              </section>

              <section className={styles.testSection}>
                <h3 className={styles.sectionTitle}>{tab === 'pending' ? 'Global Medication Queue' : 'Dispense History'}</h3>
                <div className={styles.testGrid} style={{ gridTemplateColumns: '1fr' }}>
                  {(tab === 'pending' ? pendingOrders : dispensedHistory).map(order => (
                    <div key={order.id} className={styles.testCard} onClick={() => {
                      const v = allVisits.find(v => v.items.some(i => i.id === order.id))
                      if (v) selectVisit(v)
                    }}>
                      <div className={styles.testHeader}>
                        <span className={styles.patientName}>{order.patientName}</span>
                        <span className={`${styles.testBadge}`} style={order.isCompleted ? {background: '#7c3aed'} : {}}>
                          {order.isCompleted ? 'Dispensed' : 'Waiting'}
                        </span>
                      </div>
                      <div className={styles.testName}>{order.description}</div>
                      <div className={styles.patientDate}>{order.billNumber} • Qty: {order.quantity}</div>
                    </div>
                  ))}
                  {(tab === 'pending' ? pendingOrders : dispensedHistory).length === 0 && (
                    <div style={{color: '#64748b', fontSize: '14px'}}>Pharmacy queue is clean.</div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* Dispense Modal */}
      {dispenseModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: '32px', borderRadius: '12px', width: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>
              Dispense Medication
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
              Confirm quantity for <strong>{dispenseModal.item?.description}</strong>.
            </p>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>DISPENSED QUANTITY</label>
              <input 
                type="number" 
                value={dispenseModal.qty}
                onChange={e => setDispenseModal({ ...dispenseModal, qty: e.target.value })}
                style={{
                  width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', 
                  borderRadius: '6px', fontSize: '16px', fontWeight: 'bold'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setDispenseModal({ isOpen: false, item: null, qty: 1 })}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDispense}
                style={{ padding: '10px 20px', background: '#7c3aed', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Confirm Dispense
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className={styles.loading}>Synchronizing Pharmacy Database...</div>}
    </div>
  )
}
