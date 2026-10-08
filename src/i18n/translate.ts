import { EN, EN_PATTERNS } from './en'
import { getLang, useLang } from './lang'

/**
 * Traducción de la interfaz al inglés sin tocar cada pantalla: un diccionario español→inglés
 * (frases exactas) y patrones para textos con datos variables («25 citas», «hace 3 días»…).
 * Se aplica a los textos y a placeholder/title/aria-label que React pinta en la página.
 */
const exact = new Map<string, string>()
const EDGE = /^([\s·:(),–\-—¿?¡!«»"“”.]*)(.*?)([\s·:(),–\-—¿?¡!«»"“”.]*)$/s
const add = (es: string, en: string) => {
  if (!es || exact.has(es)) return
  exact.set(es, en)
  // Las etiquetas también aparecen en minúscula o mayúscula inicial según la pantalla
  const lower = es.charAt(0).toLowerCase() + es.slice(1)
  const upper = es.charAt(0).toUpperCase() + es.slice(1)
  if (!exact.has(lower)) exact.set(lower, en.charAt(0).toLowerCase() + en.slice(1))
  if (!exact.has(upper)) exact.set(upper, en.charAt(0).toUpperCase() + en.slice(1))
}
for (const [es, en] of Object.entries(EN)) add(es.trim(), en.trim())
// Versiones sin la puntuación de los extremos («Vigencia:», «Hola,», «… nada.»)
for (const [es, en] of Object.entries(EN)) {
  const a = es.trim().match(EDGE)
  const b = en.trim().match(EDGE)
  if (a && b) add(a[2], b[2])
}

/** Traduce si sabe; si no, devuelve el texto tal cual (para usar dentro de los patrones). */
export const tr = (s: string): string => translateText(s) ?? s

const SEPARATORS = [' · ', ' — ', ' → ', ': ', ', ', ' / ', ' – ']

function lookup(s: string): string | null {
  const hit = exact.get(s)
  if (hit !== undefined) return hit
  for (const [re, to] of EN_PATTERNS) {
    const m = s.match(re)
    if (m) return typeof to === 'string' ? s.replace(re, to) : to(m, tr)
  }
  return null
}

function translateCore(core: string, depth: number): string | null {
  if (depth > 3) return null
  // Frases compuestas: «Cita · Sesión fisioterapia», «Revisión vencida: Plan nutricional»…
  for (const sep of SEPARATORS) {
    if (!core.includes(sep)) continue
    const parts = core.split(sep)
    let changed = false
    const out = parts.map((p) => {
      const t = translateInner(p, depth + 1)
      if (t !== null && t !== p) changed = true
      return t ?? p
    })
    if (changed) return out.join(sep)
  }
  return null
}

/** Busca la frase entera; si no, sin la puntuación de los extremos; si no, por trozos. */
function translateInner(text: string, depth: number): string | null {
  const ws = text.match(/^(\s*)(.*?)(\s*)$/s)!
  const [, wl, body, wt] = ws
  if (!body || !/[a-záéíóúñ]/i.test(body)) return null
  const whole = lookup(body)
  if (whole !== null) return wl + whole + wt
  const m = body.match(EDGE)
  if (!m) return null
  const [, lead, core, trail] = m
  if (!core) return null
  // En inglés no se abren las preguntas ni las exclamaciones
  const l = lead.replace(/[¿¡]/g, '')
  const t = lookup(core) ?? translateCore(core, depth)
  return t === null ? null : wl + l + t + trail + wt
}

export function translateText(text: string): string | null {
  return translateInner(text, 0)
}

const ATTRS = ['placeholder', 'title', 'aria-label']
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'])

function translateTextNode(n: Text) {
  const v = n.nodeValue ?? ''
  const t = translateText(v)
  if (t !== null && t !== v) n.nodeValue = t
}

function translateAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a)
    if (!v) continue
    const t = translateText(v)
    if (t !== null && t !== v) el.setAttribute(a, t)
  }
}

const skipped = (el: Element | null) => !el || SKIP.has(el.tagName) || !!el.closest('[data-no-translate]')
// Los placeholder de los cuadros de texto sí se traducen, aunque su contenido no
const attrSkipped = (el: Element) => !!el.closest('[data-no-translate]')

function translateTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    if (!skipped((root as Text).parentElement)) translateTextNode(root as Text)
    return
  }
  if (root.nodeType !== Node.ELEMENT_NODE || attrSkipped(root as Element)) return
  translateAttrs(root as Element)
  if (skipped(root as Element)) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let n: Node | null = walker.nextNode()
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) {
      if (!skipped(n.parentElement)) translateTextNode(n as Text)
    } else if (!attrSkipped(n as Element)) translateAttrs(n as Element)
    n = walker.nextNode()
  }
}

let observer: MutationObserver | null = null
let originalTitle = ''

function start() {
  if (observer) return
  originalTitle = document.title
  document.title = translateText(document.title) ?? document.title
  translateTree(document.body)
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') translateTree(m.target)
      else if (m.type === 'attributes') {
        if (!attrSkipped(m.target as Element)) translateAttrs(m.target as Element)
      }
      else m.addedNodes.forEach((n) => translateTree(n))
    }
  })
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })
}

function stop() {
  observer?.disconnect()
  observer = null
  if (originalTitle) document.title = originalTitle
}

/** Activa o desactiva la traducción según el idioma elegido. */
export function initTranslator() {
  const apply = () => {
    document.documentElement.lang = getLang()
    if (getLang() === 'en') start()
    else stop()
  }
  apply()
  useLang.subscribe(apply)
}
