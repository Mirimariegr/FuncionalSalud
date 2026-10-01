import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Euro,
  FileSignature,
  FileText,
  HeartPulse,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  RotateCcw,
  Settings,
  Shield,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCurrentStaff, useStore } from '../store'
import { can, type Module } from '../lib/permissions'
import { roleLabel } from '../lib/labels'
import { cx, normalize, todayKey } from '../lib/utils'
import { Avatar, Badge } from './ui'

const nav: { to: string; label: string; icon: LucideIcon; module: Module; group: string }[] = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard, module: 'dashboard', group: 'Operativa' },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays, module: 'agenda', group: 'Operativa' },
  { to: '/app/pacientes', label: 'Pacientes', icon: Users, module: 'pacientes', group: 'Operativa' },
  { to: '/app/tareas', label: 'Tareas y alertas', icon: ClipboardCheck, module: 'tareas', group: 'Operativa' },
  { to: '/app/mensajes', label: 'Mensajes', icon: MessageCircle, module: 'mensajes', group: 'Operativa' },
  { to: '/app/documentos', label: 'Documentos', icon: FileText, module: 'documentos', group: 'Clínica' },
  { to: '/app/consentimientos', label: 'Consentimientos', icon: FileSignature, module: 'consentimientos', group: 'Clínica' },
  { to: '/app/tratamientos', label: 'Tratamientos', icon: Stethoscope, module: 'tratamientos', group: 'Clínica' },
  { to: '/app/economico', label: 'Presupuestos y pagos', icon: Euro, module: 'economico', group: 'Gestión' },
  { to: '/app/informes', label: 'Informes', icon: BarChart3, module: 'informes', group: 'Gestión' },
  { to: '/app/configuracion', label: 'Configuración', icon: Settings, module: 'configuracion', group: 'Administración' },
  { to: '/app/usuarios', label: 'Usuarios y permisos', icon: Shield, module: 'usuarios', group: 'Administración' },
  { to: '/app/auditoria', label: 'Auditoría', icon: History, module: 'auditoria', group: 'Administración' },
]

const moduleByPath = (path: string): Module | null => {
  const seg = path.split('/')[2]
  if (!seg) return 'dashboard'
  const item = nav.find((n) => n.to === `/app/${seg}`)
  return item?.module ?? null
}

export default function StaffLayout() {
  const user = useCurrentStaff()!
  const logout = useStore((s) => s.logout)
  const resetDemo = useStore((s) => s.resetDemo)
  const toast = useStore((s) => s.toast)
  const tasks = useStore((s) => s.tasks)
  const unreadMsgs = useStore((s) => s.conversations.filter((c) => c.unreadClinic).length)
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const pending = tasks.filter((t) => !t.done && (user.role === 'admin' || user.role === 'direccion' || t.role === user.role)).length
  const overdue = tasks.filter((t) => !t.done && t.due <= todayKey() && (user.role === 'admin' || t.role === user.role)).length
  const current = moduleByPath(location.pathname)
  const allowed = current ? can(user.role, current) : true

  useEffect(() => setOpen(false), [location.pathname])

  const groups = [...new Set(nav.map((n) => n.group))]

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-900/20">
          <HeartPulse className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">Funcional Salud</p>
          <p className="text-[11px] text-slate-500">Gestor de pacientes</p>
        </div>
      </div>
      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g) => {
          const items = nav.filter((n) => n.group === g && can(user.role, n.module))
          if (!items.length) return null
          return (
            <div key={g}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
              <div className="space-y-0.5">
                {items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.to === '/app'}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )
                    }
                  >
                    <n.icon className="h-4 w-4" />
                    <span className="flex-1">{n.label}</span>
                    {n.module === 'tareas' && pending > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{pending}</span>}
                    {n.module === 'mensajes' && unreadMsgs > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{unreadMsgs}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button
          onClick={() => { resetDemo(); toast('Datos de demo restablecidos') }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restablecer datos de demo
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-72 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate('/app/tareas')} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Tareas y alertas">
              <Bell className="h-5 w-5" />
              {overdue > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{overdue}</span>}
            </button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2.5">
              <Avatar name={user.name} size="sm" />
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-[11px] text-slate-500">{roleLabel[user.role]}</p>
              </div>
            </div>
            <button onClick={() => { logout(); navigate('/') }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Cambiar de usuario">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="scroll-thin flex-1 overflow-y-auto">
          <div key={location.pathname} className="animate-fade-up mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
            {allowed ? <Outlet /> : <Forbidden />}
          </div>
        </main>
      </div>
    </div>
  )
}

function Forbidden() {
  const user = useCurrentStaff()!
  const log = useStore((s) => s.log)
  const { pathname } = useLocation()
  useEffect(() => log('Acceso denegado', 'Módulo', `Intento de acceso a ${pathname}`), [log, pathname])
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500"><Shield className="h-6 w-6" /></span>
      <h2 className="mt-4 text-lg font-semibold">Acceso no autorizado</h2>
      <p className="mt-1 text-sm text-slate-500">
        El perfil <Badge>{roleLabel[user.role]}</Badge> no tiene permisos para este módulo. El intento ha quedado registrado en auditoría.
      </p>
    </div>
  )
}

function GlobalSearch() {
  const patients = useStore((s) => s.patients)
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLInputElement>(null)
  const results = useMemo(() => {
    const n = normalize(q)
    if (n.length < 2) return []
    return patients
      .filter((p) => normalize(`${p.firstName} ${p.lastName} ${p.nhc} ${p.docId} ${p.phone}`).includes(n))
      .slice(0, 6)
  }, [q, patients])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="relative w-full max-w-md">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder="Buscar paciente por nombre, NHC, DNI o teléfono…"
        className="h-9 w-full rounded-lg bg-slate-100 pl-9 pr-12 text-sm outline-none ring-brand-500 transition placeholder:text-slate-400 focus:bg-white focus:ring-2"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded bg-white px-1.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200 sm:block">Ctrl K</kbd>
      {focus && results.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          {results.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => { navigate(`/app/pacientes/${p.id}`); setQ('') }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <Avatar name={`${p.firstName} ${p.lastName}`} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{p.firstName} {p.lastName}</p>
                <p className="text-[11px] text-slate-500">{p.nhc} · {p.docId} · {p.phone}</p>
              </div>
              {p.allergies.some((a) => a.status === 'activa') && <Badge tone="red">Alergias</Badge>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
