import { locale } from '../../i18n/lang'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardPlus,
  Euro,
  FilePlus2,
  FileSignature,
  FileText,
  Globe,
  HeartPulse,
  History,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Pencil,
  Phone,
  Pill,
  Plus,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react'
import { budgetTotal, effectiveConsentStatus, paidForBudget, useCurrentStaff, useStore } from '../../store'
import { apptStatus, budgetStatus, consentStatus, patientStatus, treatmentStatus } from '../../lib/labels'
import { can, canEdit } from '../../lib/permissions'
import { age, cx, fDate, fDateTime, fMoney, fTime, sameDay, todayKey } from '../../lib/utils'
import { Avatar, Badge, Button, Card, Empty, Field, Input, Modal, Progress, Select, Tabs } from '../../components/ui'
import { AppointmentDetailModal, NewAppointmentModal } from '../../components/AppointmentDialogs'
import { ConsentDetailModal, DocumentViewer, EpisodeModal, SendConsentModal, TreatmentModal, UploadDocumentModal } from '../../components/ClinicalDialogs'
import { BudgetModal, PaymentModal } from '../../components/BillingDialogs'
import { isActive, NewPrescriptionModal, PrescriptionCard } from '../../components/Prescriptions'
import { SessionRecorder } from '../../components/SessionRecorder'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import type { Patient } from '../../types'
import type { Allergy, Appointment, Consent, DocumentItem, Medication, PatientStatus, Treatment } from '../../types'

type Tab = 'resumen' | 'expediente' | 'citas' | 'tratamientos' | 'documentos' | 'consentimientos' | 'economico' | 'timeline'

export default function PatientDetail() {
  const { id } = useParams()
  const user = useCurrentStaff()!
  const role = user.role
  const db = useStore()
  const { patients, appointments, episodes, treatments, documents, consents, consentTemplates, budgets, payments, professionals, services, centers, prescriptions } = db
  const setRxStatus = useStore((s) => s.setPrescriptionStatus)
  const updatePatient = useStore((s) => s.updatePatient)
  const validate = useStore((s) => s.validateClinicalItem)
  const setPublished = useStore((s) => s.setDocumentPublished)
  const registerSession = useStore((s) => s.registerSession)
  const setBudgetStatus = useStore((s) => s.setBudgetStatus)
  const toast = useStore((s) => s.toast)

  const [tab, setTab] = useState<Tab>('resumen')
  const [modal, setModal] = useState<null | 'appt' | 'episode' | 'doc' | 'consent' | 'budget' | 'payment' | 'treatment' | 'allergy' | 'med' | 'rx' | 'contact'>(null)
  const [sessionAppt, setSessionAppt] = useState<Appointment | null>(null)
  const [apptDetail, setApptDetail] = useState<Appointment | null>(null)
  const [docView, setDocView] = useState<DocumentItem | null>(null)
  const [consentView, setConsentView] = useState<Consent | null>(null)
  const [editTreatment, setEditTreatment] = useState<Treatment | undefined>()
  const [payBudget, setPayBudget] = useState<string | undefined>()

  const p = patients.find((x) => x.id === id)
  if (!p) return <Empty icon={UserRound} title="Paciente no encontrado" action={<Link to="/app/pacientes"><Button variant="secondary">Volver</Button></Link>} />

  const clinical = role === 'admin' ? 'consultar' : ({ direccion: 'limitado', recepcion: 'limitado', sanitario: 'editar', facturacion: 'no', privacidad: 'no' } as const)[role]
  const showClinical = clinical !== 'no'
  const fullClinical = clinical === 'editar' || clinical === 'consultar'
  const showEco = can(role, 'economico')

  const pAppts = appointments.filter((a) => a.patientId === p.id).sort((a, b) => b.start.localeCompare(a.start))
  const upcoming = pAppts.filter((a) => a.start > new Date().toISOString() && !['cancelada', 'replanificada'].includes(a.status)).reverse()
  const pEpisodes = episodes.filter((e) => e.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))
  const pTreat = treatments.filter((t) => t.patientId === p.id)
  const pDocs = documents.filter((d) => d.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))
  const visibleDocs = fullClinical ? pDocs : pDocs.filter((d) => ['Administrativo', 'Aportado por paciente', 'Presupuesto', 'Factura', 'Consentimiento'].includes(d.type) || (role === 'recepcion' && d.published))
  const pConsents = consents.filter((c) => c.patientId === p.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  const pBudgets = budgets.filter((b) => b.patientId === p.id)
  const pPayments = payments.filter((x) => x.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))
  const pRx = prescriptions.filter((x) => x.patientId === p.id).sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || b.date.localeCompare(a.date))
  const todayAppt = pAppts.find((a) => sameDay(a.start, new Date()) && ['confirmada', 'pendiente', 'en_curso'].includes(a.status) && (!user.professionalId || a.professionalId === user.professionalId))
  const activeAllergies = p.allergies.filter((a) => a.status === 'activa')
  const pendingDeclared = [...p.allergies.filter((a) => a.status === 'pendiente'), ...p.medications.filter((m) => m.status === 'pendiente')]
  const pendingConsents = pConsents.filter((c) => c.status === 'pendiente' || effectiveConsentStatus(c) === 'caducado')
  const prof = professionals.find((x) => x.id === p.professionalId)
  const center = centers.find((x) => x.id === p.centerId)
  const totalBudgeted = pBudgets.filter((b) => b.status === 'aceptado').reduce((a, b) => a + budgetTotal(b), 0)
  const totalPaid = pPayments.reduce((a, x) => a + x.amount, 0)
  const pendingAmount = pBudgets.filter((b) => b.status === 'aceptado').reduce((a, b) => a + Math.max(0, budgetTotal(b) - paidForBudget(payments, b.id)), 0)
  const tname = (tid: string) => consentTemplates.find((t) => t.id === tid)?.name ?? ''
  const sname = (sid: string) => services.find((s) => s.id === sid)?.name ?? ''
  const prname = (pid: string) => professionals.find((x) => x.id === pid)?.name ?? ''

  const tabs: { id: Tab; label: string; count?: number; show: boolean }[] = [
    { id: 'resumen', label: 'Resumen', show: true },
    { id: 'expediente', label: 'Expediente clínico', show: showClinical },
    { id: 'citas', label: 'Citas', count: pAppts.length, show: can(role, 'agenda') || role === 'facturacion' },
    { id: 'tratamientos', label: 'Tratamientos', count: pTreat.length, show: can(role, 'tratamientos') },
    { id: 'documentos', label: 'Documentos', count: visibleDocs.length, show: can(role, 'documentos') },
    { id: 'consentimientos', label: 'Consentimientos', count: pConsents.length, show: can(role, 'consentimientos') },
    { id: 'economico', label: 'Económico', count: pBudgets.length, show: showEco },
    { id: 'timeline', label: 'Línea temporal', show: true },
  ]

  return (
    <div className="space-y-6">
      <Link to="/app/pacientes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Pacientes</Link>

      {/* Cabecera */}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div className="h-16 bg-gradient-to-r from-brand-600 via-brand-500 to-sky-500" />
        <div className="px-6 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="-mt-8 rounded-full ring-4 ring-white"><Avatar name={`${p.firstName} ${p.lastName}`} size="xl" /></span>
              <div className="pt-3">
                <h1 className="text-xl font-semibold tracking-tight">{p.firstName} {p.lastName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">{p.nhc}</span>·<span>{age(p.birthDate)} años ({fDate(p.birthDate)})</span>·<span>{p.docId || 'Sin documento'}</span>
                  <Badge tone={patientStatus[p.status].tone} dot>{patientStatus[p.status].label}</Badge>
                  <Badge tone="blue">{p.insurer ?? 'Privado'}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-3">
              {canEdit(role, 'clinico') && todayAppt && <Button size="sm" icon={Mic} onClick={() => setSessionAppt(todayAppt)}>Iniciar sesión · grabar</Button>}
              {canEdit(role, 'agenda') && <Button size="sm" variant={canEdit(role, 'clinico') && todayAppt ? 'secondary' : 'primary'} icon={CalendarPlus} onClick={() => setModal('appt')}>Nueva cita</Button>}
              {canEdit(role, 'clinico') && <Button size="sm" variant="secondary" icon={ClipboardPlus} onClick={() => setModal('episode')}>Registrar episodio</Button>}
              {canEdit(role, 'documentos') && <Button size="sm" variant="secondary" icon={FilePlus2} onClick={() => setModal('doc')}>Documento</Button>}
              {canEdit(role, 'consentimientos') && <Button size="sm" variant="secondary" icon={FileSignature} onClick={() => setModal('consent')}>Consentimiento</Button>}
              {canEdit(role, 'economico') && <Button size="sm" variant="secondary" icon={Euro} onClick={() => setModal('budget')}>Presupuesto</Button>}
            </div>
          </div>
          <div className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{p.phone}</p>
            <p className="flex items-center gap-2 truncate text-slate-600"><Mail className="h-4 w-4 text-slate-400" />{p.email || '—'}</p>
            <p className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{center?.name}</p>
            <p className="flex items-center gap-2 text-slate-600"><Stethoscope className="h-4 w-4 text-slate-400" />{prof?.name ?? 'Sin profesional de referencia'}</p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(activeAllergies.length > 0 || pendingDeclared.length > 0 || pendingConsents.length > 0 || p.relations.some((r) => r.kind === 'tutor')) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {activeAllergies.length > 0 && showClinical && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Alergias activas</p>
                <p className="text-sm text-red-700">{activeAllergies.map((a) => `${a.substance} (${a.severity})`).join(' · ')}</p>
              </div>
            </div>
          )}
          {pendingDeclared.length > 0 && showClinical && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Datos declarados pendientes de validar</p>
                <p className="text-sm text-amber-700">{pendingDeclared.map((x) => ('substance' in x ? x.substance : x.name)).join(' · ')}</p>
              </div>
            </div>
          )}
          {pendingConsents.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-4 ring-1 ring-orange-200">
              <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Consentimientos pendientes o caducados</p>
                <p className="text-sm text-orange-700">{pendingConsents.map((c) => tname(c.templateId)).join(' · ')}</p>
              </div>
            </div>
          )}
          {p.relations.filter((r) => r.kind === 'tutor').map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
              <div>
                <p className="text-sm font-semibold text-violet-800">Paciente menor · tutor legal</p>
                <p className="text-sm text-violet-700">{r.name} · {r.phone} · vigente hasta {fDate(r.validUntil)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs tabs={tabs.filter((t) => t.show)} value={tab} onChange={setTab} />

      {tab === 'resumen' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Próximas citas" icon={CalendarDays} padded={false} className="lg:col-span-2">
            {upcoming.length === 0 ? <Empty icon={CalendarDays} title="Sin citas programadas" action={canEdit(role, 'agenda') && <Button size="sm" onClick={() => setModal('appt')}>Programar cita</Button>} /> : (
              <ul className="divide-y divide-slate-100">
                {upcoming.slice(0, 5).map((a) => <ApptRow key={a.id} a={a} onClick={() => setApptDetail(a)} />)}
              </ul>
            )}
          </Card>
          <Card title="Contacto y preferencias" icon={MessageCircle} action={canEdit(role, 'pacientes') && <Button size="sm" variant="soft" icon={Pencil} onClick={() => setModal('contact')}>Editar</Button>}>
            <dl className="space-y-2.5 text-sm">
              <Row l="Teléfono" v={p.phone} />
              <Row l="Email" v={<span className="break-all">{p.email || '—'}</span>} />
              <Row l="Canal preferido" v={<span className="capitalize">{p.preferredChannel}</span>} />
              <Row l="Idioma" v={p.language} />
              <Row l="Dirección" v={p.address} />
              <Row l="Origen" v={p.origin} />
              <Row l="Portal" v={p.portalEnabled ? <Badge tone="green">Activo</Badge> : <Badge>Sin acceso</Badge>} />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(['whatsapp', 'email', 'sms'] as const).map((c) => (
                  <Badge key={c} tone={p.channelConsent[c] ? 'teal' : 'slate'}>{p.channelConsent[c] ? '✓' : '✕'} {c}</Badge>
                ))}
              </div>
              {p.notes && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{p.notes}</p>}
              {canEdit(role, 'pacientes') && (
                <div className="pt-2">
                  <Field label="Estado del paciente">
                    <Select value={p.status} onChange={(e) => { updatePatient(p.id, { status: e.target.value as PatientStatus }, `Estado de ${p.firstName} ${p.lastName} → ${e.target.value}`); toast('Estado actualizado') }}>
                      {Object.entries(patientStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </Field>
                </div>
              )}
            </dl>
          </Card>
          {can(role, 'tratamientos') && (
            <Card title="Tratamientos" icon={Activity} className="lg:col-span-2">
              {pTreat.length === 0 ? <p className="text-sm text-slate-500">Sin tratamientos.</p> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {pTreat.map((t) => <TreatmentCard key={t.id} t={t} />)}
                </div>
              )}
            </Card>
          )}
          <Card title="Relaciones" icon={Users}>
            {p.relations.length === 0 ? <p className="text-sm text-slate-500">Sin personas vinculadas.</p> : p.relations.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-1.5">
                <Avatar name={r.name} size="sm" />
                <div className="text-sm"><p className="font-medium">{r.name}</p><p className="text-xs capitalize text-slate-500">{r.kind} · {r.phone}</p></div>
              </div>
            ))}
            {showEco && (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                <div><p className="text-[11px] text-slate-500">Aceptado</p><p className="text-sm font-semibold">{fMoney(totalBudgeted)}</p></div>
                <div><p className="text-[11px] text-slate-500">Cobrado</p><p className="text-sm font-semibold text-emerald-600">{fMoney(totalPaid)}</p></div>
                <div><p className="text-[11px] text-slate-500">Pendiente</p><p className={cx('text-sm font-semibold', pendingAmount > 0 && 'text-amber-600')}>{fMoney(pendingAmount)}</p></div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'expediente' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Alergias e intolerancias" icon={ShieldAlert} action={canEdit(role, 'clinico') && <Button size="sm" variant="soft" icon={Plus} onClick={() => setModal('allergy')}>Añadir</Button>}>
            {p.allergies.length === 0 ? <p className="text-sm text-slate-500">Sin alergias conocidas.</p> : (
              <ul className="space-y-2">
                {p.allergies.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <span className={cx('h-2 w-2 rounded-full', a.severity === 'grave' ? 'bg-red-500' : a.severity === 'moderada' ? 'bg-amber-500' : 'bg-slate-400')} />
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{a.substance} <span className="font-normal text-slate-500">· {a.reaction}</span></p>
                      <p className="text-xs text-slate-500">Gravedad {a.severity} · {fDate(a.date)} · fuente: {a.source}</p>
                    </div>
                    {a.status === 'pendiente' ? (
                      canEdit(role, 'clinico') ? <Button size="sm" onClick={() => { validate(p.id, 'allergy', a.id); toast('Alergia validada') }}>Validar</Button> : <Badge tone="amber">Pendiente</Badge>
                    ) : <Badge tone={a.status === 'activa' ? 'red' : 'slate'}>{a.status}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {fullClinical ? (
            <>
              <Card title="Medicación" icon={Pill} action={canEdit(role, 'clinico') && <Button size="sm" variant="soft" icon={Plus} onClick={() => setModal('med')}>Añadir</Button>}>
                {p.medications.length === 0 ? <p className="text-sm text-slate-500">Sin medicación registrada.</p> : (
                  <ul className="space-y-2">
                    {p.medications.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <Pill className="h-4 w-4 text-slate-400" />
                        <div className="flex-1 text-sm">
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-slate-500">{m.dose} · {m.frequency} · desde {fDate(m.start)}</p>
                        </div>
                        {m.status === 'pendiente' ? (
                          canEdit(role, 'clinico') ? <Button size="sm" onClick={() => { validate(p.id, 'medication', m.id); toast('Medicación validada') }}>Validar</Button> : <Badge tone="amber">Declarada</Badge>
                        ) : <Badge tone={m.status === 'actual' ? 'teal' : 'slate'}>{m.status}</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Antecedentes" icon={HeartPulse}>
                {p.antecedents.length === 0 ? <p className="text-sm text-slate-500">Sin antecedentes registrados.</p> : (
                  <ul className="space-y-2">
                    {p.antecedents.map((a) => (
                      <li key={a.id} className="flex items-start gap-3 text-sm">
                        <Badge tone="violet" className="mt-0.5 w-20 justify-center capitalize">{a.kind}</Badge>
                        <span className="flex-1">{a.description}</span>
                        <span className="text-xs text-slate-400">{fDate(a.date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Recetas" icon={Pill} action={canEdit(role, 'clinico') && <Button size="sm" variant="soft" icon={Plus} onClick={() => setModal('rx')}>Nueva receta</Button>}>
                {pRx.length === 0 ? <p className="text-sm text-slate-500">Sin recetas.</p> : (
                  <div className="space-y-2">
                    {pRx.map((rx) => (
                      <div key={rx.id}>
                        <PrescriptionCard rx={rx} compact />
                        {canEdit(role, 'clinico') && isActive(rx) && (
                          <div className="mt-1 flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setRxStatus(rx.id, 'dispensada'); toast('Marcada como dispensada') }}>Dispensada</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setRxStatus(rx.id, 'anulada'); toast('Receta anulada') }}>Anular</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Episodios y visitas" icon={Stethoscope} padded={false} className="lg:col-span-2" action={canEdit(role, 'clinico') && <Button size="sm" variant="soft" icon={Plus} onClick={() => setModal('episode')}>Nuevo manual</Button>}>
                {pEpisodes.length === 0 ? <Empty icon={Stethoscope} title="Sin episodios" /> : (
                  <ul className="divide-y divide-slate-100">
                    {pEpisodes.map((e) => (
                      <li key={e.id} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{e.reason}{e.aiSummary && <Badge tone="violet"><Mic className="h-3 w-3" /> Grabada · resumen revisado</Badge>}</p>
                          <span className="shrink-0 text-xs text-slate-400">{fDate(e.date)}{e.durationSec ? ` · ${Math.max(1, Math.round(e.durationSec / 60))} min` : ''}</span>
                        </div>
                        <p className="text-xs text-slate-500">{prname(e.professionalId)}{e.treatmentId && ` · ${treatments.find((t) => t.id === e.treatmentId)?.name}`}</p>
                        {e.observations && <p className="mt-2 text-sm text-slate-600"><span className="text-xs font-medium text-slate-400">Observaciones · </span>{e.observations}</p>}
                        {e.diagnosis && <p className="mt-1 text-sm text-slate-600"><span className="text-xs font-medium text-slate-400">Juicio clínico · </span>{e.diagnosis}</p>}
                        {e.plan && <p className="mt-1 text-sm text-slate-600"><span className="text-xs font-medium text-slate-400">Plan · </span>{e.plan}</p>}
                        {e.nextAction && <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-700"><CheckCircle2 className="h-3.5 w-3.5" /> Próxima acción: {e.nextAction} · {fDate(e.nextActionDate)}</p>}
                        {e.transcript && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer font-medium text-brand-700">Ver transcripción</summary>
                            <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-600">{e.transcript}</p>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <Lock className="mt-0.5 h-5 w-5 text-slate-400" />
                <p>Tu perfil solo tiene acceso <b>limitado</b> a datos clínicos: puedes ver las alergias activas para la seguridad del paciente, pero no la medicación, antecedentes ni episodios.</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'citas' && (
        <Card padded={false} title="Historial de citas" icon={CalendarDays} action={canEdit(role, 'agenda') && <Button size="sm" icon={Plus} onClick={() => setModal('appt')}>Nueva cita</Button>}>
          <ul className="divide-y divide-slate-100">
            {pAppts.map((a) => <ApptRow key={a.id} a={a} onClick={() => setApptDetail(a)} />)}
          </ul>
        </Card>
      )}

      {tab === 'tratamientos' && (
        <div className="space-y-4">
          {canEdit(role, 'tratamientos') && <div className="flex justify-end"><Button icon={Plus} onClick={() => { setEditTreatment(undefined); setModal('treatment') }}>Nuevo tratamiento</Button></div>}
          {pTreat.length === 0 ? <Card><Empty icon={Activity} title="Sin tratamientos" /></Card> : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pTreat.map((t) => (
                <Card key={t.id}>
                  <TreatmentCard t={t} large />
                  {canEdit(role, 'tratamientos') && (
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                      {t.status === 'activo' && <Button size="sm" icon={CheckCircle2} onClick={() => { registerSession(t.id); toast('Sesión registrada') }}>Registrar sesión</Button>}
                      <Button size="sm" variant="secondary" onClick={() => { setEditTreatment(t); setModal('treatment') }}>Editar</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'documentos' && (
        <Card padded={false} title="Documentos del paciente" icon={FileText} action={canEdit(role, 'documentos') && <Button size="sm" icon={Plus} onClick={() => setModal('doc')}>Añadir</Button>}>
          {visibleDocs.length === 0 ? <Empty icon={FileText} title="Sin documentos" /> : (
            <ul className="divide-y divide-slate-100">
              {visibleDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-4 px-5 py-3">
                  <button onClick={() => setDocView(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><FileText className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium hover:text-brand-700">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.type} · {fDate(d.date)} · {d.author} · v{d.version}</p>
                    </div>
                  </button>
                  {d.reviewStatus === 'pendiente' && <Badge tone="amber">Por revisar</Badge>}
                  {canEdit(role, 'documentos') ? (
                    <button
                      disabled={d.reviewStatus === 'pendiente'}
                      onClick={() => { setPublished(d.id, !d.published); toast(d.published ? 'Retirado del portal' : 'Publicado en el portal') }}
                      className={cx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition disabled:opacity-40', d.published ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50')}
                      title={d.reviewStatus === 'pendiente' ? 'Revisa el documento antes de publicarlo' : ''}
                    >
                      {d.published ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {d.published ? 'Publicado' : 'Privado'}
                    </button>
                  ) : d.published ? <Badge tone="green">Publicado</Badge> : <Badge>Privado</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'consentimientos' && (
        <Card padded={false} title="Consentimientos" icon={FileSignature} action={canEdit(role, 'consentimientos') && <Button size="sm" icon={Plus} onClick={() => setModal('consent')}>Solicitar</Button>}>
          <ul className="divide-y divide-slate-100">
            {pConsents.map((c) => {
              const st = consentStatus[effectiveConsentStatus(c)]
              return (
                <li key={c.id}>
                  <button onClick={() => setConsentView(c)} className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-slate-50">
                    <FileSignature className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tname(c.templateId)}</p>
                      <p className="text-xs text-slate-500">Enviado {fDate(c.sentAt)} por {c.channel}{c.expiresAt && ` · vigente hasta ${fDate(c.expiresAt)}`}</p>
                    </div>
                    <Badge tone={st.tone} dot>{st.label}</Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {tab === 'economico' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card padded={false} title="Presupuestos" icon={Euro} action={canEdit(role, 'economico') && <Button size="sm" icon={Plus} onClick={() => setModal('budget')}>Nuevo</Button>}>
            {pBudgets.length === 0 ? <Empty icon={Euro} title="Sin presupuestos" /> : (
              <ul className="divide-y divide-slate-100">
                {pBudgets.map((b) => {
                  const total = budgetTotal(b)
                  const paid = paidForBudget(payments, b.id)
                  return (
                    <li key={b.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{b.number}</p>
                          <p className="text-xs text-slate-500">{b.lines.map((l) => l.concept).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fMoney(total)}</p>
                          <Badge tone={budgetStatus[b.status].tone}>{budgetStatus[b.status].label}</Badge>
                        </div>
                      </div>
                      {b.status === 'aceptado' && (
                        <div className="mt-2">
                          <div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>Cobrado {fMoney(paid)}</span><span>{Math.round((paid / total) * 100)}%</span></div>
                          <Progress value={paid} max={total} />
                        </div>
                      )}
                      {canEdit(role, 'economico') && (
                        <div className="mt-2 flex gap-2">
                          {b.status === 'borrador' && <Button size="sm" variant="soft" onClick={() => { setBudgetStatus(b.id, 'enviado'); toast('Presupuesto enviado') }}>Enviar</Button>}
                          {b.status === 'enviado' && <Button size="sm" variant="soft" onClick={() => { setBudgetStatus(b.id, 'aceptado'); toast('Aceptación registrada') }}>Registrar aceptación</Button>}
                          {b.status === 'aceptado' && paid < total && <Button size="sm" variant="soft" onClick={() => { setPayBudget(b.id); setModal('payment') }}>Registrar cobro</Button>}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
          <Card padded={false} title="Pagos" icon={Euro} action={canEdit(role, 'economico') && <Button size="sm" variant="soft" icon={Plus} onClick={() => { setPayBudget(undefined); setModal('payment') }}>Cobro</Button>}>
            {pPayments.length === 0 ? <Empty icon={Euro} title="Sin pagos" /> : (
              <ul className="divide-y divide-slate-100">
                {pPayments.map((x) => (
                  <li key={x.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div><p className="font-medium">{x.concept}</p><p className="text-xs text-slate-500">{fDate(x.date)} · {x.method}</p></div>
                    <p className="font-semibold text-emerald-600">+{fMoney(x.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'timeline' && <Timeline patientId={p.id} fullClinical={fullClinical} showEco={showEco} sname={sname} tname={tname} prname={prname} />}

      {/* Modales */}
      <NewAppointmentModal open={modal === 'appt'} onClose={() => setModal(null)} defaults={{ patientId: p.id, professionalId: p.professionalId, centerId: p.centerId }} />
      <EpisodeModal open={modal === 'episode'} onClose={() => setModal(null)} patientId={p.id} />
      <UploadDocumentModal open={modal === 'doc'} onClose={() => setModal(null)} patientId={p.id} />
      <SendConsentModal open={modal === 'consent'} onClose={() => setModal(null)} patientId={p.id} />
      <BudgetModal open={modal === 'budget'} onClose={() => setModal(null)} patientId={p.id} />
      <PaymentModal open={modal === 'payment'} onClose={() => setModal(null)} patientId={p.id} budgetId={payBudget} />
      <TreatmentModal open={modal === 'treatment'} onClose={() => setModal(null)} patientId={p.id} treatment={editTreatment} />
      <AllergyModal open={modal === 'allergy'} onClose={() => setModal(null)} patientId={p.id} />
      <MedicationModal open={modal === 'med'} onClose={() => setModal(null)} patientId={p.id} />
      <NewPrescriptionModal open={modal === 'rx'} onClose={() => setModal(null)} patientId={p.id} />
      <ContactModal open={modal === 'contact'} onClose={() => setModal(null)} patient={p} />
      {sessionAppt && <ErrorBoundary overlay onReset={() => setSessionAppt(null)}><SessionRecorder appt={sessionAppt} onClose={() => { setSessionAppt(null); setTab('expediente') }} /></ErrorBoundary>}
      <AppointmentDetailModal appt={apptDetail} onClose={() => setApptDetail(null)} />
      <DocumentViewer doc={docView} onClose={() => setDocView(null)} readOnly={!canEdit(role, 'documentos')} />
      <ConsentDetailModal consent={consentView} onClose={() => setConsentView(null)} />
    </div>
  )
}

const Row = ({ l, v }: { l: string; v: ReactNode }) => (
  <div className="flex justify-between gap-3"><dt className="text-slate-500">{l}</dt><dd className="text-right font-medium text-slate-800">{v}</dd></div>
)

function ApptRow({ a, onClick }: { a: Appointment; onClick: () => void }) {
  const { services, professionals } = useStore()
  const svc = services.find((s) => s.id === a.serviceId)
  const prof = professionals.find((s) => s.id === a.professionalId)
  const st = apptStatus[a.status]
  const d = new Date(a.start)
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-slate-50">
        <div className="w-12 shrink-0 rounded-lg bg-slate-50 py-1 text-center ring-1 ring-slate-200">
          <p className="text-[10px] uppercase text-slate-500">{d.toLocaleDateString(locale(), { month: 'short' })}</p>
          <p className="text-base font-semibold leading-tight">{d.getDate()}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{svc?.name}</p>
          <p className="text-xs text-slate-500">{fTime(a.start)} · {prof?.name} · {a.reason}</p>
        </div>
        <Badge tone={st.tone} dot>{st.label}</Badge>
      </button>
    </li>
  )
}

function TreatmentCard({ t, large }: { t: Treatment; large?: boolean }) {
  const { professionals } = useStore()
  const st = treatmentStatus[t.status]
  const overdue = t.status !== 'finalizado' && t.reviewDate && t.reviewDate < todayKey()
  return (
    <div className={cx(!large && 'rounded-xl bg-slate-50 p-4')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cx('font-semibold', large ? 'text-base' : 'text-sm')}>{t.name}</p>
          <p className="text-xs text-slate-500">{professionals.find((p) => p.id === t.professionalId)?.name} · desde {fDate(t.startDate)}</p>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      {large && <p className="mt-2 text-sm text-slate-600">{t.goals}</p>}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{t.doneSessions} de {t.totalSessions} sesiones</span>
        {t.reviewDate && <span className={cx(overdue && 'font-medium text-red-600')}>Revisión {fDate(t.reviewDate)}</span>}
      </div>
      <div className="mt-1.5"><Progress value={t.doneSessions} max={t.totalSessions} /></div>
      {large && <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">{t.visibleToPatient ? <><Globe className="h-3 w-3" /> Visible en el portal</> : <><Lock className="h-3 w-3" /> No visible para el paciente</>}</p>}
    </div>
  )
}

function Timeline({ patientId, fullClinical, showEco, sname, tname, prname }: { patientId: string; fullClinical: boolean; showEco: boolean; sname: (id: string) => string; tname: (id: string) => string; prname: (id: string) => string }) {
  const { appointments, episodes, documents, consents, payments, budgets, audit, patients } = useStore()
  const [filter, setFilter] = useState('all')
  const p = patients.find((x) => x.id === patientId)!
  const fullName = `${p.firstName} ${p.lastName}`
  const items = useMemo(() => {
    const list: { at: string; type: string; title: string; sub: string; icon: typeof CalendarDays; tone: string }[] = []
    appointments.filter((a) => a.patientId === patientId).forEach((a) => list.push({ at: a.start, type: 'cita', title: `Cita · ${sname(a.serviceId)}`, sub: `${prname(a.professionalId)} · ${apptStatus[a.status].label}`, icon: CalendarDays, tone: 'bg-brand-100 text-brand-700' }))
    if (fullClinical) episodes.filter((e) => e.patientId === patientId).forEach((e) => list.push({ at: e.date, type: 'episodio', title: `Episodio · ${e.reason}`, sub: e.diagnosis || prname(e.professionalId), icon: Stethoscope, tone: 'bg-blue-100 text-blue-700' }))
    documents.filter((d) => d.patientId === patientId && (fullClinical || d.published)).forEach((d) => list.push({ at: d.date, type: 'documento', title: `Documento · ${d.name}`, sub: `${d.type}${d.published ? ' · publicado' : ''}`, icon: FileText, tone: 'bg-slate-200 text-slate-700' }))
    consents.filter((c) => c.patientId === patientId).forEach((c) => list.push({ at: c.respondedAt ?? c.sentAt, type: 'consentimiento', title: `Consentimiento · ${tname(c.templateId)}`, sub: consentStatus[effectiveConsentStatus(c)].label, icon: FileSignature, tone: 'bg-violet-100 text-violet-700' }))
    if (showEco) {
      payments.filter((x) => x.patientId === patientId).forEach((x) => list.push({ at: x.date, type: 'economico', title: `Pago · ${fMoney(x.amount)}`, sub: `${x.concept} · ${x.method}`, icon: Euro, tone: 'bg-emerald-100 text-emerald-700' }))
      budgets.filter((b) => b.patientId === patientId).forEach((b) => list.push({ at: b.date, type: 'economico', title: `Presupuesto ${b.number}`, sub: `${fMoney(budgetTotal(b))} · ${budgetStatus[b.status].label}`, icon: Euro, tone: 'bg-emerald-100 text-emerald-700' }))
    }
    audit.filter((a) => a.detail.includes(fullName) && a.role === 'paciente').forEach((a) => list.push({ at: a.at, type: 'comunicacion', title: `${a.action} desde el portal`, sub: a.detail, icon: MessageCircle, tone: 'bg-amber-100 text-amber-700' }))
    return list.sort((a, b) => b.at.localeCompare(a.at))
  }, [appointments, episodes, documents, consents, payments, budgets, audit, patientId, fullClinical, showEco, sname, tname, prname, fullName])

  const types = [
    ['all', 'Todo'], ['cita', 'Citas'], ...(fullClinical ? [['episodio', 'Episodios']] : []), ['documento', 'Documentos'], ['consentimiento', 'Consentimientos'],
    ...(showEco ? [['economico', 'Económico']] : []), ['comunicacion', 'Portal'],
  ]
  const shown = items.filter((i) => filter === 'all' || i.type === filter)
  const nowIso = new Date().toISOString()

  return (
    <Card title="Línea temporal" icon={History}>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {types.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={cx('rounded-full px-3 py-1 text-xs font-medium ring-1 transition', filter === k ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{l}</button>
        ))}
      </div>
      <ol className="relative space-y-4 border-l-2 border-slate-100 pl-6">
        {shown.map((i, idx) => (
          <li key={idx} className={cx('relative', i.at > nowIso && 'opacity-70')}>
            <span className={cx('absolute -left-[37px] grid h-6 w-6 place-items-center rounded-full ring-4 ring-white', i.tone)}><i.icon className="h-3 w-3" /></span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">{i.title}</p>
              <span className="text-xs text-slate-400">{i.at > nowIso ? 'Próximo · ' : ''}{fDateTime(i.at)}</span>
            </div>
            <p className="text-xs text-slate-500">{i.sub}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function AllergyModal({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId: string }) {
  const add = useStore((s) => s.addAllergy)
  const toast = useStore((s) => s.toast)
  const [f, setF] = useState<Omit<Allergy, 'id'>>({ substance: '', reaction: '', severity: 'moderada', status: 'activa', source: 'profesional', date: todayKey() })
  return (
    <Modal open={open} onClose={onClose} title="Añadir alergia" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!f.substance} onClick={() => { add(patientId, f); toast('Alergia registrada'); onClose(); setF({ ...f, substance: '', reaction: '' }) }}>Guardar</Button></>}>
      <div className="grid gap-3">
        <Field label="Sustancia"><Input value={f.substance} onChange={(e) => setF({ ...f, substance: e.target.value })} autoFocus /></Field>
        <Field label="Reacción"><Input value={f.reaction} onChange={(e) => setF({ ...f, reaction: e.target.value })} /></Field>
        <Field label="Gravedad"><Select value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as Allergy['severity'] })}><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="grave">Grave</option></Select></Field>
      </div>
    </Modal>
  )
}

function MedicationModal({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId: string }) {
  const add = useStore((s) => s.addMedication)
  const toast = useStore((s) => s.toast)
  const [f, setF] = useState<Omit<Medication, 'id'>>({ name: '', dose: '', frequency: '', status: 'actual', source: 'profesional', start: todayKey() })
  return (
    <Modal open={open} onClose={onClose} title="Añadir medicación" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!f.name} onClick={() => { add(patientId, f); toast('Medicación registrada'); onClose(); setF({ ...f, name: '', dose: '', frequency: '' }) }}>Guardar</Button></>}>
      <div className="grid gap-3">
        <Field label="Medicamento"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dosis"><Input value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} /></Field>
          <Field label="Frecuencia"><Input value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} /></Field>
        </div>
        <Field label="Inicio"><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}

function ContactModal({ open, onClose, patient }: { open: boolean; onClose: () => void; patient: Patient }) {
  const updatePatient = useStore((s) => s.updatePatient)
  const toast = useStore((s) => s.toast)
  const init = () => ({ phone: patient.phone, email: patient.email, address: patient.address, preferredChannel: patient.preferredChannel, language: patient.language })
  const [f, setF] = useState(init)
  const [prev, setPrev] = useState(open)
  if (open !== prev) { setPrev(open); if (open) setF(init()) }
  return (
    <Modal open={open} onClose={onClose} title="Editar datos de contacto" subtitle="Los cambios quedan registrados en auditoría." size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!f.phone.trim()} onClick={() => {
        const changed = (['phone', 'email', 'address', 'preferredChannel', 'language'] as const).filter((k) => f[k] !== patient[k])
        updatePatient(patient.id, f, `Datos de contacto modificados (${changed.join(', ') || 'sin cambios'}) · ${patient.firstName} ${patient.lastName}`)
        toast('Datos de contacto actualizados')
        onClose()
      }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono móvil"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Dirección" className="sm:col-span-2"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Field label="Canal preferido">
          <Select value={f.preferredChannel} onChange={(e) => setF({ ...f, preferredChannel: e.target.value as Patient['preferredChannel'] })}>
            <option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option><option value="telefono">Teléfono</option>
          </Select>
        </Field>
        <Field label="Idioma"><Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option>Español</option><option>Inglés</option><option>Catalán</option><option>Francés</option></Select></Field>
      </div>
    </Modal>
  )
}
