import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Globe, Lock, Upload } from 'lucide-react'
import { useRole, useStore } from '../../store'
import { canEdit } from '../../lib/permissions'
import { fDate, normalize } from '../../lib/utils'
import { Badge, Button, Empty, PageHeader, SearchInput, Select, Td, Th } from '../../components/ui'
import { DocumentViewer, UploadDocumentModal } from '../../components/ClinicalDialogs'
import type { DocumentItem } from '../../types'

const adminTypes = ['Administrativo', 'Aportado por paciente', 'Presupuesto', 'Factura', 'Consentimiento']

export default function Documents() {
  const role = useRole()
  const { documents, patients } = useStore()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [pub, setPub] = useState('all')
  const [review, setReview] = useState('all')
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<DocumentItem | null>(null)
  const limited = role === 'recepcion' || role === 'facturacion'

  const rows = useMemo(() => {
    const n = normalize(q)
    return documents
      .filter((d) => !limited || adminTypes.includes(d.type) || d.published)
      .filter((d) => (type === 'all' || d.type === type) && (pub === 'all' || String(d.published) === pub) && (review === 'all' || d.reviewStatus === review))
      .filter((d) => {
        if (!n) return true
        const p = patients.find((x) => x.id === d.patientId)
        return normalize(`${d.name} ${d.author} ${p?.firstName} ${p?.lastName}`).includes(n)
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [documents, patients, q, type, pub, review, limited])

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Repositorio documental con versionado, revisión y publicación controlada."
        actions={canEdit(role, 'documentos') && <Button icon={Upload} onClick={() => setOpen(true)}>Añadir documento</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, autor o paciente" className="w-full max-w-sm" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
          <option value="all">Todos los tipos</option>
          {[...new Set(documents.map((d) => d.type))].map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select value={pub} onChange={(e) => setPub(e.target.value)} className="w-auto">
          <option value="all">Publicados y privados</option><option value="true">Publicados</option><option value="false">Privados</option>
        </Select>
        <Select value={review} onChange={(e) => setReview(e.target.value)} className="w-auto">
          <option value="all">Cualquier revisión</option><option value="pendiente">Pendientes de revisión</option><option value="revisado">Revisados</option>
        </Select>
      </div>
      {limited && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">Tu perfil ve documentos administrativos y los ya publicados al paciente. Los documentos clínicos privados no se muestran.</p>}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Documento</Th><Th>Paciente</Th><Th>Tipo</Th><Th>Fecha</Th><Th>Revisión</Th><Th>Portal</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => {
                const p = patients.find((x) => x.id === d.patientId)
                return (
                  <tr key={d.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setView(d)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><FileText className="h-4 w-4" /></span>
                        <div><p className="font-medium text-slate-800">{d.name}</p><p className="text-xs text-slate-500">{d.author} · v{d.version} · {d.size}</p></div>
                      </div>
                    </Td>
                    <Td><Link onClick={(e) => e.stopPropagation()} to={`/app/pacientes/${d.patientId}`} className="text-brand-700 hover:underline">{p?.firstName} {p?.lastName}</Link></Td>
                    <Td><Badge>{d.type}</Badge></Td>
                    <Td className="whitespace-nowrap">{fDate(d.date)}</Td>
                    <Td>{d.reviewStatus === 'pendiente' ? <Badge tone="amber">Pendiente</Badge> : <Badge tone="teal">Revisado</Badge>}</Td>
                    <Td>{d.published ? <Badge tone="green"><Globe className="h-3 w-3" /> Publicado</Badge> : <Badge><Lock className="h-3 w-3" /> Privado</Badge>}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty icon={FileText} title="No hay documentos" />}
      </div>
      <UploadDocumentModal open={open} onClose={() => setOpen(false)} />
      <DocumentViewer doc={view} onClose={() => setView(null)} readOnly={!canEdit(role, 'documentos')} />
    </div>
  )
}
