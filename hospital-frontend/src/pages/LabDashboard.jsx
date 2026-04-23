import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './LabDashboard.module.css'
import ProfileTab from '../components/ProfileTab'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import logo from '../assets/logo.jpg'

export default function LabDashboard() {
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
  const [pendingTests, setPendingTests] = useState([])
  const [completedTests, setCompletedTests] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ message: '', type: 'success', icon: '' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [resultModal, setResultModal] = useState({ isOpen: false, item: null, notes: '' })

  const showNotification = (message, type = 'success', icon = '✨') => {
    setNotification({ message, type, icon })
    setTimeout(() => setNotification({ message: '', type: 'success', icon: '' }), 4000)
  }

  useEffect(() => { 
    fetchTests() 
    showNotification('Lab Portal Synchronized', 'success', '🛰️')
  }, [])

  async function fetchTests() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/summary')
      
      // Only keep open/finalized visits that actually have at least one Lab Test requested
      const visitsWithLabWork = data.filter(b => 
        (b.status === 'Open' || b.status === 'Finalized') && 
        b.items.some(i => i.category === 'LabTest')
      )
      setAllVisits(visitsWithLabWork)
      
      const pending = []
      const completed = []
      data.forEach(bill => {
        bill.items.forEach(item => {
          if (item.category === 'LabTest') {
            const t = { ...item, patientName: bill.patientName, billNumber: bill.billNumber }
            if (item.isCompleted) completed.push(t)
            else pending.push(t)
          }
        })
      })
      setPendingTests(pending)
      setCompletedTests(completed)
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

  async function submitResult() {
    if (!resultModal.item) return
    try {
      await api.patch(`/bills/items/${resultModal.item.id}/complete`, {
        resultNotes: resultModal.notes
      })
      await fetchTests()
      
      // Update selectedVisit in-place so the UI reflects completion immediately
      if (selectedVisit) {
        setSelectedVisit(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === resultModal.item.id ? { ...i, isCompleted: true, notes: resultModal.notes } : i)
        }))
      }

      showNotification(`Test Results Attached: ${resultModal.item.description}`, 'success', '✅')
      setResultModal({ isOpen: false, item: null, notes: '' })
    } catch (err) {
      showNotification('Failed to save test results', 'error', '🛑')
    }
  }

  async function handleRevert(itemId, testDescription) {
    if (!window.confirm(`Are you sure you want to REVERT "${testDescription}" back to pending? This will clear the results.`)) return
    try {
      await api.patch(`/bills/items/${itemId}/revert`)
      await fetchTests()

      if (selectedVisit) {
        setSelectedVisit(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === itemId ? { ...i, isCompleted: false, notes: null } : i)
        }))
      }

      showNotification(`Test Reverted: ${testDescription}`, 'success', '⏪')
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to revert test', 'error', '🛑')
    }
  }

  const exportToPDF = (test, visit) => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text('HOSPITALBILLING', 14, 22)
    doc.setFontSize(10); doc.setTextColor(100); doc.text('Advanced Clinical Laboratory Services', 14, 28)
    
    // Meta Information
    doc.setDrawColor(226, 232, 240); doc.line(14, 35, 196, 35)
    
    doc.setFontSize(9); doc.setTextColor(100); doc.text('PATIENT NAME', 14, 45); doc.text('BILL / VISIT ID', 110, 45)
    doc.setFontSize(11); doc.setTextColor(15, 23, 42); 
    doc.text(visit?.patientName || test?.patientName || 'N/A', 14, 51)
    doc.text(visit?.billNumber || test?.billNumber || 'N/A', 110, 51)
    
    doc.setFontSize(9); doc.setTextColor(100); doc.text('INVESTIGATION', 14, 62); doc.text('REPORT DATE', 110, 62)
    doc.setFontSize(11); doc.setTextColor(15, 23, 42);
    doc.text(test.description, 14, 68)
    doc.text(new Date().toLocaleString(), 110, 68)

    // Results Box
    doc.setFillColor(248, 250, 252); doc.roundedRect(14, 80, 182, 60, 3, 3, 'F')
    doc.setFontSize(10); doc.setTextColor(100); doc.text('CONFIDENTIAL CLINICAL FINDINGS', 20, 90)
    doc.setFontSize(11); doc.setTextColor(30, 41, 59);
    const splitText = doc.splitTextToSize(test.notes || 'No findings recorded.', 170)
    doc.text(splitText, 20, 100)

    // Footer
    doc.setFontSize(8); doc.setTextColor(148, 163, 184)
    doc.text('This is a digitally certified medical report.', 14, 160)
    doc.text(`Authorized by: ${user?.name || 'Lab Department'}`, 14, 165)
    
    doc.save(`Lab_Report_${test.description.replace(/\s+/g, '_')}.pdf`)
  }

  function handlePrint(test, visit) {
    const printWindow = window.open('', '_blank');
    const content = `
      <html>
        <head>
          <title>Lab Report - ${test.description}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #0f172a; padding-bottom: 24px; margin-bottom: 32px; }
            .logo-placeholder { background: #0f172a; color: white; width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; }
            .hospital-info h1 { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
            .hospital-info p { margin: 4px 0 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .report-title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 32px; color: #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .badge { background: #f1f5f9; padding: 4px 12px; border-radius: 6px; font-size: 12px; }

            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-item { display: flex; flex-direction: column; gap: 4px; }
            .meta-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .meta-value { font-size: 15px; font-weight: 700; color: #1e293b; }

            .result-container { margin-bottom: 48px; }
            .result-header { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
            .result-content { font-size: 16px; white-space: pre-wrap; padding: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; min-height: 200px; }

            .footer { margin-top: auto; padding-top: 32px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
            .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .signature-space { margin-top: 40px; border-top: 1px solid #94a3b8; width: 200px; padding-top: 8px; font-weight: 700; }
            
            @media print {
              body { padding: 0; }
              .meta-grid { background: #fff !important; border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;" />
            <div class="hospital-info">
              <h1>HOSPITALBILLING</h1>
              <p>Excellence in Healthcare | Clinical Laboratory</p>
            </div>
          </div>

          <div class="report-title">
            Laboratory Investigation Report
            <span class="badge">Official Document</span>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Patient Name</span>
              <span class="meta-value">${visit?.patientName || test?.patientName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Bill / Visit ID</span>
              <span class="meta-value">${visit?.billNumber || test?.billNumber}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Investigation Type</span>
              <span class="meta-value">${test.description}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Date Generated</span>
              <span class="meta-value">${new Date().toLocaleString()}</span>
            </div>
          </div>

          <div class="result-container">
            <div class="result-header">CLINICAL FINDINGS & RESULTS</div>
            <div class="result-content">${test.notes || 'No clinical findings recorded.'}</div>
          </div>

          <div class="footer">
            <div class="footer-grid">
              <div>
                <p><strong>Disclaimer:</strong> This report is intended for medical use only. Results should be interpreted by a qualified medical professional in conjunction with clinical symptoms.</p>
                <p style="margin-top: 8px;">Hospital ID: RDMC-LAB-${Math.floor(Math.random() * 90000) + 10000}</p>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <div class="signature-space">Authorized Laboratory Technician</div>
                <p style="margin-top: 4px; font-size: 11px;">${user?.name || 'System Authorized'}</p>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Pending Analysis
          </a>
          <a className={`${styles.navItem} ${tab === 'completed' ? styles.active : ''}`} onClick={() => { setTab('completed'); setMobileMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            Completed Tests
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
              placeholder="Search Patient or Visit ID (e.g. BILL-2026...)" 
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
                )) : <div className={styles.noResults}>No active visits found</div>}
              </div>
            )}
          </div>

          <div className={styles.headerActions} style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <h2 className={styles.moduleTitle} style={{margin: 0, fontSize: '18px'}}>Welcome, {user?.name ?? 'Lab Tech'}</h2>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'L'}</div>
              <div className={styles.userName}>{user?.name ?? 'Lab Tech'}</div>
            </div>
          </div>
        </header>

        {tab === 'profile' ? <ProfileTab /> : selectedVisit ? (
          <div className={styles.visitWorkspace}>
            <div className={styles.workspaceHeader}>
              <button className={styles.backBtn} onClick={() => setSelectedVisit(null)}>← Back to Queue</button>
              <h2>Manage Requested Tests: {selectedVisit.patientName} <br/><small>({selectedVisit.billNumber})</small></h2>
            </div>

            <div className={styles.visitDetailsRow}>
              <div className={styles.activeBillSection}>
                <h3>Tests Ordered by Doctor</h3>
                <div className={styles.billTable}>
                  {selectedVisit.items.filter(i => i.category === 'LabTest').length === 0 ? (
                    <div className={styles.empty}>No lab tests requested by doctor for this visit.</div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Test Name</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVisit.items.filter(i => i.category === 'LabTest').map(item => (
                          <tr key={item.id}>
                            <td style={{fontWeight: 700}}>{item.description}</td>
                            <td style={{color: '#2563eb', fontWeight: 600}}>{item.unitPrice.toLocaleString()} RWF</td>
                            <td>
                              <span className={item.isCompleted ? styles.activeBadge : styles.inactiveBadge}>
                                {item.isCompleted ? 'Completed' : 'Pending'}
                              </span>
                            </td>
                            <td>
                              {!item.isCompleted ? (
                                <button className={styles.miniCompleteBtn} onClick={() => setResultModal({ isOpen: true, item, notes: '' })}>
                                  Attach Result & Complete
                                </button>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    className={styles.miniPrintBtn} 
                                    onClick={() => exportToPDF(item, selectedVisit)}
                                    style={{ padding: '6px 12px', background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Download PDF
                                  </button>
                                  <button 
                                    className={styles.miniRevertBtn} 
                                    onClick={() => handleRevert(item.id, item.description)}
                                    style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                  >
                                    Undo
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
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Pending Analysis</div>
                <div className={styles.statValue}>{pendingTests.length}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Completed Today</div>
                <div className={styles.statValue}>{completedTests.length}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <section className={styles.testSection}>
                <h3 className={styles.sectionTitle}>Active Patient Visits (Click to Pull Up)</h3>
                <div className={styles.testGrid} style={{ gridTemplateColumns: '1fr' }}>
                  {allVisits.length > 0 ? allVisits.map(visit => (
                    <div key={visit.id} className={styles.testCard} onClick={() => selectVisit(visit)} style={{ cursor: 'pointer', borderLeft: '4px solid #059669' }}>
                      <div className={styles.testHeader}>
                        <span className={styles.patientName}>{visit.patientName}</span>
                        <span className={styles.statusBadge}>{visit.status}</span>
                      </div>
                      <div className={styles.patientDate}>Bill ID: {visit.billNumber}</div>
                      <div className={styles.testDesc} style={{color: '#64748b'}}>
                        {visit.items?.filter(i => i.category === 'LabTest').length || 0} Lab Tests Tracked
                      </div>
                    </div>
                  )) : (
                    <div className={styles.empty}>No active patient visits found. Add one from the Doctor Dashboard!</div>
                  )}
                </div>
              </section>

              <section className={styles.testSection}>
                <h3 className={styles.sectionTitle}>{tab === 'pending' ? 'Global Pending Lab Work' : 'Test History'}</h3>
                <div className={styles.testGrid} style={{ gridTemplateColumns: '1fr' }}>
                  {(tab === 'pending' ? pendingTests : completedTests).map(test => (
                    <div key={test.id} className={styles.testCard} onClick={() => {
                      const v = allVisits.find(v => v.items.some(i => i.id === test.id))
                      if (v) selectVisit(v)
                    }}>
                      <div className={styles.testHeader}>
                        <span className={styles.patientName}>{test.patientName}</span>
                        <span className={`${styles.testBadge} ${test.isCompleted ? styles.completedBadge : ''}`}>
                          {test.isCompleted ? 'Finished' : 'Waiting'}
                        </span>
                      </div>
                      <div className={styles.testName}>{test.description}</div>
                      <div className={styles.patientDate}>
                        {test.billNumber}
                        {test.isCompleted && (
                          <button 
                            className={styles.undoCardBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevert(test.id, test.description);
                            }}
                            style={{ marginLeft: '12px', background: 'white', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', color: '#dc2626', fontSize: '10px', fontWeight: 'bold' }}
                          >
                            UNDO
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(tab === 'pending' ? pendingTests : completedTests).length === 0 && (
                    <div style={{color: '#64748b', fontSize: '14px'}}>Queue is empty.</div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* Attach Result Modal */}
      {resultModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: '32px', borderRadius: '12px', width: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>
              Finalize Lab Test
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
              Enter the clinical results for <strong>{resultModal.item?.description}</strong>. The Doctor will see this on their dashboard.
            </p>
            <textarea 
              autoFocus
              rows="4" 
              placeholder="e.g., Hemoglobin: 14.5 g/dL. No abnormalities found..."
              value={resultModal.notes}
              onChange={e => setResultModal({ ...resultModal, notes: e.target.value })}
              style={{
                width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', 
                borderRadius: '6px', fontSize: '14px', resize: 'vertical', marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setResultModal({ isOpen: false, item: null, notes: '' })}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={submitResult}
                style={{ padding: '8px 16px', background: '#059669', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Save Result & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
