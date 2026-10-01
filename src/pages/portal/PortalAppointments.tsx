import { useMemo, useState } from 'react'
import { CalendarClock, CalendarPlus, Check, Clock, MapPin, Stethoscope, X } from 'lucide-react'
import { useCurrentPatient, useStore } from '../../store'
import { apptStatus } from '../../lib/labels'
import { addDays, atTime, cx, fDateShort, fLong, fTime, toDateKey, todayKey } from '../../lib/utils'
import { Badge, Button, Field, Modal, Select } from '../../components/ui'
import type { Appointment } from '../../types'

export function ApptActions({ a, inverted }: { a: Appointment; inverted?: boolean }) {
  const setStatus = useStore((s) => s.setAppointmentStatus)
  const toast = useStore((s) => s.toast)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const base = inverted ? 'bg-white/15 text-white ring-white/30 hover:bg-white/25' : ''
  if (!['pendiente', 'confirmada', 'propuesta'].includes(a.status)) {
    return a.status === 'replanificacion' ? <p className={cx('text-sm', inverted ? 'text-brand-100' : 'text-slate-500')}>La clínica te propondrá una nueva fecha en breve.</p> : null
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {a.status === 'pendiente' && (
          <Button className={inverted ? '!bg-white !text-brand-700 hover:!bg-brand-50' : ''} icon={Check} onClick={() => { setStatus(a.id, 'confirmada'); toast('¡Cita confirmada! Te esperamos.') }}>Confirmar asistencia</Button>
        )}
        <Button variant="secondary" className={base} icon={CalendarClock} onClick={() => { setStatus(a.id, 'replanificacion'); toast('Solicitud de cambio enviada a recepción') }}>Cambiar fecha</Button>
        <Button variant="secondary" className={base} icon={X} onClick={() => setConfirmCancel(true)}>Cancelar</Button>
      </div>
      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="¿Cancelar la cita?" size="sm"
        footer={<><Button variant="secondary" onClick={() => setConfirmCancel(false)}>Volver</Button><Button variant="danger" onClick={() => { setStatus(a.id, 'cancelada'); toast('Cita cancelada'); setConfirmCancel(false) }}>Sí, cancelar</Button></>}>
        <p className="text-sm text-slate-600">Se liberará el hueco para otros pacientes. Si lo prefieres, puedes pedir un cambio de fecha en lugar de cancelar.</p>
      </Modal>
    </>
  )
}

export default function PortalAppointments() {
  const p = useCurrentPatient()!
  const { appointments, services, professionals, centers } = useStore()
  const [open, setOpen] = useState(false)
  const now = new Date().toISOString()
  const mine = appointments.filter((a) => a.patientId === p.id && a.status !== 'replanificada')
  const upcoming = mine.filter((a) => a.start > now && a.status !== 'cancelada').sort((a, b) => a.start.localeCompare(b.start))
  const past = mine.filter((a) => a.start <= now || a.status === 'cancelada').sort((a, b) => b.start.localeCompare(a.start))

  const Row = ({ a }: { a: Appointment }) => {
    const d = new Date(a.start)
    return (
      <li className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-14 shrink-0 rounded-xl bg-brand-50 py-2 text-center text-brand-700">
            <p className="text-[10px] font-semibold uppercase">{d.toLocaleDateString('es-ES', { month: 'short' })}</p>
            <p className="text-xl font-semibold leading-none">{d.getDate()}</p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{services.find((s) => s.id === a.serviceId)?.name}</p>
              <Badge tone={apptStatus[a.status].tone} dot>{apptStatus[a.status].label}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fLong(a.start).split(',')[0]} · {fTime(a.start)}</span>
              <span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{professionals.find((x) => x.id === a.professionalId)?.name}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{centers.find((c) => c.id === a.centerId)?.name}</span>
            </div>
            {a.start > now && <div className="mt-3"><ApptActions a={a} /></div>}
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Citas</h1>
        <Button icon={CalendarPlus} onClick={() => setOpen(true)}>Pedir cita</Button>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Próximas</h2>
        {upcoming.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">No tienes citas próximas.</p> : <ul className="space-y-3">{upcoming.map((a) => <Row key={a.id} a={a} />)}</ul>}
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Historial</h2>
        <ul className="space-y-3">{past.slice(0, 10).map((a) => <Row key={a.id} a={a} />)}</ul>
      </section>
      <RequestAppointmentModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function RequestAppointmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useCurrentPatient()!
  const { services, professionals, rooms, centers } = useStore()
  const checkConflicts = useStore((s) => s.checkConflicts)
  const createAppointment = useStore((s) => s.createAppointment)
  const addTask = useStore((s) => s.addTask)
  const toast = useStore((s) => s.toast)
  const [svcId, setSvcId] = useState(services[1].id)
  const [day, setDay] = useState(toDateKey(addDays(new Date(), 1)))
  const [slot, setSlot] = useState<{ start: Date; profId: string; roomId?: string; centerId: string } | null>(null)
  const svc = services.find((s) => s.id === svcId)!

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1)).filter((d) => d.getDay() !== 0 && d.getDay() !== 6).slice(0, 8)
  const slots = useMemo(() => {
    const out: { start: Date; profId: string; roomId?: string; centerId: string }[] = []
    const profs = professionals.filter((x) => x.active && x.serviceIds.includes(svcId))
    for (let h = 9; h < 19; h++) {
      for (const m of [0, 30]) {
        const start = atTime(new Date(`${day}T00:00:00`), h, m)
        const end = new Date(start.getTime() + svc.duration * 60000)
        for (const pr of profs) {
          const centerId = pr.centerIds.includes(p.centerId) ? p.centerId : pr.centerIds[0]
          const room = rooms.find((r) => r.centerId === centerId && r.type === svc.roomType && checkConflicts({ professionalId: pr.id, roomId: r.id, patientId: p.id, start: start.toISOString(), end: end.toISOString() }).length === 0)
          const needsRoom = !!svc.roomType && rooms.some((r) => r.centerId === centerId && r.type === svc.roomType)
          if (needsRoom && !room) continue
          if (checkConflicts({ professionalId: pr.id, roomId: room?.id, patientId: p.id, start: start.toISOString(), end: end.toISOString() }).length) continue
          out.push({ start, profId: pr.id, roomId: room?.id, centerId })
          break
        }
      }
    }
    return out
  }, [day, svcId, svc, professionals, rooms, checkConflicts, p])

  const submit = () => {
    if (!slot) return
    const res = createAppointment({ patientId: p.id, serviceId: svcId, professionalId: slot.profId, centerId: slot.centerId, roomId: slot.roomId, start: slot.start.toISOString(), end: new Date(slot.start.getTime() + svc.duration * 60000).toISOString(), status: 'pendiente', reason: 'Solicitada desde el portal' })
    if (!res.ok) return toast(res.errors[0], 'error')
    addTask({ title: 'Revisar cita solicitada desde el portal', kind: 'cita', patientId: p.id, role: 'recepcion', due: todayKey(), priority: 'media', detail: `${svc.name} · ${slot.start.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}` })
    toast('¡Cita reservada! Recibirás la confirmación.')
    setSlot(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Pedir cita" subtitle="Solo se muestran huecos realmente disponibles." size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!slot} onClick={submit}>Reservar</Button></>}>
      <Field label="¿Qué necesitas?">
        <Select value={svcId} onChange={(e) => { setSvcId(e.target.value); setSlot(null) }}>
          {services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration} min · {s.price} €</option>)}
        </Select>
      </Field>
      <p className="mb-2 mt-4 text-xs font-medium text-slate-600">Día</p>
      <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button key={d.toISOString()} onClick={() => { setDay(toDateKey(d)); setSlot(null) }} className={cx('w-16 shrink-0 rounded-xl py-2 text-center ring-1 transition', day === toDateKey(d) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white ring-slate-200 hover:ring-brand-300')}>
            <p className="text-[10px] uppercase">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</p>
            <p className="text-lg font-semibold leading-tight">{d.getDate()}</p>
            <p className="text-[10px]">{fDateShort(d.toISOString()).split(' ')[1]}</p>
          </button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-xs font-medium text-slate-600">Hora</p>
      {slots.length === 0 ? <p className="text-sm text-slate-500">No hay huecos este día. Prueba otro.</p> : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {slots.map((s) => (
            <button key={s.start.toISOString()} onClick={() => setSlot(s)} className={cx('rounded-lg py-2 text-sm font-medium ring-1 transition', slot?.start.getTime() === s.start.getTime() ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white ring-slate-200 hover:ring-brand-300')}>
              {fTime(s.start.toISOString())}
            </button>
          ))}
        </div>
      )}
      {slot && <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">Con <b>{professionals.find((x) => x.id === slot.profId)?.name}</b> en {centers.find((c) => c.id === slot.centerId)?.name}</p>}
    </Modal>
  )
}
