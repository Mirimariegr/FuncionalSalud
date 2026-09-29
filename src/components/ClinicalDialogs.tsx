import { useEffect, useState } from 'react'
import { Eye, FileText, Globe, Lock, Upload } from 'lucide-react'
import { useCurrentStaff, useStore } from '../store'
import { consentStatus } from '../lib/labels'
import { addDays, fDate, fDateTime, toDateKey } from '../lib/utils'
import type { Consent, DocType, DocumentItem, Treatment } from '../types'
import { Badge, Button, Field, Input, Modal, Select, Textarea, Toggle } from './ui'

// ---------------- Episodio ----------------
export function EpisodeModal({ open, onClose, patientId, appointmentId }: { open: boolean; onClose: () => void; patientId: string; appointmentId?: string }) {
  const user = useCurrentStaff()!
  const { professionals, treatments } = useStore()
  const saveEpisode = useStore((s) => s.saveEpisode)
  const registerSession = useStore((s) => s.registerSession)
  const addDocument = useStore((s) => s.addDocument)
  const toast = useStore((s) => s.toast)
  const patientTreatments = treatments.filter((t) => t.patientId === patientId && t.status !== 'finalizado')
  const init = () => ({
    professionalId: user.professionalId ?? professionals[0].id,
    treatmentId: patientTreatments[0]?.id ?? '',
    reason: '', observations: '', diagnosis: '', plan: '', publicSummary: '',
    nextAction: '', nextActionDate: toDateKey(addDays(new Date(), 14)),
    countSession: true, publishReport: false,
  })
  const [f, setF] = useState(init)
  useEffect(() => { if (open) setF(init()) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof ReturnType<typeof init>) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const submit = () => {
    const ep = saveEpisode({
      patientId, appointmentId, professionalId: f.professionalId, treatmentId: f.treatmentId || undefined, date: new Date().toISOString(),
      reason: f.reason, observations: f.observations, diagnosis: f.diagnosis, plan: f.plan, publicSummary: f.publicSummary,
      nextAction: f.nextAction, nextActionDate: f.nextAction ? f.nextActionDate : undefined, closed: true,
    })
    if (f.treatmentId && f.countSession) registerSession(f.treatmentId)
    if (f.publishReport && f.publicSummary) {
      addDocument({
        patientId, name: `Resumen de visita ${new Date().toLocaleDateString('es-ES')}.pdf`, type: 'Informe', date: new Date().toISOString(),
        author: professionals.find((p) => p.id === f.professionalId)?.name ?? user.name, episodeId: ep.id, treatmentId: f.treatmentId || undefined,
        version: 1, size: '48 KB', reviewStatus: 'revisado', published: true, publishedAt: new Date().toISOString(), content: f.publicSummary,
      })
    }
    toast('Episodio registrado y cerrado' + (f.nextAction ? ' · próxima acción creada como tarea' : ''))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar episodio / visita" subtitle="Las notas internas no se publican al paciente." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={!f.reason}>Guardar y cerrar episodio</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Motivo de la visita *" className="sm:col-span-2"><Input value={f.reason} onChange={set('reason')} autoFocus placeholder="p. ej. Sesión 5 de 10 · rodilla" /></Field>
        <Field label="Profesional">
          <Select value={f.professionalId} onChange={set('professionalId')}>{professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </Field>
        <Field label="Tratamiento vinculado">
          <Select value={f.treatmentId} onChange={set('treatmentId')}>
            <option value="">— Ninguno —</option>
            {patientTreatments.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.doneSessions}/{t.totalSessions})</option>)}
          </Select>
        </Field>
        <Field label="Observaciones / exploración (interno)" className="sm:col-span-2"><Textarea value={f.observations} onChange={set('observations')} /></Field>
        <Field label="Diagnóstico / juicio clínico"><Input value={f.diagnosis} onChange={set('diagnosis')} /></Field>
        <Field label="Plan"><Input value={f.plan} onChange={set('plan')} /></Field>
        <Field label="Resumen para el paciente (publicable)" className="sm:col-span-2" hint="Solo se publica si activas la opción inferior.">
          <Textarea value={f.publicSummary} onChange={set('publicSummary')} className="min-h-[60px]" />
        </Field>
        <Field label="Próxima acción"><Input value={f.nextAction} onChange={set('nextAction')} placeholder="p. ej. Revisar evolución" /></Field>
        <Field label="Fecha próxima acción"><Input type="date" value={f.nextActionDate} onChange={set('nextActionDate')} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-5 rounded-xl bg-slate-50 p-3">
        {f.treatmentId && <Toggle checked={f.countSession} onChange={(v) => setF({ ...f, countSession: v })} label="Contabilizar sesión del tratamiento" />}
        <Toggle checked={f.publishReport} onChange={(v) => setF({ ...f, publishReport: v })} label="Publicar resumen en el portal" />
      </div>
    </Modal>
  )
}

// ---------------- Documento: subir ----------------
const docTypes: DocType[] = ['Informe', 'Resultado', 'Imagen', 'Instrucciones', 'Derivación', 'Aportado por paciente', 'Administrativo', 'Presupuesto', 'Factura']

export function UploadDocumentModal({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId?: string }) {
  const user = useCurrentStaff()!
  const { patients, treatments, episodes } = useStore()
  const addDocument = useStore((s) => s.addDocument)
  const toast = useStore((s) => s.toast)
  const init = () => ({ patientId: patientId ?? '', name: '', type: 'Informe' as DocType, treatmentId: '', episodeId: '', content: '', publish: false, review: 'revisado' as DocumentItem['reviewStatus'], fileName: '' })
  const [f, setF] = useState(init)
  useEffect(() => { if (open) setF(init()) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    addDocument({
      patientId: f.patientId, name: f.name || f.fileName || 'Documento.pdf', type: f.type, date: new Date().toISOString(), author: user.name,
      treatmentId: f.treatmentId || undefined, episodeId: f.episodeId || undefined, version: 1, size: `${Math.floor(Math.random() * 800 + 40)} KB`,
      reviewStatus: f.review, published: f.publish, publishedAt: f.publish ? new Date().toISOString() : undefined, content: f.content,
    })
    toast(f.publish ? 'Documento guardado y publicado en el portal' : 'Documento guardado (no publicado)')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Añadir documento" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={!f.patientId || !(f.name || f.fileName)}>Guardar</Button></>}>
      <div className="grid gap-4">
        {!patientId && (
          <Field label="Paciente">
            <Select value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })}>
              <option value="">Selecciona…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.nhc}</option>)}
            </Select>
          </Field>
        )}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-sm text-slate-500 hover:border-brand-300 hover:bg-brand-50/40">
          <Upload className="h-6 w-6 text-slate-400" />
          {f.fileName ? <span className="font-medium text-slate-700">{f.fileName}</span> : <span>Arrastra o selecciona un archivo (PDF, imagen…)</span>}
          <input type="file" className="hidden" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) setF({ ...f, fileName: fl.name, name: f.name || fl.name }) }} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Informe…pdf" /></Field>
          <Field label="Tipo">
            <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as DocType })}>{docTypes.map((t) => <option key={t}>{t}</option>)}</Select>
          </Field>
          <Field label="Tratamiento">
            <Select value={f.treatmentId} onChange={(e) => setF({ ...f, treatmentId: e.target.value })}>
              <option value="">—</option>
              {treatments.filter((t) => t.patientId === f.patientId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Episodio">
            <Select value={f.episodeId} onChange={(e) => setF({ ...f, episodeId: e.target.value })}>
              <option value="">—</option>
              {episodes.filter((x) => x.patientId === f.patientId).map((x) => <option key={x.id} value={x.id}>{fDate(x.date)} · {x.reason}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Contenido / resumen (opcional)"><Textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} className="min-h-[60px]" /></Field>
        <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-3">
          <Toggle checked={f.review === 'pendiente'} onChange={(v) => setF({ ...f, review: v ? 'pendiente' : 'revisado', publish: v ? false : f.publish })} label="Pendiente de revisión" />
          <Toggle checked={f.publish} disabled={f.review === 'pendiente'} onChange={(v) => setF({ ...f, publish: v })} label="Publicar al paciente" />
        </div>
      </div>
    </Modal>
  )
}

// ---------------- Documento: visor ----------------
export function DocumentViewer({ doc, onClose, readOnly }: { doc: DocumentItem | null; onClose: () => void; readOnly?: boolean }) {
  const { patients, treatments } = useStore()
  const setPublished = useStore((s) => s.setDocumentPublished)
  const markReviewed = useStore((s) => s.markDocumentReviewed)
  const log = useStore((s) => s.log)
  const toast = useStore((s) => s.toast)
  const current = useStore((s) => s.documents.find((d) => d.id === doc?.id))
  useEffect(() => {
    if (doc) log('Acceso', 'Documento', `Visualización de «${doc.name}»`)
  }, [doc, log])
  if (!doc || !current) return null
  const d = current
  const p = patients.find((x) => x.id === d.patientId)
  const t = treatments.find((x) => x.id === d.treatmentId)
  return (
    <Modal open onClose={onClose} title={d.name} subtitle={`${d.type} · ${fDate(d.date)} · v${d.version} · ${d.size}`} size="lg"
      footer={!readOnly && (
        <>
          {d.reviewStatus === 'pendiente' && <Button variant="secondary" onClick={() => { markReviewed(d.id); toast('Documento marcado como revisado') }}>Marcar revisado</Button>}
          {d.published ? (
            <Button variant="danger" icon={Lock} onClick={() => { setPublished(d.id, false); toast('Documento retirado del portal') }}>Retirar del portal</Button>
          ) : (
            <Button icon={Globe} disabled={d.reviewStatus === 'pendiente'} onClick={() => { setPublished(d.id, true); toast('Documento publicado. Aviso enviado al paciente (simulado).') }}>Publicar al paciente</Button>
          )}
        </>
      )}>
      <div className="mb-4 flex flex-wrap gap-2">
        {d.published ? <Badge tone="green" dot>Publicado {d.publishedAt && `· ${fDateTime(d.publishedAt)}`}</Badge> : <Badge dot>No publicado</Badge>}
        {d.reviewStatus === 'pendiente' ? <Badge tone="amber">Pendiente de revisión</Badge> : <Badge tone="teal">Revisado</Badge>}
        {t && <Badge tone="blue">{t.name}</Badge>}
      </div>
      <div className="rounded-xl bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-lg bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-brand-700">Funcional Salud</p>
              <p className="text-[10px] text-slate-400">C/ Fuencarral 142, Madrid</p>
            </div>
            <FileText className="h-6 w-6 text-slate-300" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">{d.type}</p>
          <p className="text-lg font-semibold">{d.name.replace(/\.(pdf|jpg|png)$/i, '')}</p>
          <p className="mt-1 text-xs text-slate-500">Paciente: {p?.firstName} {p?.lastName} · {p?.nhc} · Autor: {d.author}</p>
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {d.content || 'Vista previa no disponible en el prototipo. El documento original se almacenaría en el repositorio documental con versionado y control de acceso.'}
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400"><Eye className="h-3.5 w-3.5" /> Este acceso ha quedado registrado en auditoría.</p>
    </Modal>
  )
}

// ---------------- Consentimiento: enviar ----------------
export function SendConsentModal({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId?: string }) {
  const { patients, consentTemplates } = useStore()
  const sendConsent = useStore((s) => s.sendConsent)
  const toast = useStore((s) => s.toast)
  const [pid, setPid] = useState(patientId ?? '')
  const [tpl, setTpl] = useState(consentTemplates[0].id)
  const [channel, setChannel] = useState<Consent['channel']>('portal')
  useEffect(() => { if (open) { setPid(patientId ?? ''); setTpl(consentTemplates[0].id); setChannel('portal') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const t = consentTemplates.find((x) => x.id === tpl)!
  return (
    <Modal open={open} onClose={onClose} title="Solicitar consentimiento" subtitle="Se usa una plantilla versionada; la aceptación conserva evidencias." size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!pid} onClick={() => { sendConsent(pid, tpl, channel); toast('Solicitud enviada al paciente (simulado)'); onClose() }}>Enviar solicitud</Button></>}>
      <div className="grid gap-4">
        {!patientId && (
          <Field label="Paciente">
            <Select value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Selecciona…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.nhc}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Plantilla">
          <Select value={tpl} onChange={(e) => setTpl(e.target.value)}>{consentTemplates.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.version}</option>)}</Select>
        </Field>
        <Field label="Canal">
          <Select value={channel} onChange={(e) => setChannel(e.target.value as Consent['channel'])}>
            <option value="portal">Portal del paciente</option>
            <option value="enlace">Enlace seguro (email/SMS)</option>
            <option value="presencial">Presencial en clínica</option>
          </Select>
        </Field>
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2"><Badge tone="blue">{t.kind}</Badge><span className="text-xs text-slate-500">Vigencia: {t.validityMonths ? `${t.validityMonths} meses` : 'hasta revocación'}</span></div>
          <p className="text-slate-600">{t.body}</p>
        </div>
      </div>
    </Modal>
  )
}

export function ConsentDetailModal({ consent, onClose }: { consent: Consent | null; onClose: () => void }) {
  const { patients, consentTemplates } = useStore()
  const respond = useStore((s) => s.respondConsent)
  const revoke = useStore((s) => s.revokeConsent)
  const sendConsent = useStore((s) => s.sendConsent)
  const toast = useStore((s) => s.toast)
  const current = useStore((s) => s.consents.find((c) => c.id === consent?.id))
  if (!consent || !current) return null
  const c = current
  const t = consentTemplates.find((x) => x.id === c.templateId)!
  const p = patients.find((x) => x.id === c.patientId)!
  const expired = c.status === 'aceptado' && c.expiresAt && c.expiresAt < new Date().toISOString()
  const st = consentStatus[expired ? 'caducado' : c.status]
  return (
    <Modal open onClose={onClose} title={t.name} subtitle={`${p.firstName} ${p.lastName} · ${t.kind} · ${t.version}`} size="md"
      footer={
        <>
          {c.status === 'pendiente' && <Button variant="secondary" onClick={() => { respond(c.id, true, 'clinica'); toast('Aceptación presencial registrada') }}>Registrar aceptación presencial</Button>}
          {c.status === 'aceptado' && !expired && <Button variant="danger" onClick={() => { revoke(c.id); toast('Consentimiento revocado') }}>Revocar</Button>}
          {(expired || c.status === 'rechazado' || c.status === 'revocado') && <Button onClick={() => { sendConsent(c.patientId, c.templateId, 'portal'); toast('Nueva solicitud enviada'); onClose() }}>Solicitar de nuevo</Button>}
        </>
      }>
      <Badge tone={st.tone} dot>{st.label}</Badge>
      <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t.body}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {[
          ['Enviado', fDateTime(c.sentAt)], ['Canal', c.channel], ['Visualizado', fDateTime(c.viewedAt)], ['Respondido', fDateTime(c.respondedAt)],
          ['Vigente hasta', c.expiresAt ? fDate(c.expiresAt) : t.validityMonths ? '—' : 'Hasta revocación'], ['Versión', t.version],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">{l}</dt><dd className="font-medium capitalize text-slate-800">{v}</dd></div>
        ))}
      </dl>
      {c.evidence && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200"><b>Evidencia:</b> {c.evidence}</p>}
    </Modal>
  )
}

// ---------------- Tratamiento ----------------
export function TreatmentModal({ open, onClose, patientId, treatment }: { open: boolean; onClose: () => void; patientId?: string; treatment?: Treatment }) {
  const user = useCurrentStaff()!
  const { professionals, services, patients } = useStore()
  const saveTreatment = useStore((s) => s.saveTreatment)
  const toast = useStore((s) => s.toast)
  const init = () => treatment ?? {
    patientId: patientId ?? '', professionalId: user.professionalId ?? professionals[0].id, name: '', goals: '', serviceId: services[1].id,
    totalSessions: 6, doneSessions: 0, status: 'activo' as const, startDate: toDateKey(new Date()), reviewDate: toDateKey(addDays(new Date(), 30)), visibleToPatient: true,
  }
  const [f, setF] = useState<Omit<Treatment, 'id'> & { id?: string }>(init)
  useEffect(() => { if (open) setF(init()) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title={treatment ? 'Editar tratamiento' : 'Nuevo plan de tratamiento'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!f.name || !f.patientId} onClick={() => { saveTreatment(f); toast('Tratamiento guardado'); onClose() }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!patientId && !treatment && (
          <Field label="Paciente" className="sm:col-span-2">
            <Select value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })}>
              <option value="">Selecciona…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Nombre del plan *" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Objetivos" className="sm:col-span-2"><Textarea value={f.goals} onChange={(e) => setF({ ...f, goals: e.target.value })} className="min-h-[60px]" /></Field>
        <Field label="Profesional"><Select value={f.professionalId} onChange={(e) => setF({ ...f, professionalId: e.target.value })}>{professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Servicio principal"><Select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Sesiones previstas"><Input type="number" min={1} value={f.totalSessions} onChange={(e) => setF({ ...f, totalSessions: Number(e.target.value) })} /></Field>
        <Field label="Sesiones realizadas"><Input type="number" min={0} value={f.doneSessions} onChange={(e) => setF({ ...f, doneSessions: Number(e.target.value) })} /></Field>
        <Field label="Inicio"><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="Fecha de revisión"><Input type="date" value={f.reviewDate ?? ''} onChange={(e) => setF({ ...f, reviewDate: e.target.value })} /></Field>
        <Field label="Estado">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Treatment['status'] })}>
            <option value="activo">Activo</option><option value="pausado">Pausado</option><option value="finalizado">Finalizado</option>
          </Select>
        </Field>
        <div className="flex items-end pb-2"><Toggle checked={f.visibleToPatient} onChange={(v) => setF({ ...f, visibleToPatient: v })} label="Visible en el portal" /></div>
      </div>
    </Modal>
  )
}
