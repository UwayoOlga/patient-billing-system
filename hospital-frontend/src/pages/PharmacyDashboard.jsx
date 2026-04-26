import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './LabDashboard.module.css' // Reusing styles for consistency
import ProfileTab from '../components/ProfileTab'
import logo from '../assets/logo.jpg'
import { 
  createStandardReportHeader, 
  createStandardReportFooter, 
  createStandardTable,
  generateReportFilename,
  createStatsSummary
} from '../utils/reportUtils'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockForm, setStockForm] = useState({ id: null, name: '', basePrice: 0, stockQuantity: 0 })
  const [reportData, setReportData] = useState(null)
  const [reportRange, setReportRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

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

  async function fetchReport() {
    setLoading(true)
    try {
      const billsRes = await api.get('/bills/summary')
      const start = new Date(reportRange.start); start.setHours(0,0,0,0);
      const end = new Date(reportRange.end); end.setHours(23,59,59,999);

      const dispensed = []
      ;(billsRes.data || []).forEach(bill => {
        ;(bill.items || []).forEach(item => {
          if (item.category === 'Medication' && item.isCompleted && item.completedAt) {
            const d = new Date(item.completedAt)
            if (d >= start && d <= end) {
              dispensed.push({ ...item, patientName: bill.patientName, billNumber: bill.billNumber })
            }
          }
        })
      })
      setReportData({
        dispensed: dispensed.sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt)),
        totalItems: dispensed.length,
        uniquePatients: new Set(dispensed.map(i => i.patientName)).size,
        generatedAt: new Date().toLocaleString()
      })
    } catch(err) { console.error(err) } finally { setLoading(false) }
  }

  function downloadReport() {
    if (!reportData) return
    const doc = new jsPDF()
    
    // Standardized header
    const dateRange = `${reportRange.start} to ${reportRange.end}`
    let y = createStandardReportHeader(
      doc, 
      'PHARMACY DISPENSING REPORT', 
      `Medication Dispensing & Patient Service Analysis - ${user?.name}`,
      {
        generatedBy: `Pharmacist ${user?.name}`,
        dateRange: dateRange,
        additionalInfo: `Total Medications Dispensed: ${reportData.totalItems} | Patients Served: ${reportData.uniquePatients}`
      }
    )

    // Summary statistics
    const stats = [
      { label: 'Total Medications Dispensed', value: reportData.totalItems.toString(), highlight: true },
      { label: 'Unique Patients Served', value: reportData.uniquePatients.toString() },
      { label: 'Report Period', value: dateRange },
      { label: 'Generated Date', value: new Date(reportData.generatedAt).toLocaleDateString() }
    ]

    y = createStatsSummary(doc, stats, y)
    y += 10

    // Dispensing table
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('MEDICATION DISPENSING RECORD', 14, y)
    y += 10

    const tableData = reportData.dispensed.map(i => [
      new Date(i.completedAt).toLocaleDateString(),
      i.patientName,
      i.billNumber,
      i.description,
      i.quantity.toString()
    ])

    createStandardTable(
      doc,
      ['Date', 'Patient Name', 'Bill #', 'Medication', 'Quantity'],
      tableData,
      y,
      { headerColor: [124, 58, 237] } // Pharmacy purple
    )

    // Standardized footer
    createStandardReportFooter(doc, {
      customFooterText: 'This report contains confidential pharmaceutical dispensing and patient medication data.'
    })

    // Save with standardized filename
    const filename = generateReportFilename('Pharmacy_Dispensing', user?.name || 'Pharmacist', dateRange.replace(' to ', '_to_'))
    doc.save(filename)
  }

  async function handleSaveStock(e) {
    e.preventDefault()
    try {
      if (stockForm.id) {
        await api.put(`/servicecategory/${stockForm.id}`, {
          ...stockForm,
          responsibleRole: 2, // Pharmacist
          isActive: true
        })
        showNotification('Drug updated successfully', 'success', '📦')
      } else {
        await api.post('/servicecategory', {
          ...stockForm,
          responsibleRole: 2, // Pharmacist
          isActive: true,
          description: 'Medication'
        })
        showNotification('New drug added to inventory', 'success', '✨')
      }
      setShowStockModal(false)
      fetchCategories()
    } catch (err) {
      alert('Failed to save drug')
    }
  }

  async function deleteStock(id) {
    if (!window.confirm("Delete this drug from inventory?")) return
    try {
      await api.delete(`/servicecategory/${id}`)
      fetchCategories()
    } catch { alert('Failed to delete') }
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
          <a className={`${styles.navItem} ${tab === 'reports' ? styles.active : ''}`} onClick={() => { setTab('reports'); setMobileMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Reports
          </a>
          <a className={`${styles.navItem} ${tab === 'inventory' ? styles.active : ''}`} onClick={() => { setTab('inventory'); setMobileMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Drug Inventory
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

        {tab === 'profile' ? <ProfileTab /> : tab === 'reports' ? (
          <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Pharmacy Dispense Report</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Medication dispense activity for a selected date range.</p>
              </div>
              {reportData && (
                <button onClick={downloadReport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download PDF
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Start Date</label>
                <input type="date" value={reportRange.start} onChange={e => setReportRange({...reportRange, start: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>End Date</label>
                <input type="date" value={reportRange.end} onChange={e => setReportRange({...reportRange, end: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <button onClick={fetchReport} disabled={loading} style={{ padding: '10px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Generating...' : 'Run Report'}
              </button>
            </div>
            {reportData ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#f5f3ff', padding: '20px', borderRadius: '12px', border: '1px solid #e9d5ff', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Items Dispensed</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#7c3aed' }}>{reportData.totalItems}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Patients Served</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669' }}>{reportData.uniquePatients}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Period</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{reportRange.start} to {reportRange.end}</div>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#7c3aed', color: '#fff' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Patient</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Bill #</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Medication</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.dispensed.map((item, i) => (
                      <tr key={item.id} style={{ background: i % 2 === 0 ? '#faf5ff' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>{new Date(item.completedAt).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700 }}>{item.patientName}</td>
                        <td style={{ padding: '10px 16px', color: '#7c3aed', fontWeight: 700 }}>{item.billNumber}</td>
                        <td style={{ padding: '10px 16px' }}>{item.description}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
                      </tr>
                    ))}
                    {reportData.dispensed.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No dispensed medications found in this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p style={{ fontWeight: 600, fontSize: '16px' }}>Select a date range and run the report.</p>
              </div>
            )}
          </div>
        ) : tab === 'inventory' ? (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Drug Inventory & Stock</h2>
              <button 
                onClick={() => { setStockForm({ id: null, name: '', basePrice: 0, stockQuantity: 0 }); setShowStockModal(true); }}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add New Drug
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Drug Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Base Price (RWF)</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Stock Level</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dbCategories.map(cat => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{cat.name}</td>
                    <td style={{ padding: '12px' }}>{cat.basePrice.toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                        background: cat.stockQuantity > 10 ? '#f0fdf4' : '#fef2f2',
                        color: cat.stockQuantity > 10 ? '#166534' : '#991b1b'
                      }}>
                        {cat.stockQuantity} in stock
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => { setStockForm(cat); setShowStockModal(true); }} style={{ marginRight: '8px', background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                      <button onClick={() => deleteStock(cat.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedVisit ? (
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
      {/* Stock Modal */}
      {showStockModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: '32px', borderRadius: '12px', width: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 800 }}>{stockForm.id ? 'Edit Inventory Drug' : 'Add New Inventory Drug'}</h3>
            <form onSubmit={handleSaveStock}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>DRUG NAME</label>
                <input 
                  type="text" 
                  value={stockForm.name} 
                  onChange={e => setStockForm({...stockForm, name: e.target.value})} 
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>BASE PRICE (RWF)</label>
                <input 
                  type="number" 
                  value={stockForm.basePrice} 
                  onChange={e => setStockForm({...stockForm, basePrice: parseInt(e.target.value)})} 
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>STOCK QUANTITY</label>
                <input 
                  type="number" 
                  value={stockForm.stockQuantity} 
                  onChange={e => setStockForm({...stockForm, stockQuantity: parseInt(e.target.value)})} 
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                  required 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowStockModal(false)} style={{ padding: '10px 20px', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  {stockForm.id ? 'Update Stock' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
