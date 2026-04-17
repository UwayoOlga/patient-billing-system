import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../../utils/auth'
import api from '../../utils/api'
import NewVisitModal from './NewVisitModal'
import styles from './DoctorDashboard.module.css'

export default function DoctorDashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBills() }, [])

  async function fetchBills() {
    try {
      let endpoint = '/bills'
      if (user?.role === 'Doctor') {
        endpoint = '/bills/doctor'
      }
      const { data } = await api.get(endpoint)
      setBills(data)
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const activeVisits = bills.filter(b => b.status === 'Open')
  const completedToday = bills.filter(b => {
    const today = new Date().toDateString()
    return b.status !== 'Open' && new Date(b.createdAt).toDateString() === today
  })

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span>🏥</span>
          <span>HospitalBilling</span>
        </div>
        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${styles.active}`}>
            <span>📋</span> Dashboard
          </a>
          <a className={styles.navItem}>
            <span>👤</span> Patients
          </a>
          <a className={styles.navItem}>
            <span>🩺</span> Visits
          </a>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h2 className={styles.moduleTitle}>Doctor Module</h2>
          </div>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.name?.charAt(0) ?? 'D'}
            </div>
            <div>
              <div className={styles.userName}>Dr. {user?.name ?? 'Doctor'}</div>
              <div className={styles.userRole}>Cardiology</div>
            </div>
            <span className={styles.activeBadge}>Active</span>
          </div>
        </header>

        {/* Stats */}
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
            <div className={styles.statLabel}>Total Patients</div>
            <div className={styles.statValue}>{bills.length}</div>
          </div>
        </div>

        {/* New Visit CTA */}
        <div className={styles.newVisitCard}>
          <div className={styles.newVisitIcon}>➕</div>
          <div>
            <div className={styles.newVisitTitle}>Start New Patient Visit</div>
            <div className={styles.newVisitSub}>Register a new patient and begin consultation</div>
          </div>
          <button className={styles.newVisitBtn} onClick={() => setShowModal(true)}>
            New Visit
          </button>
        </div>

        {/* Active Visits */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Today's Active Visits</h3>
          {loading ? (
            <div className={styles.empty}>Loading...</div>
          ) : activeVisits.length === 0 ? (
            <div className={styles.empty}>No active visits right now.</div>
          ) : (
            <div className={styles.visitGrid}>
              {activeVisits.map(bill => (
                <ActiveVisitCard key={bill.id} bill={bill} onRefresh={fetchBills} />
              ))}
            </div>
          )}
        </section>

        {/* Completed Today */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Completed Today</h3>
          {completedToday.length === 0 ? (
            <div className={styles.empty}>No completed visits today.</div>
          ) : (
            <div className={styles.completedList}>
              {completedToday.map(bill => (
                <CompletedRow key={bill.id} bill={bill} />
              ))}
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <NewVisitModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchBills() }}
        />
      )}
    </div>
  )
}

function ActiveVisitCard({ bill }) {
  const initials = bill.patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={styles.visitCard}>
      <div className={styles.visitCardHeader}>
        <div className={styles.patientAvatar}>{initials}</div>
        <div>
          <div className={styles.patientName}>{bill.patientName}</div>
          <span className={styles.inProgressBadge}>In Progress</span>
        </div>
      </div>
      <div className={styles.visitMeta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Visit #</span>
          <span className={styles.metaValue}>{bill.billNumber}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Visit Date</span>
          <span className={styles.metaValue}>
            {new Date(bill.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Patient ID</span>
          <span className={styles.metaValue}>P{String(bill.id).padStart(3, '0')}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Items Added</span>
          <span className={styles.metaValue}>{bill.items?.length ?? 0} services</span>
        </div>
      </div>
      <button className={styles.addChargesBtn}>+ Add Charges</button>
    </div>
  )
}

function CompletedRow({ bill }) {
  const time = new Date(bill.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className={styles.completedRow}>
      <span className={styles.completedTime}>{time}</span>
      <span className={styles.completedName}>{bill.patientName}</span>
      <span className={styles.completedVisit}>{bill.billNumber}</span>
    </div>
  )
}
