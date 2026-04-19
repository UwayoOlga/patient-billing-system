import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import BillingDashboard from './pages/BillingDashboard'
import LabDashboard from './pages/LabDashboard'
import PharmacyDashboard from './pages/PharmacyDashboard'
import PatientPortal from './pages/PatientPortal'
import LandingPage from './pages/LandingPage'
import AdminDashboard from './pages/AdminDashboard'
import { getUser } from './utils/auth'

function ProtectedRoute({ children, role }) {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!allowedRoles.includes(user.role)) {
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
