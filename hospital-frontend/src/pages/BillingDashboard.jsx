import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './BillingDashboard.module.css'

export default function BillingDashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  const [view, setView] = useState('Dashboard') // 'Dashboard' | 'Reports'

  useEffect(() => { fetchBills() }, [])

  async function fetchBills() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills')
      setBills(data)
    } catch (err) {
      console.error('Failed to fetch bills', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleFinalize(billId) {
    if (!window.confirm('Are you sure you want to finalize this bill? It will be locked for editing.')) return
    try {
      await api.patch(`/bills/${billId}/finalize`)
      fetchBills()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to finalize bill.')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const filteredBills = filter === 'All' ? bills : bills.filter(b => b.status === filter)
  const totalOutstanding = bills.reduce((acc, b) => acc + (b.status !== 'Paid' ? b.balanceDue : 0), 0)
  const openCount = bills.filter(b => b.status === 'Open').length
  const finalizedCount = bills.filter(b => b.status === 'Finalized').length

  // Reporting Logic
  const today = new Date().toDateString()
  const billsToday = bills.filter(b => new Date(b.createdAt).toDateString() === today)
  const revenueToday = billsToday.reduce((acc, b) => acc + b.totalPaid, 0)
  const categorySummary = {}
  billsToday.forEach(b => {
    b.items.forEach(i => {
      categorySummary[i.category] = (categorySummary[i.category] || 0) + i.subtotal
    })
  })

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>HospitalBilling</span>
        </div>
        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${view === 'Dashboard' ? styles.active : ''}`} onClick={() => setView('Dashboard')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </a>
          <a className={`${styles.navItem} ${view === 'Reports' ? styles.active : ''}`} onClick={() => setView('Reports')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
            Daily Reports
          </a>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h2 className={styles.moduleTitle}>
            {view === 'Dashboard' ? 'Revenue & Billing' : 'Hospital Performance Reports'}
          </h2>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'B'}</div>
            <div>
              <div className={styles.userName}>{user?.name ?? 'Billing Staff'}</div>
              <div className={styles.userRole}>Revenue Office</div>
            </div>
          </div>
        </header>

        {view === 'Dashboard' && (
          <>
            {/* Stats */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Outstanding</div>
                <div className={styles.statValue}>RWF {totalOutstanding.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Open Bills</div>
                <div className={styles.statValue}>{openCount}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Finalized</div>
                <div className={styles.statValue}>{finalizedCount}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Records</div>
                <div className={styles.statValue}>{bills.length}</div>
              </div>
            </div>

            {/* List Control */}
            <div className={styles.listControl}>
              <h3 className={styles.sectionTitle}>Patient Bills</h3>
              <div className={styles.filterTabs}>
                {['All', 'Open', 'Finalized', 'Paid'].map(t => (
                  <div
                    key={t}
                    className={`${styles.filterTab} ${filter === t ? styles.active : ''}`}
                    onClick={() => setFilter(t)}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableCard}>
              {loading ? (
                <div className={styles.empty}>Loading hospital records...</div>
              ) : filteredBills.length === 0 ? (
                <div className={styles.empty}>No bills found matching your criteria.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Bill Number</th>
                      <th>Patient Name</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th className={styles.amount}>Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(bill => (
                      <tr key={bill.id}>
                        <td className={styles.billNum}>{bill.billNumber}</td>
                        <td className={styles.patientName}>{bill.patientName}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles['status-' + bill.status]}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                        <td className={styles.amount}>RWF {bill.balanceDue.toLocaleString()}</td>
                        <td>
                          {bill.status === 'Open' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {bill.items?.some(i => !i.isCompleted) ? (
                                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold' }}>
                                  ⚠️ {bill.items.filter(i => !i.isCompleted).length} PENDINGS
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>
                                  READY FOR PAYMENT
                                </span>
                              )}
                              <button 
                                className={styles.actionBtn}
                                onClick={() => handleFinalize(bill.id)}
                                disabled={bill.items?.some(i => !i.isCompleted)}
                                style={bill.items?.some(i => !i.isCompleted) ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}}
                                title={bill.items?.some(i => !i.isCompleted) ? 'Cannot finalize while services are pending.' : ''}
                              >
                                {bill.items?.some(i => !i.isCompleted) ? 'Hold' : 'Finalize & Pay'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {view === 'Reports' && (
          <div className={styles.reportsPage}>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Revenue Collected Today</div>
                <div className={styles.statValue} style={{ color: '#059669' }}>RWF {revenueToday.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>New Visits Created Today</div>
                <div className={styles.statValue}>{billsToday.length}</div>
              </div>
            </div>

            <div className={styles.tableCard} style={{ padding: '24px' }}>
              <h3 className={styles.sectionTitle}>Revenue Breakdown by Category (Today)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {Object.entries(categorySummary).map(([cat, amt]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                    <span style={{ fontWeight: 600 }}>{cat}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>RWF {amt.toLocaleString()}</span>
                  </div>
                ))}
                {Object.keys(categorySummary).length === 0 && <div className={styles.empty}>No data recorded for today yet.</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
