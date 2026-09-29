import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  FileSignature,
  Plus,
  UserPlus,
  Euro,
} from 'lucide-react'
import { consentExpiringSoon, effectiveConsentStatus, useCurrentStaff, useStore } from '../../store'
import { apptStatus, priorityTone } from '../../lib/labels'
import { can } from '../../lib/permissions'
import { cx, fLong, fMoney, fTime, relativeDays, sameDay, todayKey } from '../../lib/utils'
import { Avatar, Badge, Button, Card, Empty, Stat } from '../../components/ui'
import { AppointmentDetailModal, NewAppointmentModal } from '../../components/AppointmentDialogs'
import { NewPatientModal } from './Patients'
import type { Appointment } from '../../types'

export default function Dashboard() {
  const user = useCurrentStaff()!
  const { appointments, patients, services, professionals, tasks, consents, documents, treatments, payments, consentTemplates } = useStore()
  const toggleTask = useStore((s) => s.toggleTask)
  const navigate = useNavigate()
  const [newAppt, setNewAppt] = useState(false)
  const [newPatient, setNewPatient] = useState(false)
  const [detail, setDetail] = useState<Appointment | null>(null)

  const isProf = user.role === 'sanitario' && user.professionalId
  const now = new Date()
  const today = appointments
    .filter((a) => sameDay(a.start, now) && !['replanificada'].includes(a.status))
    .filter((a) => !isProf || a.professionalId === user.professionalId)
    .sort((a, b) => a.start.localeCompare(b.start))

  const pendingConfirm = appointments.filter((a) => a.status === 'pendiente' && a.start > now.toISOString())
  const replan = appointments.filter((a) => a.status === 'replanificacion')
  const myTasks = tasks
    .filter((t) => !t.done && (user.role === 'admin' || user.role === 'direccion' || t.role === user.role))
    .sort((a, b) => a.due.localeCompare(b.due) || (a.priority === 'alta' ? -1 : 1))
  const expired = consents.filter((c) => effectiveConsentStatus(c) === 'caducado')
  const expiring = consents.filter((c) => consentExpiringSoon(c))
  const docsPending = documents.filter((d) => d.reviewStatus === 'pendiente')
  const overdueReview = treatments.filter((t) => t.status !== 'finalizado' && t.reviewDate && t.reviewDate < todayKey())
  const monthIncome = payments.filter((p) => new Date(p.date).getMonth() === now.getMonth() && new Date(p.date).getFullYear() === now.getFullYear()).reduce((a, p) => a + p.amount, 0)

  const pname = (id: string) => {
    const p = patients.find((x) => x.id === id)
    return p ? `${p.firstName} ${p.lastName}` : ''
  }

  const alerts = useMemo(
    () => [
      ...replan.map((a) => ({ id: a.id, icon: CalendarClock, tone: 'orange' as const, text: `${pname(a.patientId)} solicita replanificar su cita`, sub: `${services.find((s) => s.id === a.serviceId)?.name} · ${relativeDays(a.start)}`, to: `/app/pacientes/${a.patientId}` })),
      ...expired.map((c) => ({ id: c.id, icon: FileSignature, tone: 'red' as const, text: `Consentimiento caducado: ${pname(c.patientId)}`, sub: consentTemplates.find((t) => t.id === c.templateId)?.name ?? '', to: '/app/consentimientos' })),
      ...expiring.map((c) => ({ id: c.id, icon: FileSignature, tone: 'amber' as const, text: `Consentimiento próximo a caducar: ${pname(c.patientId)}`, sub: `${consentTemplates.find((t) => t.id === c.templateId)?.name} · caduca ${relativeDays(c.expiresAt!)}`, to: '/app/consentimientos' })),
      ...overdueReview.map((t) => ({ id: t.id, icon: AlertTriangle, tone: 'amber' as const, text: `Revisión vencida: ${t.name}`, sub: `${pname(t.patientId)} · ${relativeDays(t.reviewDate!)}`, to: `/app/pacientes/${t.patientId}` })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [replan.length, expired.length, expiring.length, overdueReview.length, patients],
  )

  const hour = now.getHours()
  const greet = hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{fLong(now)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{greet}, {user.name.replace(/^Dra?\.\s*/, '').split(' ')[0]}</h1>
        </div>
        <div className="flex gap-2">
          {can(user.role, 'pacientes') && user.role !== 'facturacion' && user.role !== 'privacidad' && (
            <Button variant="secondary" icon={UserPlus} onClick={() => setNewPatient(true)}>Nuevo paciente</Button>
          )}
          {can(user.role, 'agenda') && user.role !== 'direccion' && <Button icon={Plus} onClick={() => setNewAppt(true)}>Nueva cita</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label={isProf ? 'Mis citas hoy' : 'Citas hoy'} value={today.filter((a) => a.status !== 'cancelada').length} hint={`${today.filter((a) => a.status === 'atendida').length} atendidas`} icon={CalendarDays} />
        <Stat label="Pendientes de confirmar" value={pendingConfirm.length} hint="Próximos días" icon={CalendarCheck2} tone="amber" />
        <Stat label="Tareas pendientes" value={myTasks.length} hint={`${myTasks.filter((t) => t.due <= todayKey()).length} para hoy o vencidas`} icon={ClipboardList} tone="violet" />
        <Stat label="Docs. por revisar" value={docsPending.length} hint="Resultados e informes" icon={FileSearch} tone="blue" />
        {can(user.role, 'economico') ? (
          <Stat label="Cobrado este mes" value={fMoney(monthIncome)} hint={`${payments.filter((p) => new Date(p.date).getMonth() === now.getMonth()).length} cobros`} icon={Euro} tone="green" />
        ) : (
          <Stat label="Consentimientos" value={expired.length + expiring.length} hint="Caducados o por caducar" icon={FileSignature} tone="red" />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={isProf ? 'Mi agenda de hoy' : 'Agenda de hoy'}
          icon={CalendarDays}
          padded={false}
          action={can(user.role, 'agenda') && <Link to="/app/agenda" className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">Ver agenda <ArrowRight className="h-3 w-3" /></Link>}
        >
          {today.length === 0 ? (
            <Empty icon={CalendarDays} title="No hay citas hoy" />
          ) : (
            <ul className="scroll-thin max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
              {today.map((a) => {
                const p = patients.find((x) => x.id === a.patientId)!
                const prof = professionals.find((x) => x.id === a.professionalId)!
                const svc = services.find((x) => x.id === a.serviceId)!
                const st = apptStatus[a.status]
                const isNow = a.start <= now.toISOString() && now.toISOString() < a.end
                return (
                  <li key={a.id}>
                    <button onClick={() => setDetail(a)} className={cx('flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-slate-50', isNow && 'bg-brand-50/40')}>
                      <div className="w-14 shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-800">{fTime(a.start)}</p>
                        <p className="text-[11px] text-slate-400">{fTime(a.end)}</p>
                      </div>
                      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: prof.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-800">
                          {p.firstName} {p.lastName}
                          {p.allergies.some((x) => x.status === 'activa') && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        </p>
                        <p className="truncate text-xs text-slate-500">{svc.name} · {prof.name}</p>
                      </div>
                      <Badge tone={st.tone} dot>{st.label}</Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Alertas" icon={AlertTriangle} padded={false} action={<Badge tone={alerts.length ? 'red' : 'green'}>{alerts.length}</Badge>}>
          {alerts.length === 0 ? (
            <Empty icon={CheckCircle2} title="Todo en orden" />
          ) : (
            <ul className="scroll-thin max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
              {alerts.map((al) => (
                <li key={al.id}>
                  <button onClick={() => navigate(al.to)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <span className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', al.tone === 'red' ? 'bg-red-50 text-red-600' : al.tone === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600')}>
                      <al.icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">{al.text}</p>
                      <p className="truncate text-xs text-slate-500">{al.sub}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Mis tareas prioritarias" icon={ClipboardList} padded={false} action={<Link to="/app/tareas" className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">Ver todas <ArrowRight className="h-3 w-3" /></Link>}>
        {myTasks.length === 0 ? (
          <Empty icon={CheckCircle2} title="Sin tareas pendientes" />
        ) : (
          <ul className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-y-0">
            {myTasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-start gap-3 border-slate-100 px-5 py-3 md:border-b">
                <button onClick={() => toggleTask(t.id)} className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300 hover:border-brand-500" title="Marcar como hecha" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    {t.patientId && (
                      <Link to={`/app/pacientes/${t.patientId}`} className="hover:text-brand-700 hover:underline">{pname(t.patientId)}</Link>
                    )}
                    {t.patientId && ' · '}
                    <span className={cx(t.due < todayKey() && 'font-medium text-red-600')}>{relativeDays(t.due)}</span>
                  </p>
                </div>
                <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {user.role !== 'sanitario' && (
        <div className="grid gap-4 md:grid-cols-5">
          {professionals.filter((p) => p.active).map((prof) => {
            const list = appointments.filter((a) => a.professionalId === prof.id && sameDay(a.start, now) && !['cancelada', 'replanificada'].includes(a.status))
            const mins = list.reduce((acc, a) => acc + (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000, 0)
            const occ = Math.min(100, Math.round((mins / 480) * 100))
            return (
              <div key={prof.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <Avatar name={prof.name} size="sm" color={prof.color} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{prof.name}</p>
                    <p className="text-[11px] text-slate-500">{prof.specialty}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-xs text-slate-500">{list.length} citas</p>
                  <p className="text-sm font-semibold">{occ}%</p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${occ}%`, background: prof.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewAppointmentModal open={newAppt} onClose={() => setNewAppt(false)} defaults={{ professionalId: user.professionalId }} />
      <NewPatientModal open={newPatient} onClose={() => setNewPatient(false)} />
      <AppointmentDetailModal appt={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
