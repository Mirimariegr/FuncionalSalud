import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Euro, FileSignature, FileText, MapPin, Phone, Stethoscope } from 'lucide-react'
import { budgetTotal, useCurrentPatient, useStore } from '../../store'
import { apptStatus } from '../../lib/labels'
import { fLong, fMoney, fTime, relativeDays } from '../../lib/utils'
import { Badge, Button } from '../../components/ui'
import { ApptActions } from './PortalAppointments'

export default function PortalHome() {
  const p = useCurrentPatient()!
  const { appointments, services, professionals, centers, consents, consentTemplates, documents, budgets } = useStore()
  const now = new Date().toISOString()
  const next = appointments
    .filter((a) => a.patientId === p.id && a.start > now && !['cancelada', 'replanificada'].includes(a.status))
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  const pendingConsents = consents.filter((c) => c.patientId === p.id && c.status === 'pendiente')
  const newDocs = documents.filter((d) => d.patientId === p.id && d.published && d.publishedAt && Date.now() - new Date(d.publishedAt).getTime() < 14 * 86400000)
  const pendingBudgets = budgets.filter((b) => b.patientId === p.id && b.status === 'enviado')
  const center = centers.find((c) => c.id === p.centerId)

  const todo = [
    ...pendingConsents.map((c) => ({ id: c.id, icon: FileSignature, text: `Firmar: ${consentTemplates.find((t) => t.id === c.templateId)?.name}`, to: '/portal/consentimientos', cta: 'Revisar' })),
    ...pendingBudgets.map((b) => ({ id: b.id, icon: Euro, text: `Presupuesto ${b.number} · ${fMoney(budgetTotal(b))}`, to: '/portal/pagos', cta: 'Ver' })),
    ...newDocs.map((d) => ({ id: d.id, icon: FileText, text: `Nuevo documento: ${d.name}`, to: '/portal/documentos', cta: 'Abrir' })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">{fLong(new Date())}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {p.firstName} 👋</h1>
      </div>

      {next ? (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-lg shadow-brand-900/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-brand-200">Tu próxima cita · {relativeDays(next.start)}</p>
              <p className="mt-2 text-2xl font-semibold">{fLong(next.start)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-brand-100"><Clock className="h-4 w-4" /> {fTime(next.start)} · {services.find((s) => s.id === next.serviceId)?.name}</p>
            </div>
            <Badge tone={apptStatus[next.status].tone} dot className="!bg-white/95">{apptStatus[next.status].label}</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-brand-100">
            <span className="flex items-center gap-1.5"><Stethoscope className="h-4 w-4" />{professionals.find((x) => x.id === next.professionalId)?.name}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{centers.find((c) => c.id === next.centerId)?.name}</span>
          </div>
          <div className="mt-5"><ApptActions a={next} inverted /></div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
          <p className="font-medium">No tienes citas programadas</p>
          <Link to="/portal/citas"><Button className="mt-3" icon={CalendarDays}>Pedir cita</Button></Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold">Pendiente de ti</h2>
          {todo.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4 text-brand-600" /> No tienes nada pendiente.</p>
          ) : (
            <ul className="space-y-2">
              {todo.map((t) => (
                <li key={t.id}>
                  <Link to={t.to} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 hover:bg-brand-50">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200"><t.icon className="h-4 w-4" /></span>
                    <span className="flex-1 text-sm">{t.text}</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-brand-700">{t.cta} <ArrowRight className="h-3 w-3" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold">Tu clínica</h2>
          <p className="font-medium">{center?.name}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{center?.address}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{center?.phone}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Clock className="h-4 w-4 text-slate-400" />{center?.hours}</p>
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Para urgencias o síntomas graves llama al <b>112</b>. Este portal no atiende consultas clínicas urgentes.</p>
        </section>
      </div>
    </div>
  )
}
