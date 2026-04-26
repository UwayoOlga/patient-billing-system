import { Link } from 'react-router-dom'
import styles from './LandingPage.module.css'
import heroImage from '../assets/landingPageImage1.jpg'
import logo from '../assets/logo.jpg'

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.container} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Link to="/" className={styles.logo}>
            <img src={logo} alt="Hospital Logo" className={styles.logoImage} />
            <span className={styles.logoText}>Hospital Billing System</span>
          </Link>
          <div className={styles.navLinks}>
            <Link to="/patient/view" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '14px' }}>Patient Portal</Link>
            <Link to="/login" className={styles.loginBtn}>Staff Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <div className={styles.badge}>Healthcare Operational Excellence</div>
              <h1>Precision Billing. Exceptional Care.</h1>
              <p>
                The comprehensive healthcare management platform that bridges the gap between clinical excellence and financial transparency.
              </p>
              <div className={styles.heroCta}>
                <Link to="/login" className={styles.primaryBtn}>
                  Staff Login
                </Link>
                <Link to="/patient/view" className={styles.secondaryBtn}>View Bill</Link>
              </div>
            </div>
            <div className={styles.heroImageSide}>
              <div className={styles.heroDisplay}>
                <img src={heroImage} alt="System Dashboard" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>10k+</span>
              <span className={styles.statLabel}>Records Managed</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>99.9%</span>
              <span className={styles.statLabel}>Billing Accuracy</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>24/7</span>
              <span className={styles.statLabel}>Real-time Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className={styles.workflow}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Streamlined Clinical Workflows</h2>
            <p>From patient intake to final discharge, our system handles the complexity so you can focus on care.</p>
          </div>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>01</div>
              <h3>Intake & Registry</h3>
              <p>Efficient patient onboarding with automated insurance verification and demographic record management.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>02</div>
              <h3>Clinical Capture</h3>
              <p>Real-time clinical charge capture for consultations, lab investigations, and pharmacy prescriptions.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>03</div>
              <h3>Revenue Integrity</h3>
              <p>Transparent financial processing with comprehensive audit trails and institutional performance analytics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h18"/></svg>
              </div>
              <div className={styles.featureContent}>
                <h4>Departmental Isolation</h4>
                <p>Role-specific dashboards for Lab, Pharmacy, and Nursing to ensure data integrity and workflow focus.</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div className={styles.featureContent}>
                <h4>Digital Prescribing</h4>
                <p>Integrated prescription management with real-time stock adjustments and pharmacist fulfillment verification.</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div className={styles.featureContent}>
                <h4>Analytics Engine</h4>
                <p>Deep-dive financial reporting and clinical performance metrics for administrative decision making.</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className={styles.featureContent}>
                <h4>Security & Compliance</h4>
                <p>Audit-ready logs and secure patient identity management with enterprise-grade encryption standards.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Perspective Section */}
      <section className={styles.userFocus}>
        <div className={styles.container}>
          <div className={styles.userGrid}>
            <div className={styles.userCard}>
              <div className={styles.userIconLarge}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </div>
              <h4>Patient Empowerment</h4>
              <p>Transparent access to billing history and clinical summaries through our secure patient portal.</p>
            </div>
            <div className={styles.userCard}>
              <div className={styles.userIconLarge}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <h4>Clinical Efficiency</h4>
              <p>Reduced administrative burden for doctors and nurses with automated charge capture workflows.</p>
            </div>
            <div className={styles.userCard}>
              <div className={styles.userIconLarge}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <h4>Administrative Control</h4>
              <p>Complete institutional visibility with robust reporting tools and financial management modules.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBox}>
          <h2>Ready to Transform Your Hospital Operations?</h2>
          <p>Join hundreds of medical facilities streamlining their patient care and billing today.</p>
          <div className={styles.ctaFlex}>
            <Link to="/login" className={styles.ctaPrimary}>Enter Staff Portal</Link>
            <Link to="/patient/view" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, padding: '16px 32px' }}>Browse Patient Portal</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <h2>Hospital Billing System</h2>
              <p>Professional healthcare management and billing solution designed for the modern medical institution.</p>
            </div>
            <div className={styles.footerLinks}>
              <h5>Platform</h5>
              <ul>
                <li><Link to="/login">Staff Login</Link></li>
                <li><Link to="/patient/view">Patient Access</Link></li>
                <li><Link to="/">Terms of Service</Link></li>
              </ul>
            </div>
            <div className={styles.footerLinks}>
              <h5>Support</h5>
              <ul>
                <li><a href="mailto:support@hospitalbilling.rw">Contact Support</a></li>
                <li><a href="#">Knowledge Base</a></li>
                <li><a href="#">System Status</a></li>
              </ul>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© {new Date().getFullYear()} Hospital Billing System. Professional Healthcare Management.</p>
            <p>Privacy Policy | Audit Transparency</p>
          </div>
        </div>
      </footer>
    </div>
  )
}