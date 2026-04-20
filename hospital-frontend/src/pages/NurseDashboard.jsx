import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import styles from './NurseDashboard.module.css'

const NURSING_CATEGORIES = new Set(['NursingService', 'BedCharge', 'Consumable'])

export default function NurseDashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState('queue')
  const [bills, setBills] = useState([])
  const [searchBill, setSearchBill] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [editState, setEditState] = useState({})

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
    return (bill.items || []).filter(i => NURSING_CATEGORIES.has(i.category) && i.addedByRole === 'Doctor')
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
    return bills
      .flatMap(bill =>
        getNursingOrders(bill)
          .filter(i => i.isCompleted && i.completedAt && new Date(i.completedAt).toDateString() === today)
          .map(i => ({
            id: i.id,
            patientName: bill.patientName,
            billNumber: bill.billNumber,
            description: i.description,
            completedAt: i.completedAt
          }))
      )
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
  }, [bills])

  async function completeOrder(itemId) {
    const draft = editState[itemId] || {}
    const quantity = Number(draft.quantity || 1)
    const notes = draft.notes || null

    setSavingId(itemId)
    try {
      await api.patch(`/bills/items/${itemId}/nursing-complete`, { quantity, notes })
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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
          <span>NursePortal</span>
        </div>
        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${tab === 'queue' ? styles.active : ''}`} onClick={() => setTab('queue')}>
            Work Queue
          </button>
          <button className={`${styles.navItem} ${tab === 'timeline' ? styles.active : ''}`} onClick={() => setTab('timeline')}>
            Completed Timeline
          </button>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h2 className={styles.moduleTitle}>Nursing Care Dashboard</h2>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'N'}</div>
            <div>
              <div className={styles.userName}>{user?.name ?? 'Nurse'}</div>
              <div className={styles.userRole}>Clinical Execution</div>
            </div>
          </div>
        </header>

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
          <input
            placeholder="Search by Bill Number..."
            value={searchBill}
            onChange={e => setSearchBill(e.target.value)}
          />
          <button onClick={fetchNursingOrders}>Refresh</button>
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
      </main>
    </div>
  )
}
