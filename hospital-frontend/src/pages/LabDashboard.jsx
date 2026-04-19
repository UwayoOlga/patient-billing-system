import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './LabDashboard.module.css'

export default function LabDashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [allVisits, setAllVisits] = useState([])
  const [pendingTests, setPendingTests] = useState([])
  const [completedTests, setCompletedTests] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ message: '', type: 'success', icon: '' })
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
      fetchTests()
      showNotification(`Test Finalized: ${resultModal.item.description}`, 'success', '🔬')
      setResultModal({ isOpen: false, item: null, notes: '' })
    } catch (err) {
      showNotification('Failed to save test results', 'error', '🛑')
    }
  }

  async function handleRevert(itemId, testDescription) {
    if (!window.confirm(`Are you sure you want to REVERT "${testDescription}" back to pending? This will clear the results.`)) return
    try {
      await api.patch(`/bills/items/${itemId}/revert`)
      fetchTests()
      showNotification(`Test Reverted: ${testDescription}`, 'success', '⏪')
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to revert test', 'error', '🛑')
    }
  }

  function handlePrint(test, visit) {
    const printWindow = window.open('', '_blank');
    const content = `
      <html>
        <head>
          <title>Lab Report - ${test.description}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .hospital-name { font-size: 24px; font-weight: bold; color: #059669; }
            .report-title { font-size: 18px; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .meta-item { font-size: 14px; }
            .meta-label { color: #64748b; font-weight: 600; }
            .result-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; }
            .result-label { font-size: 16px; font-weight: bold; margin-bottom: 15px; display: block; }
            .result-text { font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
            .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-name">🏥 RWANDA DIGITAL HEALTHCARE</div>
            <div class="report-title">Official Laboratory Investigation Report</div>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">PATIENT:</span> ${visit?.patientName || test?.patientName}</div>
            <div class="meta-item"><span class="meta-label">BILL ID:</span> ${visit?.billNumber || test?.billNumber}</div>
            <div class="meta-item"><span class="meta-label">INVESTIGATION:</span> ${test.description}</div>
            <div class="meta-item"><span class="meta-label">DATE:</span> ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="result-box">
            <span class="result-label">CLINICAL FINDINGS & RESULTS:</span>
            <div class="result-text">${test.notes || 'No results recorded.'}</div>
          </div>
          <div class="footer">
            Computer generated report. Validated by Laboratory Technician: ${user?.name || 'Authorized Staff'}<br>
            Rwanda Digital Healthcare - Quality Clinical Services
          </div>
          <script>window.print();</script>
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
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10v6M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><path d="M9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"></path></svg>
          <span>LabPortal</span>
        </div>
        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${tab === 'pending' ? styles.active : ''}`} onClick={() => setTab('pending')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Pending Analysis
          </a>
          <a className={`${styles.navItem} ${tab === 'completed' ? styles.active : ''}`} onClick={() => setTab('completed')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            Completed Tests
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

          <div className={styles.headerActions}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'L'}</div>
              <div className={styles.userName}>{user?.name ?? 'Lab Tech'}</div>
            </div>
          </div>
        </header>

        {selectedVisit ? (
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
                                    onClick={() => handlePrint(item, selectedVisit)}
                                    style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #dcfce7', color: '#166534', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                  >
                                    📄 Print Report
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
