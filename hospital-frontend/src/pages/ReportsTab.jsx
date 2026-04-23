import { useState, useEffect } from 'react'
import api from '../utils/api'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import logo from '../assets/logo.jpg'
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
    const tableData = filteredLedger.map(p => [
      new Date(p.paidAt).toLocaleDateString(),
      p.patientName,
      p.billNumber,
      p.method,
      `RWF ${p.amount.toLocaleString()}`
    ])
    doc.setFontSize(20); doc.setTextColor(15, 23, 42); doc.text('HOSPITALBILLING', 14, 22)
    doc.setFontSize(10); doc.setTextColor(100); doc.text('Financial Revenue Report', 14, 28)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34)
    doc.autoTable({
      startY: 45,
      head: [['Date', 'Patient Name', 'Bill #', 'Method', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    })
    doc.save(`Revenue_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    const content = `
      <html>
        <head>
          <title>Hospital Revenue Report - ${new Date().toLocaleDateString()}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #0f172a; padding-bottom: 24px; margin-bottom: 32px; }
            .logo-placeholder { background: #0f172a; color: white; width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; }
            .hospital-info h1 { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
            .hospital-info p { margin: 4px 0 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .report-title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 32px; color: #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .badge { background: #f1f5f9; padding: 4px 12px; border-radius: 6px; font-size: 12px; }

            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
            .stat-value { font-size: 18px; font-weight: 800; color: #0f172a; }

            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th { text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; padding: 12px; border-bottom: 2px solid #e2e8f0; }
            .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .right { text-align: right; }

            .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; display: flex; justify-content: space-between; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;" />
            <div class="hospital-info">
              <h1>HOSPITALBILLING</h1>
              <p>Excellence in Healthcare | Financial Audit Report</p>
            </div>
          </div>

          <div class="report-title">
            Revenue Performance Summary
            <span class="badge">${dateRange.start || 'Beginning'} - ${dateRange.end || 'Today'}</span>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Revenue</div>
              <div class="stat-value">RWF ${summary.totalRevenue.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Transactions</div>
              <div class="stat-value">${filteredLedger.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Generated By</div>
              <div class="stat-value" style="font-size: 14px;">System Admin</div>
            </div>
          </div>

          <h4>Transaction Ledger</h4>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Bill #</th>
                <th>Method</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLedger.map(p => `
                <tr>
                  <td>${new Date(p.paidAt).toLocaleDateString()}</td>
                  <td>${p.patientName}</td>
                  <td>${p.billNumber}</td>
                  <td>${p.method}</td>
                  <td class="right">RWF ${p.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>Generated on ${new Date().toLocaleString()}</span>
            <span>Hospital Billing System v2.0 - Confidential</span>
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
