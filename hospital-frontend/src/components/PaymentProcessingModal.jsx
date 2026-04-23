import { useState, useEffect } from 'react'
import api from '../utils/api'
import styles from './PaymentProcessingModal.module.css'

export default function PaymentProcessingModal({ billId, onClose, onPaymentSuccess }) {
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [reference, setReference] = useState('')
  const [amountPaid, setAmountPaid] = useState(0)
  const [step, setStep] = useState('Payment') // 'Payment' | 'Receipt'

  async function handleRaiseDispute(itemId) {
    const reason = window.prompt("Reason for dispute (e.g. Patient claims service not received):")
    if (!reason || !reason.trim()) return
    try {
      await api.post(`/dispute/raise/${itemId}`, JSON.stringify(reason), {
        headers: { 'Content-Type': 'application/json' }
      })
      fetchBill() // refresh
    } catch (err) {
      alert("Failed to raise dispute")
    }
  }

  useEffect(() => {
    if (billId) fetchBill()
  }, [billId])

  async function fetchBill() {
    try {
      const { data } = await api.get(`/bills/${billId}`)
      setBill(data)
      setAmountPaid(data.balanceDue)
    } catch (err) {
      alert('Failed to load bill details.')
      onClose()
    } finally {
      setLoading(false)
    }
  }
  function handlePrint() {
    window.print()
  }

  async function handleConfirmPayment() {
    if (amountPaid <= 0) return alert('Please enter a valid amount.')
    
    setProcessing(true)
    try {
      // 1. If bill is Open, finalize it first
      if (bill.status === 'Open') {
        await api.patch(`/bills/${bill.id}/finalize`)
      }

      // 2. Record the payment
      const payResp = await api.post('/payment', {
        billId: bill.id,
        amount: amountPaid,
        method: paymentMethod,
        reference: reference
      })

      // 3. Confirm the payment (to update bill status to Paid if balance is 0)
      await api.patch(`/payment/${payResp.data.id}/confirm`)

      // 4. Refresh bill so receipt/payment history reflects latest transaction
      const refreshed = await api.get(`/bills/${bill.id}`)
      setBill(refreshed.data)

      // 5. Move to receipt step
      setStep('Receipt')
      onPaymentSuccess?.()
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed. Ensure all tests/meds are finalized before payment.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} id="printable-receipt-container">
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{step === 'Payment' ? 'Process Payment' : 'Payment Receipt'}</h2>
            <p className={styles.subtitle}>Bill #{bill?.billNumber}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </header>

        <div className={styles.content}>
          {/* Printable Hospital Header (Only visible on print) */}
          <div className={styles.printHeader} style={{ display: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '3px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
              <div style={{ background: '#0f172a', color: '#fff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>H</div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>RWANDA DIGITAL MEDICAL CENTER</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Excellence in Healthcare | Official Receipt</p>
              </div>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#475569' }}>Generated on: {new Date().toLocaleString()}</p>
          </div>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <label>Patient</label>
              <div className={styles.value}>{bill?.patientName}</div>
            </div>
            <div className={styles.summaryItem}>
              <label>Date</label>
              <div className={styles.value}>{new Date(bill?.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <table className={styles.itemTable}>
            <thead>
              <tr>
                <th>Service/Item</th>
                <th className={styles.right}>Gross</th>
                <th className={styles.right}>Insurance</th>
                <th className={styles.right}>Patient</th>
                <th className={styles.center}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bill?.items.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.itemName}>{item.description}</div>
                    <div className={styles.itemCategory}>{item.category}</div>
                  </td>
                  <td className={styles.right}>{item.unitPrice.toLocaleString()}</td>
                  <td className={styles.right}>{item.insuranceAmount.toLocaleString()}</td>
                  <td className={styles.right}>{item.patientAmount.toLocaleString()}</td>
                  <td className={styles.center}>
                    {item.isDisputed ? (
                      <span className={styles.disputeBadge}>Disputed</span>
                    ) : (
                      <button 
                        className={styles.disputeBtn} 
                        onClick={() => handleRaiseDispute(item.id)}
                        title="Flag for dispute"
                      >
                        🚩
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" className={styles.totalLabel}>Total Gross Amount</td>
                <td className={styles.totalValue}>RWF {bill?.totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan="4" className={styles.totalLabel}>Insurance Contribution</td>
                <td className={styles.totalValue} style={{ color: '#059669' }}>- RWF {bill?.totalInsurance.toLocaleString()}</td>
              </tr>
              <tr className={styles.liabilityRow}>
                <td colSpan="4" className={styles.totalLabel}>Patient Liability</td>
                <td className={styles.totalValue}>RWF {bill?.patientLiability.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan="4" className={styles.totalLabel}>Previous Payments</td>
                <td className={styles.totalValue}>- RWF {bill?.totalPaid.toLocaleString()}</td>
              </tr>
              <tr className={styles.finalRow}>
                <td colSpan="4" className={styles.totalLabel}>Balance Due</td>
                <td className={styles.totalValue}>RWF {bill?.balanceDue.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {bill?.payments && bill.payments.length > 0 && (
            <div className={styles.historySection}>
              <h4 className={styles.historyTitle}>Payment History (Installments)</h4>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className={styles.right}>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.payments.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td>{p.method}</td>
                      <td>{p.reference || '-'}</td>
                      <td className={styles.right}>RWF {p.amount.toLocaleString()}</td>
                      <td>
                        <span className={p.isConfirmed ? styles.confirmedBadge : styles.pendingBadge}>
                          {p.isConfirmed ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {step === 'Payment' && (
              <div className={styles.paymentForm}>
                <div className={styles.formHeader}>
                  <h3 className={styles.formTitle}>Payment Details</h3>
                  {amountPaid !== bill?.balanceDue && (
                    <button 
                      className={styles.quickPayBtn}
                      onClick={() => setAmountPaid(bill.balanceDue)}
                    >
                      Pay Full Amount (RWF {bill?.balanceDue.toLocaleString()})
                    </button>
                  )}
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label>Method</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => {
                        setPaymentMethod(e.target.value);
                        if (e.target.value === 'Cash') setReference('CASH-' + Math.random().toString(36).substring(7).toUpperCase());
                        else setReference('');
                      }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Mobile Money">Mobile Money (Momo)</option>
                      <option value="Bank">Bank Transfer / Card</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Amount (RWF)</label>
                    <input 
                      type="number" 
                      value={amountPaid} 
                      onChange={e => setAmountPaid(e.target.value)}
                      max={bill?.balanceDue}
                      required
                    />
                  </div>
                </div>

                {paymentMethod === 'Mobile Money' && (
                  <div className={styles.momoHint}>
                    <div className={styles.qrPlaceholder}>
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                      </svg>
                      <span>Scan to Pay (Merchant Code: 123456)</span>
                    </div>
                  </div>
                )}

                <div className={styles.field}>
                  <label>Reference / Transaction Hash</label>
                  <input 
                    placeholder={paymentMethod === 'Cash' ? "System Auto-Generated" : "e.g. TXN-998877"} 
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                  />
                </div>

                <div className={styles.footer}>
                  <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                  <button className={styles.confirmBtn} onClick={handleConfirmPayment} disabled={processing}>
                    {processing ? 'Processing...' : `Pay & Finalize: RWF ${parseInt(amountPaid).toLocaleString()}`}
                  </button>
                </div>
              </div>
          )}

          {step === 'Receipt' && (
            <div className={styles.receiptAddon}>
              <div className={styles.successBox}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h4>Transaction Successful</h4>
                <p>The payment has been recorded and confirmed.</p>
              </div>
              
              <div className={styles.receiptFooter}>
                <button className={styles.printBtn} onClick={handlePrint}>Print Receipt</button>
                <button className={styles.doneBtn} onClick={onClose}>Finish</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
