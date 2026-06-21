import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './state'
import { Layout } from './components/Layout'
import { Setup } from './pages/Setup'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Patients } from './pages/Patients'
import { PatientDetail } from './pages/PatientDetail'
import { CoupleView } from './pages/CoupleView'
import { ChartEditor } from './pages/ChartEditor'
import { PrintView } from './pages/PrintView'
import { AuditLogPage } from './pages/AuditLogPage'
import { BackupPage } from './pages/BackupPage'
import { UsersPage } from './pages/UsersPage'

export function App() {
  const { ready, initialized, user } = useAuth()

  if (!ready) {
    return <div className="auth-wrap">불러오는 중…</div>
  }

  if (!initialized) {
    return <Setup />
  }

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/couple/:id" element={<CoupleView />} />
        <Route path="/charts/:chartId" element={<ChartEditor />} />
        <Route path="/charts/:chartId/print" element={<PrintView />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
