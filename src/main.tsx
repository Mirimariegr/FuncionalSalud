import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initTranslator } from './i18n/translate'

// El traductor automático del navegador y algunas extensiones (correctores, traductores)
// reescriben el texto de la página. Se pide que no lo hagan…
document.documentElement.setAttribute('translate', 'no')
document.documentElement.classList.add('notranslate')

// …y, por si lo hacen igualmente, React no debe caerse al encontrarse nodos que ya no están
// donde los dejó (solución recomendada en facebook/react#11538).
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child
    return originalRemoveChild.call(this, child) as T
  }
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) return originalInsertBefore.call(this, newNode, null) as T
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }
}

initTranslator()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
