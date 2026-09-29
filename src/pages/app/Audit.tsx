import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { useCurrentStaff, useStore } from '../../store'
import { matrix } from '../../lib/permissions'
import { roleLabel } from '../../lib/labels'
import { fDateTime, normalize } from '../../lib/utils'
import { Badge, Empty, PageHeader, SearchInput, Select, Td, Th } from '../../components/ui'
import type { Tone } from '../../lib/labels'

const actionTone = (a: string): Tone =>
  /Exportaci|Acceso denegado|Revocaci|Rechazo/.test(a) ? 'red' : /Publicaci|Aceptaci|Validaci/.test(a) ? 'green' : /Acceso/.test(a) ? 'blue' : /Alta/.test(a) ? 'teal' : 'slate'

export default function Audit() {
  const user = useCurrentStaff()!
  const limited = matrix[user.role].auditoria === 'limitado'
  const all = useStore((s) => s.audit)
  const audit = useMemo(() => (limited ? all.filter((a) => a.user === user.name) : all), [all, limited, user.name])
  const [q, setQ] = useState('')
  const [entity, setEntity] = useState('all')
  const [who, setWho] = useState('all')
  const rows = useMemo(() => {
    const n = normalize(q)
    return audit
      .filter((a) => (entity === 'all' || a.entity === entity) && (who === 'all' || a.role === who))
      .filter((a) => !n || normalize(`${a.user} ${a.action} ${a.detail}`).includes(n))
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [audit, q, entity, who])

  return (
    <div>
      <PageHeader title="Auditoría" subtitle={limited ? 'Tu perfil tiene acceso limitado: solo ves tu propia actividad.' : 'Registro de accesos, cambios, publicaciones, descargas y exportaciones. Inalterable desde la aplicación.'} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar usuario, acción o detalle" className="w-full max-w-sm" />
        <Select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-auto">
          <option value="all">Todas las entidades</option>
          {[...new Set(audit.map((a) => a.entity))].sort().map((e) => <option key={e}>{e}</option>)}
        </Select>
        <Select value={who} onChange={(e) => setWho(e.target.value)} className="w-auto">
          <option value="all">Todos los perfiles</option>
          {Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="paciente">Paciente</option>
        </Select>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Fecha y hora</Th><Th>Usuario</Th><Th>Acción</Th><Th>Entidad</Th><Th>Detalle</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap font-mono text-xs">{fDateTime(a.at)}</Td>
                  <Td><p className="font-medium">{a.user}</p><p className="text-xs text-slate-500">{a.role === 'paciente' ? 'Paciente' : roleLabel[a.role]}</p></Td>
                  <Td><Badge tone={actionTone(a.action)}>{a.action}</Badge></Td>
                  <Td>{a.entity}</Td>
                  <Td className="text-slate-600">{a.detail}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty icon={History} title="Sin registros" />}
      </div>
    </div>
  )
}
