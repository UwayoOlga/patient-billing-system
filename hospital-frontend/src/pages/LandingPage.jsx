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
          <span className={styles.badge}>Safe & Transparent Care</span>
          <h1>View Your Hospital Bill Anytime, Anywhere</h1>
          <p>
            Access your billing details in real time, understand your charges, and save time at the hospital. 
          </p>
          <div className={styles.heroCta}>
            <Link to="/patient/view" className={styles.primaryBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              View My Bill
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
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3>Identify</h3>
              <p>Enter your <strong>Bill ID</strong> or scan your visit QR code</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3>Track</h3>
              <p>View your <strong>items & services</strong> being added in real time</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3>Confirm</h3>
              <p>Pay faster at the cashier with a pre-validated total</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURES OVERVIEW ─── */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Features</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📄</div>
              <h4>Real-time Access</h4>
              <p>See charges as they are added by doctors or lab techs.</p>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📊</div>
              <h4>Itemized Breakdown</h4>
              <p>Clear details for every medicine and test prescribed.</p>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📱</div>
              <h4>Cross-Device</h4>
              <p>Works perfectly on your smartphone or hospital kiosk.</p>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🧾</div>
              <h4>Download History</h4>
              <p>Get your digital receipt immediately after payment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. WHO IT IS FOR ─── */}
      <section className={styles.whoItIsFor}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Practical Solution For Everyone</h2>
          <div className={styles.userGrid}>
            <div className={styles.userCard}>
              <div className={styles.userHeader}>
                <span className={styles.userEmoji}>👤</span>
                <h4>Patients</h4>
              </div>
              <p>View bills easily without waiting in queues just to check a price.</p>
            </div>
            <div className={styles.userCard}>
              <div className={styles.userHeader}>
                <span className={styles.userEmoji}>🏥</span>
                <h4>Hospitals</h4>
              </div>
              <p>Reduce physical crowds in the billing hall and automate records.</p>
            </div>
            <div className={styles.userCard}>
              <div className={styles.userHeader}>
                <span className={styles.userEmoji}>💰</span>
                <h4>Cashiers</h4>
              </div>
              <p>Process payments faster with instantly verified digital bills.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. CALL TO ACTION ─── */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaContent}>
          <h2>Ready to check your visit details?</h2>
          <div className={styles.ctaButtons}>
            <Link to="/patient/view" className={styles.primaryBtnLarge}>Enter Bill ID</Link>
          </div>
        </div>
      </section>

      {/* ─── 6. FOOTER ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.logoSmall}>HospitalBilling Rwanda</div>
          <p>Transparent billing for a healthier nation.</p>
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
