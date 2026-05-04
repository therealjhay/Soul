import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import PassportPage from './pages/PassportPage'
import IssuersPage from './pages/IssuersPage'
import RecoveryPage from './pages/RecoveryPage'

export default function App() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/passport" element={<PassportPage />} />
        <Route path="/issuers" element={<IssuersPage />} />
        <Route path="/recovery" element={<RecoveryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
