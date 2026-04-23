import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './AdminDashboard.module.css'
import ProfileTab from '../components/ProfileTab'
import ReportsTab from './ReportsTab'
import logo from '../assets/logo.jpg'

const ROLE_MAP = {
  0: 'Doctor',
  1: 'LabTech',
  2: 'Pharmacist',
  3: 'Nurse',
  4: 'Cashier',
  5: 'Admin',
  6: 'Receptionist'
}

export default function AdminDashboard() {
  const [user, setUserState] = useState(getUser())
  const navigate = useNavigate()

  useEffect(() => {
    const handleStorage = () => setUserState(getUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const [activeTab, setActiveTab] = useState('staff') // Consistent state naming
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Service Categories State
  const [categories, setCategories] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', basePrice: 0, description: '', isActive: true, responsibleRole: 0 })
  const [disputes, setDisputes] = useState([])

  // Activity State
  const [stats, setStats] = useState({ totalRevenue: 0, todaysBills: 0, totalPatients: 0, pendingDisputes: 0 })
  const [logs, setLogs] = useState([])

  // Finance State
  const [ledger, setLedger] = useState([])
  const [debts, setDebts] = useState([])
  const [financeSummary, setFinanceSummary] = useState({ totalRevenue: 0, todayRevenue: 0, departmentRevenue: [] })

  const [formData, setFormData] = useState({ fullName: '', email: '', phoneNumber: '', password: '', role: 0 })

  useEffect(() => {
    if (activeTab === 'staff') fetchStaff()
    if (activeTab === 'pricing') fetchCategories()
    if (activeTab === 'activity') fetchActivity()
    if (activeTab === 'finances') fetchFinanceData()
    if (activeTab === 'disputes') fetchDisputes()
  }, [activeTab])

  async function fetchStaff() {
    setLoading(true)
    try {
      const { data } = await api.get('/staff')
      setStaffList(data)
    } catch (err) {
      console.error('Failed to fetch staff', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, {
          ...formData,
          role: Number(formData.role)
        })
      } else {
        await api.post('/auth/register', {
          ...formData,
          role: Number(formData.role)
        })
      }
      closeModal()
      fetchStaff()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Action failed')
    }
  }

  function openEdit(staff) {
    setEditingStaff(staff)
    setFormData({
      fullName: staff.fullName,
      email: staff.email,
      phoneNumber: staff.phoneNumber || '',
      password: '', // blank unless changing
      role: staff.role
    })
    setShowAddModal(true)
  }

  function closeModal() {
    setShowAddModal(false)
    setEditingStaff(null)
    setFormData({ fullName: '', email: '', phoneNumber: '', password: '', role: 0 })
  }

  async function toggleStaffStatus(staff) {
    if (!window.confirm(`Are you sure you want to ${staff.isActive ? 'deactivate' : 'activate'} ${staff.fullName}?`)) return
    try {
      await api.patch(`/staff/${staff.id}/status`, { isActive: !staff.isActive })
      fetchStaff()
    } catch (err) {
      alert('Failed to update status')
    }
  }

  async function handlePermanentDelete(staff) {
    if (!window.confirm(`PERMANENT DELETE: Are you sure you want to completely remove ${staff.fullName}? This cannot be undone.`)) return
    try {
      await api.delete(`/staff/${staff.id}`)
      fetchStaff()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Delete failed')
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  // --- SERVICE CATEGORY LOGIC ---
  async function fetchCategories() {
    setLoading(true)
    try {
      const { data } = await api.get('/servicecategory')
      setCategories(data)
    } finally { setLoading(false) }
  }

  async function fetchDisputes() {
    setLoading(true)
    try {
      const { data } = await api.get('/dispute')
      setDisputes(data)
    } finally { setLoading(false) }
  }

  async function resolveDispute(id, approve) {
    const notes = window.prompt(`Resolution Notes (${approve ? 'Approval' : 'Rejection'}):`)
    if (notes === null) return
    try {
      await api.patch(`/dispute/resolve/${id}`, { approve, notes })
      fetchDisputes()
    } catch { alert('Failed to resolve dispute') }
  }

  async function handleCategorySubmit(e) {
    e.preventDefault()
    try {
      if (editingCategory) {
        await api.put(`/servicecategory/${editingCategory.id}`, categoryForm)
      } else {
        await api.post('/servicecategory', categoryForm)
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
      fetchCategories()
    } catch (err) { alert('Failed to save category') }
  }

  function openEditCategory(c) {
    setEditingCategory(c)
    setCategoryForm({ 
      name: c.name, 
      basePrice: c.basePrice, 
      description: c.description || '', 
      isActive: c.isActive, 
      responsibleRole: c.responsibleRole,
      stockQuantity: c.stockQuantity
    })
    setShowCategoryModal(true)
  }

  async function deleteCategory(id) {
    if (!window.confirm('Are you sure? This will remove this category and its price from the system.')) return
    try {
      await api.delete(`/servicecategory/${id}`)
      fetchCategories()
    } catch (err) { alert('Failed to delete category') }
  }

  // --- FINANCE LOGIC ---
  async function fetchFinanceData() {
    setLoading(true)
    try {
      const [respLedger, respDebts, respSum] = await Promise.all([
        api.get('/adminfinance/ledger'),
        api.get('/adminfinance/debts'),
        api.get('/adminfinance/summary')
      ])
      setLedger(respLedger.data)
      setDebts(respDebts.data)
      setFinanceSummary(respSum.data)
    } finally { setLoading(false) }
  }

  // --- ACTIVITY LOGIC ---
  async function fetchActivity() {
    setLoading(true)
    try {
      const respStats = await api.get('/systemactivity/overview')
      const respLogs = await api.get('/systemactivity/logs')
      setStats(respStats.data)
      setLogs(respLogs.data)
    } finally { setLoading(false) }
  }

  const navItems = [
    { key: 'staff', label: 'Manage Staff', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { key: 'activity', label: 'System Activity', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
    { key: 'pricing', label: 'Billing Config', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
    { key: 'finances', label: 'Finances', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> },
    { key: 'disputes', label: 'Disputes', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> },
    { key: 'reports', label: 'Insights', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg> },
    { key: 'profile', label: 'My Profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ]

  return (
    <div className={styles.adminPage}>
      {/* Mobile Menu Trigger */}
      <button className={styles.mobileMenuToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {mobileMenuOpen && <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <img src={logo} alt="Hospital Logo" className={styles.logoImage} style={{ height: '32px', borderRadius: '4px' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#fff', letterSpacing: '0.05em', margin: 0 }}>HOSPITALBILLING</h2>
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.moduleTitle}>
              Welcome, {user?.name || 'Admin'}
            </h2>
          </div>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) || 'A'}</div>
            <div>
              <div className={styles.userName}>{user?.name || 'Admin'}</div>
              <div className={styles.userRole}>System Control</div>
            </div>
            <span className={styles.activeBadge}>Active</span>
          </div>
        </header>

        {activeTab === 'profile' ? <ProfileTab /> : activeTab === 'reports' ? <ReportsTab /> : (
          <>
            <div className={styles.subHeader}>
              <h3 className={styles.viewTitle}>
                {activeTab === 'staff' ? 'Staff Directory' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h3>
              {activeTab === 'staff' && (
                <button className={styles.primaryBtn} onClick={() => setShowAddModal(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Add Staff Member
                </button>
              )}
            </div>

        {activeTab === 'staff' && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Staff</div>
                <div className={styles.statValue}>{staffList.length}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Active Staff</div>
                <div className={styles.statValue}>{staffList.filter(s => s.isActive).length}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>On Medical Duty</div>
                <div className={styles.statValue}>{staffList.filter(s => s.isActive && s.role !== 5).length}</div>
              </div>
            </div>

            <div className={styles.contentCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email / Login</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s.id}>
                      <td style={{fontWeight: 600}}>{s.fullName}</td>
                      <td>{s.email}</td>
                      <td>{ROLE_MAP[s.role] || 'Unknown'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${s.isActive ? styles.activeStatus : styles.inactiveStatus}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={styles.tableActions}>
                        <button className={styles.editBtn} onClick={() => openEdit(s)}>
                          Edit
                        </button>
                        <button className={`${styles.statusToggleBtn} ${s.isActive ? styles.textRed : styles.textGreen}`} onClick={() => toggleStaffStatus(s)}>
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handlePermanentDelete(s)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loading && <tr><td colSpan="5" style={{textAlign: 'center', padding: '40px'}}>Loading staff...</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Revenue</div>
                <div className={styles.statValue}>RWF {stats.totalRevenue.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Today's Visits</div>
                <div className={styles.statValue}>{stats.todaysBills}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Patients</div>
                <div className={styles.statValue}>{stats.totalPatients}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Open Disputes</div>
                <div className={styles.statValue}>{stats.pendingDisputes}</div>
              </div>
            </div>

            <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                <h3>Live Operation Logs</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Detail</th>
                    <th>Staff Member</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i}>
                      <td><span className={styles.typeBadge}>{l.type}</span></td>
                      <td>{l.description}</td>
                      <td>{l.user}</td>
                      <td>{new Date(l.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'pricing' && (
          <>
            <div className={styles.subHeader}>
              <h3 className={styles.viewTitle}>Service Categories & Pricing</h3>
              <button className={styles.primaryBtn} onClick={() => { setEditingCategory(null); setCategoryForm({name:'', basePrice:0, description:'', isActive:true}); setShowCategoryModal(true); }}>
                Add New Category
              </button>
            </div>
            <div className={styles.contentCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Responsible Role</th>
                    <th>Base Price (RWF)</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td style={{fontWeight: 700}}>{c.name}</td>
                      <td>
                        <span className={styles.roleBadge} style={{background: '#f1f5f9', color: '#475569'}}>
                          {ROLE_MAP[c.responsibleRole]}
                        </span>
                      </td>
                      <td style={{color: '#2563eb', fontWeight: 600}}>
                        {c.basePrice.toLocaleString()}
                      </td>
                      <td>
                        {c.stockQuantity !== null ? (
                          <span style={{ 
                            fontWeight: 700, 
                            color: c.stockQuantity < 10 ? '#dc2626' : '#166534' 
                          }}>
                            {c.stockQuantity} {c.stockQuantity < 10 && '⚠️'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>N/A</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${c.isActive ? styles.activeStatus : styles.inactiveStatus}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={styles.tableActions}>
                        <button className={styles.editBtn} onClick={() => openEditCategory(c)}>Edit</button>
                        <button className={styles.deleteBtn} onClick={() => deleteCategory(c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {!loading && categories.length === 0 && (
                    <tr><td colSpan="6" style={{textAlign:'center', padding:'40px', color:'#64748b'}}>No categories defined. Add one to start setting prices.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'finances' && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Capitalized</div>
                <div className={styles.statValue}>RWF {financeSummary.totalRevenue.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Income Today</div>
                <div className={styles.statValue}>RWF {financeSummary.todayRevenue.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Active Receivables</div>
                <div className={styles.statValue}>RWF {debts.reduce((acc, d) => acc + (d.totalAmount - d.totalPaid), 0).toLocaleString()}</div>
              </div>
            </div>

            <div className={styles.financeGrid}>
              <div className={styles.contentCard}>
                <div className={styles.cardHeader}><h3>Global Payment Ledger</h3></div>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Patient</th><th>Amount</th><th>Method</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {ledger.map(p => (
                      <tr key={p.id}>
                        <td>{p.patientName}</td>
                        <td style={{fontWeight: 700, color: '#16a34a'}}>+{p.Amount?.toLocaleString() ?? p.amount?.toLocaleString()}</td>
                        <td>{p.method}</td>
                        <td>{new Date(p.paidAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.contentCard}>
                <div className={styles.cardHeader}><h3>Outstanding Patient Debts</h3></div>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {debts.map(d => (
                      <tr key={d.id}>
                        <td>{d.patientName}</td>
                        <td>{d.totalAmount.toLocaleString()}</td>
                        <td>{d.totalPaid.toLocaleString()}</td>
                        <td style={{fontWeight: 700, color: '#dc2626'}}>{(d.totalAmount - d.totalPaid).toLocaleString()} RWF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'disputes' && (
          <>
            <div className={styles.contentCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date Raised</th>
                    <th>Patient/Bill</th>
                    <th>Challenged Item</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map(d => (
                    <tr key={d.id}>
                      <td>{new Date(d.raisedAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{fontWeight: 700}}>{d.bill?.patientName || 'Unknown'}</div>
                        <div style={{fontSize: '12px', color: '#64748b'}}>{d.bill?.billNumber}</div>
                      </td>
                      <td>
                        <div style={{fontWeight: 600}}>{d.billItem?.description}</div>
                        <div style={{fontSize: '11px', color: '#64748b'}}>{d.billItem?.category}</div>
                      </td>
                      <td style={{fontSize: '13px', fontStyle: 'italic', color: '#475569'}}>{d.reason}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${d.status === 0 ? styles.reviewStatus : d.status === 1 ? styles.activeStatus : styles.inactiveStatus}`}>
                          {d.status === 0 ? 'Reviewing' : d.status === 1 ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td className={styles.tableActions}>
                        {d.status === 0 && (
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button className={styles.inlineResolveBtn} onClick={() => resolveDispute(d.id, true)}>Approve</button>
                            <button className={styles.inlineRejectBtn} onClick={() => resolveDispute(d.id, false)}>Reject</button>
                          </div>
                        )}
                        {d.status !== 0 && (
                          <div style={{fontSize: '12px', color: '#64748b'}}>Resolved: {new Date(d.resolvedAt).toLocaleDateString()}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
          </>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>{editingStaff ? 'Edit Staff Member' : 'Add New System Staff'}</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="e.g. Jean Damascene" />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="staff@hospital.rw" />
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <input value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder="+250..." />
              </div>
              <div className={styles.formGroup}>
                <label>{editingStaff ? 'New Password (leave blank to keep current)' : 'Temporary Password'}</label>
                <input required={!editingStaff} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Set password" />
              </div>
              <div className={styles.formGroup}>
                <label>Assigned Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  {Object.entries(ROLE_MAP).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>{editingStaff ? 'Save Changes' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Category Modal */}
      {showCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>{editingCategory ? 'Edit Service Category' : 'Register New Service'}</h3>
            <form onSubmit={handleCategorySubmit}>
              <div className={styles.formGroup}>
                <label>Category Name</label>
                <input required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} placeholder="e.g. General Consultation" />
              </div>
              <div className={styles.formGroup}>
                <label>Responsible Staff Role</label>
                <select value={categoryForm.responsibleRole} onChange={e => setCategoryForm({...categoryForm, responsibleRole: Number(e.target.value)})}>
                  {Object.entries(ROLE_MAP).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Base Price (RWF)</label>
                <input type="number" required value={categoryForm.basePrice} onChange={e => setCategoryForm({...categoryForm, basePrice: Number(e.target.value)})} />
              </div>
              <div className={styles.formGroup}>
                <label>Stock Quantity (Optional)</label>
                <input 
                  type="number" 
                  value={categoryForm.stockQuantity ?? ''} 
                  onChange={e => setCategoryForm({...categoryForm, stockQuantity: e.target.value === '' ? null : Number(e.target.value)})}
                  placeholder="For Medications/Consumables"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea 
                  className={styles.textarea}
                  value={categoryForm.description} 
                  onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} 
                  placeholder="Details about this service..."
                />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={categoryForm.isActive} onChange={e => setCategoryForm({...categoryForm, isActive: e.target.checked})} />
                  Category is Active
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
