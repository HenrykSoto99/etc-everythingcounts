# Fuentes públicas y procedencia

Consulta: 26 de octubre de 2026.

## CRM open source

https://github.com/kevinrivm/vocero-crm — base funcional de bandeja, pipeline, conocimiento, handoff y ventana de servicio. ETC no es un fork íntegro: la ruta administrada React/Express/MySQL fue aprobada por el usuario. Regla adaptada directamente: `src/server/inbox/window.ts` a `shared/etc/window.ts`. La revisión original se registra en `docs/third-party/vocero-source-revision.txt`.

https://github.com/kevinrivm/vocero-crm/blob/main/LICENSE — licencia MIT, copyright 2026 Kevin Belier, que exige conservar copyright y permiso. Copia íntegra en `docs/third-party/vocero-crm-LICENSE`. La autorización de reutilización no supone garantía ni soporte del autor.

## Tipografía y paleta

https://www.primitive.dev — referencia tipográfica solicitada. Su CSS público declara `JetBrains Mono` y el cuerpo usa `var(--font-mono)`. Se toma la familia tipográfica como referencia, no se copia su fuente personalizada de logotipo `logoMono`, marca ni copy. ETC usa JetBrains Mono libre mediante Google Fonts.

Paleta aportada por el usuario: #1B4079, #4D7C8A, #7F9C96, #8FAD88, #CBDF90. No es una métrica ni un dato externo inferido.

## IA

El catálogo de la API del proyecto y el catálogo completo se consultaron antes de elegir modelo. `gpt-6-luna` está ofrecido por el proyecto; su catálogo indica costo por tarea bajo, instrucciones/escritura/precisión factual nivel medio y effort none/low/medium/high/xhigh/max. Se elige para copiloto supervisado y simulación, sin herramientas ni decisiones comerciales autónomas. `gpt-5-mini` se descartó porque el catálogo anuncia retiro. No se publican tarifas de IA como precio comercial del producto; la demo tiene límites de uso y puede operar con fallback explícito.

## Meta

https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started — preparación de Cloud API.
https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/ — HTTPS, challenge y validación de webhook.
https://business.whatsapp.com/policy — consentimiento y mensajería.

Las funciones reales de WhatsApp necesitan credenciales, titularidad del número y configuración por cliente. El modo demo nunca envía a Meta.
