import { useState } from 'react'
import { Download, FileText, Upload } from 'lucide-react'
import { useCurrentPatient, useStore } from '../../store'
import { fDate } from '../../lib/utils'
import { Badge, Button, Field, Input, Modal } from '../../components/ui'
import { DocumentViewer } from '../../components/ClinicalDialogs'
import type { DocumentItem } from '../../types'

export default function PortalDocuments() {
  const p = useCurrentPatient()!
  const documents = useStore((s) => s.documents)
  const addDocument = useStore((s) => s.addDocument)
  const addTask = useStore((s) => s.addTask)
  const log = useStore((s) => s.log)
  const toast = useStore((s) => s.toast)
  const [view, setView] = useState<DocumentItem | null>(null)
  const [upload, setUpload] = useState(false)
  const [name, setName] = useState('')

  // Publicación controlada: el paciente solo ve lo publicado explícitamente
  const published = documents.filter((d) => d.patientId === p.id && d.published).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  const mine = documents.filter((d) => d.patientId === p.id && d.type === 'Aportado por paciente')

  const submit = () => {
    addDocument({ patientId: p.id, name, type: 'Aportado por paciente', date: new Date().toISOString(), author: 'Paciente (portal)', version: 1, size: '350 KB', reviewStatus: 'pendiente', published: false })
    addTask({ title: `Revisar documento aportado: ${name}`, kind: 'documento', patientId: p.id, role: 'recepcion', due: new Date().toISOString().slice(0, 10), priority: 'media' })
    toast('Documento enviado a la clínica')
    setUpload(false)
    setName('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Mis documentos</h1>
        <Button variant="secondary" icon={Upload} onClick={() => setUpload(true)}>Enviar documento</Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {published.map((d) => (
          <li key={d.id}>
            <button onClick={() => setView(d)} className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-300">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><FileText className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.name}</p>
                <p className="text-xs text-slate-500">{d.type} · {d.author} · {fDate(d.publishedAt)}</p>
              </div>
              <Download className="h-4 w-4 text-slate-400" onClick={(e) => { e.stopPropagation(); log('Descarga', 'Documento', `Descarga de «${d.name}» desde el portal`); toast('Descarga registrada (simulada)') }} />
            </button>
          </li>
        ))}
      </ul>
      {published.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">Tu clínica aún no ha publicado documentos.</p>}
      {mine.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Documentos que has enviado</h2>
          <ul className="space-y-2">
            {mine.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="flex-1 text-sm">{d.name}</span>
                <span className="text-xs text-slate-400">{fDate(d.date)}</span>
                {d.reviewStatus === 'pendiente' ? <Badge tone="amber">En revisión</Badge> : <Badge tone="green">Recibido</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-slate-400">Solo ves los documentos que tu clínica ha publicado para ti. Cada acceso queda registrado.</p>
      <DocumentViewer doc={view} onClose={() => setView(null)} readOnly />
      <Modal open={upload} onClose={() => setUpload(false)} title="Enviar documento a la clínica" size="sm"
        footer={<><Button variant="secondary" onClick={() => setUpload(false)}>Cancelar</Button><Button disabled={!name} onClick={submit}>Enviar</Button></>}>
        <label className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-sm text-slate-500 hover:border-brand-300">
          <Upload className="h-6 w-6 text-slate-400" />
          Selecciona un archivo (informe externo, DNI, tarjeta seguro…)
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setName(f.name) }} />
        </label>
        <Field label="Nombre del documento"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Informe traumatólogo.pdf" /></Field>
      </Modal>
    </div>
  )
}
