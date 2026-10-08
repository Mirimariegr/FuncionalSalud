import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed, type DB } from './data/seed'
import type {
  Allergy,
  Appointment,
  AppointmentStatus,
  AuditEntry,
  Budget,
  Consent,
  Conversation,
  DocumentItem,
  Episode,
  Medication,
  Patient,
  Payment,
  Prescription,
  Role,
  Session,
  Task,
  Treatment,
} from './types'
import { addMonths, normalize, todayKey, uid } from './lib/utils'
import { apptStatus } from './lib/labels'
import { locale } from './i18n/lang'

export interface Toast {
  id: string
  text: string
  tone: 'ok' | 'error' | 'info'
}

type Collections = keyof DB

interface State extends DB {
  seededOn: string
  session: Session | null
  toasts: Toast[]

  login: (s: Session) => void
  logout: () => void
  resetDemo: () => void
  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  log: (action: string, entity: string, detail: string) => void

  upsert: <K extends Collections>(key: K, item: DB[K][number], audit?: { action: string; entity: string; detail: string }) => void
  remove: <K extends Collections>(key: K, id: string, audit?: { action: string; entity: string; detail: string }) => void

  createPatient: (p: Omit<Patient, 'id' | 'nhc' | 'createdAt' | 'allergies' | 'medications' | 'antecedents' | 'relations'>) => Patient
  updatePatient: (id: string, patch: Partial<Patient>, detail?: string) => void
  addAllergy: (patientId: string, a: Omit<Allergy, 'id'>) => void
  addMedication: (patientId: string, m: Omit<Medication, 'id'>) => void
  validateClinicalItem: (patientId: string, kind: 'allergy' | 'medication', itemId: string) => void

  checkConflicts: (a: Pick<Appointment, 'professionalId' | 'roomId' | 'patientId' | 'start' | 'end'>, ignoreId?: string) => string[]
  createAppointment: (a: Omit<Appointment, 'id' | 'history'>) => { ok: boolean; errors: string[]; appt?: Appointment }
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void
  rescheduleAppointment: (id: string, start: string, end: string, professionalId?: string, roomId?: string) => { ok: boolean; errors: string[] }

  saveEpisode: (e: Omit<Episode, 'id'> & { id?: string }) => Episode
  saveTreatment: (t: Omit<Treatment, 'id'> & { id?: string }) => Treatment
  registerSession: (treatmentId: string) => void

  addDocument: (d: Omit<DocumentItem, 'id'>) => DocumentItem
  setDocumentPublished: (id: string, published: boolean) => void
  markDocumentReviewed: (id: string) => void

  sendConsent: (patientId: string, templateId: string, channel: Consent['channel']) => void
  respondConsent: (id: string, accept: boolean, by: 'paciente' | 'clinica') => void
  revokeConsent: (id: string) => void
  viewConsent: (id: string) => void

  saveBudget: (b: Omit<Budget, 'id' | 'number'> & { id?: string; number?: string }) => Budget
  setBudgetStatus: (id: string, status: Budget['status']) => void
  registerPayment: (p: Omit<Payment, 'id'>) => void

  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'done'>) => void
  toggleTask: (id: string) => void

  addPrescription: (p: Omit<Prescription, 'id' | 'code' | 'status' | 'date'>) => Prescription
  setPrescriptionStatus: (id: string, status: Prescription['status']) => void

  createConversation: (c: Pick<Conversation, 'patientId' | 'subject' | 'category'>, text: string) => Conversation
  sendMessage: (conversationId: string, text: string) => void
  markConversationRead: (conversationId: string, side: 'clinic' | 'patient') => void
  setConversationStatus: (conversationId: string, status: Conversation['status']) => void
}

const roleShort = (r: AuditEntry['role']) => (r === 'recepcion' ? 'Recepción' : r === 'facturacion' ? 'Administración' : r === 'sanitario' ? 'Profesional' : r === 'paciente' ? 'Paciente' : 'Clínica')

const STORAGE_KEY = 'funcional-salud-demo-v3'

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const actor = (): { user: string; role: AuditEntry['role'] } => {
        const s = get().session
        if (!s) return { user: 'Sistema', role: 'admin' }
        if (s.kind === 'patient') {
          const p = get().patients.find((x) => x.id === s.userId)
          return { user: p ? `${p.firstName} ${p.lastName}` : 'Paciente', role: 'paciente' }
        }
        const u = get().users.find((x) => x.id === s.userId)
        return { user: u?.name ?? 'Usuario', role: u?.role ?? 'admin' }
      }
      const pname = (id: string) => {
        const p = get().patients.find((x) => x.id === id)
        return p ? `${p.firstName} ${p.lastName}` : id
      }

      return {
        ...buildSeed(),
        seededOn: todayKey(),
        session: null,
        toasts: [],

        login: (session) => {
          set({ session })
          get().log('Acceso', 'Sesión', session.kind === 'patient' ? 'Inicio de sesión en el portal del paciente' : 'Inicio de sesión en el backoffice')
        },
        logout: () => set({ session: null }),
        resetDemo: () => set({ ...buildSeed(), seededOn: todayKey(), session: get().session }),

        toast: (text, tone = 'ok') => {
          const id = uid('t')
          set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
          setTimeout(() => get().dismissToast(id), 3500)
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        log: (action, entity, detail) => {
          const a = actor()
          const entry: AuditEntry = { id: uid('au'), at: new Date().toISOString(), user: a.user, role: a.role, action, entity, detail }
          set((s) => ({ audit: [entry, ...s.audit].slice(0, 500) }))
        },

        upsert: (key, item, audit) => {
          set((s) => {
            const list = s[key] as { id: string }[]
            const exists = list.some((x) => x.id === (item as { id: string }).id)
            const next = exists ? list.map((x) => (x.id === (item as { id: string }).id ? item : x)) : [...list, item]
            return { [key]: next } as Partial<State>
          })
          if (audit) get().log(audit.action, audit.entity, audit.detail)
        },
        remove: (key, id, audit) => {
          set((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<State>)
          if (audit) get().log(audit.action, audit.entity, audit.detail)
        },

        // ---------- Pacientes ----------
        createPatient: (data) => {
          const n = get().patients.length
          const p: Patient = {
            ...data,
            id: uid('pa'),
            nhc: `HC-${10231 + (n + 1) * 7}`,
            createdAt: new Date().toISOString(),
            allergies: [],
            medications: [],
            antecedents: [],
            relations: [],
          }
          set((s) => ({ patients: [...s.patients, p] }))
          get().log('Alta', 'Paciente', `Alta de ${p.firstName} ${p.lastName} (${p.nhc})`)
          return p
        },
        updatePatient: (id, patch, detail) => {
          set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
          get().log('Modificación', 'Paciente', detail ?? `Datos actualizados de ${pname(id)}`)
        },
        addAllergy: (patientId, a) => {
          const item = { ...a, id: uid('al') }
          set((s) => ({ patients: s.patients.map((p) => (p.id === patientId ? { ...p, allergies: [...p.allergies, item] } : p)) }))
          get().log(a.source === 'paciente' ? 'Declaración' : 'Alta', 'Alergia', `${a.substance} · ${pname(patientId)}`)
          if (a.source === 'paciente') {
            get().addTask({ title: `Validar alergia declarada: ${a.substance}`, kind: 'datos', patientId, role: 'sanitario', due: todayKey(), priority: 'alta' })
          }
        },
        addMedication: (patientId, m) => {
          const item = { ...m, id: uid('me') }
          set((s) => ({ patients: s.patients.map((p) => (p.id === patientId ? { ...p, medications: [...p.medications, item] } : p)) }))
          get().log(m.source === 'paciente' ? 'Declaración' : 'Alta', 'Medicación', `${m.name} · ${pname(patientId)}`)
          if (m.source === 'paciente') {
            get().addTask({ title: `Validar medicación declarada: ${m.name}`, kind: 'datos', patientId, role: 'sanitario', due: todayKey(), priority: 'media' })
          }
        },
        validateClinicalItem: (patientId, kind, itemId) => {
          set((s) => ({
            patients: s.patients.map((p) => {
              if (p.id !== patientId) return p
              if (kind === 'allergy') return { ...p, allergies: p.allergies.map((a) => (a.id === itemId ? { ...a, status: 'activa' as const } : a)) }
              return { ...p, medications: p.medications.map((m) => (m.id === itemId ? { ...m, status: 'actual' as const } : m)) }
            }),
          }))
          get().log('Validación', kind === 'allergy' ? 'Alergia' : 'Medicación', `Dato declarado por el paciente validado · ${pname(patientId)}`)
        },

        // ---------- Agenda ----------
        checkConflicts: (a, ignoreId) => {
          const errors: string[] = []
          const active = get().appointments.filter(
            (x) => x.id !== ignoreId && !['cancelada', 'replanificada', 'no_presentada'].includes(x.status) && x.start < a.end && a.start < x.end,
          )
          const prof = active.find((x) => x.professionalId === a.professionalId)
          if (prof) errors.push(`El profesional ya tiene una cita de ${new Date(prof.start).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })} a ${new Date(prof.end).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}.`)
          if (a.roomId) {
            const room = active.find((x) => x.roomId === a.roomId)
            if (room) errors.push(`La sala está ocupada en ese horario (${pname(room.patientId)}).`)
          }
          const pat = active.find((x) => x.patientId === a.patientId)
          if (pat) errors.push('El paciente ya tiene otra cita que se solapa.')
          return errors
        },
        createAppointment: (data) => {
          const errors = get().checkConflicts(data)
          if (errors.length) return { ok: false, errors }
          const a = actor()
          const appt: Appointment = { ...data, id: uid('ap'), history: [{ at: new Date().toISOString(), status: data.status, by: a.user }] }
          set((s) => ({ appointments: [...s.appointments, appt] }))
          get().log('Alta', 'Cita', `Nueva cita para ${pname(data.patientId)} el ${new Date(data.start).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`)
          return { ok: true, errors: [], appt }
        },
        setAppointmentStatus: (id, status) => {
          const a = actor()
          const appt = get().appointments.find((x) => x.id === id)
          if (!appt) return
          set((s) => ({
            appointments: s.appointments.map((x) =>
              x.id === id ? { ...x, status, history: [...x.history, { at: new Date().toISOString(), status, by: a.user }] } : x,
            ),
          }))
          get().log('Cambio de estado', 'Cita', `${pname(appt.patientId)}: ${apptStatus[appt.status].label} → ${apptStatus[status].label}`)
          if (status === 'replanificacion' && a.role === 'paciente') {
            get().addTask({ title: 'Buscar nueva fecha (replanificación solicitada)', kind: 'cita', patientId: appt.patientId, role: 'recepcion', due: todayKey(), priority: 'alta', detail: 'Solicitado por el paciente desde el portal.' })
          }
          if (status === 'cancelada' && a.role === 'paciente') {
            get().addTask({ title: 'Cita cancelada por el paciente: ofrecer hueco a lista de espera', kind: 'cita', patientId: appt.patientId, role: 'recepcion', due: todayKey(), priority: 'media' })
          }
        },
        rescheduleAppointment: (id, start, end, professionalId, roomId) => {
          const old = get().appointments.find((x) => x.id === id)
          if (!old) return { ok: false, errors: ['Cita no encontrada'] }
          const candidate = { ...old, start, end, professionalId: professionalId ?? old.professionalId, roomId: roomId ?? old.roomId }
          const errors = get().checkConflicts(candidate, id)
          if (errors.length) return { ok: false, errors }
          const a = actor()
          const now = new Date().toISOString()
          const newAppt: Appointment = { ...candidate, id: uid('ap'), status: 'pendiente', history: [{ at: now, status: 'pendiente', by: a.user }] }
          set((s) => ({
            appointments: [
              ...s.appointments.map((x) => (x.id === id ? { ...x, status: 'replanificada' as const, history: [...x.history, { at: now, status: 'replanificada' as const, by: a.user }] } : x)),
              newAppt,
            ],
            tasks: s.tasks.map((t) => (t.kind === 'cita' && t.patientId === old.patientId && !t.done && t.title.startsWith('Buscar nueva fecha') ? { ...t, done: true } : t)),
          }))
          get().log('Replanificación', 'Cita', `${pname(old.patientId)}: ${new Date(old.start).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} → ${new Date(start).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`)
          return { ok: true, errors: [] }
        },

        // ---------- Clínico ----------
        saveEpisode: (e) => {
          const isNew = !e.id
          const ep: Episode = { ...e, id: e.id ?? uid('ep') }
          set((s) => ({ episodes: isNew ? [...s.episodes, ep] : s.episodes.map((x) => (x.id === ep.id ? ep : x)) }))
          get().log(isNew ? 'Alta' : 'Modificación', 'Episodio', `${ep.reason} · ${pname(ep.patientId)}`)
          if (ep.nextAction && ep.nextActionDate) {
            get().addTask({ title: ep.nextAction, kind: 'seguimiento', patientId: ep.patientId, role: 'sanitario', due: ep.nextActionDate, priority: 'media', detail: `Próxima acción del episodio «${ep.reason}»` })
          }
          return ep
        },
        saveTreatment: (t) => {
          const isNew = !t.id
          const tr: Treatment = { ...t, id: t.id ?? uid('tr') }
          set((s) => ({ treatments: isNew ? [...s.treatments, tr] : s.treatments.map((x) => (x.id === tr.id ? tr : x)) }))
          get().log(isNew ? 'Alta' : 'Modificación', 'Tratamiento', `${tr.name} · ${pname(tr.patientId)}`)
          return tr
        },
        registerSession: (treatmentId) => {
          const t = get().treatments.find((x) => x.id === treatmentId)
          if (!t) return
          const done = Math.min(t.totalSessions, t.doneSessions + 1)
          const status = done >= t.totalSessions ? 'finalizado' : t.status
          set((s) => ({ treatments: s.treatments.map((x) => (x.id === treatmentId ? { ...x, doneSessions: done, status } : x)) }))
          get().log('Sesión', 'Tratamiento', `${t.name}: sesión ${done}/${t.totalSessions} · ${pname(t.patientId)}`)
        },

        // ---------- Documentos ----------
        addDocument: (d) => {
          const doc: DocumentItem = { ...d, id: uid('doc') }
          set((s) => ({ documents: [...s.documents, doc] }))
          get().log('Alta', 'Documento', `«${doc.name}» · ${pname(doc.patientId)}`)
          return doc
        },
        setDocumentPublished: (id, published) => {
          const d = get().documents.find((x) => x.id === id)
          if (!d) return
          set((s) => ({ documents: s.documents.map((x) => (x.id === id ? { ...x, published, publishedAt: published ? new Date().toISOString() : undefined } : x)) }))
          get().log(published ? 'Publicación' : 'Retirada', 'Documento', `«${d.name}» ${published ? 'publicado a' : 'retirado del portal de'} ${pname(d.patientId)}`)
        },
        markDocumentReviewed: (id) => {
          const d = get().documents.find((x) => x.id === id)
          if (!d) return
          set((s) => ({
            documents: s.documents.map((x) => (x.id === id ? { ...x, reviewStatus: 'revisado' } : x)),
            tasks: s.tasks.map((t) => (t.kind === 'documento' && t.patientId === d.patientId && !t.done ? { ...t, done: true } : t)),
          }))
          get().log('Revisión', 'Documento', `«${d.name}» revisado · ${pname(d.patientId)}`)
        },

        // ---------- Consentimientos ----------
        sendConsent: (patientId, templateId, channel) => {
          const tpl = get().consentTemplates.find((t) => t.id === templateId)
          const c: Consent = { id: uid('co'), patientId, templateId, status: 'pendiente', sentAt: new Date().toISOString(), channel }
          set((s) => ({ consents: [...s.consents, c] }))
          get().log('Solicitud', 'Consentimiento', `«${tpl?.name}» enviado a ${pname(patientId)} (${channel})`)
        },
        viewConsent: (id) => {
          set((s) => ({ consents: s.consents.map((c) => (c.id === id && !c.viewedAt ? { ...c, viewedAt: new Date().toISOString() } : c)) }))
        },
        respondConsent: (id, accept, by) => {
          const c = get().consents.find((x) => x.id === id)
          if (!c) return
          const tpl = get().consentTemplates.find((t) => t.id === c.templateId)
          const now = new Date()
          const evidence =
            by === 'paciente'
              ? `Portal del paciente · identidad verificada (OTP simulado) · ${tpl?.version} · ${now.toLocaleString('es-ES')}`
              : `Registro presencial en clínica por ${actor().user} · ${tpl?.version}`
          set((s) => ({
            consents: s.consents.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: accept ? 'aceptado' : 'rechazado',
                    viewedAt: x.viewedAt ?? now.toISOString(),
                    respondedAt: now.toISOString(),
                    expiresAt: accept && tpl && tpl.validityMonths > 0 ? addMonths(now, tpl.validityMonths).toISOString() : undefined,
                    evidence,
                  }
                : x,
            ),
          }))
          get().log(accept ? 'Aceptación' : 'Rechazo', 'Consentimiento', `«${tpl?.name}» · ${pname(c.patientId)}`)
          if (!accept) {
            get().addTask({ title: `Consentimiento rechazado: ${tpl?.name}`, kind: 'consentimiento', patientId: c.patientId, role: 'recepcion', due: todayKey(), priority: 'alta' })
          }
        },
        revokeConsent: (id) => {
          const c = get().consents.find((x) => x.id === id)
          if (!c) return
          const tpl = get().consentTemplates.find((t) => t.id === c.templateId)
          set((s) => ({ consents: s.consents.map((x) => (x.id === id ? { ...x, status: 'revocado', respondedAt: new Date().toISOString() } : x)) }))
          get().log('Revocación', 'Consentimiento', `«${tpl?.name}» revocado · ${pname(c.patientId)}`)
          if (tpl?.kind === 'Comunicaciones') {
            get().updatePatient(c.patientId, { channelConsent: { whatsapp: false, email: false, sms: false } }, `Canales de comunicación desactivados por revocación · ${pname(c.patientId)}`)
          }
        },

        // ---------- Económico ----------
        saveBudget: (b) => {
          const isNew = !b.id
          const n = get().budgets.length
          const bud: Budget = { ...b, id: b.id ?? uid('b'), number: b.number ?? `PRE-${new Date().getFullYear()}-${String(170 + n).padStart(4, '0')}` }
          set((s) => ({ budgets: isNew ? [...s.budgets, bud] : s.budgets.map((x) => (x.id === bud.id ? bud : x)) }))
          get().log(isNew ? 'Alta' : 'Modificación', 'Presupuesto', `${bud.number} · ${pname(bud.patientId)}`)
          return bud
        },
        setBudgetStatus: (id, status) => {
          const b = get().budgets.find((x) => x.id === id)
          if (!b) return
          set((s) => ({ budgets: s.budgets.map((x) => (x.id === id ? { ...x, status, respondedAt: ['aceptado', 'rechazado'].includes(status) ? new Date().toISOString() : x.respondedAt } : x)) }))
          get().log('Cambio de estado', 'Presupuesto', `${b.number} → ${status} · ${pname(b.patientId)}`)
        },
        registerPayment: (p) => {
          set((s) => ({ payments: [...s.payments, { ...p, id: uid('pay') }] }))
          get().log('Cobro', 'Pago', `${p.amount.toFixed(2)} € (${p.method}) · ${pname(p.patientId)}`)
        },

        // ---------- Tareas ----------
        addTask: (t) => set((s) => ({ tasks: [...s.tasks, { ...t, id: uid('tk'), createdAt: new Date().toISOString(), done: false }] })),
        toggleTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),

        // ---------- Recetas ----------
        addPrescription: (data) => {
          const rx: Prescription = { ...data, id: uid('rx'), code: `RX-${Math.floor(100000 + Math.random() * 899999)}`, status: 'activa', date: new Date().toISOString() }
          set((s) => ({ prescriptions: [...s.prescriptions, rx] }))
          get().log('Prescripción', 'Receta', `${rx.medication} · ${pname(rx.patientId)}`)
          return rx
        },
        setPrescriptionStatus: (id, status) => {
          const rx = get().prescriptions.find((x) => x.id === id)
          if (!rx) return
          set((s) => ({ prescriptions: s.prescriptions.map((x) => (x.id === id ? { ...x, status } : x)) }))
          get().log(status === 'anulada' ? 'Anulación' : 'Dispensación', 'Receta', `${rx.medication} · ${pname(rx.patientId)}`)
        },

        // ---------- Mensajes ----------
        createConversation: (c, text) => {
          const a = actor()
          const fromPatient = a.role === 'paciente'
          const now = new Date().toISOString()
          const conv: Conversation = {
            ...c,
            id: uid('cv'),
            status: 'abierta',
            createdAt: now,
            unreadClinic: fromPatient,
            unreadPatient: !fromPatient,
            messages: [{ id: uid('m'), from: fromPatient ? 'paciente' : 'clinica', author: fromPatient ? a.user : `${a.user} · ${roleShort(a.role)}`, text, at: now }],
          }
          set((s) => ({ conversations: [conv, ...s.conversations] }))
          get().log('Solicitud', 'Mensaje', `«${c.subject}» (${c.category}) · ${pname(c.patientId)}`)
          return conv
        },
        sendMessage: (conversationId, text) => {
          const a = actor()
          const fromPatient = a.role === 'paciente'
          const m = { id: uid('m'), from: fromPatient ? ('paciente' as const) : ('clinica' as const), author: fromPatient ? a.user : `${a.user} · ${roleShort(a.role)}`, text, at: new Date().toISOString() }
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, status: 'abierta', messages: [...c.messages, m], unreadClinic: fromPatient ? true : c.unreadClinic, unreadPatient: fromPatient ? c.unreadPatient : true } : c,
            ),
          }))
        },
        markConversationRead: (conversationId, side) =>
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, [side === 'clinic' ? 'unreadClinic' : 'unreadPatient']: false } : c)) })),
        setConversationStatus: (conversationId, status) => {
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, status } : c)) }))
          const c = get().conversations.find((x) => x.id === conversationId)
          if (c) get().log(status === 'cerrada' ? 'Cierre' : 'Reapertura', 'Mensaje', `«${c.subject}» · ${pname(c.patientId)}`)
        },
      }
    },
    {
      name: STORAGE_KEY,
      // Los datos de demo son relativos a «hoy»: si cambia el día se regeneran para que la agenda tenga sentido.
      onRehydrateStorage: () => (state) => {
        if (state && state.seededOn !== todayKey()) state.resetDemo()
      },
      partialize: (s) => {
        const { toasts: _toasts, ...rest } = s
        return rest
      },
    },
  ),
)

// ---------- Selectores y utilidades derivadas ----------
export const budgetTotal = (b: Budget) => {
  const base = b.lines.reduce((acc, l) => acc + l.qty * l.price * (1 - l.discount / 100), 0)
  return base * (1 + b.taxRate / 100)
}

export const paidForBudget = (payments: Payment[], budgetId: string) =>
  payments.filter((p) => p.budgetId === budgetId).reduce((a, p) => a + p.amount, 0)

export const findDuplicates = (patients: Patient[], q: { firstName: string; lastName: string; docId: string; phone: string; birthDate: string }) => {
  const fn = normalize(q.firstName)
  const ln = normalize(q.lastName)
  return patients
    .map((p) => {
      let score = 0
      const reasons: string[] = []
      if (q.docId && normalize(p.docId) === normalize(q.docId)) { score += 3; reasons.push('mismo documento') }
      if (q.phone && p.phone.replace(/\s/g, '') === q.phone.replace(/\s/g, '')) { score += 2; reasons.push('mismo teléfono') }
      if (fn && ln && normalize(p.firstName) === fn && normalize(p.lastName).startsWith(ln.split(' ')[0])) { score += 2; reasons.push('nombre y apellido') }
      if (q.birthDate && p.birthDate === q.birthDate) { score += 1; reasons.push('fecha de nacimiento') }
      return { p, score, reasons }
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
}

export const useCurrentStaff = () => {
  const session = useStore((s) => s.session)
  const users = useStore((s) => s.users)
  return session?.kind === 'staff' ? users.find((u) => u.id === session.userId) : undefined
}

export const useRole = (): Role => useCurrentStaff()?.role ?? 'recepcion'

export const useCurrentPatient = () => {
  const session = useStore((s) => s.session)
  const patients = useStore((s) => s.patients)
  return session?.kind === 'patient' ? patients.find((p) => p.id === session.userId) : undefined
}

export const effectiveConsentStatus = (c: Consent): Consent['status'] =>
  c.status === 'aceptado' && c.expiresAt && c.expiresAt < new Date().toISOString() ? 'caducado' : c.status

export const consentExpiringSoon = (c: Consent, days = 30) =>
  effectiveConsentStatus(c) === 'aceptado' && !!c.expiresAt && new Date(c.expiresAt).getTime() - Date.now() < days * 86400000
