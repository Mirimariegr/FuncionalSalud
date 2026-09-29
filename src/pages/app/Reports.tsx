import { useMemo, useState } from 'react'
import { BarChart3, CalendarCheck2, CalendarX2, Download, Euro, Users, UserX } from 'lucide-react'
import { budgetTotal, useStore } from '../../store'
import { addDays, fDateShort, fMoney, sameDay } from '../../lib/utils'
import { Button, Card, PageHeader, Select, Stat } from '../../components/ui'

function HBars({ data, format = (n: number) => String(n), color = '#0d9488' }: { data: { label: string; value: number; color?: string }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">{d.label}</span><span className="font-semibold tabular-nums text-slate-800">{format(d.value)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Reports() {
  const { appointments, patients, payments, services, professionals, centers, budgets, consents, documents, tasks } = useStore()
  const log = useStore((s) => s.log)
  const toast = useStore((s) => s.toast)
  const [days, setDays] = useState(30)
  const [center, setCenter] = useState('all')

  const from = addDays(new Date(), -days).toISOString()
  const nowIso = new Date().toISOString()
  const appts = appointments.filter((a) => a.start >= from && a.start <= nowIso && (center === 'all' || a.centerId === center))
  const pays = payments.filter((p) => p.date >= from)
  const done = appts.filter((a) => a.status === 'atendida').length
  const noShow = appts.filter((a) => a.status === 'no_presentada').length
  const cancelled = appts.filter((a) => a.status === 'cancelada').length
  const future = appointments.filter((a) => a.start > nowIso && !['cancelada', 'replanificada'].includes(a.status))
  const confirmRate = future.length ? Math.round((future.filter((a) => a.status === 'confirmada').length / future.length) * 100) : 0

  const perDay = useMemo(() => {
    const out: { d: Date; n: number; ns: number }[] = []
    for (let i = Math.min(days, 30) - 1; i >= 0; i--) {
      const d = addDays(new Date(), -i)
      if (d.getDay() === 0 || d.getDay() === 6) continue
      const list = appts.filter((a) => sameDay(a.start, d))
      out.push({ d, n: list.filter((a) => a.status === 'atendida' || a.status === 'en_curso').length, ns: list.filter((a) => a.status === 'no_presentada' || a.status === 'cancelada').length })
    }
    return out
  }, [appts, days])
  const maxDay = Math.max(1, ...perDay.map((x) => x.n + x.ns))

  const workDays = Math.max(1, Math.round((days * 5) / 7))
  const occupancy = professionals.map((p) => {
    const mins = appts.filter((a) => a.professionalId === p.id && a.status === 'atendida').reduce((acc, a) => acc + (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000, 0)
    return { label: p.name, value: Math.min(100, Math.round((mins / (workDays * 480)) * 100)), color: p.color }
  })
  const bySvc = services.map((s) => ({ label: s.name, value: pays.filter((p) => p.concept === s.name).reduce((a, p) => a + p.amount, 0) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)
  // Los cobros se imputan al centro habitual del paciente
  const byCenter = centers.map((c) => ({
    label: c.name,
    value: pays.filter((p) => patients.find((x) => x.id === p.patientId)?.centerId === c.id).reduce((a, p) => a + p.amount, 0),
  }))

  const exportCsv = () => {
    const rows = [['Indicador', 'Valor'], ['Citas atendidas', done], ['No presentadas', noShow], ['Canceladas', cancelled], ['Tasa confirmación futuras (%)', confirmRate], ['Ingresos periodo (€)', pays.reduce((a, p) => a + p.amount, 0).toFixed(2)]]
    const blob = new Blob([rows.map((r) => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `informe-actividad-${days}d.csv`
    a.click()
    log('Exportación', 'Informe', `Exportado informe de actividad (${days} días)`)
    toast('Informe exportado y registrado en auditoría')
  }

  return (
    <div>
      <PageHeader
        title="Informes y cuadro de mando"
        subtitle="Indicadores operativos y económicos básicos del MVP."
        actions={
          <>
            <Select value={center} onChange={(e) => setCenter(e.target.value)} className="w-auto">
              <option value="all">Todos los centros</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-auto">
              <option value={7}>Últimos 7 días</option><option value={14}>Últimos 14 días</option><option value={30}>Últimos 30 días</option>
            </Select>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>Exportar CSV</Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Pacientes activos" value={patients.filter((p) => p.status === 'activo' || p.status === 'seguimiento').length} icon={Users} />
        <Stat label="Citas atendidas" value={done} hint={`de ${appts.length} en el periodo`} icon={CalendarCheck2} tone="green" />
        <Stat label="No-shows" value={noShow} hint={`${appts.length ? Math.round((noShow / appts.length) * 100) : 0}% de las citas`} icon={UserX} tone="red" />
        <Stat label="Cancelaciones" value={cancelled} icon={CalendarX2} tone="orange" />
        <Stat label="Ingresos periodo" value={fMoney(pays.reduce((a, p) => a + p.amount, 0))} icon={Euro} tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Actividad diaria" icon={BarChart3} className="xl:col-span-2">
          <div className="flex h-56 items-end gap-1.5">
            {perDay.map((x) => (
              <div key={x.d.toISOString()} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                <div className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">{x.n} atendidas · {x.ns} perdidas</div>
                <div className="w-full rounded-t bg-red-300" style={{ height: `${(x.ns / maxDay) * 100}%` }} />
                <div className="w-full rounded-b-sm bg-brand-500" style={{ height: `${(x.n / maxDay) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {perDay.map((x, i) => <span key={i} className="flex-1 text-center text-[9px] text-slate-400">{i % 2 === 0 ? fDateShort(x.d.toISOString()) : ''}</span>)}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Atendidas</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-300" /> Canceladas / no presentadas</span>
          </div>
        </Card>
        <Card title="Ocupación por profesional" icon={Users} action={<span className="text-[11px] text-slate-400">Sobre jornada de 8 h</span>}>
          <HBars data={occupancy} format={(n) => `${n}%`} />
        </Card>
        <Card title="Ingresos por servicio" icon={Euro}>
          {bySvc.length ? <HBars data={bySvc} format={fMoney} /> : <p className="text-sm text-slate-500">Sin datos</p>}
        </Card>
        <Card title="Ingresos por centro" icon={Euro}>
          <HBars data={byCenter} format={fMoney} color="#2563eb" />
        </Card>
        <Card title="Operativa y cumplimiento" icon={CalendarCheck2}>
          <dl className="space-y-3 text-sm">
            {[
              ['Tasa de confirmación (citas futuras)', `${confirmRate}%`],
              ['Presupuestos enviados / aceptados', `${budgets.filter((b) => b.status !== 'borrador').length} / ${budgets.filter((b) => b.status === 'aceptado').length}`],
              ['Importe presupuestado aceptado', fMoney(budgets.filter((b) => b.status === 'aceptado').reduce((a, b) => a + budgetTotal(b), 0))],
              ['Consentimientos pendientes', consents.filter((c) => c.status === 'pendiente').length],
              ['Documentos pendientes de revisión', documents.filter((d) => d.reviewStatus === 'pendiente').length],
              ['Tareas abiertas', tasks.filter((t) => !t.done).length],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0"><dt className="text-slate-500">{l}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}
