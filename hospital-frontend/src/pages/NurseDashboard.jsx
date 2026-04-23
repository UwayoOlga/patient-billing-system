import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './NurseDashboard.module.css'
import ProfileTab from '../components/ProfileTab'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import logo from '../assets/logo.jpg'

const NURSING_CATEGORIES = new Set(['NursingService', 'BedCharge', 'Consumable'])

export default function NurseDashboard() {
  const [user, setUserState] = useState(getUser())
  const [tab, setTab] = useState('queue')
  const navigate = useNavigate()

  useEffect(() => {
    const handleStorage = () => setUserState(getUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
  const [bills, setBills] = useState([])
  const [searchBill, setSearchBill] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [editState, setEditState] = useState({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [reportRange, setReportRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [notification, setNotification] = useState({ message: '', type: 'success' })
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    fetchNursingOrders()
  }, [])

  async function fetchNursingOrders() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/summary')
      setBills(data || [])
    } catch (err) {
      console.error('Failed to fetch nursing orders', err)
    } finally {
      setLoading(false)
    }
  }

  function getNursingOrders(bill) {
    return (bill.items || []).filter(i => 
      NURSING_CATEGORIES.has(i.category)
    )
  }

  const visibleBills = useMemo(() => {
    const q = searchBill.trim().toLowerCase()
    return bills
      .filter(b => b.status === 'Open')
      .filter(b => getNursingOrders(b).length > 0)
      .filter(b => !q || b.billNumber?.toLowerCase().includes(q))
  }, [bills, searchBill])

  const completedToday = useMemo(() => {
    const today = new Date().toDateString()
    return bills.flatMap(b => 
      (b.items || [])
        .filter(i => {
          if (!NURSING_CATEGORIES.has(i.category) || !i.isCompleted || !i.completedAt) return false
          if (user?.id && i.completedByStaffId && i.completedByStaffId !== user.id) return false
          const dateStr = i.completedAt.endsWith('Z') ? i.completedAt : i.completedAt + 'Z'
          return new Date(dateStr).toDateString() === today
        })
        .map(i => ({ ...i, patientName: b.patientName, billNumber: b.billNumber }))
    ).sort((a, b) => {
      const d1 = new Date(b.completedAt.endsWith('Z') ? b.completedAt : b.completedAt + 'Z')
      const d2 = new Date(a.completedAt.endsWith('Z') ? a.completedAt : a.completedAt + 'Z')
      return d1 - d2
    })
  }, [bills])

  async function completeOrder(itemId) {
    const draft = editState[itemId] || {}
    const quantity = Number(draft.quantity || 1)
    const notes = draft.notes || null

    setSavingId(itemId)
    try {
      await api.patch(`/bills/items/${itemId}/nursing-complete`, { quantity, notes })
      showNotification('Service marked as completed.', 'success')
      await fetchNursingOrders()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete nursing service.')
    } finally {
      setSavingId(null)
    }
  }

  function setOrderDraft(itemId, field, value) {
    setEditState(prev => ({
      ...prev,
      [itemId]: {
        quantity: prev[itemId]?.quantity ?? 1,
        notes: prev[itemId]?.notes ?? '',
        [field]: value
      }
    }))
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type })
    setTimeout(() => setNotification({ message: '', type: 'success' }), 4000)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  async function fetchReport() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/summary')
      const start = new Date(reportRange.start)
      start.setHours(0, 0, 0, 0)
      const end = new Date(reportRange.end)
      end.setHours(23, 59, 59, 999)

      const allNursingItems = data.flatMap(b => 
        (b.items || [])
          .filter(i => NURSING_CATEGORIES.has(i.category))
          .map(i => ({ ...i, patientName: b.patientName, billNumber: b.billNumber }))
      )

      const completedInPeriod = allNursingItems.filter(i => {
        if (!i.isCompleted || !i.completedAt) return false
        const compDate = new Date(i.completedAt)
        return compDate >= start && compDate <= end
      })

      const stats = {
        totalCompleted: completedInPeriod.length,
        uniquePatients: new Set(completedInPeriod.map(i => i.patientName)).size,
        services: completedInPeriod.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
        generatedAt: new Date().toLocaleString()
      }
      setReportData(stats)
    } catch (err) {
      console.error('Report failed', err)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    if (!reportData) return
    const doc = new jsPDF()
    const tableData = reportData.services.map(s => [
      new Date(s.completedAt).toLocaleDateString(),
      s.patientName,
      s.billNumber,
      s.description,
      s.notes || ''
    ])

    doc.setFontSize(20); doc.setTextColor(15, 23, 42); doc.text('HOSPITALBILLING', 14, 22)
    doc.setFontSize(10); doc.setTextColor(100); doc.text('Nursing Performance Report', 14, 28)
    doc.text(`Generated: ${reportData.generatedAt}`, 14, 34)
    doc.text(`Period: ${reportRange.start} to ${reportRange.end}`, 14, 40)

    doc.autoTable({
      startY: 50,
      head: [['Date', 'Patient Name', 'Bill #', 'Service', 'Notes']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] } // Use Nurse blue
    })

    doc.save(`Nurse_Performance_Report_${reportRange.start}.pdf`)
  }

  function handlePrintReport() {
    window.print()
  }

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
          <button className={`${styles.navItem} ${tab === 'queue' ? styles.active : ''}`} onClick={() => { setTab('queue'); setMobileMenuOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
            <span>Work Queue</span>
          </button>
          <button className={`${styles.navItem} ${tab === 'timeline' ? styles.active : ''}`} onClick={() => { setTab('timeline'); setMobileMenuOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Completed Today</span>
          </button>
          <button className={`${styles.navItem} ${tab === 'reports' ? styles.active : ''}`} onClick={() => { setTab('reports'); setMobileMenuOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            <span>Performance Reports</span>
          </button>
          <button className={`${styles.navItem} ${tab === 'profile' ? styles.active : ''}`} onClick={() => { setTab('profile'); setMobileMenuOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>My Profile</span>
          </button>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h2 className={styles.moduleTitle}>Welcome, {user?.name ?? 'Nurse'}</h2>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'N'}</div>
            <div>
              <div className={styles.userName}>{user?.name ?? 'Nurse'}</div>
              <div className={styles.userRole}>Clinical Execution</div>
            </div>
          </div>
        </header>

        {notification.message && (
          <div style={{
            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
            background: notification.type === 'success' ? '#059669' : '#dc2626',
            color: 'white', padding: '12px 24px', borderRadius: '12px',
            zIndex: 10000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 700
          }}>
            {notification.message}
          </div>
        )}

        {tab === 'profile' ? <ProfileTab /> : tab === 'reports' ? (
          <div className={styles.reportView}>
            <div className={styles.noPrint} style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Generate Performance Report</h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className={styles.formGroup} style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Start Date</label>
                  <input 
                    type="date" 
                    className={styles.input} 
                    value={reportRange.start} 
                    onChange={e => setReportRange({...reportRange, start: e.target.value})} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>End Date</label>
                  <input 
                    type="date" 
                    className={styles.input} 
                    value={reportRange.end} 
                    onChange={e => setReportRange({...reportRange, end: e.target.value})} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <button 
                  onClick={fetchReport} 
                  className={styles.reportGenBtn}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Run Analysis'}
                </button>
                {reportData && (
                  <button onClick={exportToPDF} className={styles.pdfBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download PDF Report
                  </button>
                )}
              </div>
            </div>

            {reportData ? (
              <div className={styles.printableReport}>
                <div className={styles.reportHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <img src={logo} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>HOSPITALBILLING</h2>
                  </div>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Nursing Performance Report</h1>
                  <p style={{ color: '#64748b', margin: 0 }}>Period: {reportRange.start} to {reportRange.end} | Generated: {reportData.generatedAt}</p>
                </div>

                <div className={styles.statsGrid} style={{ margin: '32px 0' }}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Services Rendered</div>
                    <div className={styles.statValue}>{reportData.totalCompleted}</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Unique Patients</div>
                    <div className={styles.statValue}>{reportData.uniquePatients}</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Shift Efficiency</div>
                    <div className={styles.statValue}>100%</div>
                  </div>
                </div>

                <div className={styles.tableCard}>
                  <h3 className={styles.sectionTitle}>Detailed Activity Ledger</h3>
                  <table className={styles.reportTable}>
                    <thead>
                      <tr>
                        <th>Date/Time</th>
                        <th>Patient Name</th>
                        <th>Bill #</th>
                        <th>Service Description</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.services.map(s => (
                        <tr key={s.id}>
                          <td>{new Date(s.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td style={{ fontWeight: 700 }}>{s.patientName}</td>
                          <td>{s.billNumber}</td>
                          <td>{s.description}</td>
                          <td style={{ fontSize: '12px', fontStyle: 'italic' }}>{s.notes || '—'}</td>
                        </tr>
                      ))}
                      {reportData.services.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No services found for this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={styles.empty} style={{ background: '#fff', borderRadius: '16px', padding: '64px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" style={{ marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <h3>Ready for Analysis</h3>
                <p>Select a date range above to generate your clinical execution report.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Open Visits With Orders</div>
            <div className={styles.statValue}>{visibleBills.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Completed Today</div>
            <div className={styles.statValue}>{completedToday.length}</div>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              placeholder="Search by Bill Number..."
              value={searchBill}
              onChange={e => setSearchBill(e.target.value)}
            />
          </div>
          <button onClick={fetchNursingOrders} className={styles.refreshBtn}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
             Refresh
          </button>
        </div>

        {tab === 'timeline' ? (
          <section className={styles.tableCard}>
            <h3 className={styles.sectionTitle}>Completed Today</h3>
            {completedToday.length === 0 ? (
              <div className={styles.empty}>No nursing services completed yet today.</div>
            ) : (
              <div className={styles.todayList}>
                {completedToday.map(item => (
                  <div key={item.id} className={styles.todayRow}>
                    <span>{item.patientName} ({item.billNumber})</span>
                    <span>{item.description}</span>
                    <strong>{new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : loading ? (
          <div className={styles.empty}>Loading nursing orders...</div>
        ) : visibleBills.length === 0 ? (
          <div className={styles.empty}>No pending nursing orders found.</div>
        ) : (
          <div className={styles.billList}>
            {visibleBills.map(bill => {
              const nursingOrders = getNursingOrders(bill)
              const pending = nursingOrders.filter(i => !i.isCompleted)
              const done = nursingOrders.filter(i => i.isCompleted)

              return (
                <div key={bill.id} className={styles.billCard}>
                  <div className={styles.billHeader}>
                    <div>
                      <strong>{bill.patientName}</strong>
                      <div>{bill.billNumber}</div>
                    </div>
                    <div>
                      <span>{pending.length} Pending</span> · <span>{done.length} Completed</span>
                    </div>
                  </div>

                  {pending.length === 0 ? (
                    <div className={styles.doneText}>All nursing orders are completed.</div>
                  ) : (
                    <div className={styles.orderList}>
                      {pending.map(order => {
                        const draft = editState[order.id] || { quantity: order.quantity || 1, notes: '' }
                        return (
                          <div key={order.id} className={styles.orderRow}>
                            <div className={styles.orderInfo}>
                              <div>{order.description}</div>
                              <small>
                                {order.category} | Ordered: {new Date(order.addedAt).toLocaleString()} | Completed: Pending
                              </small>
                            </div>
                            <input
                              type="number"
                              min="1"
                              value={draft.quantity}
                              onChange={e => setOrderDraft(order.id, 'quantity', e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={draft.notes}
                              onChange={e => setOrderDraft(order.id, 'notes', e.target.value)}
                            />
                            <button
                              onClick={() => completeOrder(order.id)}
                              disabled={savingId === order.id}
                            >
                              {savingId === order.id ? 'Saving...' : 'Mark Completed'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {done.length > 0 && (
                    <div className={styles.completedBlock}>
                      <h4>Completed Services Timeline</h4>
                      {done.map(order => (
                        <div key={order.id} className={styles.completedRow}>
                          <span>{order.description}</span>
                          <small>
                            Ordered: {new Date(order.addedAt).toLocaleString()} | Completed: {order.completedAt ? new Date(order.completedAt).toLocaleString() : 'Pending'}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}
