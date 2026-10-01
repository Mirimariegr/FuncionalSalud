import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, Mic, Clock, DoorOpen, History, MapPin, Stethoscope, User } from 'lucide-react'
import { useRole, useStore } from '../store'
import { apptStatus, apptTransitions } from '../lib/labels'
import { canEdit } from '../lib/permissions'
import { atTime, fDateTime, fLong, fTime, pad, toDateKey } from '../lib/utils'
import type { Appointment, AppointmentStatus } from '../types'
import { Avatar, Badge, Button, Field, Input, Modal, Select } from './ui'
import { SessionRecorder } from './SessionRecorder'
import { ErrorBoundary } from './ErrorBoundary'

export function NewAppointmentModal({
  open,
  onClose,
  defaults,
}: {
  open: boolean
  onClose: () => void
  defaults?: { patientId?: string; professionalId?: string; date?: string; time?: string; centerId?: string }
}) {
  const { patients, services, professionals, rooms, centers } = useStore()
  const createAppointment = useStore((s) => s.createAppointment)
  const checkConflicts = useStore((s) => s.checkConflicts)
  const toast = useStore((s) => s.toast)

  const init = () => ({
    patientId: defaults?.patientId ?? '',
    professionalId: defaults?.professionalId ?? professionals[0].id,
    serviceId: '',
    centerId: defaults?.centerId ?? 'c1',
    roomId: '',
    date: defaults?.date ?? toDateKey(new Date()),
    time: defaults?.time ?? '10:00',
    reason: '',
    status: 'pendiente' as AppointmentStatus,
  })
  const [f, setF] = useState(init)
  const [errors, setErrors] = useState<string[]>([])
  const [patientQuery, setPatientQuery] = useState('')

  useEffect(() => {
    if (open) {
      setF(init())
      setErrors([])
      setPatientQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const prof = professionals.find((p) => p.id === f.professionalId)
  const profServices = services.filter((s) => prof?.serviceIds.includes(s.id) && s.active)
  const svc = services.find((s) => s.id === f.serviceId) ?? profServices[0]
  const centerOptions = centers.filter((c) => prof?.centerIds.includes(c.id))
  const centerId = centerOptions.some((c) => c.id === f.centerId) ? f.centerId : centerOptions[0]?.id
  const roomOptions = rooms.filter((r) => r.centerId === centerId && r.active && (!svc?.roomType || r.type === svc.roomType))

  const [h, m] = f.time.split(':').map(Number)
  const start = atTime(new Date(`${f.date}T00:00:00`), h, m)
  const end = new Date(start.getTime() + (svc?.duration ?? 30) * 60000)
  const roomId = f.roomId && roomOptions.some((r) => r.id === f.roomId) ? f.roomId : roomOptions[0]?.id

  const liveConflicts = useMemo(
    () => (f.patientId && svc ? checkConflicts({ professionalId: f.professionalId, roomId, patientId: f.patientId, start: start.toISOString(), end: end.toISOString() }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f.patientId, f.professionalId, roomId, f.date, f.time, svc?.id, checkConflicts],
  )

  const filteredPatients = patients
    .filter((p) => p.status !== 'archivado')
    .filter((p) => `${p.firstName} ${p.lastName} ${p.nhc}`.toLowerCase().includes(patientQuery.toLowerCase()))
    .slice(0, 50)
  const selectedPatient = patients.find((p) => p.id === f.patientId)

  const submit = () => {
    if (!f.patientId || !svc) {
      setErrors(['Selecciona paciente y servicio.'])
      return
    }
    const res = createAppointment({
      patientId: f.patientId,
      serviceId: svc.id,
      professionalId: f.professionalId,
      centerId: centerId!,
      roomId,
      start: start.toISOString(),
      end: end.toISOString(),
      status: f.status,
      reason: f.reason || svc.name,
    })
    if (!res.ok) {
      setErrors(res.errors)
      return
    }
    toast(`Cita creada para ${selectedPatient?.firstName}. ${f.status === 'pendiente' ? 'Se ha enviado solicitud de confirmación (simulada).' : ''}`)
    onClose()
  }

  const times: string[] = []
  for (let hh = 8; hh < 21; hh++) for (const mm of [0, 15, 30, 45]) times.push(`${pad(hh)}:${pad(mm)}`)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva cita"
      subtitle="El sistema valida disponibilidad de profesional, sala y paciente."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={liveConflicts.length > 0}>Crear cita</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paciente" className="sm:col-span-2">
          {selectedPatient ? (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
              <Avatar name={`${selectedPatient.firstName} ${selectedPatient.lastName}`} size="sm" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-xs text-slate-500">{selectedPatient.nhc} · {selectedPatient.phone}</p>
              </div>
              {selectedPatient.allergies.some((a) => a.status === 'activa') && <Badge tone="red">Alergias activas</Badge>}
              {!defaults?.patientId && <Button size="sm" variant="ghost" onClick={() => setF({ ...f, patientId: '' })}>Cambiar</Button>}
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Buscar paciente…" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} autoFocus />
              <div className="scroll-thin max-h-40 overflow-y-auto rounded-lg ring-1 ring-slate-200">
                {filteredPatients.map((p) => (
                  <button key={p.id} type="button" onClick={() => setF({ ...f, patientId: p.id })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50">
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    <span className="text-xs text-slate-400">{p.nhc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Field>
        <Field label="Profesional">
          <Select value={f.professionalId} onChange={(e) => setF({ ...f, professionalId: e.target.value, serviceId: '', roomId: '' })}>
            {professionals.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.specialty}</option>)}
          </Select>
        </Field>
        <Field label="Servicio">
          <Select value={svc?.id ?? ''} onChange={(e) => setF({ ...f, serviceId: e.target.value, roomId: '' })}>
            {profServices.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration} min</option>)}
          </Select>
        </Field>
        <Field label="Centro">
          <Select value={centerId} onChange={(e) => setF({ ...f, centerId: e.target.value, roomId: '' })}>
            {centerOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Sala / recurso">
          <Select value={roomId ?? ''} onChange={(e) => setF({ ...f, roomId: e.target.value })}>
            {roomOptions.length === 0 && <option value="">Sin sala requerida</option>}
            {roomOptions.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.type}</option>)}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Hora de inicio" hint={svc ? `Fin previsto: ${fTime(end.toISOString())}` : undefined}>
          <Select value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}>
            {times.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Estado inicial">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AppointmentStatus })}>
            <option value="pendiente">Pendiente de confirmación (envía solicitud)</option>
            <option value="confirmada">Confirmada</option>
            <option value="propuesta">Propuesta</option>
            <option value="espera">Lista de espera</option>
          </Select>
        </Field>
        <Field label="Motivo">
          <Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Motivo de consulta o nota administrativa" />
        </Field>
      </div>
      {svc?.consentTemplateId && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <AlertTriangle className="h-4 w-4" /> Este servicio requiere consentimiento informado. Verifica que esté vigente antes de la cita.
        </p>
      )}
      {[...new Set([...liveConflicts, ...errors])].length > 0 && (
        <div className="mt-4 space-y-1 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> No se puede reservar</p>
          {[...new Set([...liveConflicts, ...errors])].map((e) => <p key={e} className="pl-6 text-xs">{e}</p>)}
        </div>
      )}
    </Modal>
  )
}

export function AppointmentDetailModal({ appt, onClose }: { appt: Appointment | null; onClose: () => void }) {
  const { patients, services, professionals, rooms, centers } = useStore()
  const setStatus = useStore((s) => s.setAppointmentStatus)
  const reschedule = useStore((s) => s.rescheduleAppointment)
  const toast = useStore((s) => s.toast)
  const current = useStore((s) => s.appointments.find((a) => a.id === appt?.id))
  const role = useRole()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'view' | 'reschedule'>('view')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [session, setSession] = useState(false)

  useEffect(() => {
    if (appt) {
      setSession(false)
      setMode('view')
      setErrors([])
      const d = new Date(appt.start)
      d.setDate(d.getDate() + 7)
      setDate(toDateKey(d))
      setTime(fTime(appt.start))
    }
  }, [appt])

  if (!appt || !current) return null
  if (session) return <ErrorBoundary onReset={() => { setSession(false); onClose() }}><SessionRecorder appt={current} onClose={() => { setSession(false); onClose() }} /></ErrorBoundary>
  const a = current
  const clinician = canEdit(role, 'clinico')
  const p = patients.find((x) => x.id === a.patientId)!
  const svc = services.find((x) => x.id === a.serviceId)!
  const prof = professionals.find((x) => x.id === a.professionalId)!
  const room = rooms.find((x) => x.id === a.roomId)
  const center = centers.find((x) => x.id === a.centerId)
  const st = apptStatus[a.status]
  const editable = canEdit(role, 'agenda')
  const next = apptTransitions[a.status]

  const doReschedule = () => {
    const [h, m] = time.split(':').map(Number)
    const s = atTime(new Date(`${date}T00:00:00`), h, m)
    const e = new Date(s.getTime() + svc.duration * 60000)
    const res = reschedule(a.id, s.toISOString(), e.toISOString())
    if (!res.ok) return setErrors(res.errors)
    toast('Cita replanificada. Se ha notificado al paciente (simulado).')
    onClose()
  }

  const actionLabel: Partial<Record<AppointmentStatus, string>> = {
    confirmada: 'Confirmar',
    en_curso: 'Iniciar atención',
    atendida: 'Marcar atendida',
    no_presentada: 'No presentado',
    cancelada: 'Cancelar cita',
    replanificacion: 'Solicitar replanificación',
    pendiente: 'Enviar a confirmar',
  }

  return (
    <Modal open onClose={onClose} title={svc.name} subtitle={fLong(a.start)} size="md">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate(`/app/pacientes/${p.id}`)} className="flex items-center gap-3 text-left hover:opacity-80">
          <Avatar name={`${p.firstName} ${p.lastName}`} size="lg" />
          <div>
            <p className="font-semibold">{p.firstName} {p.lastName}</p>
            <p className="text-xs text-slate-500">{p.nhc} · {p.phone}</p>
          </div>
        </button>
        <Badge tone={st.tone} dot>{st.label}</Badge>
      </div>
      {p.allergies.some((x) => x.status === 'activa') && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="h-4 w-4" /> Alergias: {p.allergies.filter((x) => x.status === 'activa').map((x) => x.substance).join(', ')}
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {[
          { i: Clock, l: 'Horario', v: `${fTime(a.start)} – ${fTime(a.end)} (${svc.duration} min)` },
          { i: Stethoscope, l: 'Profesional', v: prof.name },
          { i: MapPin, l: 'Centro', v: center?.name },
          { i: DoorOpen, l: 'Sala', v: room?.name ?? '—' },
          { i: User, l: 'Motivo', v: a.reason },
          { i: CalendarClock, l: 'Precio orientativo', v: `${svc.price} €` },
        ].map(({ i: I, l, v }) => (
          <div key={l} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="flex items-center gap-1.5 text-[11px] text-slate-500"><I className="h-3.5 w-3.5" />{l}</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>

      {mode === 'reschedule' ? (
        <div className="mt-5 rounded-xl bg-orange-50/60 p-4 ring-1 ring-orange-200">
          <p className="mb-3 text-sm font-medium text-orange-800">Nueva fecha para la cita</p>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          {errors.map((e) => <p key={e} className="mt-2 text-xs text-red-600">{e}</p>)}
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode('view')}>Volver</Button>
            <Button size="sm" onClick={doReschedule}>Replanificar</Button>
          </div>
        </div>
      ) : (
        editable && (next.length > 0 || ['pendiente', 'confirmada', 'replanificacion', 'no_presentada'].includes(a.status)) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {next.filter((s) => s !== 'replanificacion').map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === 'cancelada' || s === 'no_presentada' ? 'danger' : s === 'confirmada' || s === 'atendida' || s === 'en_curso' ? 'primary' : 'secondary'}
                icon={s === 'en_curso' && clinician ? Mic : undefined}
                onClick={() => (s === 'en_curso' && clinician ? setSession(true) : (setStatus(a.id, s), toast(`Cita: ${apptStatus[s].label}`)))}
              >
                {s === 'en_curso' && clinician ? 'Iniciar atención · grabar y resumir' : actionLabel[s] ?? apptStatus[s].label}
              </Button>
            ))}
            {a.status === 'en_curso' && clinician && (
              <Button size="sm" icon={Mic} onClick={() => setSession(true)}>Grabar y resumir sesión</Button>
            )}
            {['pendiente', 'confirmada', 'replanificacion', 'no_presentada'].includes(a.status) && (
              <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => setMode('reschedule')}>Replanificar</Button>
            )}
          </div>
        )
      )}

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400"><History className="h-3.5 w-3.5" /> Historial</p>
        <ol className="space-y-1.5 border-l border-slate-200 pl-4">
          {a.history.slice().reverse().map((h, i) => (
            <li key={i} className="relative text-xs text-slate-600">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-slate-300 ring-2 ring-white" />
              <span className="font-medium text-slate-800">{apptStatus[h.status].label}</span> · {h.by} · {fDateTime(h.at)}
            </li>
          ))}
        </ol>
      </div>
    </Modal>
  )
}
