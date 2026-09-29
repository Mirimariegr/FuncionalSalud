export type ID = string

export type Role = 'admin' | 'direccion' | 'recepcion' | 'sanitario' | 'facturacion' | 'privacidad'

export interface Center {
  id: ID
  name: string
  address: string
  phone: string
  hours: string
  active: boolean
}

export interface Professional {
  id: ID
  name: string
  title: string
  specialty: string
  color: string
  centerIds: ID[]
  serviceIds: ID[]
  active: boolean
}

export interface Room {
  id: ID
  name: string
  type: string
  centerId: ID
  active: boolean
}

export interface Service {
  id: ID
  name: string
  specialty: string
  duration: number
  price: number
  roomType?: string
  consentTemplateId?: ID
  active: boolean
}

export type PatientStatus = 'prealta' | 'activo' | 'seguimiento' | 'inactivo' | 'bloqueado' | 'archivado'

export interface Allergy {
  id: ID
  substance: string
  reaction: string
  severity: 'leve' | 'moderada' | 'grave'
  status: 'activa' | 'inactiva' | 'pendiente'
  source: 'profesional' | 'paciente'
  date: string
}

export interface Medication {
  id: ID
  name: string
  dose: string
  frequency: string
  status: 'actual' | 'historica' | 'pendiente'
  source: 'profesional' | 'paciente'
  start: string
}

export interface Antecedent {
  id: ID
  kind: 'personal' | 'familiar' | 'quirurgico' | 'habito'
  description: string
  date: string
}

export interface Relation {
  id: ID
  name: string
  kind: 'tutor' | 'representante' | 'emergencia' | 'autorizado'
  phone: string
  validUntil?: string
}

export interface Patient {
  id: ID
  nhc: string
  firstName: string
  lastName: string
  docId: string
  birthDate: string
  sex: 'M' | 'F' | 'X'
  phone: string
  email: string
  address: string
  language: string
  preferredChannel: 'whatsapp' | 'email' | 'sms' | 'telefono'
  channelConsent: { whatsapp: boolean; email: boolean; sms: boolean }
  centerId: ID
  professionalId?: ID
  status: PatientStatus
  insurer?: string
  policy?: string
  origin: string
  portalEnabled: boolean
  allergies: Allergy[]
  medications: Medication[]
  antecedents: Antecedent[]
  relations: Relation[]
  notes?: string
  createdAt: string
}

export type AppointmentStatus =
  | 'propuesta'
  | 'pendiente'
  | 'confirmada'
  | 'espera'
  | 'en_curso'
  | 'atendida'
  | 'no_presentada'
  | 'cancelada'
  | 'replanificacion'
  | 'replanificada'

export interface Appointment {
  id: ID
  patientId: ID
  serviceId: ID
  professionalId: ID
  centerId: ID
  roomId?: ID
  start: string
  end: string
  status: AppointmentStatus
  reason: string
  history: { at: string; status: AppointmentStatus; by: string }[]
}

export interface Episode {
  id: ID
  patientId: ID
  professionalId: ID
  appointmentId?: ID
  treatmentId?: ID
  date: string
  reason: string
  observations: string
  diagnosis: string
  plan: string
  publicSummary: string
  nextAction: string
  nextActionDate?: string
  closed: boolean
}

export interface Treatment {
  id: ID
  patientId: ID
  professionalId: ID
  name: string
  goals: string
  serviceId: ID
  totalSessions: number
  doneSessions: number
  status: 'activo' | 'pausado' | 'finalizado'
  startDate: string
  reviewDate?: string
  budgetId?: ID
  visibleToPatient: boolean
}

export type DocType =
  | 'Informe'
  | 'Resultado'
  | 'Imagen'
  | 'Consentimiento'
  | 'Presupuesto'
  | 'Factura'
  | 'Instrucciones'
  | 'Derivación'
  | 'Aportado por paciente'
  | 'Administrativo'

export interface DocumentItem {
  id: ID
  patientId: ID
  name: string
  type: DocType
  date: string
  author: string
  episodeId?: ID
  treatmentId?: ID
  version: number
  size: string
  reviewStatus: 'pendiente' | 'revisado'
  published: boolean
  publishedAt?: string
  content?: string
}

export interface ConsentTemplate {
  id: ID
  name: string
  kind: 'Tratamiento' | 'Protección de datos' | 'Comunicaciones' | 'Portal' | 'Cesión' | 'Representación' | 'Imagen'
  version: string
  validityMonths: number
  body: string
}

export type ConsentStatus = 'pendiente' | 'aceptado' | 'rechazado' | 'revocado' | 'caducado'

export interface Consent {
  id: ID
  patientId: ID
  templateId: ID
  status: ConsentStatus
  sentAt: string
  channel: 'portal' | 'enlace' | 'presencial'
  viewedAt?: string
  respondedAt?: string
  expiresAt?: string
  evidence?: string
}

export interface BudgetLine {
  concept: string
  serviceId?: ID
  qty: number
  price: number
  discount: number
}

export interface Budget {
  id: ID
  number: string
  patientId: ID
  treatmentId?: ID
  date: string
  validUntil: string
  lines: BudgetLine[]
  taxRate: number
  status: 'borrador' | 'enviado' | 'aceptado' | 'rechazado'
  respondedAt?: string
}

export interface Payment {
  id: ID
  patientId: ID
  budgetId?: ID
  date: string
  amount: number
  method: 'Tarjeta' | 'Efectivo' | 'Transferencia' | 'Bizum' | 'Online (simulado)'
  concept: string
}

export interface Task {
  id: ID
  title: string
  detail?: string
  kind: 'cita' | 'documento' | 'consentimiento' | 'seguimiento' | 'economico' | 'datos' | 'general'
  patientId?: ID
  role: Role
  due: string
  priority: 'alta' | 'media' | 'baja'
  done: boolean
  createdAt: string
}

export interface AuditEntry {
  id: ID
  at: string
  user: string
  role: Role | 'paciente'
  action: string
  entity: string
  detail: string
}

export interface StaffUser {
  id: ID
  name: string
  role: Role
  email: string
  centerIds: ID[]
  professionalId?: ID
}

export interface Session {
  kind: 'staff' | 'patient'
  userId: ID
}
