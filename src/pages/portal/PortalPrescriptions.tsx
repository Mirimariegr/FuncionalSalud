import { useState } from 'react'
import { useCurrentPatient, useStore } from '../../store'
import { isActive, PharmacyModal, PrescriptionCard } from '../../components/Prescriptions'
import type { Prescription } from '../../types'

export default function PortalPrescriptions() {
  const p = useCurrentPatient()!
  const all = useStore((s) => s.prescriptions).filter((x) => x.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))
  const [show, setShow] = useState<Prescription | null>(null)
  const active = all.filter(isActive)
  const past = all.filter((x) => !isActive(x))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recetas</h1>
        <p className="text-sm text-slate-500">Pulsa «Mostrar en la farmacia» y enseña la pantalla en el mostrador.</p>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-emerald-700">Activas ({active.length})</h2>
        {active.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">No tienes recetas activas.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">{active.map((rx) => <PrescriptionCard key={rx.id} rx={rx} onShow={() => setShow(rx)} />)}</div>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Anteriores</h2>
          <div className="grid gap-3 sm:grid-cols-2">{past.map((rx) => <PrescriptionCard key={rx.id} rx={rx} compact />)}</div>
        </section>
      )}
      <PharmacyModal rx={show} onClose={() => setShow(null)} />
    </div>
  )
}
