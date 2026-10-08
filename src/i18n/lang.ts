import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'es' | 'en'

/** Idioma de la interfaz. Se guarda aparte de los datos de demo para que «Restablecer» no lo cambie. */
export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist((set) => ({ lang: 'es', setLang: (lang) => set({ lang }) }), { name: 'funcional-salud-lang' }),
)

export const getLang = (): Lang => useLang.getState().lang

/** Configuración regional para fechas, horas e importes. */
export const locale = () => (getLang() === 'en' ? 'en-GB' : 'es-ES')

/** Idioma del reconocimiento de voz del navegador. */
export const speechLang = () => (getLang() === 'en' ? 'en-GB' : 'es-ES')
