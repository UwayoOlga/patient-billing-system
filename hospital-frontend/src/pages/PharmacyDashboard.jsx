import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './LabDashboard.module.css' // Reusing styles for consistency
import ProfileTab from '../components/ProfileTab'
import logo from '../assets/logo.jpg'

export default function PharmacyDashboard() {
  const [user, setUserState] = useState(getUser())
  const navigate = useNavigate()

  useEffect(() => {
    const handleStorage = () => setUserState(getUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
  const [tab, setTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [allVisits, setAllVisits] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [dispensedHistory, setDispensedHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ message: '', type: 'success', icon: '' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dispenseModal, setDispenseModal] = useState({ isOpen: false, item: null, qty: 1, categoryId: '' })
  const [dbCategories, setDbCategories] = useState([])

  const showNotification = (message, type = 'success', icon = '✨') => {
    setNotification({ message, type, icon })
    setTimeout(() => setNotification({ message: '', type: 'success', icon: '' }), 4000)
  }

  useEffect(() => { 
    fetchOrders() 
    fetchCategories()
    showNotification('Pharmacy Portal Synchronized', 'success', '🛰️')
  }, [])

  async function fetchCategories() {
    try {
      const { data } = await api.get('/servicecategory')
      // Pharmacist role = 2
      setDbCategories(data.filter(c => c.isActive && c.responsibleRole === 2))
    } catch (err) {}
  }

  async function fetchOrders() {
    setLoading(true)
    try {
      // 1. Fetch formal prescriptions
      const rxRes = await api.get('/prescriptions/pending')
      const rxData = rxRes.data || []

      // 2. Fetch bill summary (contains direct BillItem medications)
      const billsRes = await api.get('/bills/summary')
      const billsData = billsRes.data || []
      
      const visitsMap = {}

      // Process formal prescriptions
      rxData.forEach(rx => {
        if (!visitsMap[rx.billId]) {
          visitsMap[rx.billId] = {
            id: rx.billId,
            billNumber: rx.billNumber || 'Unknown',
            patientName: rx.patientName || 'Unknown Patient',
            status: 'Open',
            urgency: 'Normal',
            items: [], // Prescriptions
            directMeds: [] // Direct BillItems
          }
        }
        visitsMap[rx.billId].items.push(rx)
      })

      // Process direct Medication BillItems
      billsData.forEach(bill => {
        const meds = (bill.items || []).filter(i => i.category === 'Medication' && !i.isCompleted)
        if (meds.length > 0) {
          if (!visitsMap[bill.id]) {
            visitsMap[bill.id] = {
              id: bill.id,
              billNumber: bill.billNumber,
              patientName: bill.patientName,
              status: bill.status,
              urgency: bill.urgency,
              items: [],
              directMeds: []
            }
          }
          visitsMap[bill.id].directMeds = meds
        }
      })

      const visitsWithPharmacyWork = Object.values(visitsMap)
      setAllVisits(visitsWithPharmacyWork)
      
      setPendingOrders(rxData.map(rx => ({ ...rx, patientName: rx.patientName, billNumber: rx.billNumber })))
      
      if (selectedVisit) {
        const updated = visitsWithPharmacyWork.find(v => v.id === selectedVisit.id)
        if (updated) setSelectedVisit(updated)
        else setSelectedVisit(null)
      }
    } catch (err) {
      console.error("Pharmacy Fetch Error:", err)
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
    if (!dispenseModal.item || (!dispenseModal.categoryId && !dispenseModal.isDirect)) {
      alert("Please select a drug from the inventory");
      return;
    }
    try {
      if (dispenseModal.isDirect) {
        // Direct BillItem dispense
        await api.patch(`/bills/items/${dispenseModal.item.id}/dispense`, {
          quantity: Number(dispenseModal.qty)
        })
      } else {
        // Formal Prescription dispense
        await api.patch(`/prescriptions/${dispenseModal.item.id}/dispense`, {
          serviceCategoryId: Number(dispenseModal.categoryId),
          quantity: Number(dispenseModal.qty)
        })
      }
      await fetchOrders()
      showNotification(`Dispensed: ${dispenseModal.item.drugName || dispenseModal.item.description}`, 'success', '💊')
      setDispenseModal({ isOpen: false, item: null, qty: 1, categoryId: '', isDirect: false })
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
      {/* Mobile Menu Trigger */}
      <button className={styles.mobileMenuToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {mobileMenuOpen && <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sidebarLogo} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 24px 24px' }}>
          <img src={logo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
          <h2 style={{ fontSize: '12px', fontWeight: 900, color: '#fff', letterSpacing: '0.05em', margin: 0 }}>HOSPITALBILLING</h2>
        </div>
        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${tab === 'pending' ? styles.active : ''}`} onClick={() => { setTab('pending'); setMobileMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            Pending Prescriptions
          </a>
          <a className={`${styles.navItem} ${tab === 'completed' ? styles.active : ''}`} onClick={() => { setTab('completed'); setMobileMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Dispense History
          </a>
          <a className={`${styles.navItem} ${tab === 'profile' ? styles.active : ''}`} onClick={() => { setTab('profile'); setMobileMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            My Profile
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

          <div className={styles.headerActions} style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <h2 className={styles.moduleTitle} style={{margin: 0, fontSize: '18px'}}>Welcome, {user?.name ?? 'Pharmacist'}</h2>
            <div className={styles.userInfo}>
              <div className={styles.avatar} style={{ background: '#7c3aed' }}>{user?.name?.charAt(0) ?? 'P'}</div>
              <div className={styles.userName}>{user?.name ?? 'Pharmacist'}</div>
            </div>
          </div>
        </header>

        {tab === 'profile' ? <ProfileTab /> : selectedVisit ? (
          <div className={styles.visitWorkspace}>
            <div className={styles.workspaceHeader}>
              <button className={styles.backBtn} onClick={() => setSelectedVisit(null)}>← Back to Queue</button>
              <h2 style={{color: '#7c3aed'}}>Dispense Drugs: {selectedVisit.patientName} <br/><small>({selectedVisit.billNumber})</small></h2>
            </div>

            <div className={styles.visitDetailsRow}>
              <div className={styles.activeBillSection}>
                <h3>Pharmacy Worklist</h3>
                <div className={styles.billTable}>
                  {(selectedVisit.items.length === 0 && selectedVisit.directMeds.length === 0) ? (
                    <div className={styles.empty}>No prescriptions for this visit.</div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Order Type</th>
                          <th>Drug/Item</th>
                          <th>Instruction/Notes</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Formal Prescriptions */}
                        {selectedVisit.items.map(item => (
                          <tr key={`rx-${item.id}`}>
                            <td style={{fontSize: '11px', color: '#7c3aed', fontWeight: 800}}>PRESCRIPTION</td>
                            <td style={{fontWeight: 700}}>{item.drugName}</td>
                            <td>{item.dosage} - {item.frequency}</td>
                            <td>
                              {item.status === 0 ? (
                                <button 
                                  className={styles.miniCompleteBtn} 
                                  onClick={() => setDispenseModal({ isOpen: true, item, qty: 1, categoryId: dbCategories[0]?.id || '', isDirect: false })}
                                  style={{background: '#7c3aed'}}
                                >
                                  Dispense
                                </button>
                              ) : <span className={styles.activeBadge} style={{background: '#7c3aed'}}>Dispensed</span>}
                            </td>
                          </tr>
                        ))}
                        {/* Direct Medication Items */}
                        {selectedVisit.directMeds.map(item => (
                          <tr key={`direct-${item.id}`}>
                            <td style={{fontSize: '11px', color: '#059669', fontWeight: 800}}>DIRECT ORDER</td>
                            <td style={{fontWeight: 700}}>{item.description}</td>
                            <td>{item.notes || 'No specific notes'}</td>
                            <td>
                              <button 
                                className={styles.miniCompleteBtn} 
                                onClick={() => setDispenseModal({ isOpen: true, item, qty: item.quantity || 1, categoryId: 'DIRECT', isDirect: true })}
                                style={{background: '#059669'}}
                              >
                                Fulfill & Bill
                              </button>
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
                        <div style={{display: 'flex', gap: '8px'}}>
                          {visit.urgency !== 'Normal' && (
                            <span style={{
                              fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px',
                              background: visit.urgency === 'Emergency' ? '#fee2e2' : '#ffedd5',
                              color: visit.urgency === 'Emergency' ? '#dc2626' : '#9a3412',
                              border: '1px solid currentColor'
                            }}>{visit.urgency}</span>
                          )}
                          <span className={styles.statusBadge}>{visit.status}</span>
                        </div>
                      </div>
                      <div className={styles.patientDate}>Bill ID: {visit.billNumber}</div>
                      <div className={styles.testDesc} style={{color: '#64748b'}}>
                        {visit.items.length || 0} Pending Prescriptions
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
                        <span className={`${styles.testBadge}`} style={order.status === 1 ? {background: '#7c3aed'} : {}}>
                          {order.status === 1 ? 'Dispensed' : 'Pending'}
                        </span>
                      </div>
                      <div className={styles.testName}>{order.drugName} {order.dosage}</div>
                      <div className={styles.patientDate}>{order.billNumber} • Freq: {order.frequency}</div>
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
              Select actual drug from inventory to bill for <strong>{dispenseModal.item?.drugName} ({dispenseModal.item?.dosage})</strong>.
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>INVENTORY DRUG TO BILL</label>
              {dispenseModal.isDirect ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569' }}>
                  <strong>{dispenseModal.item?.description}</strong> (Directly added to bill)
                </div>
              ) : (
                <select 
                  value={dispenseModal.categoryId}
                  onChange={e => setDispenseModal({ ...dispenseModal, categoryId: e.target.value })}
                  style={{
                    width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', 
                    borderRadius: '6px', fontSize: '14px'
                  }}
                >
                  <option value="">-- Select drug from stock --</option>
                  {dbCategories.map(c => <option key={c.id} value={c.id}>{c.name} (RWF {c.basePrice})</option>)}
                </select>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>DISPENSED QUANTITY</label>
              <input 
                type="number" 
                min="1"
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
