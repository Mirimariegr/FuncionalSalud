import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, UserPlus, Users } from 'lucide-react'
import { findDuplicates, useRole, useStore } from '../../store'
import { patientStatus } from '../../lib/labels'
import { canEdit } from '../../lib/permissions'
import { age, fDate, normalize } from '../../lib/utils'
import { Avatar, Badge, Button, Empty, Field, Input, Modal, PageHeader, SearchInput, Select, Td, Th, Toggle } from '../../components/ui'
import type { Patient, PatientStatus } from '../../types'

export default function Patients() {
  const { patients, centers, professionals, appointments } = useStore()
  const log = useStore((s) => s.log)
  const toast = useStore((s) => s.toast)
  const role = useRole()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | PatientStatus>('all')
  const [center, setCenter] = useState('all')
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => {
    const n = normalize(q)
    return patients
      .filter((p) => (status === 'all' || p.status === status) && (center === 'all' || p.centerId === center))
      .filter((p) => !n || normalize(`${p.firstName} ${p.lastName} ${p.nhc} ${p.docId} ${p.phone} ${p.email}`).includes(n))
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [patients, q, status, center])

  const nextAppt = (id: string) =>
    appointments
      .filter((a) => a.patientId === id && a.start > new Date().toISOString() && !['cancelada', 'replanificada'].includes(a.status))
      .sort((a, b) => a.start.localeCompare(b.start))[0]

  const exportCsv = () => {
    const header = 'NHC;Nombre;Apellidos;Documento;Teléfono;Email;Estado\n'
    const body = rows.map((p) => [p.nhc, p.firstName, p.lastName, p.docId, p.phone, p.email, p.status].join(';')).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pacientes.csv'
    a.click()
    log('Exportación', 'Pacientes', `Exportado listado de ${rows.length} pacientes (CSV)`)
    toast('Exportación registrada en auditoría')
  }

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle={`${patients.length} pacientes · ${patients.filter((p) => p.status === 'activo' || p.status === 'seguimiento').length} activos`}
        actions={
          <>
            {canEdit(role, 'pacientes') || role === 'direccion' ? <Button variant="secondary" icon={Download} onClick={exportCsv}>Exportar</Button> : null}
            {canEdit(role, 'pacientes') && <Button icon={UserPlus} onClick={() => setOpen(true)}>Nuevo paciente</Button>}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Nombre, NHC, DNI, teléfono o email" className="w-full max-w-sm" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-auto">
          <option value="all">Todos los estados</option>
          {Object.entries(patientStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={center} onChange={(e) => setCenter(e.target.value)} className="w-auto">
          <option value="all">Todos los centros</option>
          {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <Th>Paciente</Th>
                <Th>NHC</Th>
                <Th>Contacto</Th>
                <Th>Profesional ref.</Th>
                <Th>Próxima cita</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => {
                const na = nextAppt(p.id)
                const prof = professionals.find((x) => x.id === p.professionalId)
                return (
                  <tr key={p.id} onClick={() => navigate(`/app/pacientes/${p.id}`)} className="cursor-pointer transition hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${p.firstName} ${p.lastName}`} size="sm" />
                        <div>
                          <p className="flex items-center gap-1.5 font-medium text-slate-800">
                            {p.firstName} {p.lastName}
                            {p.allergies.some((a) => a.status === 'activa') && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                          </p>
                          <p className="text-xs text-slate-500">{age(p.birthDate)} años · {p.insurer ?? 'Privado'}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">{p.nhc}</Td>
                    <Td>
                      <p className="text-sm">{p.phone}</p>
                      <p className="text-xs text-slate-500">{p.email}</p>
                    </Td>
                    <Td className="text-sm">{prof?.name ?? '—'}</Td>
                    <Td className="text-sm">{na ? fDate(na.start) : <span className="text-slate-400">Sin cita</span>}</Td>
                    <Td><Badge tone={patientStatus[p.status].tone} dot>{patientStatus[p.status].label}</Badge></Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty icon={Users} title="Sin resultados" text="Prueba con otro término o crea un nuevo paciente." />}
      </div>
      <NewPatientModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

export function NewPatientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { patients, centers, professionals } = useStore()
  const createPatient = useStore((s) => s.createPatient)
  const sendConsent = useStore((s) => s.sendConsent)
  const toast = useStore((s) => s.toast)
  const navigate = useNavigate()
  const empty = {
    firstName: '', lastName: '', docId: '', birthDate: '', sex: 'F' as Patient['sex'], phone: '', email: '', address: '', language: 'Español',
    preferredChannel: 'whatsapp' as Patient['preferredChannel'], centerId: 'c1', professionalId: '', insurer: '', policy: '', origin: 'Recepción',
    whatsapp: true, emailOk: true, sms: false, invite: true, sendRgpd: true,
  }
  const [f, setF] = useState(empty)
  const [ack, setAck] = useState(false)
  useEffect(() => { if (open) { setF(empty); setAck(false) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const dups = useMemo(() => findDuplicates(patients, f), [patients, f])
  const valid = f.firstName && f.lastName && f.phone && f.birthDate
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const submit = () => {
    const p = createPatient({
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), docId: f.docId.trim().toUpperCase(), birthDate: f.birthDate, sex: f.sex, phone: f.phone,
      email: f.email, address: f.address, language: f.language, preferredChannel: f.preferredChannel,
      channelConsent: { whatsapp: f.whatsapp, email: f.emailOk, sms: f.sms }, centerId: f.centerId, professionalId: f.professionalId || undefined,
      status: f.docId ? 'activo' : 'prealta', insurer: f.insurer || undefined, policy: f.policy || undefined, origin: f.origin, portalEnabled: f.invite,
    })
    if (f.sendRgpd) {
      sendConsent(p.id, 'ct1', 'enlace')
      sendConsent(p.id, 'ct2', 'enlace')
    }
    toast(`Paciente ${p.firstName} ${p.lastName} creado${f.invite ? ' · invitación al portal enviada' : ''}`)
    onClose()
    navigate(`/app/pacientes/${p.id}`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alta de paciente"
      subtitle="Los datos se capturan una vez y se reutilizan en todo el sistema."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid || (dups.length > 0 && !ack)}>Crear paciente</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *"><Input value={f.firstName} onChange={set('firstName')} autoFocus /></Field>
        <Field label="Apellidos *"><Input value={f.lastName} onChange={set('lastName')} /></Field>
        <Field label="DNI / NIE / Pasaporte" hint="Si falta, el paciente queda en prealta."><Input value={f.docId} onChange={set('docId')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nacimiento *"><Input type="date" value={f.birthDate} onChange={set('birthDate')} /></Field>
          <Field label="Sexo">
            <Select value={f.sex} onChange={set('sex')}><option value="F">Mujer</option><option value="M">Hombre</option><option value="X">Otro / NC</option></Select>
          </Field>
        </div>
        <Field label="Teléfono móvil *"><Input value={f.phone} onChange={set('phone')} placeholder="6XXXXXXXX" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Dirección" className="sm:col-span-2"><Input value={f.address} onChange={set('address')} /></Field>
        <Field label="Centro habitual">
          <Select value={f.centerId} onChange={set('centerId')}>{centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </Field>
        <Field label="Profesional de referencia">
          <Select value={f.professionalId} onChange={set('professionalId')}>
            <option value="">— Sin asignar —</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Aseguradora"><Input value={f.insurer} onChange={set('insurer')} placeholder="Privado si se deja vacío" /></Field>
        <Field label="Canal preferido">
          <Select value={f.preferredChannel} onChange={set('preferredChannel')}>
            <option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option><option value="telefono">Teléfono</option>
          </Select>
        </Field>
      </div>
      <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">Autorizaciones y comunicaciones</p>
        <Toggle checked={f.whatsapp} onChange={(v) => setF({ ...f, whatsapp: v })} label="Autoriza WhatsApp" />
        <Toggle checked={f.emailOk} onChange={(v) => setF({ ...f, emailOk: v })} label="Autoriza email" />
        <Toggle checked={f.invite} onChange={(v) => setF({ ...f, invite: v })} label="Enviar invitación al portal" />
        <Toggle checked={f.sendRgpd} onChange={(v) => setF({ ...f, sendRgpd: v })} label="Solicitar consentimientos RGPD y comunicaciones" />
      </div>
      {dups.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800"><AlertTriangle className="h-4 w-4" /> Posible paciente duplicado</p>
          <ul className="mt-2 space-y-1.5">
            {dups.slice(0, 3).map(({ p, reasons }) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-amber-100">
                <span><b>{p.firstName} {p.lastName}</b> <span className="text-xs text-slate-500">· {p.nhc} · coincide: {reasons.join(', ')}</span></span>
                <Button size="sm" variant="soft" onClick={() => { onClose(); navigate(`/app/pacientes/${p.id}`) }}>Abrir ficha</Button>
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-center gap-2 text-xs text-amber-800">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="accent-amber-600" />
            He comprobado que no es la misma persona y quiero crear un paciente nuevo.
          </label>
        </div>
      )}
    </Modal>
  )
}
