import type { Role } from '../types'

export type Module =
  | 'dashboard'
  | 'agenda'
  | 'pacientes'
  | 'clinico'
  | 'tareas'
  | 'documentos'
  | 'consentimientos'
  | 'tratamientos'
  | 'economico'
  | 'informes'
  | 'configuracion'
  | 'usuarios'
  | 'auditoria'

export type Access = 'editar' | 'consultar' | 'limitado' | 'no'

export const moduleLabel: Record<Module, string> = {
  dashboard: 'Inicio',
  agenda: 'Agenda y citas',
  pacientes: 'Pacientes (datos administrativos)',
  clinico: 'Datos clínicos / expediente',
  tareas: 'Tareas y alertas',
  documentos: 'Documentos',
  consentimientos: 'Consentimientos',
  tratamientos: 'Tratamientos',
  economico: 'Presupuestos y pagos',
  informes: 'Informes',
  configuracion: 'Configuración',
  usuarios: 'Usuarios y permisos',
  auditoria: 'Auditoría',
}

/** Matriz de acceso basada en el Anexo A del funcional. */
export const matrix: Record<Role, Record<Module, Access>> = {
  admin: {
    dashboard: 'editar', agenda: 'editar', pacientes: 'editar', clinico: 'consultar', tareas: 'editar', documentos: 'editar',
    consentimientos: 'editar', tratamientos: 'consultar', economico: 'editar', informes: 'consultar', configuracion: 'editar',
    usuarios: 'editar', auditoria: 'consultar',
  },
  direccion: {
    dashboard: 'consultar', agenda: 'consultar', pacientes: 'consultar', clinico: 'limitado', tareas: 'consultar', documentos: 'consultar',
    consentimientos: 'consultar', tratamientos: 'consultar', economico: 'consultar', informes: 'consultar', configuracion: 'consultar',
    usuarios: 'consultar', auditoria: 'consultar',
  },
  recepcion: {
    dashboard: 'editar', agenda: 'editar', pacientes: 'editar', clinico: 'limitado', tareas: 'editar', documentos: 'limitado',
    consentimientos: 'editar', tratamientos: 'consultar', economico: 'consultar', informes: 'no', configuracion: 'no',
    usuarios: 'no', auditoria: 'no',
  },
  sanitario: {
    dashboard: 'editar', agenda: 'editar', pacientes: 'consultar', clinico: 'editar', tareas: 'editar', documentos: 'editar',
    consentimientos: 'editar', tratamientos: 'editar', economico: 'limitado', informes: 'no', configuracion: 'no',
    usuarios: 'no', auditoria: 'limitado',
  },
  facturacion: {
    dashboard: 'consultar', agenda: 'no', pacientes: 'consultar', clinico: 'no', tareas: 'editar', documentos: 'limitado',
    consentimientos: 'limitado', tratamientos: 'consultar', economico: 'editar', informes: 'consultar', configuracion: 'no',
    usuarios: 'no', auditoria: 'limitado',
  },
  privacidad: {
    dashboard: 'consultar', agenda: 'no', pacientes: 'consultar', clinico: 'no', tareas: 'consultar', documentos: 'consultar',
    consentimientos: 'consultar', tratamientos: 'no', economico: 'no', informes: 'no', configuracion: 'no',
    usuarios: 'consultar', auditoria: 'consultar',
  },
}

export const can = (role: Role, m: Module) => matrix[role][m] !== 'no'
export const canEdit = (role: Role, m: Module) => matrix[role][m] === 'editar'
