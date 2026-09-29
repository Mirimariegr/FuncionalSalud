import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Euro, FileText, Plus, Receipt, TrendingUp } from 'lucide-react'
import { budgetTotal, paidForBudget, useRole, useStore } from '../../store'
import { budgetStatus } from '../../lib/labels'
import { canEdit } from '../../lib/permissions'
import { fDate, fMoney } from '../../lib/utils'
import { Badge, Button, PageHeader, Progress, Stat, Tabs, Td, Th } from '../../components/ui'
import { BudgetModal, PaymentModal } from '../../components/BillingDialogs'

export default function Billing() {
  const role = useRole()
  const { budgets, payments, patients } = useStore()
  const setStatus = useStore((s) => s.setBudgetStatus)
  const toast = useStore((s) => s.toast)
  const [tab, setTab] = useState<'presupuestos' | 'cobros' | 'pendientes'>('presupuestos')
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [pay, setPay] = useState<{ patientId?: string; budgetId?: string } | null>(null)
  const editable = canEdit(role, 'economico')
  const pname = (id: string) => { const p = patients.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : '' }

  const now = new Date()
  const monthPayments = payments.filter((p) => new Date(p.date).getMonth() === now.getMonth() && new Date(p.date).getFullYear() === now.getFullYear())
  const accepted = budgets.filter((b) => b.status === 'aceptado')
  const pendings = accepted.map((b) => ({ b, total: budgetTotal(b), paid: paidForBudget(payments, b.id) })).filter((x) => x.paid < x.total - 0.01)
  const sent = budgets.filter((b) => b.status !== 'borrador')
  const convRate = sent.length ? Math.round((accepted.length / sent.length) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Presupuestos y pagos"
        subtitle="Módulo económico básico del MVP. Pagos online e integración de facturación en fase 2."
        actions={editable && (
          <>
            <Button variant="secondary" icon={CreditCard} onClick={() => setPay({})}>Registrar cobro</Button>
            <Button icon={Plus} onClick={() => setBudgetOpen(true)}>Nuevo presupuesto</Button>
          </>
        )}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cobrado este mes" value={fMoney(monthPayments.reduce((a, p) => a + p.amount, 0))} hint={`${monthPayments.length} cobros`} icon={Euro} tone="green" />
        <Stat label="Pendiente de cobro" value={fMoney(pendings.reduce((a, x) => a + x.total - x.paid, 0))} hint={`${pendings.length} presupuestos`} icon={Receipt} tone="amber" />
        <Stat label="Presupuestos en curso" value={budgets.filter((b) => b.status === 'enviado').length} hint={fMoney(budgets.filter((b) => b.status === 'enviado').reduce((a, b) => a + budgetTotal(b), 0))} icon={FileText} tone="blue" />
        <Stat label="Tasa de aceptación" value={`${convRate}%`} hint={`${accepted.length} de ${sent.length} enviados`} icon={TrendingUp} />
      </div>
      <Tabs
        tabs={[
          { id: 'presupuestos', label: 'Presupuestos', count: budgets.length },
          { id: 'pendientes', label: 'Pendientes de cobro', count: pendings.length },
          { id: 'cobros', label: 'Cobros', count: payments.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div className="scroll-thin overflow-x-auto">
          {tab === 'presupuestos' && (
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Número</Th><Th>Paciente</Th><Th>Conceptos</Th><Th>Fecha</Th><Th>Validez</Th><Th className="text-right">Total</Th><Th>Estado</Th>{editable && <Th />}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {budgets.slice().sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap font-mono text-xs">{b.number}</Td>
                    <Td className="whitespace-nowrap"><Link to={`/app/pacientes/${b.patientId}`} className="font-medium hover:text-brand-700">{pname(b.patientId)}</Link></Td>
                    <Td className="max-w-[220px] truncate text-xs text-slate-500">{b.lines.map((l) => l.concept).join(', ')}</Td>
                    <Td className="whitespace-nowrap">{fDate(b.date)}</Td>
                    <Td className="whitespace-nowrap">{fDate(b.validUntil)}</Td>
                    <Td className="text-right font-semibold">{fMoney(budgetTotal(b))}</Td>
                    <Td><Badge tone={budgetStatus[b.status].tone}>{budgetStatus[b.status].label}</Badge></Td>
                    {editable && (
                      <Td className="whitespace-nowrap text-right">
                        {b.status === 'borrador' && <Button size="sm" variant="soft" onClick={() => { setStatus(b.id, 'enviado'); toast('Presupuesto enviado') }}>Enviar</Button>}
                        {b.status === 'enviado' && (
                          <span className="inline-flex gap-1">
                            <Button size="sm" variant="soft" onClick={() => { setStatus(b.id, 'aceptado'); toast('Aceptación registrada') }}>Aceptado</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setStatus(b.id, 'rechazado'); toast('Rechazo registrado') }}>Rechazado</Button>
                          </span>
                        )}
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'pendientes' && (
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Presupuesto</Th><Th>Paciente</Th><Th className="w-64">Cobrado</Th><Th className="text-right">Pendiente</Th>{editable && <Th />}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pendings.map(({ b, total, paid }) => (
                  <tr key={b.id}>
                    <Td className="whitespace-nowrap font-mono text-xs">{b.number}</Td>
                    <Td className="whitespace-nowrap"><Link to={`/app/pacientes/${b.patientId}`} className="font-medium hover:text-brand-700">{pname(b.patientId)}</Link></Td>
                    <Td><div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>{fMoney(paid)} de {fMoney(total)}</span><span>{Math.round((paid / total) * 100)}%</span></div><Progress value={paid} max={total} /></Td>
                    <Td className="text-right font-semibold text-amber-600">{fMoney(total - paid)}</Td>
                    {editable && <Td className="text-right"><Button size="sm" variant="soft" onClick={() => setPay({ patientId: b.patientId, budgetId: b.id })}>Cobrar</Button></Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'cobros' && (
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Fecha</Th><Th>Paciente</Th><Th>Concepto</Th><Th>Método</Th><Th className="text-right">Importe</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {payments.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80).map((p) => (
                  <tr key={p.id}>
                    <Td className="whitespace-nowrap">{fDate(p.date)}</Td>
                    <Td className="whitespace-nowrap"><Link to={`/app/pacientes/${p.patientId}`} className="font-medium hover:text-brand-700">{pname(p.patientId)}</Link></Td>
                    <Td>{p.concept}</Td>
                    <Td><Badge>{p.method}</Badge></Td>
                    <Td className="text-right font-semibold text-emerald-600">{fMoney(p.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <BudgetModal open={budgetOpen} onClose={() => setBudgetOpen(false)} />
      <PaymentModal open={!!pay} onClose={() => setPay(null)} patientId={pay?.patientId} budgetId={pay?.budgetId} />
    </div>
  )
}
