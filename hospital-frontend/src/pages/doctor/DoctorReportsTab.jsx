import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'
import * as XLSX from 'xlsx'
import { 
  createStandardReportHeader, 
  createStandardReportFooter, 
  createStandardTable,
  generateReportFilename,
  createStatsSummary
} from '../../utils/reportUtils'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import styles from './DoctorReportsTab.module.css'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DoctorReportsTab() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchReport()
  }, [dateRange])

  async function fetchReport() {
    setLoading(true)
    try {
      const params = {
        start: dateRange.start,
        end: dateRange.end
      }
      const { data } = await api.get('/bills/doctor-report', { params })
      setReport(data)
    } catch (err) {
      console.error('Failed to fetch doctor report:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load report data'
      alert(`Error loading report: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredConsultations = report?.consultations?.filter(c =>
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.billNumber.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const exportToExcel = () => {
    if (!report) return

    // Summary sheet
    const summaryData = [
      { Metric: 'Total Patients', Value: report.totalPatients },
      { Metric: 'Total Consultations', Value: report.totalConsultations },
      { Metric: 'Completed Consultations', Value: report.completedConsultations },
      { Metric: 'Active Consultations', Value: report.activeConsultations },
      { Metric: 'Total Revenue (RWF)', Value: report.totalRevenue },
      { Metric: 'Average Consultation Value (RWF)', Value: Math.round(report.averageConsultationValue) }
    ]

    // Consultations sheet
    const consultationsData = filteredConsultations.map(c => ({
      'Bill Number': c.billNumber,
      'Patient Name': c.patientName,
      'Date': new Date(c.consultationDate).toLocaleDateString(),
      'Status': c.status,
      'Services Count': c.servicesCount,
      'Amount (RWF)': c.totalAmount,
      'Services': c.services.join('; '),
      'Prescriptions': c.prescriptions.join('; ')
    }))

    // Service breakdown sheet
    const serviceData = report.serviceBreakdown.map(s => ({
      'Service Category': s.category,
      'Count': s.count,
      'Revenue (RWF)': s.revenue,
      'Percentage': `${s.percentage}%`
    }))

    const workbook = XLSX.utils.book_new()
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    
    const consultationsSheet = XLSX.utils.json_to_sheet(consultationsData)
    XLSX.utils.book_append_sheet(workbook, consultationsSheet, 'Consultations')
    
    const serviceSheet = XLSX.utils.json_to_sheet(serviceData)
    XLSX.utils.book_append_sheet(workbook, serviceSheet, 'Service Breakdown')

    XLSX.writeFile(workbook, `Doctor_Report_${report.doctorName.replace(/\s+/g, '_')}_${dateRange.start}_to_${dateRange.end}.xlsx`)
  }

  const exportToPDF = () => {
    if (!report) return

    const doc = new jsPDF()
    
    // Standardized header
    const dateRange = `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`
    let y = createStandardReportHeader(
      doc, 
      'DOCTOR PERFORMANCE REPORT', 
      `Clinical Performance Analysis - Dr. ${report.doctorName}`,
      {
        generatedBy: `Dr. ${report.doctorName}`,
        dateRange: dateRange,
        additionalInfo: `Total Consultations: ${report.totalConsultations} | Patients Treated: ${report.totalPatients}`
      }
    )

    // Summary statistics
    const stats = [
      { label: 'Total Patients Treated', value: report.totalPatients.toString() },
      { label: 'Total Consultations', value: report.totalConsultations.toString() },
      { label: 'Completed Consultations', value: report.completedConsultations.toString() },
      { label: 'Active Consultations', value: report.activeConsultations.toString() },
      { label: 'Total Revenue Generated', value: `RWF ${report.totalRevenue.toLocaleString()}`, highlight: true },
      { label: 'Average Consultation Value', value: `RWF ${Math.round(report.averageConsultationValue).toLocaleString()}` }
    ]

    y = createStatsSummary(doc, stats, y)
    y += 10

    // Consultations table
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('CONSULTATION DETAILS', 14, y)
    y += 10

    const tableData = filteredConsultations.slice(0, 15).map(c => [
      new Date(c.consultationDate).toLocaleDateString(),
      c.patientName,
      c.billNumber,
      c.status === 'ConsultationDone' ? 'Completed' : c.status,
      c.servicesCount.toString(),
      `RWF ${c.totalAmount.toLocaleString()}`
    ])

    const finalY = createStandardTable(
      doc,
      ['Date', 'Patient', 'Bill #', 'Status', 'Services', 'Amount'],
      tableData,
      y
    )

    // Service breakdown if space allows
    if (finalY < 200 && report.serviceBreakdown.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text('SERVICE CATEGORY BREAKDOWN', 14, finalY + 15)

      const serviceData = report.serviceBreakdown.map(s => [
        s.category,
        s.count.toString(),
        `RWF ${s.revenue.toLocaleString()}`,
        `${s.percentage}%`
      ])

      createStandardTable(
        doc,
        ['Service Category', 'Count', 'Revenue', 'Percentage'],
        serviceData,
        finalY + 20
      )
    }

    // Standardized footer
    createStandardReportFooter(doc, {
      customFooterText: 'This report contains confidential medical performance data.'
    })

    // Save with standardized filename
    const filename = generateReportFilename('Doctor_Performance', report.doctorName, dateRange.replace(' - ', '_to_'))
    doc.save(filename)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Generating your performance report...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className={styles.error}>
        <p>Unable to load report data. This could be because:</p>
        <ul style={{ textAlign: 'left', marginTop: '16px' }}>
          <li>You don't have any consultations in the selected date range</li>
          <li>There was a server error</li>
          <li>You need to be logged in as a doctor</li>
        </ul>
        <button onClick={fetchReport} className={styles.retryBtn}>Retry</button>
      </div>
    )
  }

  return (
    <div className={styles.reports}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Performance Report</h2>
          <p className={styles.subtitle}>Dr. {report.doctorName} • {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.excelBtn} onClick={exportToExcel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            Export Excel
          </button>
          <button className={styles.pdfBtn} onClick={exportToPDF}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.field}>
            <label>Start Date</label>
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange({...dateRange, start: e.target.value})} 
            />
          </div>
          <div className={styles.field}>
            <label>End Date</label>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange({...dateRange, end: e.target.value})} 
            />
          </div>
          <div className={styles.field}>
            <label>Search Consultations</label>
            <input 
              type="text" 
              placeholder="Patient name or bill number..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>Total Patients</h3>
            <p className={styles.statValue}>{report.totalPatients}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>Total Consultations</h3>
            <p className={styles.statValue}>{report.totalConsultations}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>Completed</h3>
            <p className={styles.statValue}>{report.completedConsultations}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>Total Revenue</h3>
            <p className={styles.statValue}>RWF {report.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h4>Daily Activity Trend</h4>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={report.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                <Legend />
                <Area type="monotone" dataKey="patientsCount" stackId="1" stroke="#8884d8" fill="#8884d8" name="Patients" />
                <Area type="monotone" dataKey="consultationsCompleted" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h4>Service Category Breakdown</h4>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={report.serviceBreakdown}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({category, percentage}) => `${category} (${percentage}%)`}
                >
                  {report.serviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Consultations Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h4>Consultation Details</h4>
          <span className={styles.tableCount}>{filteredConsultations.length} consultations</span>
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Bill #</th>
                <th>Status</th>
                <th>Services</th>
                <th>Prescriptions</th>
                <th className={styles.right}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsultations.map(consultation => (
                <tr key={consultation.billId}>
                  <td>{new Date(consultation.consultationDate).toLocaleDateString()}</td>
                  <td className={styles.patientCell}>
                    <div className={styles.patientAvatar}>
                      {consultation.patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    {consultation.patientName}
                  </td>
                  <td className={styles.billNumber}>{consultation.billNumber}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[consultation.status.toLowerCase()]}`}>
                      {consultation.status === 'ConsultationDone' ? 'Completed' : consultation.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.servicesList}>
                      {consultation.services.slice(0, 2).map((service, idx) => (
                        <span key={idx} className={styles.serviceTag}>{service}</span>
                      ))}
                      {consultation.services.length > 2 && (
                        <span className={styles.moreServices}>+{consultation.services.length - 2} more</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.prescriptionsList}>
                      {consultation.prescriptions.slice(0, 2).map((rx, idx) => (
                        <span key={idx} className={styles.prescriptionTag}>{rx}</span>
                      ))}
                      {consultation.prescriptions.length > 2 && (
                        <span className={styles.morePrescriptions}>+{consultation.prescriptions.length - 2} more</span>
                      )}
                    </div>
                  </td>
                  <td className={styles.right}>
                    <span className={styles.amount}>RWF {consultation.totalAmount.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
              {filteredConsultations.length === 0 && (
                <tr>
                  <td colSpan="7" className={styles.empty}>
                    {searchQuery ? 'No consultations match your search.' : 'No consultations found for the selected period.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}