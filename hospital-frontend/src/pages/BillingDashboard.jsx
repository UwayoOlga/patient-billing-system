import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './BillingDashboard.module.css'
import ProfileTab from '../components/ProfileTab'
import logo from '../assets/logo.jpg'
import PaymentProcessingModal from '../components/PaymentProcessingModal'

export default function BillingDashboard() {
  const [user, setUserState] = useState(getUser())
  const navigate = useNavigate()

  useEffect(() => {
    const handleStorage = () => setUserState(getUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('dashboard') // Match other dashboards
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [bills, setBills] = useState([])

  const [disputes, setDisputes] = useState([])
  const [disputeLoading, setDisputeLoading] = useState(false)

  useEffect(() => { fetchBills() }, [])

  async function fetchDisputes() {
    setDisputeLoading(true)
    try {
      const { data } = await api.get('/disputes/open')
      setDisputes(data)
    } catch (err) {
      console.error('Failed to fetch disputes', err)
    } finally {
      setDisputeLoading(false)
    }
  }

  async function handleResolveDispute(disputeId, isResolved, notes = '') {
    try {
      await api.patch('/disputes/resolve', { disputeId, isResolved, resolutionNotes: notes })
      fetchDisputes()
    } catch (err) {
      console.error('Failed to resolve dispute', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'disputes') fetchDisputes()
  }, [activeTab])

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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const filteredBills = bills.filter(b => {
    const matchesFilter = filter === 'All' || b.status === filter
    const matchesSearch = b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         b.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Stats calculation
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

  const navItems = [
    {
      key: 'dashboard', label: 'Dashboard',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    },
    {
      key: 'reports', label: 'Daily Reports',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
    },
    {
      key: 'disputes', label: 'Complaints',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    },
    {
      key: 'profile', label: 'My Profile',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
  ]

  return (
    <div className={styles.page}>
      {/* Mobile Menu Trigger */}
      <button className={styles.mobileMenuToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {mobileMenuOpen && <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />}

      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sidebarLogo} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 24px 24px' }}>
          <img src={logo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
          <h2 style={{ fontSize: '12px', fontWeight: 900, color: '#fff', letterSpacing: '0.05em', margin: 0 }}>HOSPITALBILLING</h2>
        </div>
        <nav className={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`${styles.navItem} ${activeTab === item.key ? styles.active : ''}`}
              onClick={() => { 
                setActiveTab(item.key); 
                setMobileMenuOpen(false); 
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.moduleTitle}>
              Welcome, {user?.name ?? 'Billing Staff'}
            </h2>
          </div>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'B'}</div>
            <div>
              <div className={styles.userName}>{user?.name ?? 'Billing Staff'}</div>
              <div className={styles.userRole}>Revenue Office</div>
            </div>
            <span className={styles.activeBadge}>Active</span>
          </div>
        </header>

        {activeTab === 'profile' ? <ProfileTab /> : activeTab === 'disputes' ? (
          <div style={{ padding: '24px 0' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>Patient Complaints</h3>
            {disputeLoading ? <p>Loading...</p> : disputes.length === 0 ? (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
                No open complaints at the moment.
              </div>
            ) : disputes.map(d => (
              <div key={d.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{d.patientName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Bill: {d.billNumber} · {new Date(d.raisedAt).toLocaleDateString()}</div>
                  </div>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>OPEN</span>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', margin: '8px 0 16px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>{d.reason}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleResolveDispute(d.id, true, 'Resolved by billing staff')}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    Resolve & Remove
                  </button>
                  <button
                    onClick={() => handleResolveDispute(d.id, false, 'Rejected by billing staff')}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'dashboard' && (
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
              <div className={styles.searchSection}>
                <h3 className={styles.sectionTitle}>Hospital Revenue Records</h3>
                <div className={styles.searchBar}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input 
                    placeholder="Search by Bill ID or Patient Name..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
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
                          {bill.status === 'Finalized' || bill.status === 'Open' ? (
                            <button 
                              className={styles.payBtn}
                              onClick={() => setSelectedBillId(bill.id)}
                            >
                              Process Payment
                            </button>
                          ) : (
                            <span className={styles.completedTag}>Fully Paid</span>
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

        {activeTab === 'reports' && (
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

      {selectedBillId && (
        <PaymentProcessingModal 
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
          onPaymentSuccess={fetchBills}
        />
      )}
    </div>
  )
}
