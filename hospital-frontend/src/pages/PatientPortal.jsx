import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import api from '../utils/api'
import { getUser, setUser, logout } from '../utils/auth'
import styles from './PatientPortal.module.css'
import logo from '../assets/logo.jpg'

export default function PatientPortal() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('bill') ? 'current' : 'history')
  const [billNumber, setBillNumber] = useState(searchParams.get('bill') || '')
  const [user, setUserState] = useState(getUser())
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ identifier: '', password: '', fullName: '', phoneNumber: '', email: '', dateOfBirth: '', nationalId: '' })

  const [bill, setBill] = useState(null)
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [disputes, setDisputes] = useState([])
  const [report, setReport] = useState(null)
  const [reportRange, setReportRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [payStep, setPayStep] = useState('method') // 'method' | 'details' | 'confirm' | 'success'
  const [payPhone, setPayPhone] = useState('')
  const [payAccountName, setPayAccountName] = useState('')
  const [payBankName, setPayBankName] = useState('')
  const [payReference, setPayReference] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [payMethod, setPayMethod] = useState('momo')
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', email: '', dateOfBirth: '' })
  const [error, setError] = useState('')
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [activeDisputeItem, setActiveDisputeItem] = useState(null)
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeError, setDisputeError] = useState('')

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
      setPayStep('method')
      setPayPhone('')
      setPayReference('')
      setPayBankName('')
      setPayAccountName('')
    } catch (err) {
      setError('No active bill found with that ID.')
      setBill(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSecureHistory() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/bills/history`)
      setHistory(data)

      // Automatically set the latest Unpaid/Open bill as the "Current" view for patients
      // only if they haven't manually selected one yet AND they're on the history tab
      const activeBill = data.find(b => b.status === 'Open' || b.status === 'Finalized' || b.balanceDue > 0)
      if (activeBill && !bill && activeTab === 'history') {
        setBill(activeBill)
      }
    } catch (err) {
      console.error("History Load Error:", err);
      setError(err.response?.data?.message || 'Could not load history.');
    } finally {
      setLoading(false)
    }
  }

  async function fetchProfile() {
    setLoading(true)
    try {
      const { data } = await api.get('/patient/profile')
      setProfile(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDisputes() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/disputes')
      setDisputes(data)
    } catch (err) {
      console.error('Failed to load disputes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchReport() {
    setLoading(true)
    try {
      const { data } = await api.get(`/bills/report?start=${reportRange.start}&end=${reportRange.end}`)
      setReport(data)
    } catch (err) {
      console.error("Report Generation Error:", err);
      setError('Failed to generate report.')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    if (!report || !report.visits.length) return
    const doc = new jsPDF()
    
    doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text('HOSPITALBILLING', 14, 22)
    doc.setFontSize(10); doc.setTextColor(100); doc.text('Official Patient Medical & Billing Statement', 14, 28)
    
    doc.setDrawColor(226, 232, 240); doc.line(14, 35, 196, 35)

    doc.setFontSize(9); doc.setTextColor(100); doc.text('PATIENT NAME', 14, 45); doc.text('REPORT PERIOD', 110, 45)
    doc.setFontSize(11); doc.setTextColor(15, 23, 42);
    doc.text(report.patientName, 14, 51)
    doc.text(`${reportRange.start} to ${reportRange.end}`, 110, 51)

    const tableData = report.visits.map(v => [
      new Date(v.date).toLocaleDateString(),
      v.billNumber,
      `RWF ${v.totalAmount.toLocaleString()}`,
      `RWF ${v.patientAmount.toLocaleString()}`,
      `RWF ${v.paidAmount.toLocaleString()}`,
      v.status
    ])

    doc.autoTable({
      startY: 65,
      head: [['Date', 'Bill #', 'Total', 'Your Part', 'Paid', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    })

    const finalY = doc.lastAutoTable.finalY + 15
    doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text('Financial Summary', 14, finalY)
    doc.setFontSize(10); doc.setTextColor(71, 85, 105)
    doc.text(`Total Visits: ${report.visitCount}`, 14, finalY + 10)
    doc.text(`Total Personal Spending: RWF ${report.totalSpent.toLocaleString()}`, 14, finalY + 16)
    doc.text(`Total Insurance Coverage: RWF ${report.totalInsurance.toLocaleString()}`, 14, finalY + 22)

    doc.save(`Patient_Report_${reportRange.start}.pdf`)
  }

  function downloadCSV() {
    if (!report || !report.visits.length) return
    const headers = ['Date', 'Bill Number', 'Total Amount', 'Insurance Amount', 'Patient Amount', 'Paid Amount', 'Status']
    const rows = report.visits.map(v => [
      new Date(v.date).toLocaleDateString(),
      v.billNumber,
      v.totalAmount,
      v.insuranceAmount,
      v.patientAmount,
      v.paidAmount,
      v.status
    ])

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Hospital_Report_${reportRange.start}_to_${reportRange.end}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    if (user?.role === 'Patient') {
      if (activeTab === 'history') fetchSecureHistory()
      if (activeTab === 'profile') fetchProfile()
      if (activeTab === 'complaints') fetchDisputes()
      if (activeTab === 'reports') fetchReport()
    }
  }, [activeTab, user])

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (authMode === 'login') {
        const { data } = await api.post('/auth/patient/login', { identifier: authForm.identifier, password: authForm.password })
        setUser(data)
        setUserState(data)
      } else {
        const payload = {
          fullName: authForm.fullName.trim(),
          phoneNumber: authForm.phoneNumber.trim(),
          email: authForm.email?.trim() || null,
          dateOfBirth: authForm.dateOfBirth,
          nationalId: authForm.nationalId.trim(),
          password: authForm.password
        }
        const { data } = await api.post('/auth/patient/register', payload)
        setAuthMode('login')
        setAuthForm({ ...authForm, identifier: payload.phoneNumber, password: '' })
        setError('')
        setRegistrationSuccess(true)
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const validationErrors = Object.values(err.response.data.errors).flat().join(' ');
        setError(validationErrors);
      } else {
        setError(err.response?.data?.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    setUserState(null)
    setHistory([])
    setBill(null)
    setProfile(null)
    setDisputes(null)
    setReport(null)
    setActiveTab('history')
  }

  async function handlePay() {
    if (!bill) return
    setIsPaying(true)
    setError('')
    try {
      const ref = payMethod === 'momo'
        ? `MOMO-${payPhone}-${Math.random().toString(36).substring(2,7).toUpperCase()}`
        : `BANK-${payBankName.replace(/\s/g,'-').toUpperCase()}-${Math.random().toString(36).substring(2,7).toUpperCase()}`
      await api.post('/payment/patient-pay', {
        billId: bill.id,
        amount: bill.balanceDue,
        method: payMethod === 'momo' ? 'Mobile Money' : 'Bank Transfer',
        reference: ref
      })
      setPayStep('success')
      await fetchBill(bill.billNumber)
    } catch (err) {
      console.error('Payment Error:', err)
      setError(err.response?.data?.message || 'Payment failed. Please try again.')
    } finally {
      setIsPaying(false)
    }
  }

  function handlePrintReceipt() {
    if (!bill) return
    const doc = new jsPDF()

    // Header
    doc.setFontSize(22); doc.setTextColor(15, 23, 42)
    doc.text('HOSPITALBILLING', 14, 22)
    doc.setFontSize(10); doc.setTextColor(100)
    doc.text('Official Payment Receipt', 14, 28)
    doc.setDrawColor(226, 232, 240); doc.line(14, 33, 196, 33)

    // Patient & bill info
    doc.setFontSize(9); doc.setTextColor(100)
    doc.text('RECEIPT TO', 14, 43); doc.text('BILL NUMBER', 110, 43)
    doc.setFontSize(11); doc.setTextColor(15, 23, 42)
    doc.text(bill.patientName || '', 14, 49)
    doc.text(bill.billNumber || '', 110, 49)

    doc.setFontSize(9); doc.setTextColor(100)
    doc.text('RECEIPT DATE', 14, 59); doc.text('STATUS', 110, 59)
    doc.setFontSize(11); doc.setTextColor(15, 23, 42)
    doc.text(new Date().toLocaleDateString(), 14, 65)
    doc.text(bill.status || '', 110, 65)

    // Items table
    const completedItems = bill.items?.filter(i => i.isCompleted && !i.isDisputed) || []
    doc.autoTable({
      startY: 75,
      head: [['Description', 'Qty', 'Unit Price', 'Subtotal']],
      body: completedItems.map(i => [
        i.description,
        i.quantity,
        `RWF ${i.unitPrice?.toLocaleString()}`,
        `RWF ${i.subtotal?.toLocaleString()}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    })

    const finalY = (doc.lastAutoTable?.finalY || 75) + 10

    // Summary
    doc.autoTable({
      startY: finalY,
      body: [
        ['Total Charges', `RWF ${bill.totalAmount?.toLocaleString()}`],
        ['Insurance Coverage', `- RWF ${bill.totalInsurance?.toLocaleString()}`],
        ['Patient Liability', `RWF ${bill.patientLiability?.toLocaleString()}`],
        ['Total Paid', `RWF ${bill.totalPaid?.toLocaleString()}`],
        ['Balance Due', `RWF ${bill.balanceDue?.toLocaleString()}`],
      ],
      theme: 'plain',
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      styles: { fontSize: 11 }
    })

    // Footer
    const footerY = (doc.lastAutoTable?.finalY || finalY) + 20
    doc.setFontSize(9); doc.setTextColor(150)
    doc.text('This is a computer-generated receipt. No signature required.', 14, footerY)
    doc.text('RWANDA DIGITAL MEDICAL CENTER', 14, footerY + 6)

    doc.save(`Receipt_${bill.billNumber}.pdf`)
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.put('/patient/profile', editForm)
      setProfile(data)
      setIsEditing(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRaiseDispute(e) {
    e.preventDefault()
    if (!activeDisputeItem || !disputeReason.trim()) return
    setDisputeLoading(true)
    setDisputeError('')
    try {
      await api.post(`/bills/item/${activeDisputeItem.id}/dispute`, JSON.stringify(disputeReason), {
        headers: { 'Content-Type': 'application/json' }
      })
      setActiveDisputeItem(null)
      setDisputeReason('')
      if (bill) await fetchBill(bill.billNumber)
    } catch (err) {
      setDisputeError(err.response?.data?.message || 'Failed to submit complaint. Please try again.')
    } finally {
      setDisputeLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    fetchBill(billNumber)
  }

  const navItems = [
    { key: 'current', label: 'View Single Bill', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> },
    { key: 'history', label: user ? 'Visit History' : 'Login / Register', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
    ...(user ? [
      { key: 'reports', label: 'My Reports', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg> },
      { key: 'profile', label: 'My Profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
      { key: 'complaints', label: 'Complaints', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> },
    ] : [])
  ]

  return (
    <div className={styles.patientPortal}>
      {/* Top Navbar */}
      <nav className={styles.topNav}>
        <div className={styles.brand} onClick={() => { setActiveTab('current'); setError(''); }}>
          <img src={logo} alt="Logo" className={styles.logoImage} />
          <span className={styles.brandText}>HOSPITALBILLING</span>
        </div>
        
        <div className={styles.navLinks}>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`${styles.navItem} ${activeTab === item.key ? styles.active : ''}`}
              onClick={() => {
                const protectedTabs = ['reports', 'profile', 'complaints', 'history']
                if (protectedTabs.includes(item.key) && !user) {
                  setActiveTab('history') // shows login/register
                } else {
                  setActiveTab(item.key)
                }
                setError('')
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.userMenu}>
          {user ? (
            <>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
                <div className={styles.userName}>{user.name}</div>
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Logout
              </button>
            </>
          ) : (
            <button className={styles.navItem} onClick={() => setActiveTab('history')}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.mainContainer}>
        <header className={styles.header}>
          <h2 className={styles.moduleTitle}>
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Patient Portal'}
          </h2>
          <p className={styles.moduleSubtitle}>
            {user ? 'Manage your health records, bills, and profile.' : 'Access your medical invoices securely.'}
          </p>
        </header>

        <div className={styles.dashboardContent}>

          {activeTab === 'current' && !bill && (
            <div className={styles.authCard}>
              <h2>Hospital Invoice</h2>
              {user ? (
                <div style={{ marginBottom: '24px' }}>
                  <p>You don't have any active bills at the moment.</p>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', fontSize: '13px', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0ea5e9' }}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    <span>Any new visit created at the reception will automatically appear here.</span>
                  </div>
                </div>
              ) : (
                <p>Please enter the Bill Number to view your charges.</p>
              )}

              <form onSubmit={handleSearch} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter Bill ID (e.g. BILL-20260423-ABC123)"
                  value={billNumber}
                  onChange={e => setBillNumber(e.target.value.toUpperCase().trim())}
                  required
                />
                <button type="submit" className={styles.btn} disabled={loading}>
                  {loading ? 'Finding...' : 'View Invoice'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'current' && bill && (
            <div className={styles.billContainer}>
              {user && bill.patientId === (user.patientId ?? user.id) && (
                <div style={{ background: '#0ea5e9', color: '#fff', padding: '8px 24px', fontSize: '12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    SECURELY LINKED TO YOUR ACCOUNT
                  </span>
                  <button onClick={() => { setBill(null); setActiveTab('history'); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}>BACK TO HISTORY</button>
                </div>
              )}
              <div className={styles.billHeader}>
                <div className={styles.billInfo}>
                  <span>Patient Invoice</span>
                  <h2>{bill.patientName}</h2>
                  <span>Bill #: {bill.billNumber}</span>
                </div>
                <div className={styles.status}>
                  <span className={styles[`status-${bill.status}`]}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10" /></svg>
                    {bill.status}
                  </span>
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
                        {item.isDisputed && <div className={styles.disputeBadge}>UNDER REVIEW</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={styles.itemPrice} style={!item.isCompleted ? { color: '#94a3b8', textDecoration: 'line-through' } : {}}>
                          RWF {item.subtotal.toLocaleString()}
                        </div>
                        {item.isCompleted && !item.isDisputed && user?.role === 'Patient' && (
                          <button
                            className={styles.reportBtn}
                            onClick={() => setActiveDisputeItem(item)}
                          >
                            Report Issue
                          </button>
                        )}
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

                {/* Payment / Receipt Section */}
                <div className={`${styles.paySection} no-print`}>
                  {bill.balanceDue > 0 ? (
                    <div className={styles.payPrompt}>

                      {/* Step indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                        {['method', 'details', 'confirm'].map((s, i) => (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 800,
                              background: ['method','details','confirm'].indexOf(payStep) >= i ? '#0ea5e9' : '#e2e8f0',
                              color: ['method','details','confirm'].indexOf(payStep) >= i ? '#fff' : '#94a3b8'
                            }}>{i + 1}</div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: payStep === s ? '#0ea5e9' : '#94a3b8' }}>
                              {s === 'method' ? 'Method' : s === 'details' ? 'Details' : 'Confirm'}
                            </span>
                            {i < 2 && <div style={{ width: '24px', height: '2px', background: '#e2e8f0' }} />}
                          </div>
                        ))}
                      </div>

                      {/* Step 1 — Choose method */}
                      {payStep === 'method' && (
                        <>
                          <h3 style={{ marginBottom: '8px' }}>How would you like to pay?</h3>
                          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
                            Balance due: <strong style={{ color: '#0f172a' }}>RWF {bill.balanceDue.toLocaleString()}</strong>
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <button
                              onClick={() => { setPayMethod('momo'); setPayStep('details') }}
                              style={{
                                padding: '20px', borderRadius: '16px', border: '2px solid #e2e8f0',
                                background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                            >
                              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📱</div>
                              <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>Mobile Money</div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>MTN MoMo / Airtel Money</div>
                            </button>
                            <button
                              onClick={() => { setPayMethod('bank'); setPayStep('details') }}
                              style={{
                                padding: '20px', borderRadius: '16px', border: '2px solid #e2e8f0',
                                background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                            >
                              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏦</div>
                              <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>Bank Transfer</div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Direct bank / card payment</div>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Step 2 — Enter details */}
                      {payStep === 'details' && (
                        <>
                          <h3 style={{ marginBottom: '4px' }}>
                            {payMethod === 'momo' ? '📱 Mobile Money Payment' : '🏦 Bank Transfer Payment'}
                          </h3>
                          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                            Amount: <strong style={{ color: '#0f172a' }}>RWF {bill.balanceDue.toLocaleString()}</strong>
                          </p>

                          {payMethod === 'momo' ? (
                            <>
                              {/* MoMo instructions */}
                              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#c2410c', marginBottom: '8px' }}>📋 How to pay via MoMo:</div>
                                <ol style={{ fontSize: '13px', color: '#7c3aed', paddingLeft: '18px', lineHeight: '1.8', margin: 0 }}>
                                  <li>Dial <strong>*182*8*1#</strong> on your phone</li>
                                  <li>Enter merchant code: <strong>123456</strong></li>
                                  <li>Enter amount: <strong>RWF {bill.balanceDue.toLocaleString()}</strong></li>
                                  <li>Enter your PIN to confirm</li>
                                  <li>Copy the transaction ID below</li>
                                </ol>
                              </div>
                              <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>
                                  Your MoMo Phone Number *
                                </label>
                                <input
                                  type="tel"
                                  placeholder="e.g. 0788123456"
                                  value={payPhone}
                                  onChange={e => setPayPhone(e.target.value)}
                                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }}
                                />
                              </div>
                              <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>
                                  Transaction ID (from MoMo SMS) *
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. TXN123456789"
                                  value={payReference}
                                  onChange={e => setPayReference(e.target.value)}
                                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'monospace' }}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Bank instructions */}
                              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e40af', marginBottom: '8px' }}>🏦 Bank Transfer Details:</div>
                                <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.8' }}>
                                  <div>Bank: <strong>Bank of Kigali</strong></div>
                                  <div>Account Name: <strong>Rwanda Digital Medical Center</strong></div>
                                  <div>Account Number: <strong>00040-0123456-78</strong></div>
                                  <div>Reference: <strong>{bill.billNumber}</strong></div>
                                </div>
                              </div>
                              <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>
                                  Your Bank Name *
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Bank of Kigali"
                                  value={payBankName}
                                  onChange={e => setPayBankName(e.target.value)}
                                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }}
                                />
                              </div>
                              <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>
                                  Account Holder Name *
                                </label>
                                <input
                                  type="text"
                                  placeholder="Name on your bank account"
                                  value={payAccountName}
                                  onChange={e => setPayAccountName(e.target.value)}
                                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }}
                                />
                              </div>
                              <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>
                                  Bank Transaction Reference *
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. REF-20240423-001"
                                  value={payReference}
                                  onChange={e => setPayReference(e.target.value)}
                                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'monospace' }}
                                />
                              </div>
                            </>
                          )}

                          {error && <div className={styles.error} style={{ marginBottom: '12px' }}>{error}</div>}

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => { setPayStep('method'); setError('') }}
                              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                              ← Back
                            </button>
                            <button
                              onClick={() => {
                                if (payMethod === 'momo' && (!payPhone.trim() || !payReference.trim())) {
                                  setError('Please enter your phone number and transaction ID.')
                                  return
                                }
                                if (payMethod === 'bank' && (!payBankName.trim() || !payAccountName.trim() || !payReference.trim())) {
                                  setError('Please fill in all bank details.')
                                  return
                                }
                                setError('')
                                setPayStep('confirm')
                              }}
                              style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>
                              Review & Confirm →
                            </button>
                          </div>
                        </>
                      )}

                      {/* Step 3 — Confirm */}
                      {payStep === 'confirm' && (
                        <>
                          <h3 style={{ marginBottom: '16px' }}>Confirm Your Payment</h3>
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                            <div style={{ display: 'grid', gap: '12px' }}>
                              {[
                                ['Method', payMethod === 'momo' ? '📱 Mobile Money' : '🏦 Bank Transfer'],
                                ['Amount', `RWF ${bill.balanceDue.toLocaleString()}`],
                                payMethod === 'momo'
                                  ? ['Phone', payPhone]
                                  : ['Bank', payBankName],
                                payMethod === 'momo'
                                  ? ['Transaction ID', payReference]
                                  : ['Account Name', payAccountName],
                                payMethod === 'bank' ? ['Reference', payReference] : null,
                                ['Bill Number', bill.billNumber],
                              ].filter(Boolean).map(([label, val]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                  <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                                  <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: label.includes('ID') || label.includes('Reference') || label.includes('Bill') ? 'monospace' : 'inherit' }}>{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {error && <div className={styles.error} style={{ marginBottom: '12px' }}>{error}</div>}

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => { setPayStep('details'); setError('') }}
                              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                              ← Edit
                            </button>
                            <button
                              className={styles.payBtn}
                              onClick={handlePay}
                              disabled={isPaying}
                              style={{ flex: 2, padding: '12px' }}
                            >
                              {isPaying ? 'Processing...' : `✓ Confirm Payment — RWF ${bill.balanceDue.toLocaleString()}`}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Step 4 — Success */}
                      {payStep === 'success' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
                          <h3 style={{ color: '#059669', marginBottom: '8px' }}>Payment Submitted!</h3>
                          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                            Your payment has been recorded. The billing team will confirm it shortly.
                          </p>
                          <button className={styles.printReceiptBtn} onClick={handlePrintReceipt}>
                            Download Receipt PDF
                          </button>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className={styles.paidSuccess}>
                      <div className={styles.successIcon}>✓</div>
                      <h3>Bill Fully Paid</h3>
                      <p>Thank you for choosing RWANDA DIGITAL MEDICAL CENTER.</p>
                      <button className={styles.printReceiptBtn} onClick={handlePrintReceipt}>
                        Download/Print Official Receipt
                      </button>
                    </div>
                  )}
                </div>

              </div>


            </div>
          )}

          {activeTab === 'history' && !user && (
            <div className={styles.historySection}>
              <div className={styles.authCard} style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
                <h2>Patient Account</h2>
                <p>{authMode === 'login' ? 'Login to view your history' : 'Register for an account to track all your hospital visits and bills.'}</p>
                {!user && authMode === 'login' && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#1e40af' }}>
                    💡 <strong>Don't have an account?</strong> Register now to see your full billing history and manage your visits securely.
                  </div>
                )}
                <div className={styles.tabContainer} style={{ marginBottom: '16px' }}>
                  <button className={`${styles.tab} ${authMode === 'login' ? styles.active : ''}`} onClick={() => { setAuthMode('login'); setError(''); }} style={{ padding: '8px' }}>Login</button>
                  <button className={`${styles.tab} ${authMode === 'register' ? styles.active : ''}`} onClick={() => { setAuthMode('register'); setError(''); }} style={{ padding: '8px' }}>Register</button>
                </div>
                <form onSubmit={handleAuth} className={styles.form}>
                  {registrationSuccess && (
                    <div style={{ 
                      background: '#f0fdf4', 
                      border: '1px solid #bbf7d0', 
                      color: '#15803d', 
                      padding: '12px', 
                      borderRadius: '12px', 
                      marginBottom: '16px', 
                      fontSize: '13px', 
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Account created! Please login to continue.
                    </div>
                  )}
                  {error && <div className={styles.error} style={{ marginBottom: '12px' }}>{error}</div>}
                  {authMode === 'login' ? (
                    <>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Phone or Email"
                        value={authForm.identifier}
                        onChange={e => setAuthForm({ ...authForm, identifier: e.target.value.trim() })}
                        required
                      />
                      <input
                        type="password"
                        className={styles.input}
                        placeholder="Password"
                        value={authForm.password}
                        onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                        required
                        minLength="6"
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Full Name"
                        value={authForm.fullName}
                        onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })}
                        required
                        pattern="^[a-zA-Z\s'\-]+$"
                        title="Name can only contain letters, spaces, hyphens and apostrophes"
                        minLength="3"
                      />
                      <input
                        type="email"
                        className={styles.input}
                        placeholder="Email Address (Optional)"
                        value={authForm.email}
                        onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                      />
                      <input
                        type="tel"
                        className={styles.input}
                        placeholder="Phone Number (e.g. +250...)"
                        value={authForm.phoneNumber}
                        onChange={e => setAuthForm({ ...authForm, phoneNumber: e.target.value.trim() })}
                        required
                        pattern="^\+?[0-9]{10,15}$"
                        title="Enter a valid phone number (10-15 digits)"
                      />
                      <input
                        type="date"
                        className={styles.input}
                        value={authForm.dateOfBirth}
                        onChange={e => setAuthForm({ ...authForm, dateOfBirth: e.target.value })}
                        required
                        max={new Date().toISOString().split("T")[0]}
                      />
                      <input
                        type="tel"
                        className={styles.input}
                        placeholder="Rwanda National ID (16 digits)"
                        value={authForm.nationalId}
                        onChange={e => setAuthForm({ ...authForm, nationalId: e.target.value })}
                        required
                        pattern="^[0-9]{16}$"
                        title="National ID must be exactly 16 digits"
                      />
                      <input
                        type="password"
                        className={styles.input}
                        placeholder="Create Password"
                        value={authForm.password}
                        onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                        required
                        minLength="6"
                      />
                    </>
                  )}
                  <button type="submit" className={styles.btn} disabled={loading}>{loading ? '...' : (authMode === 'login' ? 'Login' : 'Register')}</button>
                </form>
              </div>
            </div>
          )}
          {activeTab === 'history' && user && (
            <div className={styles.historySection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Billing History</h2>
                <button onClick={handleLogout} className={styles.backBtn} style={{ background: '#fef2f2', color: '#ef4444', padding: '8px 16px', borderRadius: '8px' }}>Logout</button>
              </div>
              <div style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '10px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  </div>
                  <span>Showing all records linked to <strong>{user.phoneNumber}</strong></span>
                </div>
                <button onClick={fetchSecureHistory} className={styles.backBtn} style={{ margin: 0, padding: '8px 16px', fontSize: '13px' }}>
                  Refresh List
                </button>
              </div>
              {error && <div className={styles.error}>{error}</div>}

              {history.length > 0 ? (
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
                      <div className={styles.hCardArrow}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.authCard} style={{ background: '#fff', border: '2px dashed #e2e8f0', padding: '48px 32px' }}>
                  <div style={{ background: '#f8fafc', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  </div>
                  <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>No Visits Found Yet</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '300px', margin: '0 auto 16px' }}>If you have previous visits at the hospital, make sure your portal phone number matches the one you provided at reception.</p>
                  <button onClick={fetchSecureHistory} className={styles.btn} style={{ padding: '10px 24px', fontSize: '14px' }}>Check Again</button>
                </div>
              )}
            </div>
          )}

          {['profile', 'reports', 'complaints'].includes(activeTab) && !user && (
            <div className={styles.authCard} style={{ maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
              <h2>Login Required</h2>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>You need to be logged in to access this section.</p>
              <button className={styles.btn} onClick={() => setActiveTab('history')}>
                Login / Register
              </button>
            </div>
          )}

          {activeTab === 'profile' && user && (
            <div className={styles.historySection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Patient Profile</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {!isEditing ? (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditForm({
                          fullName: profile?.fullName || '',
                          phoneNumber: profile?.phoneNumber || '',
                          email: profile?.email || '',
                          dateOfBirth: profile?.dateOfBirth || ''
                        });
                      }}
                      className={styles.editBtn}
                    >
                      Edit Details
                    </button>
                  ) : (
                    <button onClick={() => setIsEditing(false)} className={styles.backBtn} style={{ margin: 0 }}>Cancel</button>
                  )}
                  <button onClick={handleLogout} className={styles.backBtn} style={{ background: '#fef2f2', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', margin: 0 }}>Logout</button>
                </div>
              </div>

              {profile ? (
                <div className={styles.profileGrid}>
                  <div className={styles.profileCard}>
                    <h3 className={styles.sectionTitle}>Personal Details</h3>
                    {!isEditing ? (
                      <>
                        <div className={styles.profileItem}>
                          <label>Full Name</label>
                          <div>{profile.fullName}</div>
                        </div>
                        <div className={styles.profileItem}>
                          <label>Email Address</label>
                          <div>{profile.email || 'Not provided'}</div>
                        </div>
                        <div className={styles.profileItem}>
                          <label>Phone Number</label>
                          <div>{profile.phoneNumber}</div>
                        </div>
                        <div className={styles.profileItem}>
                          <label>Date of Birth</label>
                          <div>{profile.dateOfBirth}</div>
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleUpdateProfile} className={styles.form}>
                        {error && <div className={styles.error}>{error}</div>}
                        <div className={styles.formGroup}>
                          <label>Full Name</label>
                          <input
                            type="text"
                            className={styles.input}
                            value={editForm.fullName}
                            onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                            required
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Email Address</label>
                          <input
                            type="email"
                            className={styles.input}
                            value={editForm.email}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Phone Number</label>
                          <input
                            type="tel"
                            className={styles.input}
                            value={editForm.phoneNumber}
                            onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                            required
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Date of Birth</label>
                          <input
                            type="date"
                            className={styles.input}
                            value={editForm.dateOfBirth}
                            onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                            required
                          />
                        </div>
                        <button type="submit" className={styles.saveBtn} disabled={loading}>
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </form>
                    )}
                  </div>

                  <div className={styles.profileCard}>
                    <h3 className={styles.sectionTitle}>Identification & Insurance</h3>
                    <div className={styles.profileItem}>
                      <label>National ID</label>
                      <div style={{ color: '#64748b' }}>{profile.nationalId}</div>
                    </div>
                    <div className={styles.profileItem}>
                      <label>Insurance Provider</label>
                      <div style={{ color: '#0f172a', fontWeight: 700 }}>{profile.insuranceProvider || 'Private / None'}</div>
                    </div>
                    <div className={styles.profileItem}>
                      <label>Policy Number</label>
                      <div>{profile.insuranceNumber || 'N/A'}</div>
                    </div>
                    <div className={styles.profileItem}>
                      <label>Coverage</label>
                      <div style={{ color: '#059669', fontWeight: 700 }}>{profile.insuranceCoveragePercentage}% Coverage</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', marginTop: '24px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                        National ID and Insurance details can only be updated by the hospital administration.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.loading}>Loading profile...</div>
              )}
            </div>
          )}

          {activeTab === 'complaints' && user && (
            <div className={styles.historySection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Billing Complaints</h2>
                <button onClick={handleLogout} className={styles.backBtn} style={{ background: '#fef2f2', color: '#ef4444', padding: '8px 16px', borderRadius: '8px' }}>Logout</button>
              </div>

              <p style={{ color: '#64748b', marginBottom: '20px' }}>Track the status of issues you've reported on your bills.</p>

              {disputes.length > 0 ? (
                <div className={styles.historyList}>
                  {disputes.map(d => (
                    <div key={d.id} className={styles.historyCard}>
                      <div className={styles.hCardDate}>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                      <div className={styles.hCardInfo}>
                        <div className={styles.hCardTitle}>{d.itemDescription}</div>
                        <div className={styles.hCardSub}>Bill: {d.billNumber}</div>
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                          " {d.reason} "
                        </div>
                      </div>
                      <div className={styles.status}>
                        <span className={styles[`status-${d.status}`]}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10" /></svg>
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.authCard} style={{ background: '#fff', border: '1px dashed #cbd5e1' }}>
                  <p>You haven't reported any issues yet.</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>To report an issue, find the specific item in your current bill and click "Report Issue".</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'reports' && user && (
            <div className={styles.historySection}>
              <div className={styles.subHeader}>
                <h2>Financial Reports</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={exportToPDF} className={styles.btn} style={{ background: '#f1f5f9', color: '#475569' }}>Download PDF Report</button>
                  <button onClick={downloadCSV} className={styles.btn}>Download CSV</button>
                </div>
              </div>

              <div className={styles.authCard} style={{ maxWidth: '100%', marginBottom: '32px', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>CUSTOMIZE REPORT RANGE</h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className={styles.formGroup} style={{ flex: 1, minWidth: '200px' }}>
                    <label>Start Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={reportRange.start}
                      onChange={e => setReportRange({ ...reportRange, start: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1, minWidth: '200px' }}>
                    <label>End Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={reportRange.end}
                      onChange={e => setReportRange({ ...reportRange, end: e.target.value })}
                    />
                  </div>
                  <button onClick={fetchReport} className={styles.btn} style={{ height: '48px', padding: '0 32px' }} disabled={loading}>
                    {loading ? 'Generating...' : 'Update Report'}
                  </button>
                </div>
              </div>

              {report && (
                <div className={styles.dashboardContent}>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Total Spent (Self)</div>
                      <div className={styles.statValue} style={{ color: '#0ea5e9' }}>RWF {report.totalSpent.toLocaleString()}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Insurance Coverage</div>
                      <div className={styles.statValue} style={{ color: '#10b981' }}>RWF {report.totalInsurance.toLocaleString()}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Total Visits</div>
                      <div className={styles.statValue}>{report.visitCount}</div>
                    </div>
                  </div>

                  <div className={styles.billContainer} style={{ maxWidth: '100%' }}>
                    <div className={styles.cardHeader} style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: 0 }}>Visit Details</h3>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Bill Number</th>
                          <th>Total Charges</th>
                          <th>Insurance</th>
                          <th>Your Part</th>
                          <th>Paid</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.visits.map(v => (
                          <tr key={v.billId}>
                            <td>{new Date(v.date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 700, color: '#0ea5e9' }}>{v.billNumber}</td>
                            <td>{v.totalAmount.toLocaleString()}</td>
                            <td style={{ color: '#059669' }}>{v.insuranceAmount.toLocaleString()}</td>
                            <td style={{ fontWeight: 700 }}>{v.patientAmount.toLocaleString()}</td>
                            <td style={{ color: v.paidAmount >= v.patientAmount ? '#059669' : '#f59e0b' }}>
                              {v.paidAmount.toLocaleString()}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${styles['status-' + v.status]}`}>
                                {v.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {report.visits.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                              No visits found for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      {/* Dispute Modal — rendered at root level to avoid stacking context issues */}
      {activeDisputeItem && (
        <div className={styles.disputeOverlay}>
          <div className={styles.disputeForm}>
            <h3>Report Issue: {activeDisputeItem.description}</h3>
            <p>Describe the issue with this charge (e.g., incorrect price, service not received).</p>
            <form onSubmit={handleRaiseDispute}>
              {disputeError && <div className={styles.error} style={{ marginBottom: '12px' }}>{disputeError}</div>}
              <textarea
                className={styles.textarea}
                placeholder="Enter details here..."
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                required
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => { setActiveDisputeItem(null); setDisputeError('') }} className={styles.backBtn} disabled={disputeLoading}>Cancel</button>
                <button type="submit" className={styles.payBtn} style={{ padding: '8px 24px' }} disabled={disputeLoading}>
                  {disputeLoading ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
