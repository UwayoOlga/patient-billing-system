import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
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
  const [resolvingId, setResolvingId] = useState(null)

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
    setResolvingId(disputeId)
    try {
      await api.patch('/disputes/resolve', { disputeId, isResolved, resolutionNotes: notes })
      await fetchDisputes()
    } catch (err) {
      console.error('Failed to resolve dispute', err)
      alert(err.response?.data?.message || 'Failed to update complaint. Please try again.')
    } finally {
      setResolvingId(null)
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
  const [reportRange, setReportRange] = useState('today')
  const [customStart, setCustomStart] = useState(() => new Date().toISOString().split('T')[0])
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0])

  function getReportDates() {
    const now = new Date()
    if (reportRange === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { start, end: now }
    }
    if (reportRange === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0,0,0,0)
      return { start, end: now }
    }
    if (reportRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end: now }
    }
    // custom
    return { start: new Date(customStart), end: new Date(customEnd + 'T23:59:59') }
  }

  const { start: rStart, end: rEnd } = getReportDates()

  const reportBills = bills.filter(b => {
    const d = new Date(b.createdAt)
    return d >= rStart && d <= rEnd
  })

  const paidBills = reportBills.filter(b => b.status === 'Paid')
  const totalCollected = reportBills.reduce((s, b) => s + (b.totalPaid || 0), 0)
  const totalOutstandingReport = reportBills.reduce((s, b) => s + (b.balanceDue || 0), 0)
  const totalInsurance = reportBills.reduce((s, b) => s + (b.totalInsurance || 0), 0)
  const totalBilled = reportBills.reduce((s, b) => s + (b.totalAmount || 0), 0)
  const collectionRate = totalBilled > 0 ? ((totalCollected / (totalBilled - totalInsurance)) * 100).toFixed(1) : '0.0'

  const categorySummary = {}
  reportBills.forEach(b => {
    b.items?.forEach(i => {
      if (!i.isCompleted) return
      const cat = i.category || 'Other'
      if (!categorySummary[cat]) categorySummary[cat] = { count: 0, amount: 0 }
      categorySummary[cat].count += 1
      categorySummary[cat].amount += i.subtotal || 0
    })
  })

  const paymentMethods = {}
  reportBills.forEach(b => {
    b.payments?.forEach(p => {
      const m = p.method || 'Unknown'
      paymentMethods[m] = (paymentMethods[m] || 0) + p.amount
    })
  })

  // Recent payments list
  const recentPayments = reportBills
    .flatMap(b => (b.payments || []).map(p => ({ ...p, patientName: b.patientName, billNumber: b.billNumber })))
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
    .slice(0, 20)

  function exportReportPDF() {
    const doc = new jsPDF()
    const rangeLabel = reportRange === 'custom'
      ? `${customStart} to ${customEnd}`
      : reportRange === 'today' ? new Date().toLocaleDateString()
      : reportRange === 'week' ? 'Last 7 Days'
      : 'This Month'

    doc.setFontSize(20); doc.setTextColor(15, 23, 42)
    doc.text('HOSPITALBILLING', 14, 20)
    doc.setFontSize(10); doc.setTextColor(100)
    doc.text(`Cashier Financial Report — ${rangeLabel}`, 14, 27)
    doc.setDrawColor(226, 232, 240); doc.line(14, 32, 196, 32)

    // KPI summary
    doc.autoTable({
      startY: 38,
      head: [['Metric', 'Value']],
      body: [
        ['Total Billed', `RWF ${totalBilled.toLocaleString()}`],
        ['Insurance Coverage', `RWF ${totalInsurance.toLocaleString()}`],
        ['Total Collected', `RWF ${totalCollected.toLocaleString()}`],
        ['Outstanding Balance', `RWF ${totalOutstandingReport.toLocaleString()}`],
        ['Collection Rate', `${collectionRate}%`],
        ['Total Visits', reportBills.length],
        ['Fully Paid', paidBills.length],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: { 1: { halign: 'right' } }
    })

    // Category breakdown
    let y = doc.lastAutoTable.finalY + 12
    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text('Revenue by Service Category', 14, y)
    doc.autoTable({
      startY: y + 4,
      head: [['Category', 'Items', 'Revenue']],
      body: Object.entries(categorySummary).sort((a,b) => b[1].amount - a[1].amount).map(([cat, v]) => [
        cat, v.count, `RWF ${v.amount.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
      columnStyles: { 2: { halign: 'right' } }
    })

    // Payments table
    y = doc.lastAutoTable.finalY + 12
    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text('Recent Payments', 14, y)
    doc.autoTable({
      startY: y + 4,
      head: [['Patient', 'Bill #', 'Method', 'Amount', 'Date']],
      body: recentPayments.map(p => [
        p.patientName,
        p.billNumber,
        p.method?.toUpperCase(),
        `RWF ${p.amount?.toLocaleString()}`,
        new Date(p.paidAt).toLocaleDateString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] },
      columnStyles: { 3: { halign: 'right' } }
    })

    doc.save(`Cashier_Report_${rangeLabel.replace(/ /g,'_')}.pdf`)
  }

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
                    disabled={resolvingId === d.id}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: resolvingId === d.id ? 0.6 : 1 }}
                  >
                    {resolvingId === d.id ? 'Processing...' : 'Resolve & Remove'}
                  </button>
                  <button
                    onClick={() => handleResolveDispute(d.id, false, 'Rejected by billing staff')}
                    disabled={resolvingId === d.id}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: resolvingId === d.id ? 0.6 : 1 }}
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
            {/* Range Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div className={styles.filterTabs}>
                {[['today','Today'],['week','Last 7 Days'],['month','This Month'],['custom','Custom']].map(([val, label]) => (
                  <div key={val} className={`${styles.filterTab} ${reportRange === val ? styles.active : ''}`} onClick={() => setReportRange(val)}>{label}</div>
                ))}
              </div>
              {reportRange === 'custom' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
                  <span style={{ color: '#64748b', fontSize: '13px' }}>to</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
                </div>
              )}
              <button onClick={exportReportPDF}
                style={{ marginLeft: 'auto', background: '#0f172a', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export PDF
              </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Total Billed', value: `RWF ${totalBilled.toLocaleString()}`, color: '#0f172a' },
                { label: 'Total Collected', value: `RWF ${totalCollected.toLocaleString()}`, color: '#059669' },
                { label: 'Outstanding', value: `RWF ${totalOutstandingReport.toLocaleString()}`, color: '#ef4444' },
                { label: 'Insurance Covered', value: `RWF ${totalInsurance.toLocaleString()}`, color: '#8b5cf6' },
                { label: 'Collection Rate', value: `${collectionRate}%`, color: '#0ea5e9' },
                { label: 'Total Visits', value: reportBills.length, color: '#0f172a' },
                { label: 'Fully Paid', value: paidBills.length, color: '#059669' },
              ].map(({ label, value, color }) => (
                <div key={label} className={styles.statCard}>
                  <div className={styles.statLabel}>{label}</div>
                  <div className={styles.statValue} style={{ fontSize: '20px', color }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Category Breakdown */}
              <div className={styles.tableCard} style={{ padding: '24px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', color: '#0f172a' }}>Revenue by Service Category</div>
                {Object.keys(categorySummary).length === 0 ? (
                  <div className={styles.empty}>No completed services in this period.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(categorySummary).sort((a,b) => b[1].amount - a[1].amount).map(([cat, v]) => {
                      const pct = totalCollected > 0 ? (v.amount / totalBilled * 100).toFixed(0) : 0
                      return (
                        <div key={cat}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{cat}</span>
                            <span style={{ color: '#64748b' }}>{v.count} items · <strong style={{ color: '#0f172a' }}>RWF {v.amount.toLocaleString()}</strong></span>
                          </div>
                          <div style={{ background: '#f1f5f9', borderRadius: '99px', height: '6px' }}>
                            <div style={{ background: '#0ea5e9', width: `${pct}%`, height: '6px', borderRadius: '99px', transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className={styles.tableCard} style={{ padding: '24px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', color: '#0f172a' }}>Payment Methods</div>
                {Object.keys(paymentMethods).length === 0 ? (
                  <div className={styles.empty}>No payments recorded in this period.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(paymentMethods).map(([method, amt]) => (
                      <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: method === 'momo' ? '#f59e0b' : '#3b82f6' }} />
                          <span style={{ fontWeight: 600, fontSize: '14px', textTransform: 'uppercase' }}>{method}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: '#059669' }}>RWF {amt.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payments Table */}
            <div className={styles.tableCard}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '15px' }}>
                Recent Payments ({recentPayments.length})
              </div>
              {recentPayments.length === 0 ? (
                <div className={styles.empty}>No payments in this period.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Bill #</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{p.patientName}</td>
                        <td className={styles.billNum}>{p.billNumber}</td>
                        <td><span style={{ background: p.method === 'momo' ? '#fef3c7' : '#eff6ff', color: p.method === 'momo' ? '#92400e' : '#1e40af', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{p.method}</span></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{p.reference}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>RWF {p.amount?.toLocaleString()}</td>
                        <td style={{ color: '#64748b', fontSize: '13px' }}>{new Date(p.paidAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
