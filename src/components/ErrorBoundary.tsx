import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  error: Error | null
}

/** Evita la pantalla en blanco: si algo falla al pintar, muestra el error y permite recuperarse. */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error en la aplicación:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600"><AlertTriangle className="h-6 w-6" /></span>
        <h2 className="mt-4 text-lg font-semibold">Algo no ha funcionado</h2>
        <p className="mt-1 text-sm text-slate-500">Puedes volver a la pantalla anterior y seguir usando la demo. Si se repite, copia este mensaje y envíalo:</p>
        <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-700 ring-1 ring-slate-200">{error.message}</pre>
        <div className="mt-5 flex justify-center gap-2">
          <button
            className="h-9 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            onClick={() => { this.setState({ error: null }); this.props.onReset?.() }}
          >
            Volver
          </button>
          <button className="h-9 rounded-lg px-4 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" onClick={() => window.location.reload()}>
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
