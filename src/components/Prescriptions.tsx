import { useEffect, useState } from 'react'
import { Pill } from 'lucide-react'
import { useCurrentStaff, useStore } from '../store'
import { addDays, cx, fDate } from '../lib/utils'
import type { Prescription } from '../types'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from './ui'

const statusTone = { activa: 'green', dispensada: 'slate', anulada: 'red' } as const
const statusLabel = { activa: 'Activa', dispensada: 'Dispensada', anulada: 'Anulada' } as const

export const isActive = (rx: Prescription) => rx.status === 'activa' && rx.validUntil >= new Date().toISOString()

/** Código de barras decorativo derivado del código de la receta (simulación visual). */
export function Barcode({ code, className }: { code: string; className?: string }) {
  const bars = [...code].flatMap((ch) => {
    const n = ch.charCodeAt(0)
    return [1 + (n % 3), 1 + ((n >> 2) % 2), 1 + ((n >> 1) % 3), 1 + (n % 2)]
  })
  return (
    <div className={cx('flex h-14 items-stretch justify-center gap-[1px] bg-white px-3 py-2', className)} aria-label={`Código ${code}`}>
      {bars.map((w, i) => <span key={i} style={{ width: w * 1.5 }} className={i % 2 ? 'bg-transparent' : 'bg-slate-900'} />)}
    </div>
  )
}

export function PrescriptionCard({ rx, onShow, compact }: { rx: Prescription; onShow?: () => void; compact?: boolean }) {
  const prof = useStore((s) => s.professionals.find((p) => p.id === rx.professionalId))
  const active = isActive(rx)
  const expired = !active && rx.status === 'activa'
  return (
    <div className={cx('rounded-2xl bg-white p-4 ring-1', active ? 'ring-emerald-200' : 'ring-slate-200 opacity-80')}>
      <div className="flex items-start gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}><Pill className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{rx.medication}</p>
            <Badge tone={expired ? 'orange' : statusTone[rx.status]}>{expired ? 'Caducada' : statusLabel[rx.status]}</Badge>
          </div>
          <p className="text-sm text-slate-600">{rx.dose} · {rx.frequency} · {rx.duration}</p>
          {!compact && rx.instructions && <p className="mt-1 text-xs text-slate-500">{rx.instructions}</p>}
          <p className="mt-1 text-[11px] text-slate-400">{prof?.name} · {fDate(rx.date)} · válida hasta {fDate(rx.validUntil)}</p>
        </div>
      </div>
      {active && onShow && <Button className="mt-3 w-full" variant="soft" onClick={onShow}>Mostrar en la farmacia</Button>}
    </div>
  )
}

export function PharmacyModal({ rx, onClose }: { rx: Prescription | null; onClose: () => void }) {
  const patient = useStore((s) => s.patients.find((p) => p.id === rx?.patientId))
  if (!rx || !patient) return null
  return (
    <Modal open onClose={onClose} title="Receta para la farmacia" subtitle="Enseña esta pantalla en el mostrador" size="sm">
      <div className="rounded-2xl bg-slate-50 p-5 text-center ring-1 ring-slate-200">
        <p className="text-xs uppercase tracking-wide text-slate-500">Código de receta</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-widest">{rx.code}</p>
        <Barcode code={rx.code} className="mt-3 rounded-lg ring-1 ring-slate-200" />
        <p className="mt-4 text-lg font-semibold">{rx.medication}</p>
        <p className="text-sm text-slate-600">{rx.dose} · {rx.frequency} · {rx.duration}</p>
        <p className="mt-3 text-xs text-slate-500">{patient.firstName} {patient.lastName} · {patient.docId} · válida hasta {fDate(rx.validUntil)}</p>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">Prototipo: en producción se integraría con la receta electrónica oficial.</p>
    </Modal>
  )
}

export function NewPrescriptionModal({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId: string }) {
  const user = useCurrentStaff()!
  const professionals = useStore((s) => s.professionals)
  const add = useStore((s) => s.addPrescription)
  const toast = useStore((s) => s.toast)
  const init = () => ({ professionalId: user.professionalId ?? professionals[0].id, medication: '', dose: '1 comprimido', frequency: 'Cada 8 horas', duration: '7 días', instructions: '', days: 30 })
  const [f, setF] = useState(init)
  useEffect(() => { if (open) setF(init()) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof ReturnType<typeof init>) => (e: { target: { value: string } }) => setF({ ...f, [k]: k === 'days' ? Number(e.target.value) : e.target.value })
  return (
    <Modal open={open} onClose={onClose} title="Nueva receta" subtitle="El paciente la verá al momento en su portal." size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!f.medication.trim()} onClick={() => {
        add({ patientId, professionalId: f.professionalId, medication: f.medication, dose: f.dose, frequency: f.frequency, duration: f.duration, instructions: f.instructions, validUntil: addDays(new Date(), f.days).toISOString() })
        toast('Receta emitida y visible en el portal del paciente')
        onClose()
      }}>Emitir receta</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Medicamento *" className="sm:col-span-2"><Input value={f.medication} onChange={set('medication')} placeholder="p. ej. Ibuprofeno 600 mg comprimidos" autoFocus /></Field>
        <Field label="Dosis"><Input value={f.dose} onChange={set('dose')} /></Field>
        <Field label="Frecuencia"><Input value={f.frequency} onChange={set('frequency')} /></Field>
        <Field label="Duración"><Input value={f.duration} onChange={set('duration')} /></Field>
        <Field label="Validez">
          <Select value={f.days} onChange={set('days')}><option value={10}>10 días</option><option value={30}>30 días</option><option value={90}>90 días</option></Select>
        </Field>
        <Field label="Prescriptor" className="sm:col-span-2">
          <Select value={f.professionalId} onChange={set('professionalId')}>{professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </Field>
        <Field label="Indicaciones para el paciente" className="sm:col-span-2"><Textarea value={f.instructions} onChange={set('instructions')} className="min-h-[60px]" /></Field>
      </div>
    </Modal>
  )
}
