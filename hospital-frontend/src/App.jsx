import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import BillingDashboard from './pages/BillingDashboard'
import LabDashboard from './pages/LabDashboard'
import PharmacyDashboard from './pages/PharmacyDashboard'
import NurseDashboard from './pages/NurseDashboard'
import PatientPortal from './pages/PatientPortal'
import LandingPage from './pages/LandingPage'
import AdminDashboard from './pages/AdminDashboard'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import { getUser } from './utils/auth'

function ProtectedRoute({ children, role }) {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  
  if (role) {
    const normalizeRole = value => String(value || '').trim().toLowerCase()
    const allowedRoles = (Array.isArray(role) ? role : [role]).map(normalizeRole)
    const userRole = normalizeRole(user.role)
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/login" replace />
    }
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/patient/view" element={<PatientPortal />} />
      <Route
        path="/reception"
        element={
          <ProtectedRoute role="Receptionist">
            <ReceptionistDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute role="Doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute role={["Cashier", "Admin"]}>
            <BillingDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab"
        element={
          <ProtectedRoute role="LabTech">
            <LabDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse"
        element={
          <ProtectedRoute role="Nurse">
            <NurseDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute role="Pharmacist">
            <PharmacyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="Admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
