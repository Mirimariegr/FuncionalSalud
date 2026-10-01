import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useStore } from './store'
import { Toaster } from './components/ui'
import Login from './pages/Login'
import StaffLayout from './components/StaffLayout'
import PatientLayout from './components/PatientLayout'
import Dashboard from './pages/app/Dashboard'
import Agenda from './pages/app/Agenda'
import Patients from './pages/app/Patients'
import PatientDetail from './pages/app/PatientDetail'
import Tasks from './pages/app/Tasks'
import Documents from './pages/app/Documents'
import Consents from './pages/app/Consents'
import Treatments from './pages/app/Treatments'
import Billing from './pages/app/Billing'
import Reports from './pages/app/Reports'
import Settings from './pages/app/Settings'
import Users from './pages/app/Users'
import Audit from './pages/app/Audit'
import PortalHome from './pages/portal/PortalHome'
import PortalAppointments from './pages/portal/PortalAppointments'
import PortalDocuments from './pages/portal/PortalDocuments'
import PortalConsents from './pages/portal/PortalConsents'
import PortalTreatments from './pages/portal/PortalTreatments'
import PortalBilling from './pages/portal/PortalBilling'
import PortalProfile from './pages/portal/PortalProfile'
import PortalMessages from './pages/portal/PortalMessages'
import PortalPrescriptions from './pages/portal/PortalPrescriptions'
import Messages from './pages/app/Messages'

function RequireSession({ kind, children }: { kind: 'staff' | 'patient'; children: ReactNode }) {
  const session = useStore((s) => s.session)
  if (!session || session.kind !== kind) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/app" element={<RequireSession kind="staff"><StaffLayout /></RequireSession>}>
          <Route index element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="pacientes" element={<Patients />} />
          <Route path="pacientes/:id" element={<PatientDetail />} />
          <Route path="tareas" element={<Tasks />} />
          <Route path="mensajes" element={<Messages />} />
          <Route path="documentos" element={<Documents />} />
          <Route path="consentimientos" element={<Consents />} />
          <Route path="tratamientos" element={<Treatments />} />
          <Route path="economico" element={<Billing />} />
          <Route path="informes" element={<Reports />} />
          <Route path="configuracion" element={<Settings />} />
          <Route path="usuarios" element={<Users />} />
          <Route path="auditoria" element={<Audit />} />
        </Route>
        <Route path="/portal" element={<RequireSession kind="patient"><PatientLayout /></RequireSession>}>
          <Route index element={<PortalHome />} />
          <Route path="citas" element={<PortalAppointments />} />
          <Route path="recetas" element={<PortalPrescriptions />} />
          <Route path="mensajes" element={<PortalMessages />} />
          <Route path="documentos" element={<PortalDocuments />} />
          <Route path="consentimientos" element={<PortalConsents />} />
          <Route path="tratamientos" element={<PortalTreatments />} />
          <Route path="pagos" element={<PortalBilling />} />
          <Route path="datos" element={<PortalProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  )
}
