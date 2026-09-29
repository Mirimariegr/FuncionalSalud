import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Euro, FileSignature, FileText, HeartPulse, Home, LogOut, Activity, UserRound } from 'lucide-react'
import { useCurrentPatient, useStore } from '../store'
import { cx } from '../lib/utils'
import { Avatar } from './ui'

const items = [
  { to: '/portal', label: 'Inicio', icon: Home },
  { to: '/portal/citas', label: 'Mis citas', icon: CalendarDays },
  { to: '/portal/documentos', label: 'Documentos', icon: FileText },
  { to: '/portal/consentimientos', label: 'Consentimientos', icon: FileSignature },
  { to: '/portal/tratamientos', label: 'Tratamientos', icon: Activity },
  { to: '/portal/pagos', label: 'Presupuestos y pagos', icon: Euro },
  { to: '/portal/datos', label: 'Mis datos', icon: UserRound },
]

export default function PatientLayout() {
  const p = useCurrentPatient()!
  const logout = useStore((s) => s.logout)
  const pendingConsents = useStore((s) => s.consents.filter((c) => c.patientId === p.id && c.status === 'pendiente').length)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="min-h-full bg-gradient-to-b from-brand-50/70 via-slate-50 to-slate-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><HeartPulse className="h-5 w-5" /></span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Funcional Salud</p>
            <p className="text-[11px] text-slate-500">Portal del paciente</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Avatar name={`${p.firstName} ${p.lastName}`} size="sm" />
            <span className="hidden text-sm font-medium sm:block">{p.firstName}</span>
            <button onClick={() => { logout(); navigate('/') }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Salir"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <nav className="scroll-thin mx-auto hidden max-w-5xl gap-1 overflow-x-auto px-4 md:flex">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/portal'} className={({ isActive }) => cx('-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium', isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
              <i.icon className="h-4 w-4" />{i.label}
              {i.to === '/portal/consentimientos' && pendingConsents > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">{pendingConsents}</span>}
            </NavLink>
          ))}
        </nav>
      </header>
      <main key={location.pathname} className="animate-fade-up mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      {/* Navegación móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
        {items.filter((i) => i.to !== '/portal/tratamientos' && i.to !== '/portal/datos').map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === '/portal'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-brand-700' : 'text-slate-500')}>
            <i.icon className="h-5 w-5" />
            {i.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
