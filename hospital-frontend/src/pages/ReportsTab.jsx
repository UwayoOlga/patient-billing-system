import { useState, useEffect } from 'react'
import api from '../utils/api'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import styles from './ReportsTab.module.css'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsTab() {
  const [summary, setSummary] = useState({ totalRevenue: 0, departmentRevenue: [] })
  const [trends, setTrends] = useState([])
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [searchName, setSearchName] = useState('')

  useEffect(() => {
    fetchData()
  }, [dateRange])

  async function fetchData() {
    setLoading(true)
    try {
      const params = {}
      if (dateRange.start) params.startDate = dateRange.start
      if (dateRange.end) params.endDate = dateRange.end

      const [sResp, tResp, lResp] = await Promise.all([
        api.get('/adminfinance/summary', { params }),
        api.get('/adminfinance/trends'),
        api.get('/adminfinance/ledger', { params })
      ])
      setSummary(sResp.data)
      setTrends(tResp.data)
      setLedger(lResp.data)
    } catch (err) {
      console.error('Failed to fetch reports', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLedger = ledger.filter(p => 
    p.patientName.toLowerCase().includes(searchName.toLowerCase()) || 
    p.billNumber.toLowerCase().includes(searchName.toLowerCase())
  )

  const exportToExcel = () => {
    const data = filteredLedger.map(p => ({
      'Patient Name': p.patientName,
      'Bill Number': p.billNumber,
      'Amount (RWF)': p.amount,
      'Method': p.method,
      'Confirmed By': p.confirmedBy,
      'Date': new Date(p.paidAt).toLocaleDateString(),
      'Reference': p.reference || 'N/A'
    }))
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments')
    XLSX.writeFile(workbook, `Hospital_Revenue_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text('Hospital Billing - Revenue Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22)
    doc.text(`Total Revenue: RWF ${summary.totalRevenue.toLocaleString()}`, 14, 28)

    const tableData = filteredLedger.map(p => [
      p.patientName,
      p.billNumber,
      p.amount.toLocaleString(),
      p.method,
      new Date(p.paidAt).toLocaleDateString()
    ])

    doc.autoTable({
      startY: 35,
      head: [['Patient', 'Bill #', 'Amount', 'Method', 'Date']],
      body: tableData,
    })

    doc.save(`Revenue_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className={styles.reports}>
      {/* ─── FILTERS ─── */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.field}>
            <label>Start Date</label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
          </div>
          <div className={styles.field}>
            <label>End Date</label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          </div>
          <div className={styles.field}>
            <label>Patient/Bill Search</label>
            <input type="text" placeholder="Search..." value={searchName} onChange={e => setSearchName(e.target.value)} />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.excelBtn} onClick={exportToExcel}>Export Excel</button>
          <button className={styles.pdfBtn} onClick={exportToPDF}>Download PDF Report</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Revenue</h3>
          <p>RWF {summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Transactions</h3>
          <p>{filteredLedger.length}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Avg per Visit</h3>
          <p>RWF {filteredLedger.length > 0 ? Math.round(summary.totalRevenue / filteredLedger.length).toLocaleString() : 0}</p>
        </div>
      </div>

      {/* ─── CHARTS ─── */}
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h4>Revenue Trend (Last 7 Days)</h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Daily Revenue" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h4>Revenue by Department</h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={summary.departmentRevenue}
                  dataKey="revenue"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {summary.departmentRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── DATATABLE ─── */}
      <div className={styles.tableCard}>
        <h4>Detailed Transaction Log</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Bill #</th>
              <th>Method</th>
              <th className={styles.right}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.map(p => (
              <tr key={p.id}>
                <td>{new Date(p.paidAt).toLocaleDateString()}</td>
                <td>{p.patientName}</td>
                <td>{p.billNumber}</td>
                <td>{p.method}</td>
                <td className={styles.right}>RWF {p.amount.toLocaleString()}</td>
              </tr>
            ))}
            {filteredLedger.length === 0 && (
              <tr><td colSpan="5" className={styles.empty}>No transactions found for the selected criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
