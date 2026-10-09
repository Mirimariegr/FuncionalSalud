# Funcional Salud · Gestor de Pacientes (demo)

Prototipo operativo del **Gestor de Pacientes para Clínicas** de Reliotek, construido a partir del documento *Funcional de Negocio v0.1*. Pensado para enseñar el producto en una demo: todas las pantallas funcionan con datos de ejemplo realistas y los cambios se guardan en el navegador.

> Fuera de alcance en esta versión: la integración con **WhatsApp** (se abordará en una fase posterior).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (estático, se puede servir desde cualquier hosting)
```

Al hacer push a `main`, el workflow `.github/workflows/deploy.yml` publica la demo (funciona tanto con *Settings → Pages → Source: GitHub Actions* como con *Deploy from a branch → gh-pages*). Demo: https://mirimariegr.github.io/FuncionalSalud/

## Qué incluye

**Backoffice de la clínica**

| Módulo | Qué se puede hacer |
| --- | --- |
| Inicio | KPIs del día, agenda de hoy, alertas (replanificaciones, consentimientos caducados o por caducar, revisiones vencidas), tareas prioritarias y ocupación por profesional. |
| Agenda | Vista día (columnas por profesional) y semana. Crear citas pulsando un hueco, con validación de solapes de profesional, sala y paciente. Cambios de estado según las reglas del §7.2 y replanificación trazada. |
| Pacientes | Búsqueda (también global con `Ctrl K`), alta con **detección de duplicados**, exportación CSV auditada. |
| Mensajes | Chat con los pacientes y solicitudes por formulario (citas, facturas, documentación, datos personales), con estado abierta o resuelta. La ficha permite editar teléfono, email y dirección. |
| Ficha 360º | Cabecera con alertas (alergias, datos declarados pendientes, consentimientos, tutor legal), resumen, expediente clínico (alergias, medicación, antecedentes, episodios), citas, tratamientos, documentos, consentimientos, económico y **línea temporal** filtrable. |
| Episodios | Registro de visita con notas internas, juicio clínico, plan, resumen publicable y próxima acción (genera tarea). |
| Sesión grabada | Al pulsar «Iniciar atención» el profesional graba la consulta con el micrófono (Google Chrome o Microsoft Edge) y se transcribe en directo distinguiendo **Profesional** y **Paciente** (detección automática, corregible con un clic). Al pulsar «Finalizar y resumir» la grabación se detiene y se genera un resumen en lenguaje clínico (síntomas, evolución, indicaciones, próxima revisión); el profesional lo **acepta** (se añade al historial del paciente) o lo **rechaza** (no se guarda nada). |
| Recetas | El profesional emite recetas desde la ficha; el paciente las ve en su portal con código para la farmacia. |
| Documentos | Repositorio con revisión y **publicación controlada** al portal; cada visualización queda auditada. |
| Consentimientos | Plantillas versionadas, envío, aceptación trazable con evidencias, vigencia, caducidad y revocación. |
| Tratamientos | Planes con sesiones, progreso, revisión y alertas de seguimiento. |
| Presupuestos y pagos | Presupuestos con líneas, descuentos e IVA, aceptación, cobros parciales y pendientes. |
| Informes | Pestaña **Analíticas** (indicadores, actividad diaria, ocupación e ingresos) y pestaña **Historial** (evolución mensual y últimas visitas). |
| Configuración | Centros, profesionales, salas/recursos y servicios (CRUD). |
| Usuarios y permisos | Usuarios y matriz de acceso por rol (Anexo A). |
| Auditoría | Registro de accesos, cambios, publicaciones y exportaciones. |

**Idioma ES / EN**: el selector de la cabecera (y de la pantalla de acceso) cambia toda la interfaz y los datos de ejemplo entre español e inglés, y se recuerda en el navegador. Fechas e importes siguen el idioma elegido. En inglés la transcripción de la sesión escucha en inglés; el resumen automático se genera con reglas en español, así que en inglés conviene revisarlo o completarlo a mano.

**Portal del paciente** (responsive, sin instalar nada): recetas activas con pantalla «Mostrar en la farmacia», chat y solicitudes a administración, próxima cita con confirmar / cambiar / cancelar, pedir cita en huecos realmente libres, documentos publicados, firma de consentimientos con verificación OTP simulada, tratamientos y evolución, presupuestos (aceptar y pago online simulado), datos personales, preferencias de comunicación, declaración de alergias o medicación para revisión y solicitud de derechos RGPD.

## EOS · Extracción de datos de contratos a Google Sheet

Página independiente en `public/eos/index.html`, publicada en https://mirimariegr.github.io/FuncionalSalud/eos/. Envía cada contrato (PDF o imagen) al webhook de n8n `eos-documento` (workflow «EOS · Documento a Google Sheet»), donde Claude identifica a todos los intervinientes y se añade **una fila por interviniente** en «Hoja 1» del Sheet de EOS con: NOMBRE PDF, DNI/NIE, NOMBRE INTERVINIENTE (nombre y dos apellidos), DIRECCION PARTICULAR COMPLETA, POBLACION, PROVINCIA, PAIS y CODIGO POSTAL. Para probar con la URL de test de n8n: `.../eos/?webhook=<url-de-test>`.

## Guion sugerido para la demo

1. **Recepción (Silvia Ramos)**: Inicio → alertas → *Nuevo paciente* escribiendo «María García López» para ver la detección de duplicados → *Nueva cita* en un hueco ocupado para ver el control de solapes.
2. **Médico general (Dr. Andrés Soler)** o **fisioterapeuta (Laura Méndez)**: en la Agenda abre una cita de hoy y pulsa «Iniciar atención · grabar y resumir», habla al menos un minuto → «Finalizar y resumir» → «Aceptar y añadir al historial» (o «Rechazar»). Después, ficha de *María García López* → Expediente (alergias, validar el Omeprazol declarado) → *Registrar episodio* con próxima acción y resumen publicado → Línea temporal.
3. **Paciente (María García López)** en el portal: confirmar cita, firmar el consentimiento de imagen, aceptar y pagar el presupuesto, declarar una alergia.
4. **Administración (Irene Campos)**: Tareas (aparecen las generadas desde el portal), Informes, Usuarios y permisos, Auditoría.
5. Entrar como **Facturación** o **Privacidad** para ver cómo cambian menú y accesos (y el registro de accesos denegados).

«Restablecer datos de demo» (barra lateral) vuelve al estado inicial. Los datos se regeneran solos cada día para que la agenda siempre sea relativa a hoy.

## Stack

React 19 + TypeScript + Vite, Tailwind CSS 4, Zustand (estado persistido en `localStorage`), React Router (hash routing, apto para hosting estático) y Lucide Icons. Sin backend: el modelo de datos (`src/types.ts`) sigue el modelo conceptual del §22 para facilitar pasar a una API real.

```
src/
  data/seed.ts          datos de demo (deterministas, relativos a hoy)
  store.ts              estado y reglas de negocio (solapes, auditoría, tareas automáticas…)
  lib/permissions.ts    matriz de acceso por rol
  components/           UI base, layouts y diálogos reutilizables
  pages/app/            backoffice
  pages/portal/         portal del paciente
```
