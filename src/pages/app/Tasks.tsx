import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, Plus } from 'lucide-react'
import { useCurrentStaff, useStore } from '../../store'
import { priorityTone, roleLabel } from '../../lib/labels'
import { cx, relativeDays, todayKey } from '../../lib/utils'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Textarea } from '../../components/ui'
import type { Role, Task } from '../../types'

const kindLabel: Record<Task['kind'], string> = {
  cita: 'Cita', documento: 'Documento', consentimiento: 'Consentimiento', seguimiento: 'Seguimiento', economico: 'Económico', datos: 'Datos', general: 'General',
}

export default function Tasks() {
  const user = useCurrentStaff()!
  const { tasks, patients } = useStore()
  const toggle = useStore((s) => s.toggleTask)
  const addTask = useStore((s) => s.addTask)
  const toast = useStore((s) => s.toast)
  const [scope, setScope] = useState<'mine' | 'all'>(user.role === 'admin' || user.role === 'direccion' ? 'all' : 'mine')
  const [kind, setKind] = useState('all')
  const [showDone, setShowDone] = useState(false)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', detail: '', patientId: '', role: user.role as Role, due: todayKey(), priority: 'media' as Task['priority'] })

  const list = tasks
    .filter((t) => (scope === 'all' || t.role === user.role) && (kind === 'all' || t.kind === kind) && (showDone || !t.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due))
  const groups = [
    { k: 'overdue', l: 'Vencidas', items: list.filter((t) => !t.done && t.due < todayKey()) },
    { k: 'today', l: 'Hoy', items: list.filter((t) => !t.done && t.due === todayKey()) },
    { k: 'next', l: 'Próximas', items: list.filter((t) => !t.done && t.due > todayKey()) },
    { k: 'done', l: 'Completadas', items: list.filter((t) => t.done) },
  ].filter((g) => g.items.length)
  const pname = (id?: string) => { const p = patients.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : '' }

  return (
    <div>
      <PageHeader title="Tareas y alertas" subtitle="Pendientes generados por el sistema y por el equipo." actions={<Button icon={Plus} onClick={() => setOpen(true)}>Nueva tarea</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(['mine', 'all'] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={cx('rounded-md px-3 py-1.5 text-sm font-medium', scope === s ? 'bg-white shadow-sm' : 'text-slate-500')}>{s === 'mine' ? `Mi perfil (${roleLabel[user.role]})` : 'Todo el equipo'}</button>
          ))}
        </div>
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-auto">
          <option value="all">Todos los tipos</option>
          {Object.entries(kindLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-brand-600" /> Mostrar completadas</label>
      </div>
      {groups.length === 0 ? <Card><Empty icon={CheckCircle2} title="¡Todo al día!" text="No hay tareas pendientes con estos filtros." /></Card> : (
        <div className="space-y-6">
          {groups.map((g) => (
            <Card key={g.k} title={<>{g.l} <span className="ml-1 text-slate-400">{g.items.length}</span></>} icon={ClipboardCheck} padded={false}>
              <ul className="divide-y divide-slate-100">
                {g.items.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-5 py-3">
                    <button onClick={() => { toggle(t.id); if (!t.done) toast('Tarea completada') }} className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition', t.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 hover:border-brand-500')}>
                      {t.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-sm font-medium', t.done && 'text-slate-400 line-through')}>{t.title}</p>
                      {t.detail && <p className="text-xs text-slate-500">{t.detail}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {t.patientId && <Link to={`/app/pacientes/${t.patientId}`} className="font-medium text-brand-700 hover:underline">{pname(t.patientId)}</Link>}
                        <Badge>{kindLabel[t.kind]}</Badge>
                        {scope === 'all' && <Badge tone="violet">{roleLabel[t.role]}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                      <span className={cx('text-xs', !t.done && t.due < todayKey() ? 'font-medium text-red-600' : 'text-slate-400')}>{relativeDays(t.due)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva tarea" size="sm"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!f.title} onClick={() => { addTask({ ...f, patientId: f.patientId || undefined, kind: 'general' }); toast('Tarea creada'); setOpen(false); setF({ ...f, title: '', detail: '' }) }}>Crear</Button></>}>
        <div className="grid gap-3">
          <Field label="Título"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="Detalle"><Textarea value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} className="min-h-[60px]" /></Field>
          <Field label="Paciente (opcional)">
            <Select value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })}>
              <option value="">—</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Asignar a">
              <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </Field>
            <Field label="Prioridad">
              <Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Task['priority'] })}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></Select>
            </Field>
          </div>
          <Field label="Fecha límite"><Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  )
}
