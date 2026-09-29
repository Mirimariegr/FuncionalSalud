import { useState } from 'react'
import { FileSignature, ShieldCheck, Smartphone } from 'lucide-react'
import { effectiveConsentStatus, useCurrentPatient, useStore } from '../../store'
import { consentStatus } from '../../lib/labels'
import { fDate } from '../../lib/utils'
import { Badge, Button, Modal } from '../../components/ui'
import type { Consent } from '../../types'

const revocable = ['Comunicaciones', 'Imagen', 'Portal', 'Cesión', 'Tratamiento']

export default function PortalConsents() {
  const p = useCurrentPatient()!
  const { consents, consentTemplates } = useStore()
  const respond = useStore((s) => s.respondConsent)
  const revoke = useStore((s) => s.revokeConsent)
  const viewConsent = useStore((s) => s.viewConsent)
  const toast = useStore((s) => s.toast)
  const [open, setOpen] = useState<Consent | null>(null)
  const [step, setStep] = useState<'read' | 'otp'>('read')
  const [read, setRead] = useState(false)

  const mine = consents.filter((c) => c.patientId === p.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  const pending = mine.filter((c) => c.status === 'pendiente')
  const rest = mine.filter((c) => c.status !== 'pendiente')
  const tpl = (id: string) => consentTemplates.find((t) => t.id === id)!

  const openConsent = (c: Consent) => { setOpen(c); setStep('read'); setRead(false); viewConsent(c.id) }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mis consentimientos</h1>
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-amber-700">Pendientes de tu firma</h2>
          <ul className="space-y-3">
            {pending.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 ring-2 ring-amber-200">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600"><FileSignature className="h-5 w-5" /></span>
                <div className="flex-1">
                  <p className="font-medium">{tpl(c.templateId).name}</p>
                  <p className="text-xs text-slate-500">Solicitado el {fDate(c.sentAt)} · {tpl(c.templateId).version}</p>
                </div>
                <Button onClick={() => openConsent(c)}>Leer y firmar</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Historial</h2>
        <ul className="space-y-2">
          {rest.map((c) => {
            const st = effectiveConsentStatus(c)
            const t = tpl(c.templateId)
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <FileSignature className="h-4 w-4 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-slate-500">{c.respondedAt && `Respondido el ${fDate(c.respondedAt)}`}{c.expiresAt && ` · vigente hasta ${fDate(c.expiresAt)}`}</p>
                </div>
                <Badge tone={consentStatus[st].tone} dot>{consentStatus[st].label}</Badge>
                {st === 'aceptado' && revocable.includes(t.kind) && (
                  <Button size="sm" variant="ghost" onClick={() => { revoke(c.id); toast('Consentimiento revocado. La clínica ha sido notificada.') }}>Revocar</Button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {open && (
        <Modal open onClose={() => setOpen(null)} title={tpl(open.templateId).name} subtitle={`${tpl(open.templateId).kind} · versión ${tpl(open.templateId).version}`} size="md"
          footer={step === 'read' ? (
            <>
              <Button variant="secondary" onClick={() => { respond(open.id, false, 'paciente'); toast('Has rechazado el consentimiento', 'info'); setOpen(null) }}>Rechazar</Button>
              <Button disabled={!read} onClick={() => setStep('otp')}>Aceptar y firmar</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep('read')}>Volver</Button>
              <Button icon={ShieldCheck} onClick={() => { respond(open.id, true, 'paciente'); toast('Consentimiento firmado. Se ha guardado la evidencia.'); setOpen(null) }}>Confirmar firma</Button>
            </>
          )}>
          {step === 'read' ? (
            <>
              <div className="scroll-thin max-h-72 overflow-y-auto rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                <p>Yo, <b>{p.firstName} {p.lastName}</b>, con documento {p.docId}:</p>
                <p className="mt-3">{tpl(open.templateId).body}</p>
                <p className="mt-3 text-xs text-slate-500">Vigencia: {tpl(open.templateId).validityMonths ? `${tpl(open.templateId).validityMonths} meses desde la aceptación` : 'hasta revocación'}. Podrás revocarlo cuando proceda desde este portal.</p>
              </div>
              <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="mt-0.5 accent-brand-600" />
                He leído y comprendido la información anterior.
              </label>
            </>
          ) : (
            <div className="text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Smartphone className="h-6 w-6" /></span>
              <p className="mt-3 font-medium">Verifica tu identidad</p>
              <p className="text-sm text-slate-500">Código enviado al móvil terminado en {p.phone.slice(-3)} (simulado)</p>
              <div className="mt-4 flex justify-center gap-2">
                {'731604'.split('').map((d, i) => <span key={i} className="grid h-11 w-9 place-items-center rounded-lg bg-slate-50 text-lg font-semibold ring-1 ring-slate-200">{d}</span>)}
              </div>
              <p className="mt-4 text-xs text-slate-400">Se guardará versión, fecha, hora, canal y evidencia de visualización y aceptación.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
