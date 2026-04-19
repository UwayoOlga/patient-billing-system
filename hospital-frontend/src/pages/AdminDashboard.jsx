import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../utils/auth'
import api from '../utils/api'
import styles from './AdminDashboard.module.css'

const ROLE_MAP = {
  0: 'Doctor',
  1: 'LabTech',
  2: 'Pharmacist',
  3: 'Nurse',
  4: 'Cashier',
  5: 'Admin'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [view, setView] = useState('Staff') // 'Staff' | 'Activity' | 'Pricing' | 'Finances'
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  
  // Service Categories State
  const [categories, setCategories] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', basePrice: 0, description: '', isActive: true, responsibleRole: 0 })

  // Activity State
  const [stats, setStats] = useState({ totalRevenue: 0, todaysBills: 0, totalPatients: 0, pendingDisputes: 0 })
  const [logs, setLogs] = useState([])

  // Finance State
  const [ledger, setLedger] = useState([])
  const [debts, setDebts] = useState([])
  const [financeSummary, setFinanceSummary] = useState({ totalRevenue: 0, todayRevenue: 0, departmentRevenue: [] })

  const [formData, setFormData] = useState({ fullName: '', email: '', phoneNumber: '', password: '', role: 0 })

  useEffect(() => {
    if (view === 'Staff') fetchStaff()
    if (view === 'Pricing') fetchCategories()
    if (view === 'Activity') fetchActivity()
    if (view === 'Finances') fetchFinanceData()
  }, [view])

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
    setCategoryForm({ name: c.name, basePrice: c.basePrice, description: c.description || '', isActive: c.isActive, responsibleRole: c.responsibleRole })
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

  return (
    <div className={styles.adminPage}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          System Admin
        </div>
        <nav className={styles.nav}>
          <div className={`${styles.navItem} ${view === 'Staff' ? styles.activeNavItem : ''}`} onClick={() => setView('Staff')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Manage Staff
          </div>
          <div className={`${styles.navItem} ${view === 'Activity' ? styles.activeNavItem : ''}`} onClick={() => setView('Activity')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            System Activity
          </div>
          <div className={`${styles.navItem} ${view === 'Pricing' ? styles.activeNavItem : ''}`} onClick={() => setView('Pricing')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Billing Config
          </div>
          <div className={`${styles.navItem} ${view === 'Finances' ? styles.activeNavItem : ''}`} onClick={() => setView('Finances')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            Finances
          </div>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h2>{view === 'Staff' ? 'Staff Directory' : view}</h2>
          {view === 'Staff' && (
            <button className={styles.primaryBtn} onClick={() => setShowAddModal(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Staff Member
            </button>
          )}
        </div>

        {view === 'Staff' && (
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
                        <span className={`${styles.roleBadge} ${s.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={styles.tableActions}>
                        <button className={styles.editBtn} onClick={() => openEdit(s)}>
                          Edit
                        </button>
                        <button className={`${styles.editBtn} ${s.isActive ? styles.textRed : styles.textGreen}`} onClick={() => toggleStaffStatus(s)}>
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

        {view === 'Activity' && (
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

        {view === 'Pricing' && (
          <>
            <div className={styles.header}>
              <h2>Service Categories & Pricing</h2>
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
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td style={{fontWeight: 700}}>{c.name}</td>
                      <td>
                        <span className={styles.roleBadge} style={{background: '#f1f5f9'}}>
                          {ROLE_MAP[c.responsibleRole]}
                        </span>
                      </td>
                      <td style={{color: '#2563eb', fontWeight: 600}}>
                        {c.basePrice.toLocaleString()}
                      </td>
                      <td>{c.description || '--'}</td>
                      <td>
                        <span className={`${styles.roleBadge} ${c.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
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
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'40px', color:'#64748b'}}>No categories defined. Add one to start setting prices.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        {view === 'Finances' && (
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
                <div className={styles.statValue}>RWF {debts.reduce((acc, d) => acc + (d.TotalAmount - d.TotalPaid), 0).toLocaleString()}</div>
              </div>
            </div>

            <div className={styles.financeGrid}>
              <div className={styles.contentCard}>
                <div className={styles.cardHeader}><h3>Global Payment Ledger</h3></div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Confirmed By</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(p => (
                      <tr key={p.id}>
                        <td>{p.patientName}</td>
                        <td style={{fontWeight: 700, color: '#16a34a'}}>+{p.Amount.toLocaleString()}</td>
                        <td>{p.method}</td>
                        <td>{p.confirmedBy}</td>
                        <td>{new Date(p.paidAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.contentCard}>
                <div className={styles.cardHeader}><h3>Outstanding Debts</h3></div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Patient / Bill</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map(d => (
                      <tr key={d.id}>
                        <td>{d.patientName} <br/><small>{d.billNumber}</small></td>
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
            <h3>{editingCategory ? 'Edit Service Category' : 'Add New Category'}</h3>
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
                <label>Description (Optional)</label>
                <textarea 
                  className={styles.textarea}
                  value={categoryForm.description} 
                  onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} 
                  placeholder="Details about this service category..."
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input type="checkbox" checked={categoryForm.isActive} onChange={e => setCategoryForm({...categoryForm, isActive: e.target.checked})} />
                  &nbsp; Category is Active
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
