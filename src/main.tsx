import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// El traductor automático del navegador reescribe el DOM y hace caer la app al actualizarse
document.documentElement.setAttribute('translate', 'no')
document.documentElement.classList.add('notranslate')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
