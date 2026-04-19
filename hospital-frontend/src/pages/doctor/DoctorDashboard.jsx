import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../../utils/auth'
import api from '../../utils/api'
import NewVisitModal from './NewVisitModal'
import AddChargeModal from './AddChargeModal'
import VisitDetailsModal from './VisitDetailsModal'
import styles from './DoctorDashboard.module.css'

export default function DoctorDashboard() {
  const user = getUser()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [bills, setBills] = useState([])
  const [patients, setPatients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [viewBill, setViewBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [trashBills, setTrashBills] = useState([])
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' })
  const [profileForm, setProfileForm] = useState({ fullName: '', newPassword: '' })

  useEffect(() => { fetchBills() }, [])

  useEffect(() => {
    if (activeTab === 'patients') fetchPatients()
    if (activeTab === 'trash') fetchTrash()
    if (activeTab === 'profile') fetchProfile()
  }, [activeTab])

  async function fetchBills() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/doctor')
      setBills(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function deleteBill(billId) {
    if (!window.confirm("Are you sure you want to delete this entire visit record? This action cannot be undone.")) return
    try {
      await api.delete(`/bills/${billId}`)
      await fetchBills()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete visit')
    }
  }

  async function fetchPatients() {
    setPatientsLoading(true)
    try {
      // Only fetch patients this doctor has treated or registered
      const { data } = await api.get('/patient/mine')
      setPatients(data)
    } catch {
      // silently fail
    } finally {
      setPatientsLoading(false)
    }
  }

  async function fetchTrash() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/trash')
      setTrashBills(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function fetchProfile() {
    setProfileLoading(true)
    try {
      const { data } = await api.get('/staff/me')
      setProfile(data)
      setProfileForm({ 
        fullName: data.fullName, 
        phoneNumber: data.phoneNumber || '', 
        newPassword: '' 
      })
    } catch {
      // silently fail
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setProfileLoading(true)
    setUpdateMsg({ type: '', text: '' })
    try {
      await api.put('/staff/me', profileForm)
      const { data } = await api.get('/staff/me') // Re-fetch to get fresh DB data
      setProfile(data)
      setUpdateMsg({ type: 'success', text: 'Profile updated successfully!' })
      // Update local storage
      const localUser = JSON.parse(localStorage.getItem('user'))
      localUser.name = data.fullName
      localStorage.setItem('user', JSON.stringify(localUser))
    } catch (err) {
      setUpdateMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' })
    } finally {
      setProfileLoading(false)
    }
  }

  async function restoreBill(billId) {
    try {
      await api.patch(`/bills/${billId}/restore`)
      await fetchTrash()
      await fetchBills()
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed')
    }
  }

  async function permanentDelete(billId) {
    if (!window.confirm("PERMANENT DELETE: This will completely erase this record from the database. Proceed?")) return
    try {
      await api.delete(`/bills/${billId}/permanent`)
      await fetchTrash()
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const activeVisits = bills.filter(b => b.status === 'Open')
  const completedVisits = bills.filter(b => b.status !== 'Open')
  const completedToday = completedVisits.filter(b => {
    const today = new Date().toDateString()
    return new Date(b.createdAt).toDateString() === today
  })

  const filteredPatients = patients.filter(p =>
    p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phoneNumber?.includes(searchQuery)
  )

  const filteredVisits = bills.filter(b =>
    b.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.billNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const navItems = [
    {
      key: 'dashboard', label: 'Dashboard',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    },
    {
      key: 'patients', label: 'Patients',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
    {
      key: 'visits', label: 'Visits',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    },
    {
      key: 'trash', label: 'Trash',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
    },
    {
      key: 'profile', label: 'Profile',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
  ]

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <svg className={styles.logoIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>HospitalBilling</span>
        </div>
        <nav className={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`${styles.navItem} ${activeTab === item.key ? styles.active : ''}`}
              onClick={() => { setActiveTab(item.key); setSearchQuery('') }}
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
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h2 className={styles.moduleTitle}>
              {activeTab === 'dashboard' && 'Doctor Module'}
              {activeTab === 'patients' && 'All Patients'}
              {activeTab === 'visits' && 'Visit History'}
              {activeTab === 'trash' && 'Trash / Deleted Visits'}
              {activeTab === 'profile' && 'My Profile'}
            </h2>
          </div>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'D'}</div>
            <div>
              <div className={styles.userName}>Dr. {user?.name ?? 'Doctor'}</div>
              <div className={styles.userRole}>Medical Services</div>
            </div>
            <span className={styles.activeBadge}>Active</span>
          </div>
        </header>

        {/* ─── DASHBOARD TAB ─── */}
        {activeTab === 'dashboard' && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Active Visits</div>
                <div className={styles.statValue}>{activeVisits.length}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Completed Today</div>
                <div className={styles.statValue}>{completedToday.length}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Visits</div>
                <div className={styles.statValue}>{bills.length}</div>
              </div>
            </div>

            <div className={styles.newVisitCard}>
              <div className={styles.newVisitIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div>
                <div className={styles.newVisitTitle}>Start New Patient Visit</div>
                <div className={styles.newVisitSub}>Register a new patient and begin consultation</div>
              </div>
              <button className={styles.newVisitBtn} onClick={() => setShowModal(true)}>
                New Visit
              </button>
            </div>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Today's Active Visits</h3>
              {loading ? (
                <div className={styles.empty}>Loading patient data...</div>
              ) : activeVisits.length === 0 ? (
                <div className={styles.empty}>No active visits right now.</div>
              ) : (
                <div className={styles.visitGrid}>
                  {activeVisits.map(bill => (
                    <ActiveVisitCard
                      key={bill.id}
                      bill={bill}
                      onRefresh={fetchBills}
                      onAddCharge={() => setSelectedBill(bill)}
                      onView={() => setViewBill(bill)}
                      onDelete={() => deleteBill(bill.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Completed Today</h3>
              {completedToday.length === 0 ? (
                <div className={styles.empty}>No completed visits today.</div>
              ) : (
                <div className={styles.completedList}>
                  {completedToday.map(bill => (
                    <CompletedRow key={bill.id} bill={bill} onView={() => setViewBill(bill)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ─── PATIENTS TAB ─── */}
        {activeTab === 'patients' && (
          <>
            <div className={styles.tabToolbar}>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  className={styles.searchInput}
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={styles.countBadge}>{filteredPatients.length} patients</div>
            </div>

            {patientsLoading ? (
              <div className={styles.empty}>Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div className={styles.empty}>
                {searchQuery ? 'No patients match your search.' : 'No patients registered yet.'}
              </div>
            ) : (
              <div className={styles.patientsTable}>
                <div className={styles.tableHeader}>
                  <span>Patient</span>
                  <span>Phone</span>
                  <span>Patient ID</span>
                  <span>Registered</span>
                </div>
                {filteredPatients.map(p => (
                  <div key={p.id} className={styles.tableRow}>
                    <div className={styles.patientCell}>
                      <div className={styles.tableAvatar}>
                        {p.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className={styles.tableName}>{p.fullName}</span>
                    </div>
                    <span className={styles.tablePhone}>{p.phoneNumber ?? '—'}</span>
                    <span className={styles.tableId}>P{String(p.id).padStart(4, '0')}</span>
                    <span className={styles.tableDate}>
                      {p.registeredAt ? new Date(p.registeredAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── VISITS TAB ─── */}
        {activeTab === 'visits' && (
          <>
            <div className={styles.tabToolbar}>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  className={styles.searchInput}
                  placeholder="Search by patient name or visit #..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={styles.visitFilterRow}>
                <span className={`${styles.filterChip} ${styles.chipOpen}`}>{activeVisits.length} Open</span>
                <span className={`${styles.filterChip} ${styles.chipClosed}`}>{completedVisits.length} Completed</span>
              </div>
            </div>

            {loading ? (
              <div className={styles.empty}>Loading visits...</div>
            ) : filteredVisits.length === 0 ? (
              <div className={styles.empty}>
                {searchQuery ? 'No visits match your search.' : 'No visits recorded yet.'}
              </div>
            ) : (
              <div className={styles.visitsTable}>
                <div className={styles.tableHeader}>
                  <span>Patient</span>
                  <span>Visit #</span>
                  <span>Date</span>
                  <span>Items</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                  {filteredVisits.map(bill => (
                    <div key={bill.id} className={styles.visitTableRow}>
                      <div className={styles.patientCell}>
                        <div className={styles.tableAvatar}>
                          {bill.patientName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className={styles.tableName}>{bill.patientName}</span>
                      </div>
                      <span className={styles.tableVisitNo}>{bill.billNumber}</span>
                      <span className={styles.tableDate}>{new Date(bill.createdAt).toLocaleDateString()}</span>
                      <span className={styles.tableItems}>{bill.items?.length ?? 0} items</span>
                      <span className={bill.status === 'Open' ? styles.statusOpen : styles.statusClosed}>
                        {bill.status}
                      </span>
                      <div className={styles.tableActions}>
                        {bill.status === 'Open' && (
                          <button
                            className={styles.addChargesBtnSmall}
                            onClick={() => setSelectedBill(bill)}
                          >
                            + Charge
                          </button>
                        )}
                        <button
                          className={styles.viewBtnSmall}
                          onClick={() => setViewBill(bill)}
                        >
                          View
                        </button>
                        {bill.status === 'Open' && (
                          <button
                            className={styles.deleteBtnSmallRed}
                            onClick={() => deleteBill(bill.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* ─── TRASH TAB ─── */}
        {activeTab === 'trash' && (
          <>
            <div className={styles.tabToolbar}>
              <div className={styles.countBadge}>{trashBills.length} items in trash</div>
              <p className={styles.toolbarNote}>Visits here are hidden from reports but can be restored.</p>
            </div>

            {loading ? (
              <div className={styles.empty}>Loading trash...</div>
            ) : trashBills.length === 0 ? (
              <div className={styles.empty}>Your trash is empty.</div>
            ) : (
              <div className={styles.trashGrid}>
                {trashBills.map(bill => (
                  <div key={bill.id} className={styles.trashCard}>
                    <div className={styles.trashInfo}>
                      <div className={styles.trashName}>{bill.patientName}</div>
                      <div className={styles.trashMeta}>{bill.billNumber} • {new Date(bill.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className={styles.trashActions}>
                      <button className={styles.restoreBtn} onClick={() => restoreBill(bill.id)}>Restore</button>
                      <button className={styles.permDeleteBtn} onClick={() => permanentDelete(bill.id)}>Delete Permanently</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <div className={styles.profileContainer}>
            {profileLoading && !profile ? (
              <div className={styles.empty}>Loading profile...</div>
            ) : (
              <div className={styles.profileCard}>
                <div className={styles.profileHeader}>
                  <div className={styles.profileAvatarLarge}>{profile?.fullName?.charAt(0)}</div>
                  <div className={styles.profileTitle}>
                    <h3>{profile?.fullName || 'No Name Set'}</h3>
                    <div className={styles.profileContactInfo}>
                      <span className={styles.profilePhone}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {profile?.phoneNumber || 'No phone set'}
                      </span>
                      <span className={styles.profileRoleBadge}>{profile?.role}</span>
                    </div>
                  </div>
                </div>

                <form className={styles.profileForm} onSubmit={handleUpdateProfile}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        value={profileForm.fullName}
                        onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                        required
                        placeholder="e.g. Dr. John Doe"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Phone Number</label>
                      <input 
                        type="tel" 
                        value={profileForm.phoneNumber}
                        onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                        placeholder="e.g. +1 555-0123"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Username (System ID)</label>
                      <input type="text" value={profile?.username} disabled title="Username cannot be changed" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>New Password (Optional)</label>
                      <input 
                        type="password" 
                        placeholder="Leave blank to keep current"
                        value={profileForm.newPassword}
                        onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})}
                      />
                    </div>
                  </div>

                  {updateMsg.text && (
                    <div className={updateMsg.type === 'success' ? styles.successMsg : styles.errorMsg}>
                      {updateMsg.text === 'Profile updated successfully!' ? (
                        <div className={styles.successContent}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Changes saved to database
                        </div>
                      ) : updateMsg.text}
                    </div>
                  )}

                  <button type="submit" className={styles.saveProfileBtn} disabled={profileLoading}>
                    {profileLoading ? 'Syncing Changes...' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <NewVisitModal
          onClose={() => setShowModal(false)}
          onCreated={(bill) => {
            setShowModal(false)
            fetchBills()
            // If doctor clicked "Add Charges Now", open AddChargeModal immediately
            if (bill) setSelectedBill(bill)
          }}
        />
      )}

      {selectedBill && (
        <AddChargeModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onAdded={() => { setSelectedBill(null); fetchBills() }}
        />
      )}

      {viewBill && (
        <VisitDetailsModal
          bill={viewBill}
          onClose={() => setViewBill(null)}
          onUpdated={fetchBills}
        />
      )}
    </div>
  )
}

function ActiveVisitCard({ bill, onAddCharge, onView, onDelete }) {
  const initials = bill.patientName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={styles.visitCard}>
      <div className={styles.visitCardHeader}>
        <div className={styles.patientAvatar}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div className={styles.patientName}>{bill.patientName}</div>
          <span className={styles.inProgressBadge}>In Progress</span>
        </div>
        <button className={styles.deleteIconBtn} onClick={onDelete} title="Delete Visit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
      <div className={styles.visitMeta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Visit #</span>
          <span className={styles.metaValue}>{bill.billNumber}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Visit Date</span>
          <span className={styles.metaValue}>{new Date(bill.createdAt).toLocaleDateString()}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Patient ID</span>
          <span className={styles.metaValue}>P{String(bill.patientId ?? bill.id).padStart(4, '0')}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Items Added</span>
          <span className={styles.metaValue}>{bill.items?.length ?? 0} services</span>
        </div>
      </div>
      <div className={styles.actionBtns}>
        <button className={styles.viewBtn} onClick={onView}>View Details / PDF</button>
        <button className={styles.addChargesBtn} onClick={onAddCharge}>+ Add Charges</button>
      </div>
    </div>
  )
}

function CompletedRow({ bill, onView }) {
  const time = new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={styles.completedRow}>
      <span className={styles.completedTime}>{time}</span>
      <span className={styles.completedName}>{bill.patientName}</span>
      <span className={styles.completedVisit}>{bill.billNumber}</span>
      <span className={styles.statusClosed}>{bill.status}</span>
      <button className={styles.viewBtnText} onClick={onView}>View PDF</button>
    </div>
  )
}
