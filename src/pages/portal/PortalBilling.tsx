import { useState } from 'react'
import { CreditCard, Euro, Lock } from 'lucide-react'
import { budgetTotal, paidForBudget, useCurrentPatient, useStore } from '../../store'
import { budgetStatus } from '../../lib/labels'
import { fDate, fMoney } from '../../lib/utils'
import { Badge, Button, Modal, Progress } from '../../components/ui'
import type { Budget } from '../../types'

export default function PortalBilling() {
  const p = useCurrentPatient()!
  const { budgets, payments } = useStore()
  const setStatus = useStore((s) => s.setBudgetStatus)
  const registerPayment = useStore((s) => s.registerPayment)
  const toast = useStore((s) => s.toast)
  const [payFor, setPayFor] = useState<{ b: Budget; amount: number } | null>(null)

  const mine = budgets.filter((b) => b.patientId === p.id && b.status !== 'borrador').sort((a, b) => b.date.localeCompare(a.date))
  const pays = payments.filter((x) => x.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Presupuestos y pagos</h1>
      <ul className="space-y-4">
        {mine.map((b) => {
          const total = budgetTotal(b)
          const paid = paidForBudget(payments, b.id)
          return (
            <li key={b.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Presupuesto {b.number}</p>
                  <p className="text-xs text-slate-500">Emitido {fDate(b.date)} · válido hasta {fDate(b.validUntil)}</p>
                </div>
                <Badge tone={budgetStatus[b.status].tone}>{budgetStatus[b.status].label}</Badge>
              </div>
              <table className="mt-4 w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {b.lines.map((l, i) => (
                    <tr key={i}><td className="py-1.5">{l.concept} {l.qty > 1 && <span className="text-slate-400">× {l.qty}</span>} {l.discount > 0 && <Badge tone="green" className="ml-1">-{l.discount}%</Badge>}</td><td className="py-1.5 text-right">{fMoney(l.qty * l.price * (1 - l.discount / 100))}</td></tr>
                  ))}
                  {b.taxRate > 0 && <tr><td className="py-1.5 text-slate-500">IVA {b.taxRate}%</td><td className="py-1.5 text-right text-slate-500">incl.</td></tr>}
                  <tr><td className="pt-2 font-semibold">Total</td><td className="pt-2 text-right text-lg font-semibold">{fMoney(total)}</td></tr>
                </tbody>
              </table>
              {b.status === 'enviado' && (
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => { setStatus(b.id, 'aceptado'); toast('Presupuesto aceptado. ¡Gracias!') }}>Aceptar presupuesto</Button>
                  <Button variant="secondary" onClick={() => { setStatus(b.id, 'rechazado'); toast('Presupuesto rechazado', 'info') }}>Rechazar</Button>
                </div>
              )}
              {b.status === 'aceptado' && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-600"><span>Pagado {fMoney(paid)}</span><span>Pendiente <b>{fMoney(Math.max(0, total - paid))}</b></span></div>
                  <Progress value={paid} max={total} />
                  {paid < total - 0.01 && <Button className="mt-3" size="sm" icon={CreditCard} onClick={() => setPayFor({ b, amount: Math.round((total - paid) * 100) / 100 })}>Pagar online</Button>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {mine.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">No tienes presupuestos.</p>}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Mis pagos</h2>
        <ul className="space-y-2">
          {pays.map((x) => (
            <li key={x.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <Euro className="h-4 w-4 text-slate-400" />
              <div className="flex-1"><p className="text-sm">{x.concept}</p><p className="text-xs text-slate-500">{fDate(x.date)} · {x.method}</p></div>
              <p className="font-semibold">{fMoney(x.amount)}</p>
            </li>
          ))}
        </ul>
      </section>
      {payFor && (
        <Modal open onClose={() => setPayFor(null)} title="Pago seguro" subtitle="Pasarela de pago simulada (integración real en fase 2)" size="sm"
          footer={<><Button variant="secondary" onClick={() => setPayFor(null)}>Cancelar</Button><Button icon={Lock} onClick={() => { registerPayment({ patientId: p.id, budgetId: payFor.b.id, date: new Date().toISOString(), amount: payFor.amount, method: 'Online (simulado)', concept: `Pago online ${payFor.b.number}` }); toast('Pago realizado correctamente'); setPayFor(null) }}>Pagar {fMoney(payFor.amount)}</Button></>}>
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
            <p className="text-xs text-slate-400">Tarjeta de demostración</p>
            <p className="mt-4 font-mono text-lg tracking-widest">4242 4242 4242 4242</p>
            <div className="mt-3 flex justify-between text-xs text-slate-300"><span>{p.firstName.toUpperCase()} {p.lastName.split(' ')[0].toUpperCase()}</span><span>12/29</span></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
