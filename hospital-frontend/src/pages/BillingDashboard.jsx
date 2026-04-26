import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import api from '../utils/api'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts'
import styles from './BillingDashboard.module.css'
import ProfileTab from '../components/ProfileTab'
import logo from '../assets/logo.jpg'
import PaymentProcessingModal from '../components/PaymentProcessingModal'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function BillingDashboard() {
  const [user, setUserState] = useState(getUser())
  const navigate = useNavigate()

  useEffect(() => {
    const handleStorage = () => setUserState(getUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('dashboard') // Match other dashboards
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [bills, setBills] = useState([])
  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [disputeFilter, setDisputeFilter] = useState('open')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [dashboardData, setDashboardData] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalOutstanding: 0,
    revenueChart: [],
    paymentMethodChart: [],
    dailyTrends: [],
    topPatients: []
  })
  const [cashierReport, setCashierReport] = useState({
    totalCollected: 0,
    totalTransactions: 0,
    averageTransactionAmount: 0,
    paymentMethodSummary: [],
    transactions: []
  })
  const [reportRange, setReportRange] = useState(() => {
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    return {
      start: toDateTimeLocal(dayStart),
      end: toDateTimeLocal(now)
    }
  })


  useEffect(() => { 
    fetchBills()
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchCashierReport()
    }
    if (activeTab === 'disputes') {
      fetchDisputes(disputeFilter === 'open')
    }
  }, [activeTab, disputeFilter])

  async function fetchDashboardData() {
    try {
      const [paymentsRes, trendsRes] = await Promise.all([
        api.get('/payment/reports/cashier'),
        api.get('/adminfinance/trends')
      ])

      const payments = paymentsRes.data
      const trends = trendsRes.data

      // Calculate dashboard metrics
      const today = new Date().toDateString()
      const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const todayRevenue = payments.transactions?.filter(t => 
        new Date(t.paidAt).toDateString() === today
      ).reduce((sum, t) => sum + t.amount, 0) || 0

      const weekRevenue = payments.transactions?.filter(t => 
        new Date(t.paidAt) >= thisWeek
      ).reduce((sum, t) => sum + t.amount, 0) || 0

      const monthRevenue = payments.transactions?.filter(t => 
        new Date(t.paidAt) >= thisMonth
      ).reduce((sum, t) => sum + t.amount, 0) || 0

      // Payment method breakdown
      const paymentMethodChart = payments.paymentMethodSummary?.map(method => ({
        name: method.method,
        value: method.amount,
        count: method.count
      })) || []

      // Daily trends for chart
      const dailyTrends = trends?.map(trend => ({
        date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: trend.amount
      })) || []

      setDashboardData({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        totalOutstanding: 0, // Will be calculated from bills
        revenueChart: paymentMethodChart,
        paymentMethodChart,
        dailyTrends,
        topPatients: []
      })
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
    }
  }

  async function fetchBills() {
    setLoading(true)
    try {
      const { data } = await api.get('/bills')
      // Enhanced payment status logic - only show "Paid" when actually fully paid
      const processedBills = data.map(bill => {
        let displayStatus = bill.status;
        
        // Only mark as "Paid" if balance is zero or negative AND there are confirmed payments
        if (bill.balanceDue <= 0 && bill.totalPaid > 0) {
          displayStatus = 'Paid';
        } 
        // Show "Partial" if there are payments but still balance remaining
        else if (bill.totalPaid > 0 && bill.balanceDue > 0) {
          displayStatus = 'Partial';
        }
        // Keep original status for Open, Finalized, etc.
        
        return { ...bill, status: displayStatus };
      })
      setBills(processedBills)
      
      // Update total outstanding - only count bills that aren't fully paid
      const totalOutstanding = processedBills.reduce((acc, b) => 
        acc + (b.status !== 'Paid' ? Math.max(0, b.balanceDue) : 0), 0
      )
      setDashboardData(prev => ({ ...prev, totalOutstanding }))
    } catch (err) {
      console.error('Failed to fetch bills', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCashierReport() {
    setReportLoading(true)
    setReportError('')
    try {
      const params = {}
      if (reportRange.start) params.startDate = new Date(reportRange.start).toISOString()
      if (reportRange.end) params.endDate = new Date(reportRange.end).toISOString()

      const { data } = await api.get('/payment/reports/cashier', { params })
      setCashierReport({
        totalCollected: data.totalCollected ?? 0,
        totalTransactions: data.totalTransactions ?? 0,
        averageTransactionAmount: data.averageTransactionAmount ?? 0,
        paymentMethodSummary: data.paymentMethodSummary ?? [],
        transactions: data.transactions ?? []
      })
    } catch (err) {
      console.error('Failed to generate cashier report', err)
      const message = err?.response?.data?.message || 'Failed to generate report for selected time range.'
      setReportError(message)
      setCashierReport({
        totalCollected: 0,
        totalTransactions: 0,
        averageTransactionAmount: 0,
        paymentMethodSummary: [],
        transactions: []
      })
    } finally {
      setReportLoading(false)
    }
  }

  async function fetchDisputes(openOnly = true) {
    setDisputesLoading(true)
    try {
      const { data } = await api.get('/disputes', { params: { openOnly } })
      setDisputes(data ?? [])
    } catch (err) {
      console.error('Failed to fetch disputes', err)
      setDisputes([])
    } finally {
      setDisputesLoading(false)
    }
  }

  async function handleResolveDispute(disputeId, approve) {
    const resolutionNotes = window.prompt(approve ? 'Resolution notes (optional):' : 'Rejection reason (optional):') ?? ''
    try {
      await api.patch(`/dispute/resolve/${disputeId}`, {
        approve: approve,
        notes: resolutionNotes
      })
      await fetchDisputes(disputeFilter === 'open')
    } catch (err) {
      console.error('Failed to update dispute', err)
      alert(err?.response?.data?.message || 'Failed to update dispute.')
    }
  }

  function downloadCashierPdfReport() {
    const doc = new jsPDF()
    const rangeLabel = `${reportRange.start || 'Beginning'} to ${reportRange.end || 'Now'}`

    doc.setFontSize(18)
    doc.text('Cashier Collection Report', 14, 18)
    doc.setFontSize(11)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26)
    doc.text(`Range: ${rangeLabel}`, 14, 32)
    doc.text(`Total Collected: RWF ${cashierReport.totalCollected.toLocaleString()}`, 14, 38)
    doc.text(`Transactions: ${cashierReport.totalTransactions}`, 14, 44)

    const tableRows = cashierReport.transactions.map(t => [
      new Date(t.paidAt).toLocaleString(),
      t.billNumber,
      t.patientName,
      t.method,
      t.reference || 'N/A',
      t.confirmedBy,
      `RWF ${Number(t.amount || 0).toLocaleString()}`
    ])

    autoTable(doc, {
      startY: 52,
      head: [['Paid At', 'Bill #', 'Patient', 'Method', 'Reference', 'Confirmed By', 'Amount']],
      body: tableRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] }
    })

    const filename = `Cashier_Report_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const filteredBills = bills.filter(b => {
    const matchesFilter = filter === 'All' || b.status === filter
    const matchesSearch = b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         b.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Stats calculation
  const totalOutstanding = dashboardData.totalOutstanding
  const openCount = bills.filter(b => b.status === 'Open').length
  const finalizedCount = bills.filter(b => b.status === 'Finalized').length
  const paidCount = bills.filter(b => b.status === 'Paid').length

  const navItems = [
    {
      key: 'dashboard', label: 'Analytics',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
    },
    {
      key: 'bills', label: 'Bill Management',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    },
    {
      key: 'reports', label: 'Daily Reports',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
    },
    {
      key: 'disputes', label: 'Bill Disputes',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    },
    {
      key: 'profile', label: 'My Profile',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
  ]

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.moduleTitle}>
              Welcome, {user?.name ?? 'Billing Staff'}
            </h2>
          </div>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) ?? 'B'}</div>
            <div>
              <div className={styles.userName}>{user?.name ?? 'Billing Staff'}</div>
              <div className={styles.userRole}>Revenue Office</div>
            </div>
            <span className={styles.activeBadge}>Active</span>
          </div>
        </header>

        {activeTab === 'profile' ? <ProfileTab /> : activeTab === 'dashboard' && (
          <>
            {/* Enhanced Stats */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Today's Collection</div>
                <div className={styles.statValue} style={{ color: '#059669' }}>RWF {dashboardData.todayRevenue.toLocaleString()}</div>
                <div className={styles.statTrend} style={{ color: '#059669', fontSize: '12px', marginTop: '4px' }}>
                  +{Math.round((dashboardData.todayRevenue / Math.max(1, dashboardData.weekRevenue / 7)) * 100)}% vs avg
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Week Collection</div>
                <div className={styles.statValue} style={{ color: '#0ea5e9' }}>RWF {dashboardData.weekRevenue.toLocaleString()}</div>
                <div className={styles.statTrend} style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  Last 7 days
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Outstanding</div>
                <div className={styles.statValue} style={{ color: totalOutstanding > 0 ? '#dc2626' : '#059669' }}>
                  RWF {totalOutstanding.toLocaleString()}
                </div>
                <div className={styles.statTrend} style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  {bills.filter(b => b.status !== 'Paid').length} unpaid bills
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Collection Rate</div>
                <div className={styles.statValue} style={{ color: '#8b5cf6' }}>
                  {bills.length > 0 ? Math.round((paidCount / bills.length) * 100) : 0}%
                </div>
                <div className={styles.statTrend} style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  {paidCount} of {bills.length} bills
                </div>
              </div>
            </div>

            {/* Enhanced Analytics Grid */}
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  Revenue Trends (Last 7 Days)
                </h3>
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.dailyTrends}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value >= 1000 ? (value/1000) + 'k' : value}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                        formatter={(value) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
                        labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                  Payment Methods Distribution
                </h3>
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.paymentMethodChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dashboardData.paymentMethodChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                        formatter={(value, name) => [`RWF ${value.toLocaleString()}`, name]}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Additional Analytics Row */}
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Bill Status Overview
                </h3>
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Open', count: openCount, color: '#f59e0b' },
                      { name: 'Finalized', count: finalizedCount, color: '#0ea5e9' },
                      { name: 'Partial', count: bills.filter(b => b.status === 'Partial').length, color: '#f97316' },
                      { name: 'Paid', count: paidCount, color: '#10b981' }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                        formatter={(value, name) => [`${value} bills`, name]}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {[
                          { name: 'Open', count: openCount, color: '#f59e0b' },
                          { name: 'Finalized', count: finalizedCount, color: '#0ea5e9' },
                          { name: 'Partial', count: bills.filter(b => b.status === 'Partial').length, color: '#f97316' },
                          { name: 'Paid', count: paidCount, color: '#10b981' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Revenue vs Outstanding
                </h3>
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { 
                        name: 'This Week', 
                        collected: dashboardData.weekRevenue, 
                        outstanding: totalOutstanding 
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value >= 1000 ? (value/1000) + 'k' : value}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                        formatter={(value, name) => [`RWF ${value.toLocaleString()}`, name === 'collected' ? 'Collected' : 'Outstanding']}
                      />
                      <Legend />
                      <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outstanding" fill="#dc2626" name="Outstanding" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* List Control */}
            <div className={styles.listControl}>
              <div className={styles.searchSection}>
                <h3 className={styles.sectionTitle}>Hospital Revenue Records</h3>
                <div className={styles.searchBar}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input 
                    placeholder="Search by Bill ID or Patient Name..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.filterTabs}>
                {['All', 'Open', 'Finalized', 'Paid'].map(t => (
                  <div
                    key={t}
                    className={`${styles.filterTab} ${filter === t ? styles.active : ''}`}
                    onClick={() => setFilter(t)}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableCard}>
              {loading ? (
                <div className={styles.empty}>Loading hospital records...</div>
              ) : filteredBills.length === 0 ? (
                <div className={styles.empty}>No bills found matching your criteria.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Bill Number</th>
                      <th>Patient Name</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th className={styles.amount}>Total Amount</th>
                      <th className={styles.amount}>Paid</th>
                      <th className={styles.amount}>Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(bill => (
                      <tr key={bill.id}>
                        <td className={styles.billNum}>{bill.billNumber}</td>
                        <td className={styles.patientName}>{bill.patientName}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles['status-' + bill.status]}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                        <td className={styles.amount}>RWF {bill.totalAmount.toLocaleString()}</td>
                        <td className={styles.amount} style={{ color: bill.totalPaid > 0 ? '#059669' : '#64748b' }}>
                          RWF {bill.totalPaid.toLocaleString()}
                        </td>
                        <td className={styles.amount} style={{ color: bill.balanceDue > 0 ? '#dc2626' : '#059669' }}>
                          RWF {bill.balanceDue.toLocaleString()}
                        </td>
                        <td>
                          {(bill.status === 'Finalized' || (bill.status === 'Open' && bill.totalAmount > 0) || bill.status === 'Partial') ? (
                            <button 
                              className={styles.payBtn}
                              onClick={() => setSelectedBillId(bill.id)}
                            >
                              {bill.status === 'Partial' ? 'Complete Payment' : 'Process Payment'}
                            </button>
                          ) : bill.status === 'Paid' ? (
                            <span className={styles.completedTag}>Fully Paid</span>
                          ) : (
                            <span className={styles.pendingTag}>Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'reports' && (
          <div className={styles.reportsPage}>
            <div className={styles.reportsFilterRow}>
              <div className={styles.reportsField}>
                <label htmlFor="report-start">Start Time</label>
                <input
                  id="report-start"
                  type="datetime-local"
                  value={reportRange.start}
                  onChange={e => setReportRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className={styles.reportsField}>
                <label htmlFor="report-end">End Time</label>
                <input
                  id="report-end"
                  type="datetime-local"
                  value={reportRange.end}
                  onChange={e => setReportRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              <button
                className={styles.generateBtn}
                onClick={fetchCashierReport}
                disabled={reportLoading}
              >
                {reportLoading ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                className={styles.pdfBtn}
                onClick={downloadCashierPdfReport}
                disabled={cashierReport.transactions.length === 0}
              >
                Download PDF
              </button>
            </div>

            {reportError && <div className={styles.reportError}>{reportError}</div>}

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Collected</div>
                <div className={styles.statValue} style={{ color: '#059669' }}>
                  RWF {cashierReport.totalCollected.toLocaleString()}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Confirmed Transactions</div>
                <div className={styles.statValue}>{cashierReport.totalTransactions}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Average Transaction</div>
                <div className={styles.statValue}>
                  RWF {Math.round(cashierReport.averageTransactionAmount || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div className={styles.tableCard} style={{ padding: '24px' }}>
                <h3 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Revenue Breakdown by Payment Method</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cashierReport.paymentMethodSummary.map(method => (
                    <div key={method.method} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 600 }}>{method.method} ({method.count})</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>RWF {method.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {cashierReport.paymentMethodSummary.length === 0 && (
                    <div className={styles.empty}>No confirmed payments found in selected range.</div>
                  )}
                </div>
              </div>

              <div className={styles.tableCard} style={{ padding: '24px' }}>
                <h3 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Recent Report Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Report Period</span>
                    <span style={{ fontWeight: 600 }}>{new Date(reportRange.start).toLocaleDateString()} to {new Date(reportRange.end).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Generation Date</span>
                    <span style={{ fontWeight: 600 }}>{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.tableCard}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '15px' }}>
                Transaction Details ({cashierReport.transactions.length})
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paid At</th>
                    <th>Bill Number</th>
                    <th>Patient</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Confirmed By</th>
                    <th className={styles.amount}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {cashierReport.transactions.map(t => (
                    <tr key={t.paymentId}>
                      <td>{new Date(t.paidAt).toLocaleString()}</td>
                      <td className={styles.billNum}>{t.billNumber}</td>
                      <td className={styles.patientName}>{t.patientName}</td>
                      <td>{t.method}</td>
                      <td>{t.reference || 'N/A'}</td>
                      <td>{t.confirmedBy}</td>
                      <td className={styles.amount}>RWF {t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {cashierReport.transactions.length === 0 && (
                    <tr>
                      <td colSpan="7" className={styles.empty}>No transactions for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'disputes' && (
          <div className={styles.reportsPage}>
            <div className={styles.listControl}>
              <div className={styles.searchSection}>
                <h3 className={styles.sectionTitle}>Bill Disputes</h3>
                <p className={styles.userRole}>Review and resolve patient billing disputes.</p>
              </div>
              <div className={styles.filterTabs}>
                <div
                  className={`${styles.filterTab} ${disputeFilter === 'open' ? styles.active : ''}`}
                  onClick={() => setDisputeFilter('open')}
                >
                  Open Only
                </div>
                <div
                  className={`${styles.filterTab} ${disputeFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setDisputeFilter('all')}
                >
                  All Disputes
                </div>
              </div>
            </div>

            <div className={styles.tableCard}>
              {disputesLoading ? (
                <div className={styles.empty}>Loading disputes...</div>
              ) : disputes.length === 0 ? (
                <div className={styles.empty}>No disputes found for the selected filter.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Raised At</th>
                      <th>Bill Number</th>
                      <th>Patient</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th className={styles.amount}>Total</th>
                      <th className={styles.amount}>Paid</th>
                      <th className={styles.amount}>Balance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.map(d => (
                      <tr key={d.id}>
                        <td>{new Date(d.raisedAt).toLocaleString()}</td>
                        <td className={styles.billNum}>{d.billNumber}</td>
                        <td className={styles.patientName}>{d.patientName}</td>
                        <td>{d.reason}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${d.status === 'Open' || d.status === 'UnderReview' ? styles['status-Open'] : d.status === 'Resolved' ? styles['status-Paid'] : styles['status-Finalized']}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className={styles.amount}>RWF {Number(d.totalAmount || 0).toLocaleString()}</td>
                        <td className={styles.amount}>RWF {Number(d.totalPaid || 0).toLocaleString()}</td>
                        <td className={styles.amount}>RWF {Number(d.balanceDue || 0).toLocaleString()}</td>
                        <td>
                          {(d.status === 'Open' || d.status === 'UnderReview') ? (
                            <div className={styles.disputeActions}>
                              <button className={styles.resolveBtn} onClick={() => handleResolveDispute(d.id, true)}>Resolve</button>
                              <button className={styles.rejectBtn} onClick={() => handleResolveDispute(d.id, false)}>Reject</button>
                            </div>
                          ) : (
                            <span className={styles.completedTag}>Closed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedBillId && (
        <PaymentProcessingModal 
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
          onPaymentSuccess={fetchBills}
        />
      )}
    </div>
  )
}

function toDateTimeLocal(date) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
