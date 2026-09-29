import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSignature, Send } from 'lucide-react'
import { consentExpiringSoon, effectiveConsentStatus, useRole, useStore } from '../../store'
import { consentStatus } from '../../lib/labels'
import { canEdit } from '../../lib/permissions'
import { cx, fDate } from '../../lib/utils'
import { Badge, Button, Card, PageHeader, Select, Stat, Tabs, Td, Th } from '../../components/ui'
import { ConsentDetailModal, SendConsentModal } from '../../components/ClinicalDialogs'
import type { Consent, ConsentStatus } from '../../types'

export default function Consents() {
  const role = useRole()
  const { consents, consentTemplates, patients } = useStore()
  const [tab, setTab] = useState<'registro' | 'plantillas'>('registro')
  const [status, setStatus] = useState<'all' | ConsentStatus | 'expiring'>('all')
  const [tpl, setTpl] = useState('all')
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Consent | null>(null)

  const eff = consents.map((c) => ({ c, s: effectiveConsentStatus(c) }))
  const rows = eff
    .filter(({ c, s }) => (status === 'all' || (status === 'expiring' ? consentExpiringSoon(c) : s === status)) && (tpl === 'all' || c.templateId === tpl))
    .sort((a, b) => b.c.sentAt.localeCompare(a.c.sentAt))

  return (
    <div>
      <PageHeader title="Consentimientos" subtitle="Plantillas versionadas, aceptación trazable, vigencia y revocación." actions={canEdit(role, 'consentimientos') && <Button icon={Send} onClick={() => setOpen(true)}>Solicitar consentimiento</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Aceptados vigentes" value={eff.filter((x) => x.s === 'aceptado').length} icon={FileSignature} tone="green" />
        <Stat label="Pendientes de respuesta" value={eff.filter((x) => x.s === 'pendiente').length} icon={FileSignature} tone="amber" />
        <Stat label="Caducan en 30 días" value={consents.filter((c) => consentExpiringSoon(c)).length} icon={FileSignature} tone="orange" />
        <Stat label="Caducados / revocados" value={eff.filter((x) => x.s === 'caducado' || x.s === 'revocado').length} icon={FileSignature} tone="red" />
      </div>
      <Tabs tabs={[{ id: 'registro', label: 'Registro' }, { id: 'plantillas', label: 'Plantillas', count: consentTemplates.length }]} value={tab} onChange={setTab} />
      <div className="mt-5">
        {tab === 'registro' ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-auto">
                <option value="all">Todos los estados</option>
                {Object.entries(consentStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                <option value="expiring">Próximos a caducar</option>
              </Select>
              <Select value={tpl} onChange={(e) => setTpl(e.target.value)} className="w-auto">
                <option value="all">Todas las plantillas</option>
                {consentTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Paciente</Th><Th>Consentimiento</Th><Th>Enviado</Th><Th>Canal</Th><Th>Vigencia</Th><Th>Estado</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(({ c, s }) => {
                      const p = patients.find((x) => x.id === c.patientId)
                      const t = consentTemplates.find((x) => x.id === c.templateId)
                      const soon = consentExpiringSoon(c)
                      return (
                        <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setView(c)}>
                          <Td><Link onClick={(e) => e.stopPropagation()} to={`/app/pacientes/${c.patientId}`} className="font-medium text-slate-800 hover:text-brand-700">{p?.firstName} {p?.lastName}</Link></Td>
                          <Td><p>{t?.name}</p><p className="text-xs text-slate-500">{t?.kind} · {t?.version}</p></Td>
                          <Td className="whitespace-nowrap">{fDate(c.sentAt)}</Td>
                          <Td className="capitalize">{c.channel}</Td>
                          <Td className={cx('whitespace-nowrap', soon && 'font-medium text-orange-600')}>{c.expiresAt ? fDate(c.expiresAt) : '—'}</Td>
                          <Td><Badge tone={consentStatus[s].tone} dot>{consentStatus[s].label}</Badge></Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {consentTemplates.map((t) => (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{t.name}</p>
                  <Badge tone="blue">{t.version}</Badge>
                </div>
                <div className="mt-1 flex gap-2 text-xs text-slate-500"><span>{t.kind}</span>·<span>{t.validityMonths ? `Vigencia ${t.validityMonths} meses` : 'Hasta revocación'}</span></div>
                <p className="mt-3 line-clamp-4 text-sm text-slate-600">{t.body}</p>
                <p className="mt-3 text-xs text-slate-400">{consents.filter((c) => c.templateId === t.id && effectiveConsentStatus(c) === 'aceptado').length} aceptaciones vigentes</p>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SendConsentModal open={open} onClose={() => setOpen(false)} />
      <ConsentDetailModal consent={view} onClose={() => setView(null)} />
    </div>
  )
}
