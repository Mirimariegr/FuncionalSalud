import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { budgetTotal, paidForBudget, useStore } from '../store'
import { addDays, fMoney } from '../lib/utils'
import type { Budget, BudgetLine, Payment } from '../types'
import { Button, Field, Input, Modal, Select } from './ui'

export function BudgetModal({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId?: string }) {
  const { patients, services, treatments } = useStore()
  const saveBudget = useStore((s) => s.saveBudget)
  const toast = useStore((s) => s.toast)
  const [pid, setPid] = useState(patientId ?? '')
  const [treatmentId, setTreatmentId] = useState('')
  const [lines, setLines] = useState<BudgetLine[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [validDays, setValidDays] = useState(30)

  useEffect(() => {
    if (open) {
      setPid(patientId ?? '')
      setTreatmentId('')
      setLines([{ concept: services[1].name, serviceId: services[1].id, qty: 1, price: services[1].price, discount: 0 }])
      setTaxRate(0)
      setValidDays(30)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const draft: Budget = { id: '', number: '', patientId: pid, date: '', validUntil: '', lines, taxRate, status: 'borrador' }
  const total = budgetTotal(draft)
  const upd = (i: number, patch: Partial<BudgetLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const save = (status: Budget['status']) => {
    saveBudget({ patientId: pid, treatmentId: treatmentId || undefined, date: new Date().toISOString(), validUntil: addDays(new Date(), validDays).toISOString(), lines, taxRate, status })
    toast(status === 'enviado' ? 'Presupuesto enviado al portal del paciente' : 'Presupuesto guardado como borrador')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo presupuesto" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" disabled={!pid || !lines.length} onClick={() => save('borrador')}>Guardar borrador</Button>
          <Button disabled={!pid || !lines.length} onClick={() => save('enviado')}>Enviar al paciente</Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-3">
        {!patientId && (
          <Field label="Paciente" className="sm:col-span-3">
            <Select value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Selecciona…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.nhc}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Tratamiento vinculado">
          <Select value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
            <option value="">—</option>
            {treatments.filter((t) => t.patientId === pid).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="IVA">
          <Select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))}>
            <option value={0}>Exento (asistencia sanitaria)</option>
            <option value={21}>21 % (estética)</option>
          </Select>
        </Field>
        <Field label="Validez (días)"><Input type="number" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} /></Field>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2 text-left">Concepto</th><th className="w-16 px-2 py-2">Uds.</th><th className="w-24 px-2 py-2">Precio</th><th className="w-20 px-2 py-2">Dto. %</th><th className="w-24 px-2 py-2 text-right">Importe</th><th className="w-8" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1">
                    <Select value={l.serviceId ?? ''} onChange={(e) => { const s = services.find((x) => x.id === e.target.value); upd(i, s ? { serviceId: s.id, concept: s.name, price: s.price } : { serviceId: undefined }) }} className="w-36">
                      <option value="">Libre</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Input value={l.concept} onChange={(e) => upd(i, { concept: e.target.value })} />
                  </div>
                </td>
                <td className="px-1"><Input type="number" min={1} value={l.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) })} /></td>
                <td className="px-1"><Input type="number" value={l.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} /></td>
                <td className="px-1"><Input type="number" min={0} max={100} value={l.discount} onChange={(e) => upd(i, { discount: Number(e.target.value) })} /></td>
                <td className="px-3 text-right font-medium">{fMoney(l.qty * l.price * (1 - l.discount / 100))}</td>
                <td><button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2">
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setLines([...lines, { concept: '', qty: 1, price: 0, discount: 0 }])}>Añadir línea</Button>
          <p className="text-sm">Total: <b className="text-base">{fMoney(total)}</b></p>
        </div>
      </div>
    </Modal>
  )
}

export function PaymentModal({ open, onClose, patientId, budgetId }: { open: boolean; onClose: () => void; patientId?: string; budgetId?: string }) {
  const { patients, budgets, payments } = useStore()
  const registerPayment = useStore((s) => s.registerPayment)
  const toast = useStore((s) => s.toast)
  const [pid, setPid] = useState(patientId ?? '')
  const [bid, setBid] = useState(budgetId ?? '')
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<Payment['method']>('Tarjeta')
  const [concept, setConcept] = useState('')

  const pending = (id: string) => {
    const b = budgets.find((x) => x.id === id)
    return b ? Math.max(0, budgetTotal(b) - paidForBudget(payments, id)) : 0
  }
  useEffect(() => {
    if (open) {
      setPid(patientId ?? '')
      setBid(budgetId ?? '')
      setAmount(budgetId ? Math.round(pending(budgetId) * 100) / 100 : 0)
      setMethod('Tarjeta')
      setConcept(budgetId ? `Pago presupuesto ${budgets.find((b) => b.id === budgetId)?.number}` : '')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose} title="Registrar cobro" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!pid || amount <= 0} onClick={() => { registerPayment({ patientId: pid, budgetId: bid || undefined, date: new Date().toISOString(), amount, method, concept: concept || 'Cobro' }); toast(`Cobro de ${fMoney(amount)} registrado`); onClose() }}>Registrar</Button></>}>
      <div className="grid gap-4">
        {!patientId && (
          <Field label="Paciente">
            <Select value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Selecciona…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Presupuesto (opcional)">
          <Select value={bid} onChange={(e) => { setBid(e.target.value); if (e.target.value) setAmount(Math.round(pending(e.target.value) * 100) / 100) }}>
            <option value="">—</option>
            {budgets.filter((b) => b.patientId === pid && b.status === 'aceptado').map((b) => <option key={b.id} value={b.id}>{b.number} · pendiente {fMoney(pending(b.id))}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Importe (€)"><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label="Método">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
              {['Tarjeta', 'Efectivo', 'Transferencia', 'Bizum'].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Concepto"><Input value={concept} onChange={(e) => setConcept(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
