import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, Plus } from 'lucide-react'
import { useCurrentStaff, useStore } from '../../store'
import { treatmentStatus } from '../../lib/labels'
import { canEdit } from '../../lib/permissions'
import { cx, fDate, todayKey } from '../../lib/utils'
import { Avatar, Badge, Button, Card, Empty, PageHeader, Progress, Select } from '../../components/ui'
import { TreatmentModal } from '../../components/ClinicalDialogs'
import type { Treatment } from '../../types'

export default function Treatments() {
  const user = useCurrentStaff()!
  const { treatments, patients, professionals, appointments } = useStore()
  const registerSession = useStore((s) => s.registerSession)
  const toast = useStore((s) => s.toast)
  const [status, setStatus] = useState('activo')
  const [prof, setProf] = useState(user.professionalId ?? 'all')
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Treatment | undefined>()
  const editable = canEdit(user.role, 'tratamientos')

  const rows = treatments.filter((t) => (status === 'all' || t.status === status) && (prof === 'all' || t.professionalId === prof))
  const hasNextAppt = (pid: string) => appointments.some((a) => a.patientId === pid && a.start > new Date().toISOString() && !['cancelada', 'replanificada'].includes(a.status))

  return (
    <div>
      <PageHeader title="Tratamientos" subtitle="Planes, sesiones, revisiones y seguimiento." actions={editable && <Button icon={Plus} onClick={() => { setEdit(undefined); setOpen(true) }}>Nuevo tratamiento</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="all">Todos</option><option value="activo">Activos</option><option value="pausado">Pausados</option><option value="finalizado">Finalizados</option>
        </Select>
        <Select value={prof} onChange={(e) => setProf(e.target.value)} className="w-auto">
          <option value="all">Todos los profesionales</option>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
      {rows.length === 0 ? <Card><Empty icon={Activity} title="No hay tratamientos con estos filtros" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => {
            const p = patients.find((x) => x.id === t.patientId)!
            const pr = professionals.find((x) => x.id === t.professionalId)
            const overdue = t.status !== 'finalizado' && t.reviewDate && t.reviewDate < todayKey()
            const noAppt = t.status === 'activo' && !hasNextAppt(t.patientId)
            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/app/pacientes/${p.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                    <Avatar name={`${p.firstName} ${p.lastName}`} size="sm" />
                    <div><p className="text-sm font-medium">{p.firstName} {p.lastName}</p><p className="text-[11px] text-slate-500">{pr?.name}</p></div>
                  </Link>
                  <Badge tone={treatmentStatus[t.status].tone}>{treatmentStatus[t.status].label}</Badge>
                </div>
                <p className="mt-3 font-semibold">{t.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.goals}</p>
                <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{t.doneSessions}/{t.totalSessions} sesiones</span><span className={cx(overdue && 'font-medium text-red-600')}>Revisión {fDate(t.reviewDate)}</span></div>
                <div className="mt-1.5"><Progress value={t.doneSessions} max={t.totalSessions} tone={t.status === 'pausado' ? 'amber' : 'teal'} /></div>
                {(overdue || noAppt) && (
                  <div className="mt-3 space-y-1">
                    {overdue && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5" /> Revisión vencida</p>}
                    {noAppt && <p className="flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> Sin próxima cita programada</p>}
                  </div>
                )}
                {editable && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    {t.status === 'activo' && <Button size="sm" variant="soft" onClick={() => { registerSession(t.id); toast('Sesión registrada') }}>+ Sesión</Button>}
                    <Button size="sm" variant="ghost" onClick={() => { setEdit(t); setOpen(true) }}>Editar</Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
      <TreatmentModal open={open} onClose={() => setOpen(false)} treatment={edit} />
    </div>
  )
}
