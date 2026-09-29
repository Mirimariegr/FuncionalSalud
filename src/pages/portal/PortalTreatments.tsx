import { Activity, CheckCircle2 } from 'lucide-react'
import { useCurrentPatient, useStore } from '../../store'
import { treatmentStatus } from '../../lib/labels'
import { fDate } from '../../lib/utils'
import { Badge, Progress } from '../../components/ui'

export default function PortalTreatments() {
  const p = useCurrentPatient()!
  const { treatments, episodes, professionals } = useStore()
  const mine = treatments.filter((t) => t.patientId === p.id && t.visibleToPatient)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mis tratamientos</h1>
      {mine.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">No tienes tratamientos visibles.</p>}
      {mine.map((t) => {
        const eps = episodes.filter((e) => e.treatmentId === t.id && e.publicSummary).sort((a, b) => b.date.localeCompare(a.date))
        return (
          <section key={t.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Activity className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-slate-500">{professionals.find((x) => x.id === t.professionalId)?.name} · desde {fDate(t.startDate)}</p>
                </div>
              </div>
              <Badge tone={treatmentStatus[t.status].tone}>{treatmentStatus[t.status].label}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600"><b className="font-medium text-slate-800">Objetivo:</b> {t.goals}</p>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-sm"><span>{t.doneSessions} de {t.totalSessions} sesiones</span><span className="font-semibold text-brand-700">{Math.round((t.doneSessions / t.totalSessions) * 100)}%</span></div>
              <Progress value={t.doneSessions} max={t.totalSessions} />
              <div className="mt-3 flex gap-1">
                {Array.from({ length: t.totalSessions }, (_, i) => (
                  <span key={i} className={`h-2 flex-1 rounded-full ${i < t.doneSessions ? 'bg-brand-500' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
            {eps.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Evolución</p>
                <ul className="space-y-2">
                  {eps.map((e) => (
                    <li key={e.id} className="flex gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <div><p className="text-slate-700">{e.publicSummary}</p><p className="text-xs text-slate-400">{fDate(e.date)}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
