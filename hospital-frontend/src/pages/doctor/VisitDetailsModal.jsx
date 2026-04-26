import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { 
  createStandardReportHeader, 
  createStandardReportFooter, 
  createStandardTable,
  generateReportFilename
} from '../../utils/reportUtils'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../utils/api'
import logo from '../../assets/logo.jpg'
import styles from './VisitDetailsModal.module.css'
import AddPrescriptionModal from './AddPrescriptionModal'

export default function VisitDetailsModal({ bill, onClose, onUpdated }) {
  const [billData, setBillData] = useState(bill)
  const [prescriptions, setPrescriptions] = useState([])
  const [showAddPrescription, setShowAddPrescription] = useState(false)
  const printRef = useRef(null)
  const sigPadRef = useRef(null)
  const [signatureUrl, setSignatureUrl] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [completing, setCompleting] = useState(false)

  async function handleDone() {
    if (billData.status !== 'Open') {
      onUpdated?.()
      onClose()
      return
    }
    setCompleting(true)
    try {
      await api.patch(`/bills/${bill.id}/doctor-complete`)
      onUpdated?.()
      onClose()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete visit')
    } finally {
      setCompleting(false)
    }
  }

  async function reloadBill() {
    try {
      const { data } = await api.get(`/bills/${bill.id}`)
      setBillData(data)
      const rxRes = await api.get(`/prescriptions/bill/${bill.id}`)
      setPrescriptions(rxRes.data)
      if (onUpdated) onUpdated()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(itemId) {
    if (!window.confirm("Are you sure you want to remove this service?")) return
    setDeletingId(itemId)
    try {
      await api.delete(`/bills/items/${itemId}`)
      await reloadBill()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove service')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    reloadBill()
  }, [])

  function handleSaveSignature() {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setSignatureUrl(sigPadRef.current.getTrimmedCanvas().toDataURL('image/png'))
    }
  }

  function handleClearSignature() {
    if (sigPadRef.current) sigPadRef.current.clear()
    setSignatureUrl(null)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Standardized header
    let y = createStandardReportHeader(
      doc, 
      'CLINICAL VISIT SUMMARY', 
      `Medical Record & Treatment Summary - ${billData.patientName}`,
      {
        generatedBy: `Dr. ${billData.assignedDoctorName || 'Medical Staff'}`,
        additionalInfo: `Visit Number: ${billData.billNumber} | Patient ID: P${String(billData.patientId ?? billData.id).padStart(4, '0')}`
      }
    )

    // Patient Information
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('PATIENT & VISIT INFORMATION', 14, y)
    y += 10

    const patientInfo = [
      { label: 'Visit Date', value: new Date(billData.createdAt).toLocaleDateString() },
      { label: 'Attending Doctor', value: `Dr. ${billData.assignedDoctorName || 'TBD'}` },
      { label: 'Visit Status', value: billData.status },
      { label: 'Total Services', value: `${billData.items?.length || 0} services recorded` }
    ]

    patientInfo.forEach(info => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(info.label + ':', 14, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(info.value, 70, y)
      y += 6
    })
    y += 8

    // Clinical Findings & Procedures
    if (otherItems.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text('CLINICAL FINDINGS & PROCEDURES', 14, y)
      y += 10

      const clinicalData = otherItems.map(i => [
        i.category,
        i.description,
        i.notes || '—'
      ])
      
      y = createStandardTable(
        doc,
        ['Category', 'Description', 'Clinical Notes'],
        clinicalData,
        y
      )
      y += 10
    }

    // Laboratory Investigations
    if (labTests.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text('LABORATORY INVESTIGATIONS', 14, y)
      y += 10

      const labData = labTests.map(test => [
        test.description,
        test.isCompleted ? 'Completed' : 'Pending',
        test.notes || '—'
      ])

      y = createStandardTable(
        doc,
        ['Test Description', 'Status', 'Results/Notes'],
        labData,
        y,
        { headerColor: [5, 150, 105] }
      )
      y += 10
    }

    // Prescriptions
    if (prescriptions.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text('PRESCRIPTIONS & TREATMENT PLAN', 14, y)
      y += 10

      const rxData = prescriptions.map(rx => [
        rx.drugName,
        rx.dosage,
        rx.frequency,
        rx.duration,
        rx.status === 0 ? 'Pending' : 'Dispensed'
      ])

      y = createStandardTable(
        doc,
        ['Medication', 'Dosage', 'Frequency', 'Duration', 'Status'],
        rxData,
        y,
        { headerColor: [124, 58, 237] }
      )
    }

    // Digital Signature Section
    if (signatureUrl) {
      // Add signature to PDF
      try {
        doc.addImage(signatureUrl, 'PNG', 140, y + 10, 40, 20)
        doc.setDrawColor(15, 23, 42)
        doc.line(140, y + 32, 180, y + 32)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text('Physician Digital Signature', 140, y + 36)
        doc.text(new Date().toLocaleDateString(), 140, y + 40)
      } catch (e) {
        console.warn('Could not add signature to PDF:', e)
      }
    }

    // Standardized footer
    createStandardReportFooter(doc, {
      customFooterText: 'This is an official medical record. Maintain confidentiality as per medical ethics.'
    })

    // Save with standardized filename
    const filename = generateReportFilename('Visit_Summary', billData.patientName, billData.billNumber)
    doc.save(filename)
  }

  function handlePrint() {
    window.print()
  }

  const patientInitials = billData.patientName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const labTests = billData.items?.filter(i => i.category === 'LabTest') || []
  const otherItems = billData.items?.filter(i => i.category !== 'LabTest') || []

  async function handleFinishConsultation() {
    try {
      await api.patch(`/bills/${bill.id}/finish-consultation`)
      onUpdated()
      onClose()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finish consultation')
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Hide close button and non-printable elements during print via CSS */}
      <div className={styles.modal} ref={printRef}>
        <div className={styles.noPrintHeader}>
          <h3>Visit Details & Summary</h3>
          <div className={styles.actionsBox}>
            <button className={styles.printBtn} onClick={exportToPDF}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Summary PDF
            </button>
            {billData.status === 'Open' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={styles.finishBtn} onClick={handleFinishConsultation}>
                  Finish Consultation
                </button>
                <button className={styles.finishBtn} onClick={handleDone} disabled={completing} style={{ background: '#059669' }}>
                  {completing ? 'Completing...' : 'Done / Close'}
                </button>
              </div>
            ) : (
              <button className={styles.finishBtn} onClick={onClose} style={{ background: '#64748b' }}>
                Close
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.printableContent}>
          {/* Printable Hospital Header */}
          <div className={styles.hospitalHeader}>
            <div className={styles.logoRow}>
              <img src={logo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
              <div className={styles.hospitalInfo}>
                <h2>HOSPITAL BILLING SYSTEM</h2>
                <p className={styles.hospitalMotto}>Professional Healthcare Management | Clinical Summary</p>
              </div>
            </div>
          </div>

          {/* Patient info card */}
          <div className={styles.patientInfoCard}>
            <div className={styles.patientIdentity}>
              <div className={styles.avatar}>{patientInitials}</div>
              <div>
                <div className={styles.patientName}>{billData.patientName}</div>
                <div className={styles.patientId}>Patient ID: P{String(billData.patientId ?? billData.id).padStart(4, '0')}</div>
              </div>
            </div>
            <div className={styles.visitMetaGrid}>
              <div className={styles.metaItem}>
                <span>Visit No.</span>
                <strong>{billData.billNumber}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Visit Date</span>
                <strong>{new Date(billData.createdAt).toLocaleDateString()}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Status</span>
                <strong>
                  <span className={billData.status === 'Open' ? styles.statusOpen : styles.statusClosed}>
                    {billData.status}
                  </span>
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.contentSections}>
            
            {/* Clinical Actions & Notes */}
            <div className={styles.sectionBlock}>
              <h4 className={styles.blockTitle}>Clinical Notes & Diagnoses</h4>
              {otherItems.length === 0 ? (
                <div className={styles.emptyState}>No clinical notes recorded yet.</div>
              ) : (
                <div className={styles.itemsList}>
                   {otherItems.map(item => (
                     <div key={item.id} className={styles.itemRow}>
                       <div className={styles.itemHeader}>
                         <div className={styles.itemMain}>
                           <span className={styles.itemCat}>{item.category}</span>
                           <span className={styles.itemDesc}>{item.description}</span>
                         </div>
                         {billData.status === 'Open' && (
                           <button 
                             className={styles.deleteBtn} 
                             onClick={() => handleDelete(item.id)}
                             disabled={deletingId === item.id}
                           >
                             🗑 Remove
                           </button>
                         )}
                       </div>
                       {item.notes && (
                         <div className={styles.itemNotes}>
                           <strong>Notes:</strong> {item.notes}
                         </div>
                       )}
                       <div className={styles.itemFooter}>
                         <span>Added by: Dr. {item.addedBy}</span>
                         <span>{new Date(item.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       </div>
                     </div>
                   ))}
                </div>
              )}
            </div>

            {/* Lab Tests */}
            <div className={styles.sectionBlock}>
              <h4 className={styles.blockTitle}>Laboratory Investigations</h4>
              {labTests.length === 0 ? (
                <div className={styles.emptyState}>No lab tests ordered during this visit.</div>
              ) : (
                <div className={styles.labGrid}>
                  {labTests.map(test => (
                    <div key={test.id} className={styles.labCard}>
                      <div className={styles.labHeader}>
                        <span className={styles.labDesc}>{test.description}</span>
                        <div className={styles.labStatusBox}>
                          <span className={test.isCompleted ? styles.labStatusDone : styles.labStatusPending}>
                            {test.isCompleted ? '✓ Completed' : 'Pending'}
                          </span>
                          {billData.status === 'Open' && (
                            <button 
                              className={styles.deleteBtnSmall} 
                              onClick={() => handleDelete(test.id)}
                              disabled={deletingId === test.id}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      {test.notes && (
                        <div className={styles.labNotes}>
                          <strong>{test.isCompleted ? 'Lab Results' : 'Instructions'}:</strong> {test.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescriptions and Digital Signature */}
            <div className={styles.sectionBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 className={styles.blockTitle} style={{ marginBottom: 0 }}>Prescriptions / Treatment Plan</h4>
                {billData.status === 'Open' && (
                  <button 
                    className={styles.addBtn}
                    onClick={() => setShowAddPrescription(true)}
                  >
                    + Prescribe Meds
                  </button>
                )}
              </div>
              <div className={styles.prescriptionBox}>
                {prescriptions.length === 0 ? (
                  <p>No prescriptions recorded yet.</p>
                ) : (
                  <div className={styles.itemsList}>
                    {prescriptions.map(rx => (
                      <div key={rx.id} className={styles.itemRow} style={{ borderLeft: rx.status === 0 ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemMain}>
                            <span className={styles.itemCat}>{rx.drugName} ({rx.dosage})</span>
                            <span className={styles.itemDesc}>Take {rx.frequency} for {rx.duration}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: rx.status === 0 ? '#f59e0b' : '#10b981' }}>
                            {rx.status === 0 ? 'Pending' : 'Dispensed'}
                          </span>
                        </div>
                        <div className={styles.itemFooter}>
                          <span>Prescribed by: {rx.prescribedByStaff?.fullName}</span>
                          <span>{new Date(rx.prescribedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={styles.signatureSection} style={{ marginTop: '2rem' }}>
                  <div className={styles.docSignatureInfo}>
                    <span className={styles.docRole}>Attending Physician</span>
                    <span>Date: {new Date().toLocaleDateString()}</span>
                  </div>

                  {!signatureUrl ? (
                    <div className={styles.signaturePadWrapper}>
                      <div className={styles.sigLabel}>Sign Below (Draw with mouse/touch):</div>
                      <SignatureCanvas
                        ref={sigPadRef}
                        penColor="#1a56db"
                        canvasProps={{ className: styles.sigCanvas }}
                      />
                      <div className={styles.sigActions}>
                        <button className={styles.sigClearBtn} onClick={handleClearSignature}>Clear</button>
                        <button className={styles.sigSaveBtn} onClick={handleSaveSignature}>Save & Lock Signature</button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.lockedSignatureRow}>
                      <div className={styles.lockedSignatureBox}>
                        <img src={signatureUrl} alt="Doctor Signature" className={styles.signatureImage} />
                        <div className={styles.sigLine}></div>
                      </div>
                      <button className={styles.sigClearBtnText} onClick={handleClearSignature}>
                        Erase & Resign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showAddPrescription && (
        <AddPrescriptionModal 
          bill={billData} 
          onClose={() => setShowAddPrescription(false)} 
          onAdded={() => {
            setShowAddPrescription(false)
            reloadBill()
          }} 
        />
      )}
    </div>
  )
}
