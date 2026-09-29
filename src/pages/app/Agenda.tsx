import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarClock, AlertTriangle } from 'lucide-react'
import { useCurrentStaff, useStore } from '../../store'
import { apptStatus } from '../../lib/labels'
import { canEdit } from '../../lib/permissions'
import { addDays, cx, fDateShort, fLong, fTime, pad, sameDay, startOfWeek, toDateKey } from '../../lib/utils'
import { Badge, Button, Card, PageHeader, Select } from '../../components/ui'
import { AppointmentDetailModal, NewAppointmentModal } from '../../components/AppointmentDialogs'
import type { Appointment } from '../../types'

const START_H = 8
const END_H = 20
const HOUR_PX = 64

export default function Agenda() {
  const user = useCurrentStaff()!
  const { appointments, professionals, patients, services, centers, rooms } = useStore()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [date, setDate] = useState(() => new Date())
  const [centerId, setCenterId] = useState('all')
  const [profId, setProfId] = useState(user.professionalId ?? 'all')
  const [showCancelled, setShowCancelled] = useState(false)
  const [detail, setDetail] = useState<Appointment | null>(null)
  const [newAppt, setNewAppt] = useState<null | { date: string; time: string; professionalId?: string }>(null)
  const editable = canEdit(user.role, 'agenda')

  const profs = professionals.filter((p) => p.active && (centerId === 'all' || p.centerIds.includes(centerId)) && (profId === 'all' || p.id === profId))
  const weekStart = startOfWeek(date)
  const days = view === 'day' ? [date] : Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
  const columns: { key: string; label: string; sub?: string; date: Date; profId?: string; color?: string }[] =
    view === 'day'
      ? profs.map((p) => ({ key: p.id, label: p.name, sub: p.specialty, date, profId: p.id, color: p.color }))
      : days.map((d) => ({ key: toDateKey(d), label: fLong(d).split(',')[0], sub: fDateShort(d.toISOString()), date: d, profId: profId === 'all' ? undefined : profId }))

  const visible = useMemo(
    () =>
      appointments.filter(
        (a) =>
          (showCancelled || !['cancelada', 'replanificada'].includes(a.status)) &&
          (centerId === 'all' || a.centerId === centerId) &&
          profs.some((p) => p.id === a.professionalId),
      ),
    [appointments, showCancelled, centerId, profs],
  )

  const move = (dir: number) => setDate((d) => addDays(d, dir * (view === 'day' ? 1 : 7)))
  const waitlist = appointments.filter((a) => a.status === 'replanificacion' || a.status === 'espera')

  const now = new Date()
  const nowTop = ((now.getHours() - START_H) * 60 + now.getMinutes()) * (HOUR_PX / 60)

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={view === 'day' ? fLong(date) : `Semana del ${fDateShort(weekStart.toISOString())} al ${fDateShort(addDays(weekStart, 5).toISOString())}`}
        actions={editable && <Button icon={Plus} onClick={() => setNewAppt({ date: toDateKey(date), time: '10:00', professionalId: profId === 'all' ? undefined : profId })}>Nueva cita</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg bg-white ring-1 ring-slate-200">
          <button onClick={() => move(-1)} className="p-2 text-slate-500 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setDate(new Date())} className="border-x border-slate-200 px-3 text-sm font-medium">Hoy</button>
          <button onClick={() => move(1)} className="p-2 text-slate-500 hover:text-slate-900"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(['day', 'week'] as const).map((v) => (
            <button key={v} onClick={() => { setView(v); if (v === 'week' && profId === 'all') setProfId(professionals[0].id) }} className={cx('rounded-md px-3 py-1.5 text-sm font-medium', view === v ? 'bg-white shadow-sm' : 'text-slate-500')}>
              {v === 'day' ? 'Día' : 'Semana'}
            </button>
          ))}
        </div>
        <Select value={centerId} onChange={(e) => setCenterId(e.target.value)} className="w-auto">
          <option value="all">Todos los centros</option>
          {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={profId} onChange={(e) => setProfId(e.target.value)} className="w-auto">
          {view === 'day' && <option value="all">Todos los profesionales</option>}
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-brand-600" />
          Mostrar canceladas
        </label>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
          <div className="scroll-thin overflow-x-auto">
            <div style={{ minWidth: 72 + columns.length * 170 }}>
              {/* Cabecera */}
              <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white">
                <div className="w-[72px] shrink-0" />
                {columns.map((c) => (
                  <div key={c.key} className={cx('flex-1 border-l border-slate-100 px-3 py-3', view === 'week' && sameDay(c.date, now) && 'bg-brand-50/60')}>
                    <div className="flex items-center gap-2">
                      {c.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
                      <p className="truncate text-sm font-semibold capitalize">{c.label}</p>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.sub}</p>
                  </div>
                ))}
              </div>
              {/* Rejilla */}
              <div className="relative flex" style={{ height: (END_H - START_H) * HOUR_PX }}>
                <div className="w-[72px] shrink-0">
                  {Array.from({ length: END_H - START_H }, (_, i) => (
                    <div key={i} className="relative text-right" style={{ height: HOUR_PX }}>
                      <span className="absolute -top-2 right-3 text-[11px] text-slate-400">{pad(START_H + i)}:00</span>
                    </div>
                  ))}
                </div>
                {columns.map((c) => {
                  const list = visible.filter((a) => sameDay(a.start, c.date) && (!c.profId || a.professionalId === c.profId))
                  const lanes = layoutLanes(list)
                  return (
                    <div key={c.key} className="relative flex-1 border-l border-slate-100">
                      {Array.from({ length: (END_H - START_H) * 2 }, (_, i) => (
                        <button
                          key={i}
                          disabled={!editable}
                          onClick={() => setNewAppt({ date: toDateKey(c.date), time: `${pad(START_H + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`, professionalId: c.profId })}
                          className={cx('group block w-full', i % 2 ? 'border-b border-slate-100' : 'border-b border-dashed border-slate-100/70', editable && 'hover:bg-brand-50/50')}
                          style={{ height: HOUR_PX / 2 }}
                        >
                          {editable && <Plus className="mx-auto hidden h-3.5 w-3.5 text-brand-400 group-hover:block" />}
                        </button>
                      ))}
                      {sameDay(c.date, now) && nowTop > 0 && nowTop < (END_H - START_H) * HOUR_PX && (
                        <div className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-400" style={{ top: nowTop }}>
                          <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                        </div>
                      )}
                      {list.map((a) => {
                        const s = new Date(a.start)
                        const e = new Date(a.end)
                        const top = ((s.getHours() - START_H) * 60 + s.getMinutes()) * (HOUR_PX / 60)
                        const height = Math.max(22, ((e.getTime() - s.getTime()) / 60000) * (HOUR_PX / 60) - 2)
                        const prof = professionals.find((p) => p.id === a.professionalId)!
                        const p = patients.find((x) => x.id === a.patientId)!
                        const svc = services.find((x) => x.id === a.serviceId)!
                        const room = rooms.find((r) => r.id === a.roomId)
                        const st = apptStatus[a.status]
                        const muted = ['cancelada', 'replanificada', 'no_presentada'].includes(a.status)
                        const { lane, of } = lanes[a.id]
                        return (
                          <button
                            key={a.id}
                            onClick={() => setDetail(a)}
                            className={cx('absolute overflow-hidden rounded-lg px-2 py-1 text-left text-xs shadow-sm ring-1 transition hover:z-20 hover:shadow-md', muted && 'opacity-50 line-through')}
                            style={{ top, height, left: `calc(${(lane / of) * 100}% + 3px)`, width: `calc(${100 / of}% - 6px)`, background: `${prof.color}14`, borderLeft: `3px solid ${prof.color}`, ['--tw-ring-color' as string]: `${prof.color}33` }}
                          >
                            <p className="flex items-center gap-1 truncate font-semibold text-slate-800">
                              {a.status === 'pendiente' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
                              {a.status === 'replanificacion' && <CalendarClock className="h-3 w-3 shrink-0 text-orange-500" />}
                              {p.allergies.some((x) => x.status === 'activa') && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
                              {p.firstName} {p.lastName}
                            </p>
                            {height > 34 && <p className="truncate text-slate-600">{fTime(a.start)} · {svc.name}</p>}
                            {height > 50 && (
                              <p className="truncate text-[10px] text-slate-500">
                                {view === 'week' ? prof.name : room?.name ?? ''} · {st.label}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card title="Replanificación y espera" icon={CalendarClock} padded={false} action={<Badge tone="orange">{waitlist.length}</Badge>}>
            <ul className="scroll-thin max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {waitlist.length === 0 && <li className="px-5 py-6 text-center text-xs text-slate-500">Nada pendiente</li>}
              {waitlist.map((a) => {
                const p = patients.find((x) => x.id === a.patientId)!
                return (
                  <li key={a.id}>
                    <button onClick={() => setDetail(a)} className="w-full px-5 py-3 text-left hover:bg-slate-50">
                      <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-slate-500">{services.find((s) => s.id === a.serviceId)?.name} · {fDateShort(a.start)} {fTime(a.start)}</p>
                      <Badge tone={apptStatus[a.status].tone} className="mt-1">{apptStatus[a.status].label}</Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
          <Card title="Leyenda">
            <div className="space-y-2">
              {professionals.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="h-3 w-3 rounded" style={{ background: p.color }} />
                  <span className="flex-1 text-slate-700">{p.name}</span>
                  <span className="text-slate-400">{p.specialty}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pendiente de confirmar</div>
              <div className="flex items-center gap-2 text-xs text-slate-500"><AlertTriangle className="h-3 w-3 text-red-500" /> Paciente con alergias activas</div>
            </div>
          </Card>
        </div>
      </div>

      <AppointmentDetailModal appt={detail} onClose={() => setDetail(null)} />
      <NewAppointmentModal open={!!newAppt} onClose={() => setNewAppt(null)} defaults={newAppt ?? undefined} />
    </div>
  )
}

/** Reparte citas solapadas en carriles para que no se tapen entre sí. */
function layoutLanes(list: Appointment[]) {
  const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
  const out: Record<string, { lane: number; of: number }> = {}
  let cluster: Appointment[] = []
  let laneEnds: string[] = []
  let clusterEnd = ''
  const flush = () => {
    cluster.forEach((a) => (out[a.id].of = laneEnds.length))
    cluster = []
    laneEnds = []
  }
  for (const a of sorted) {
    if (cluster.length && a.start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((e) => e <= a.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(a.end)
    } else laneEnds[lane] = a.end
    out[a.id] = { lane, of: 1 }
    cluster.push(a)
    clusterEnd = cluster.length === 1 ? a.end : a.end > clusterEnd ? a.end : clusterEnd
  }
  flush()
  return out
}
