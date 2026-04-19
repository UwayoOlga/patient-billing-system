import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import api from '../../utils/api'
import styles from './VisitDetailsModal.module.css'

export default function VisitDetailsModal({ bill, onClose, onUpdated }) {
  const [billData, setBillData] = useState(bill)
  const printRef = useRef(null)
  const sigPadRef = useRef(null)
  const [signatureUrl, setSignatureUrl] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function reloadBill() {
    try {
      const { data } = await api.get(`/bills/${bill.id}`)
      setBillData(data)
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

  function handleSaveSignature() {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setSignatureUrl(sigPadRef.current.getTrimmedCanvas().toDataURL('image/png'))
    }
  }

  function handleClearSignature() {
    if (sigPadRef.current) sigPadRef.current.clear()
    setSignatureUrl(null)
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

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Hide close button and non-printable elements during print via CSS */}
      <div className={styles.modal} ref={printRef}>
        <div className={styles.noPrintHeader}>
          <h3>Visit Details & Summary</h3>
          <div className={styles.actionsBox}>
            <button className={styles.printBtn} onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print / Save PDF
            </button>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.printableContent}>
          {/* Printable Hospital Header */}
          <div className={styles.hospitalHeader}>
            <div className={styles.logoRow}>
              <svg className={styles.hospitalLogo} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <h2>HospitalBilling Clinical Summary</h2>
            </div>
            <p className={styles.hospitalMotto}>Excellence in Healthcare</p>
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
              <h4 className={styles.blockTitle}>Prescriptions / Treatment Plan</h4>
              <div className={styles.prescriptionBox}>
                <p>Medication dispensed via pharmacy system or external prescription.</p>
                
                <div className={styles.signatureSection}>
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
    </div>
  )
}
