import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import logo from '../assets/logo.jpg'

/**
 * Creates a standardized header for all hospital reports
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {string} reportTitle - The main title of the report
 * @param {string} reportSubtitle - The subtitle/description of the report
 * @param {Object} options - Additional options
 * @returns {number} - The Y position after the header
 */
export function createStandardReportHeader(doc, reportTitle, reportSubtitle, options = {}) {
  const {
    generatedBy = 'System Generated',
    dateRange = null,
    additionalInfo = null
  } = options

  const pageW = 210
  const margin = 14
  const rightEdge = 196

  // Professional Header Background
  doc.setFillColor(15, 23, 42) // Dark blue
  doc.rect(0, 0, pageW, 45, 'F')

  // Hospital Logo
  try {
    doc.addImage(logo, 'JPEG', margin, 12, 20, 20)
  } catch (err) {
    // Fallback if image fails
    doc.setFillColor(255, 255, 255)
    doc.circle(24, 22, 10, 'F')
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.text('H', 24, 27, { align: 'center' })
  }

  // Hospital Name and System Title
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('HOSPITAL BILLING SYSTEM', 45, 18)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 220, 240)
  doc.text('Professional Healthcare Management Solution', 45, 25)

  // Report Title and Info
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(reportTitle, 45, 35)

  // Generation Info
  const now = new Date()
  doc.setFontSize(8)
  doc.setTextColor(180, 200, 220)
  doc.text(`Generated: ${now.toLocaleString()} | ${generatedBy}`, 45, 40)

  // Report Details Section
  let y = 55
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(reportSubtitle, margin, y)
  y += 5

  // Separator line
  doc.setDrawColor(200, 210, 220)
  doc.line(margin, y, rightEdge, y)
  y += 10

  // Additional report information
  if (dateRange) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Report Period: ${dateRange}`, margin, y)
    y += 6
  }

  if (additionalInfo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(additionalInfo, margin, y)
    y += 6
  }

  y += 5 // Extra spacing after header

  return y
}

/**
 * Creates a standardized footer for all hospital reports
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {Object} options - Footer options
 */
export function createStandardReportFooter(doc, options = {}) {
  const {
    confidentialityNotice = true,
    customFooterText = null
  } = options

  const pageH = doc.internal.pageSize.height
  const margin = 14
  const rightEdge = 196

  // Footer separator line
  doc.setDrawColor(200, 210, 220)
  doc.line(margin, pageH - 25, rightEdge, pageH - 25)

  // Footer content
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)

  if (confidentialityNotice) {
    doc.text('CONFIDENTIAL MEDICAL DOCUMENT', margin, pageH - 18)
    doc.text('• This report contains confidential patient and hospital information', margin, pageH - 14)
    doc.text('• Unauthorized access, use, or disclosure is strictly prohibited', margin, pageH - 10)
  }

  if (customFooterText) {
    doc.text(customFooterText, margin, pageH - 6)
  }

  // Hospital branding
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(150, 160, 170)
  doc.text('Hospital Billing System — Professional Healthcare Management', rightEdge, pageH - 6, { align: 'right' })
}

/**
 * Creates a professional table with standardized styling
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {Array} headers - Table headers
 * @param {Array} data - Table data
 * @param {number} startY - Starting Y position
 * @param {Object} options - Table styling options
 */
export function createStandardTable(doc, headers, data, startY, options = {}) {
  const {
    headerColor = [15, 23, 42],
    alternateRowColor = [248, 250, 252],
    fontSize = 8,
    theme = 'striped',
    columnWidths = null
  } = options

  // Check if autoTable is available
  if (typeof doc.autoTable === 'function') {
    try {
      doc.autoTable({
        startY: startY,
        head: [headers],
        body: data,
        theme: theme,
        headStyles: { 
          fillColor: headerColor,
          textColor: [255, 255, 255],
          fontSize: fontSize,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: fontSize - 0.5
        },
        alternateRowStyles: {
          fillColor: alternateRowColor
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        columnStyles: columnWidths ? columnWidths.reduce((acc, width, index) => {
          acc[index] = { cellWidth: width }
          return acc
        }, {}) : {}
      })

      return doc.lastAutoTable.finalY
    } catch (error) {
      console.warn('autoTable failed, falling back to manual table:', error)
    }
  }

  // Fallback: Manual table implementation
  return createManualTable(doc, headers, data, startY, options)
}

/**
 * Manual table implementation as fallback
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {Array} headers - Table headers
 * @param {Array} data - Table data
 * @param {number} startY - Starting Y position
 * @param {Object} options - Table styling options
 */
function createManualTable(doc, headers, data, startY, options = {}) {
  const {
    headerColor = [15, 23, 42],
    alternateRowColor = [248, 250, 252],
    fontSize = 8,
    columnWidths = null
  } = options

  const margin = 14
  const pageWidth = 196
  const rowHeight = 6
  let y = startY

  // Calculate column widths
  const numCols = headers.length
  const defaultColWidth = (pageWidth - margin * 2) / numCols
  const colWidths = columnWidths || Array(numCols).fill(defaultColWidth)
  
  // Ensure column widths fit within page
  const totalWidth = colWidths.reduce((sum, width) => sum + width, 0)
  if (totalWidth > pageWidth - margin * 2) {
    const scale = (pageWidth - margin * 2) / totalWidth
    colWidths.forEach((width, i) => colWidths[i] = width * scale)
  }

  // Draw header
  doc.setFillColor(...headerColor)
  doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F')
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  doc.setTextColor(255, 255, 255)
  
  let x = margin
  headers.forEach((header, i) => {
    doc.text(header, x + 2, y + 4)
    x += colWidths[i]
  })
  
  y += rowHeight

  // Draw data rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize - 0.5)
  doc.setTextColor(15, 23, 42)

  data.forEach((row, rowIndex) => {
    // Alternate row colors
    if (rowIndex % 2 === 1) {
      doc.setFillColor(...alternateRowColor)
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F')
    }

    x = margin
    row.forEach((cell, colIndex) => {
      const cellText = String(cell || '')
      // Truncate text if too long
      const maxChars = Math.floor(colWidths[colIndex] / 2.5)
      const displayText = cellText.length > maxChars ? 
        cellText.substring(0, maxChars - 3) + '...' : cellText
      
      doc.text(displayText, x + 2, y + 4)
      x += colWidths[colIndex]
    })
    
    y += rowHeight
  })

  // Draw table border
  doc.setDrawColor(200, 210, 220)
  doc.rect(margin, startY, pageWidth - margin * 2, y - startY)

  return y + 5
}

/**
 * Standardized filename generator for reports
 * @param {string} reportType - Type of report (e.g., 'Doctor_Report', 'Patient_Receipt')
 * @param {string} identifier - Unique identifier (e.g., doctor name, patient name)
 * @param {string} dateRange - Date range or single date
 * @returns {string} - Standardized filename
 */
export function generateReportFilename(reportType, identifier, dateRange = null) {
  const now = new Date()
  const dateStr = dateRange || now.toISOString().split('T')[0]
  const cleanIdentifier = identifier.replace(/[^a-zA-Z0-9]/g, '_')
  
  return `${reportType}_${cleanIdentifier}_${dateStr}.pdf`
}

/**
 * Creates a summary statistics section
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {Array} stats - Array of {label, value, highlight} objects
 * @param {number} startY - Starting Y position
 * @returns {number} - Y position after the stats section
 */
export function createStatsSummary(doc, stats, startY) {
  const margin = 14
  const rightEdge = 196
  let y = startY

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('SUMMARY STATISTICS', margin, y)
  y += 5

  doc.setDrawColor(200, 210, 220)
  doc.line(margin, y, rightEdge, y)
  y += 10

  stats.forEach(stat => {
    if (stat.highlight) {
      doc.setFillColor(240, 253, 244)
      doc.rect(margin - 2, y - 5, rightEdge - margin + 4, 10, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(70, 90, 110)
    doc.text(stat.label, margin, y)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(stat.highlight ? 5 : 15, stat.highlight ? 150 : 23, stat.highlight ? 105 : 42)
    doc.text(stat.value, rightEdge, y, { align: 'right' })

    y += 8
  })

  return y + 5
}