import { useState } from 'react'
import { Pill, Save, Scale, ShieldAlert } from 'lucide-react'
import { useCurrentPatient, useStore } from '../../store'
import { todayKey } from '../../lib/utils'
import { Badge, Button, Field, Input, Modal, Select, Toggle } from '../../components/ui'
import type { Patient } from '../../types'

export default function PortalProfile() {
  const p = useCurrentPatient()!
  const updatePatient = useStore((s) => s.updatePatient)
  const addAllergy = useStore((s) => s.addAllergy)
  const addMedication = useStore((s) => s.addMedication)
  const addTask = useStore((s) => s.addTask)
  const log = useStore((s) => s.log)
  const toast = useStore((s) => s.toast)
  const [f, setF] = useState({ phone: p.phone, email: p.email, address: p.address, language: p.language, preferredChannel: p.preferredChannel })
  const [declare, setDeclare] = useState<null | 'allergy' | 'med'>(null)
  const [text, setText] = useState('')
  const [extra, setExtra] = useState('')
  const [rights, setRights] = useState(false)
  const [right, setRight] = useState('Acceso')

  const dirty = f.phone !== p.phone || f.email !== p.email || f.address !== p.address || f.language !== p.language || f.preferredChannel !== p.preferredChannel

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mis datos</h1>
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold">Datos personales y de contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><Input value={`${p.firstName} ${p.lastName}`} disabled /></Field>
          <Field label="Documento"><Input value={p.docId} disabled /></Field>
          <Field label="Teléfono móvil"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Dirección" className="sm:col-span-2"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="Idioma"><Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option>Español</option><option>Inglés</option><option>Catalán</option><option>Francés</option></Select></Field>
          <Field label="¿Cómo prefieres que te contactemos?">
            <Select value={f.preferredChannel} onChange={(e) => setF({ ...f, preferredChannel: e.target.value as Patient['preferredChannel'] })}>
              <option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option><option value="telefono">Teléfono</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button icon={Save} disabled={!dirty} onClick={() => { updatePatient(p.id, f, `Datos de contacto actualizados por el paciente desde el portal`); toast('Datos actualizados') }}>Guardar cambios</Button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="mb-1 text-sm font-semibold">Preferencias de comunicación</h2>
        <p className="mb-4 text-xs text-slate-500">Puedes activar o desactivar cada canal en cualquier momento.</p>
        <div className="flex flex-wrap gap-6">
          {(['whatsapp', 'email', 'sms'] as const).map((c) => (
            <Toggle key={c} checked={p.channelConsent[c]} label={c === 'whatsapp' ? 'WhatsApp' : c === 'email' ? 'Email' : 'SMS'}
              onChange={(v) => { updatePatient(p.id, { channelConsent: { ...p.channelConsent, [c]: v } }, `Preferencia ${c} ${v ? 'activada' : 'desactivada'} por el paciente`); toast('Preferencia guardada') }} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="mb-1 text-sm font-semibold">Información de salud</h2>
        <p className="mb-4 text-xs text-slate-500">Lo que declares aquí lo revisará un profesional antes de incorporarlo a tu expediente.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 text-red-500" /> Alergias</p>
            <ul className="space-y-1.5">
              {p.allergies.map((a) => <li key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">{a.substance}{a.status === 'pendiente' ? <Badge tone="amber">En revisión</Badge> : <Badge tone="red">Confirmada</Badge>}</li>)}
              {p.allergies.length === 0 && <li className="text-sm text-slate-400">Ninguna registrada</li>}
            </ul>
            <Button size="sm" variant="soft" className="mt-2" onClick={() => { setDeclare('allergy'); setText(''); setExtra('') }}>Declarar alergia</Button>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Pill className="h-4 w-4 text-brand-600" /> Medicación</p>
            <ul className="space-y-1.5">
              {p.medications.filter((m) => m.status !== 'historica').map((m) => <li key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">{m.name}{m.status === 'pendiente' ? <Badge tone="amber">En revisión</Badge> : <Badge tone="teal">Actual</Badge>}</li>)}
              {p.medications.length === 0 && <li className="text-sm text-slate-400">Ninguna registrada</li>}
            </ul>
            <Button size="sm" variant="soft" className="mt-2" onClick={() => { setDeclare('med'); setText(''); setExtra('') }}>Declarar medicación</Button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-slate-400" />
          <div><p className="text-sm font-semibold">Tus derechos de protección de datos</p><p className="text-xs text-slate-500">Acceso, rectificación, supresión, limitación, oposición y portabilidad.</p></div>
        </div>
        <Button variant="secondary" onClick={() => setRights(true)}>Ejercer un derecho</Button>
      </section>

      <Modal open={!!declare} onClose={() => setDeclare(null)} title={declare === 'allergy' ? 'Declarar alergia' : 'Declarar medicación'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeclare(null)}>Cancelar</Button><Button disabled={!text} onClick={() => {
          if (declare === 'allergy') addAllergy(p.id, { substance: text, reaction: extra, severity: 'moderada', status: 'pendiente', source: 'paciente', date: todayKey() })
          else addMedication(p.id, { name: text, dose: extra, frequency: '', status: 'pendiente', source: 'paciente', start: todayKey() })
          toast('Enviado. Un profesional lo revisará.')
          setDeclare(null)
        }}>Enviar</Button></>}>
        <div className="grid gap-3">
          <Field label={declare === 'allergy' ? 'Sustancia o alimento' : 'Medicamento'}><Input value={text} onChange={(e) => setText(e.target.value)} autoFocus /></Field>
          <Field label={declare === 'allergy' ? '¿Qué reacción tuviste?' : 'Dosis y frecuencia'}><Input value={extra} onChange={(e) => setExtra(e.target.value)} /></Field>
        </div>
      </Modal>
      <Modal open={rights} onClose={() => setRights(false)} title="Ejercer un derecho" size="sm"
        footer={<><Button variant="secondary" onClick={() => setRights(false)}>Cancelar</Button><Button onClick={() => {
          addTask({ title: `Solicitud de derecho de ${right.toLowerCase()} (RGPD)`, kind: 'datos', patientId: p.id, role: 'privacidad', due: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), priority: 'alta', detail: 'Plazo legal: 1 mes desde la recepción.' })
          log('Solicitud', 'Derechos RGPD', `Derecho de ${right.toLowerCase()} solicitado por ${p.firstName} ${p.lastName}`)
          toast('Solicitud registrada. Te responderemos en un plazo máximo de 1 mes.')
          setRights(false)
        }}>Enviar solicitud</Button></>}>
        <Field label="Derecho">
          <Select value={right} onChange={(e) => setRight(e.target.value)}>{['Acceso', 'Rectificación', 'Supresión', 'Limitación', 'Oposición', 'Portabilidad'].map((r) => <option key={r}>{r}</option>)}</Select>
        </Field>
        <p className="mt-3 text-xs text-slate-500">La solicitud llegará al Responsable de privacidad de la clínica con estado, plazo y evidencias.</p>
      </Modal>
    </div>
  )
}
