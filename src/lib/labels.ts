import type { AppointmentStatus, ConsentStatus, PatientStatus, Role } from '../types'

export type Tone = 'slate' | 'teal' | 'blue' | 'amber' | 'red' | 'violet' | 'green' | 'orange'

export const roleLabel: Record<Role, string> = {
  admin: 'Administrador',
  direccion: 'Dirección',
  recepcion: 'Recepción',
  sanitario: 'Profesional sanitario',
  facturacion: 'Administración / facturación',
  privacidad: 'Responsable de privacidad',
}

export const apptStatus: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  propuesta: { label: 'Propuesta', tone: 'slate' },
  pendiente: { label: 'Pendiente confirmar', tone: 'amber' },
  confirmada: { label: 'Confirmada', tone: 'teal' },
  espera: { label: 'En espera', tone: 'violet' },
  en_curso: { label: 'En curso', tone: 'blue' },
  atendida: { label: 'Atendida', tone: 'green' },
  no_presentada: { label: 'No presentada', tone: 'red' },
  cancelada: { label: 'Cancelada', tone: 'slate' },
  replanificacion: { label: 'Replanificación solicitada', tone: 'orange' },
  replanificada: { label: 'Replanificada', tone: 'slate' },
}

export const patientStatus: Record<PatientStatus, { label: string; tone: Tone }> = {
  prealta: { label: 'Prealta', tone: 'amber' },
  activo: { label: 'Activo', tone: 'teal' },
  seguimiento: { label: 'En seguimiento', tone: 'blue' },
  inactivo: { label: 'Inactivo', tone: 'slate' },
  bloqueado: { label: 'Bloqueado', tone: 'red' },
  archivado: { label: 'Archivado', tone: 'slate' },
}

export const consentStatus: Record<ConsentStatus, { label: string; tone: Tone }> = {
  pendiente: { label: 'Pendiente', tone: 'amber' },
  aceptado: { label: 'Aceptado', tone: 'green' },
  rechazado: { label: 'Rechazado', tone: 'red' },
  revocado: { label: 'Revocado', tone: 'slate' },
  caducado: { label: 'Caducado', tone: 'orange' },
}

export const budgetStatus: Record<string, { label: string; tone: Tone }> = {
  borrador: { label: 'Borrador', tone: 'slate' },
  enviado: { label: 'Enviado', tone: 'amber' },
  aceptado: { label: 'Aceptado', tone: 'green' },
  rechazado: { label: 'Rechazado', tone: 'red' },
}

export const treatmentStatus: Record<string, { label: string; tone: Tone }> = {
  activo: { label: 'Activo', tone: 'teal' },
  pausado: { label: 'Pausado', tone: 'amber' },
  finalizado: { label: 'Finalizado', tone: 'slate' },
}

export const priorityTone: Record<string, Tone> = { alta: 'red', media: 'amber', baja: 'slate' }

/** Estados a los que se puede pasar una cita desde el estado actual (reglas del §7.2). */
export const apptTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  propuesta: ['pendiente', 'confirmada', 'cancelada'],
  pendiente: ['confirmada', 'cancelada', 'replanificacion'],
  confirmada: ['en_curso', 'no_presentada', 'cancelada', 'replanificacion'],
  espera: ['pendiente', 'cancelada'],
  en_curso: ['atendida'],
  atendida: [],
  no_presentada: ['replanificacion'],
  cancelada: [],
  replanificacion: ['cancelada'],
  replanificada: [],
}
