import { useState } from 'react'
import { Plus, Shield, Users as UsersIcon } from 'lucide-react'
import { useRole, useStore } from '../../store'
import { roleLabel } from '../../lib/labels'
import { canEdit, matrix, moduleLabel, type Access, type Module } from '../../lib/permissions'
import { cx, uid } from '../../lib/utils'
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Td, Th } from '../../components/ui'
import type { Role, StaffUser } from '../../types'

const accessCls: Record<Access, string> = {
  editar: 'bg-brand-600 text-white',
  consultar: 'bg-brand-100 text-brand-800',
  limitado: 'bg-amber-100 text-amber-800',
  no: 'bg-slate-100 text-slate-400',
}

export default function Users() {
  const role = useRole()
  const { users, centers, professionals } = useStore()
  const upsert = useStore((s) => s.upsert)
  const toast = useStore((s) => s.toast)
  const [edit, setEdit] = useState<StaffUser | null>(null)
  const editable = canEdit(role, 'usuarios')
  const roles = Object.keys(roleLabel) as Role[]

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios y permisos" subtitle="Permisos resueltos por rol, centro, tipo de dato y acción. Basado en el Anexo A del funcional."
        actions={editable && <Button icon={Plus} onClick={() => setEdit({ id: '', name: '', role: 'recepcion', email: '', centerIds: [centers[0].id] })}>Nuevo usuario</Button>} />
      <Card title="Usuarios de la organización" icon={UsersIcon} padded={false}>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Usuario</Th><Th>Rol</Th><Th>Centros</Th><Th>Profesional vinculado</Th>{editable && <Th />}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={u.name} size="sm" /><div><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></Td>
                  <Td><Badge tone="violet">{roleLabel[u.role]}</Badge></Td>
                  <Td className="text-xs">{u.centerIds.map((id) => centers.find((c) => c.id === id)?.name).join(' · ')}</Td>
                  <Td className="text-sm">{professionals.find((p) => p.id === u.professionalId)?.name ?? '—'}</Td>
                  {editable && <Td><Button size="sm" variant="ghost" onClick={() => setEdit(u)}>Editar</Button></Td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Matriz de acceso por rol" icon={Shield} padded={false}>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>Módulo</Th>{roles.map((r) => <Th key={r} className="text-center">{roleLabel[r]}</Th>)}<Th className="text-center">Paciente</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(moduleLabel) as Module[]).map((m) => (
                <tr key={m}>
                  <Td className="font-medium">{moduleLabel[m]}</Td>
                  {roles.map((r) => (
                    <Td key={r} className="text-center"><span className={cx('inline-block rounded-md px-2 py-0.5 text-[11px] font-medium capitalize', accessCls[matrix[r][m]])}>{matrix[r][m]}</span></Td>
                  ))}
                  <Td className="text-center text-[11px] text-slate-500">{patientAccess[m]}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          {(Object.keys(accessCls) as Access[]).map((a) => <span key={a} className="flex items-center gap-1.5"><span className={cx('h-3 w-3 rounded', accessCls[a])} /> <span className="capitalize">{a}</span></span>)}
          <span className="ml-auto">Prueba a entrar con distintos perfiles para ver cómo cambia la navegación.</span>
        </div>
      </Card>

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Editar usuario' : 'Nuevo usuario'} size="sm"
          footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button><Button disabled={!edit.name || !edit.email} onClick={() => { upsert('users', { ...edit, id: edit.id || uid('u') }, { action: edit.id ? 'Modificación' : 'Alta', entity: 'Usuario', detail: `${edit.name} · rol ${roleLabel[edit.role]}` }); toast('Usuario guardado'); setEdit(null) }}>Guardar</Button></>}>
          <div className="grid gap-3">
            <Field label="Nombre"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
            <Field label="Email"><Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label="Rol"><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>{roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</Select></Field>
            {edit.role === 'sanitario' && (
              <Field label="Profesional vinculado">
                <Select value={edit.professionalId ?? ''} onChange={(e) => setEdit({ ...edit, professionalId: e.target.value || undefined })}>
                  <option value="">—</option>{professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Centros">
              <div className="space-y-1.5">
                {centers.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={edit.centerIds.includes(c.id)} onChange={(e) => setEdit({ ...edit, centerIds: e.target.checked ? [...edit.centerIds, c.id] : edit.centerIds.filter((x) => x !== c.id) })} />{c.name}</label>
                ))}
              </div>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  )
}

const patientAccess: Record<Module, string> = {
  dashboard: 'Inicio portal', agenda: 'Consultar / solicitar cambios', pacientes: 'Consultar / editar propios', clinico: 'Publicados', tareas: '—',
  documentos: 'Publicados', consentimientos: 'Aceptar / revocar', tratamientos: 'Autorizados', economico: 'Consultar / aceptar / pagar', informes: '—',
  configuracion: '—', usuarios: '—', auditoria: 'Actividad propia',
}
