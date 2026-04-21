import { useState, useEffect } from 'react';
import api from '../utils/api';
import { getUser, logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import styles from './ReceptionistDashboard.module.css';
import ProfileTab from '../components/ProfileTab';

export default function ReceptionistDashboard() {
  const [user, setUserState] = useState(getUser());
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorage = () => setUserState(getUser());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [patients, setPatients] = useState([]);
  const [tab, setTab] = useState('patients'); // 'patients' | 'profile'
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [insuranceProv, setInsuranceProv] = useState('');
  const [insuranceNum, setInsuranceNum] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patient');
      setPatients(res.data);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoading(false);
    }
  };

  const [formErrors, setFormErrors] = useState({});

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setFormErrors({});
    try {
      const payload = {
        fullName: fullName.trim(),
        dateOfBirth: dob,
        phoneNumber: phone.trim(),
        insuranceProvider: insuranceProv || null,
        insuranceNumber: insuranceNum || null
      };

      if (editingId) {
        await api.put(`/patient/${editingId}`, payload);
      } else {
        await api.post('/patient', payload);
      }

      setShowModal(false);
      fetchPatients();
      // Reset form
      setEditingId(null);
      setFullName('');
      setDob('');
      setPhone('');
      setInsuranceProv('');
      setInsuranceNum('');
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.errors) {
        // Handle DataAnnotation validation errors
        setFormErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Error saving patient data. Please check your connection.');
      }
    }
  };

  const openAppModal = (patient = null) => {
    if (patient) {
      setEditingId(patient.id);
      setFullName(patient.fullName);
      setDob(patient.dateOfBirth?.split('T')[0] || ''); // Provide a safe formatted string if available
      setPhone(patient.phoneNumber);
      setInsuranceProv(patient.insuranceProvider || '');
      setInsuranceNum(patient.insuranceNumber || '');
    } else {
      setEditingId(null);
      setFullName('');
      setDob('');
      setPhone('');
      setInsuranceProv('');
      setInsuranceNum('');
    }
    setShowModal(true);
  };

  const handleOpenVisit = async (patientId) => {
    if (!window.confirm("Open a new visit for this patient?")) return;
    try {
      const res = await api.post('/bills', { patientId });
      alert(`Visit opened successfully! Reference: ${res.data.bill.billNumber}\n\nNote: This visit remains open until midnight or until finalized by billing. The patient should proceed directly to the Doctor's queue.`);
    } catch (err) {
      alert('Failed to open visit');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phoneNumber.includes(searchTerm)
  );

  return (
    <div className={styles.page}>
      {/* Mobile Overlay */}
      {mobileMenuOpen && <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sidebarLogo}>
          <svg className={styles.logoIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${tab === 'patients' ? styles.active : ''}`} onClick={() => { setTab('patients'); setMobileMenuOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Patients
          </button>
          <button className={`${styles.navItem} ${tab === 'profile' ? styles.active : ''}`} onClick={() => { setTab('profile'); setMobileMenuOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            My Profile
          </button>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.moduleTitle}>Welcome, {user?.name || 'Staff'}</h2>
          </div>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) || 'R'}</div>
            <div>
              <div className={styles.userName}>{user?.name || 'Staff'}</div>
              <div className={styles.userRole}>Registration Desk</div>
            </div>
          </div>
        </header>

        {tab === 'patients' ? (
          <>
            <div className={styles.tabToolbar}>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input 
                  type="text" 
                  placeholder="Search patients by name or phone..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <button className={styles.btnPrimary} onClick={() => openAppModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Patient
              </button>
            </div>

            {loading ? (
              <div className={styles.empty}>Loading hospital records...</div>
            ) : (
              <div className={styles.patientGrid}>
                {filteredPatients.map(patient => (
                  <div key={patient.id} className={styles.patientCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.patientAvatar}>
                        {patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.patientInfo}>
                        <h3>{patient.fullName}</h3>
                        <span className={styles.patientId}>P{String(patient.id).padStart(4, '0')}</span>
                      </div>
                    </div>
                    
                    <div className={styles.cardDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Contact</span>
                        <span className={styles.detailValue}>{patient.phoneNumber}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Insurance</span>
                        {patient.insuranceProvider ? (
                          <span className={styles.insuranceBadge}>{patient.insuranceProvider} ({patient.insuranceCoveragePercentage}%)</span>
                        ) : (
                          <span className={styles.detailValue}>Private Pay</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.cardActions} style={{display: 'flex', gap: '8px'}}>
                      <button 
                        className={styles.btnSecondary} 
                        onClick={() => handleOpenVisit(patient.id)}
                        style={{flex: 1}}
                      >
                        Open Visit
                      </button>
                      <button 
                        onClick={() => openAppModal(patient)}
                        style={{padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer', flexShrink: 0}}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className={styles.empty}>No patient records found matching "{searchTerm}"</div>
                )}
              </div>
            )}
          </>
        ) : (
          <ProfileTab />
        )}
      </main>

      {/* Registration Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? 'Edit Patient Details' : 'Register New Patient'}</h2>
              <p style={{fontSize: '13px', color: '#64748b', margin: '4px 0 16px 0'}}>Manage medical records and demographic data.</p>
            </div>
            <form onSubmit={handleRegisterPatient} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Full Name *</label>
                <input 
                  type="text" 
                  placeholder="Legal Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={formErrors.FullName ? styles.inputError : ''}
                  required 
                />
                {formErrors.FullName && <span className={styles.errorText}>{formErrors.FullName[0]}</span>}
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div className={styles.formGroup}>
                  <label>Date of Birth *</label>
                  <input 
                    type="date" 
                    value={dob}
                    max={new Date().toISOString().split('T')[0]} // dates after today can't be selected
                    onChange={e => setDob(e.target.value)}
                    className={formErrors.DateOfBirth ? styles.inputError : ''}
                    required 
                  />
                  {formErrors.DateOfBirth && <span className={styles.errorText}>{formErrors.DateOfBirth[0]}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Phone Number *</label>
                  <input 
                    type="tel" 
                    placeholder="+250..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={formErrors.PhoneNumber ? styles.inputError : ''}
                    required 
                  />
                  {formErrors.PhoneNumber && <span className={styles.errorText}>{formErrors.PhoneNumber[0]}</span>}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Insurance Provider</label>
                <select 
                  value={insuranceProv} 
                  onChange={e => setInsuranceProv(e.target.value)}
                >
                  <option value="">None (100% Patient Pay)</option>
                  <option value="RAMA">RAMA (80% Coverage)</option>
                  <option value="MMI">MMI (85% Coverage)</option>
                  <option value="SORAS">SORAS (90% Coverage)</option>
                </select>
              </div>

              {insuranceProv && (
                <div className={styles.formGroup}>
                  <label>Insurance Number *</label>
                  <input 
                    type="text" 
                    placeholder="Policy Number"
                    value={insuranceNum}
                    onChange={e => setInsuranceNum(e.target.value)}
                    required={!!insuranceProv}
                  />
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>{editingId ? 'Save Changes' : 'Complete Registration'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
