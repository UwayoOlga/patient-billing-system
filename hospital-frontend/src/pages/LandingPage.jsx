import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './LandingPage.module.css'
import slide1 from '../assets/landingPageImage1.jpg'
import slide2 from '../assets/landingPageImage2.png'
import logo from '../assets/logo.jpg'

export default function LandingPage() {
  const slides = [slide1, slide2]
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <div className={styles.landing}>
      {/* ─── NAVIGATION ─── */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>
          <img src={logo} alt="Logo" style={{ height: '32px', borderRadius: '4px' }} />
          <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.05em' }}>HOSPITALBILLING</span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.loginBtnSecondary}>Staff Login</Link>
        </div>
      </nav>

      {/* ─── 1. HERO SECTION ─── */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>Integrated Hospital Management</span>
          <h1>Streamlining Patient Care and Billing Operations</h1>
          <p>
            A unified platform connecting clinical workflows—from Triage and Lab to Pharmacy—with automated billing for a seamless and transparent healthcare experience.
          </p>
          <div className={styles.heroCta}>
            <Link to="/patient/view" className={styles.primaryBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              Patient Portal
            </Link>
            <Link to="/login" className={styles.secondaryBtn}>Staff Portal</Link>
          </div>
        </div>
        <div className={styles.heroImageContainer}>
          {slides.map((src, idx) => (
            <img 
              key={src}
              src={src} 
              alt={`Healthcare Slide ${idx + 1}`} 
              className={`${styles.heroSlide} ${currentSlide === idx ? styles.active : ''}`}
            />
          ))}
        </div>
      </header>

      {/* ─── 2. HOW IT WORKS ─── */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>The Patient Journey</h2>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3>Registration & Triage</h3>
              <p>Reception registers patients and Nurses capture vitals for immediate triage and tracking.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3>Clinical & Lab Services</h3>
              <p>Doctors consult and request tests, which Lab Technicians complete with real-time charge capture.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3>Pharmacy & Billing</h3>
              <p>Pharmacists dispense medications while the system automatically generates an itemized final invoice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURES OVERVIEW ─── */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Core Features</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              </div>
              <h4>Role-based Dashboards</h4>
              <p>Specialized interfaces for Cashiers, Auditors, Revenue Managers, and Patients.</p>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <h4>Real-time Financial Tracking</h4>
              <p>Live updates on patient account balances, payment processing, and outstanding liabilities.</p>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h4>Automated Billing</h4>
              <p>Every clinical action is instantly converted into itemized charges, eliminating manual data entry.</p>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <h4>Patient Financial Portal</h4>
              <p>Patients can view their transaction history, itemized bills, and resolve invoice disputes seamlessly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. WHO IT IS FOR ─── */}
      <section className={styles.whoItIsFor}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Built For Everyone</h2>
          <div className={styles.userGrid}>
            <div className={styles.userCard}>
              <div className={styles.userHeader}>
                <span className={styles.userEmoji}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </span>
                <h4>Patients</h4>
              </div>
              <p>Experience fully transparent itemized billing, digital receipts, and easy dispute resolution online.</p>
            </div>
            <div className={styles.userCard}>
              <div className={styles.userHeader}>
                <span className={styles.userEmoji}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                </span>
                <h4>Revenue Managers</h4>
              </div>
              <p>Oversee the hospital's financial health with automated cashier reporting and real-time insights.</p>
            </div>
            <div className={styles.userCard}>
              <div className={styles.userHeader}>
                <span className={styles.userEmoji}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </span>
                <h4>Billing Cashiers</h4>
              </div>
              <p>Process payments efficiently with integrated multi-method support, ensuring accurate reconciliation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. CALL TO ACTION ─── */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaContent}>
          <h2>Ready to access the system?</h2>
          <div className={styles.ctaButtons} style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/login" className={styles.primaryBtnLarge} style={{ backgroundColor: 'white', color: '#2563eb', border: 'none' }}>Staff Login</Link>
            <Link to="/patient/view" className={styles.primaryBtnLarge} style={{ backgroundColor: 'transparent', color: 'white', border: '2px solid white' }}>Patient Portal</Link>
          </div>
        </div>
      </section>

      {/* ─── 6. FOOTER ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.logoSmall}>HospitalBilling Rwanda</div>
          <p>Streamlined healthcare and transparent billing.</p>
        </div>
        <div className={styles.footerInfo}>
          <div className={styles.contactInfo}>
            <span>Support: +250 780 000 000</span>
            <span>Email: help@hospitalbilling.rw</span>
          </div>
          <p className={styles.copy}>© {new Date().getFullYear()} HospitalBilling. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
