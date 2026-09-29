import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, HeartPulse, ShieldCheck, Smartphone, Stethoscope, UserRound } from 'lucide-react'
import { useStore } from '../store'
import { roleLabel } from '../lib/labels'
import { Avatar, Button } from '../components/ui'
import { cx } from '../lib/utils'

export default function Login() {
  const users = useStore((s) => s.users)
  const patients = useStore((s) => s.patients)
  const login = useStore((s) => s.login)
  const navigate = useNavigate()
  const [mode, setMode] = useState<'staff' | 'patient'>('staff')
  const [otp, setOtp] = useState<string | null>(null)
  const portalPatients = patients.filter((p) => p.portalEnabled).slice(0, 6)

  return (
    <div className="flex min-h-full">
      {/* Panel de marca */}
      <aside className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <HeartPulse className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight">Funcional Salud</p>
            <p className="text-xs text-brand-200">Gestor de pacientes · by Reliotek</p>
          </div>
        </div>
        <div className="relative mt-auto">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Toda la relación con tus pacientes,
            <br />
            <span className="text-brand-300">en un solo lugar.</span>
          </h1>
          <p className="mt-4 max-w-md text-brand-100/80">
            Agenda, ficha 360º, expediente, documentos, consentimientos trazables, tratamientos y presupuestos. Con un portal para que el paciente lo gestione sin instalar nada.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              { icon: Stethoscope, t: 'Multiespecialidad' },
              { icon: Building2, t: 'Multicentro' },
              { icon: ShieldCheck, t: 'RGPD y auditoría' },
            ].map(({ icon: I, t }) => (
              <div key={t} className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                <I className="h-4 w-4 text-brand-300" />
                <p className="mt-2 text-xs font-medium">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative mt-10 text-xs text-brand-200/70">Prototipo operativo para demo · Los datos son ficticios y se guardan en este navegador.</p>
      </aside>

      {/* Acceso */}
      <main className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-lg animate-fade-up">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <HeartPulse className="h-5 w-5" />
            </span>
            <p className="font-semibold">Funcional Salud</p>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Bienvenido</h2>
          <p className="mt-1 text-sm text-slate-500">Elige cómo quieres acceder a la demo.</p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(['staff', 'patient'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setOtp(null) }}
                className={cx('flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
              >
                {m === 'staff' ? <Building2 className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                {m === 'staff' ? 'Equipo de la clínica' : 'Portal del paciente'}
              </button>
            ))}
          </div>

          {mode === 'staff' ? (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Entrar como</p>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { login({ kind: 'staff', userId: u.id }); navigate('/app') }}
                  className="group flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:ring-brand-400 hover:shadow-md"
                >
                  <Avatar name={u.name} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500">{roleLabel[u.role]}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </button>
              ))}
            </div>
          ) : otp ? (
            <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Smartphone className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-medium">Verificación en dos pasos</p>
                  <p className="text-xs text-slate-500">Hemos enviado un código a tu móvil (simulado).</p>
                </div>
              </div>
              <div className="mt-5 flex justify-center gap-2">
                {'482915'.split('').map((d, i) => (
                  <span key={i} className="grid h-12 w-10 place-items-center rounded-lg bg-slate-50 text-lg font-semibold ring-1 ring-slate-200">{d}</span>
                ))}
              </div>
              <Button className="mt-6 w-full" onClick={() => { login({ kind: 'patient', userId: otp }); navigate('/portal') }}>
                Verificar y entrar
              </Button>
              <button onClick={() => setOtp(null)} className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-700">Volver</button>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pacientes de demostración</p>
              {portalPatients.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setOtp(p.id)}
                  className="group flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:ring-brand-400 hover:shadow-md"
                >
                  <Avatar name={`${p.firstName} ${p.lastName}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {p.firstName} {p.lastName}
                      {i === 0 && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Recomendado</span>}
                    </p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </button>
              ))}
              <p className="pt-2 text-xs text-slate-400">En producción el acceso será por invitación con autenticación reforzada.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
