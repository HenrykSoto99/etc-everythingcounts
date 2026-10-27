# Validación del MVP ETC

Fecha de actualización: 27 de octubre de 2026. Stack administrado: React/TypeScript, Express y MySQL persistente. Las escrituras de prueba utilizaron exclusivamente espacios ficticios de demo o cuentas ficticias de QA. No se enviaron mensajes a Meta ni correos a personas reales.

## Backend y contratos

`pnpm check` pasó y `pnpm test` pasó con 45 pruebas en 11 archivos. Cubren reglas de conversación y handoff, sesiones, autenticación y migraciones, límites del agente en español e inglés, cifrado/configuración y rechazo de afirmaciones de acciones no ejecutadas. `pnpm build` generó frontend, bundle de servidor y HTML inicial de landing, privacidad, índice de recursos, seis guías y 404. El aviso de tamaño de bundle no impide compilar.

`ETC_SMOKE_AI=1 node scripts/smoke-demo.mjs` comprobó sesiones aisladas, acceso anónimo rechazado, CRUD y scoping de contactos/conversaciones/tareas, etapa persistente, consentimiento estricto, pausa humana, idempotencia de mensajes, borradores y CSV. Obtuvo una respuesta del proveedor real de IA.

`SMOKE_AI=1 node scripts/smoke-account.mjs` comprobó registro/login de una cuenta ficticia, espacio separado, rechazo de contraseña incorrecta, guardas de solicitudes y consultas por segmento, denegación de claves en demo, bloqueo seguro del cifrado no configurado y logout. Obtuvo una respuesta real del modelo para una consulta operativa. No valida infalibilidad ni contenido comercial de un cliente.

## Responsive e interacciones

La inspección de navegador usó Chromium con tamaños de laptop 1366×900, tablet 820×1180 y celular 390×844. Se revisaron landing, login, pipeline, consultas, ajustes y guía API. Se corrigieron el menú desbordado de tablet, el autoescalado del encabezado de guías móvil, campos táctiles y contraste de títulos en oscuro. La comprobación dirigida de las ocho vistas afectadas terminó sin desbordamiento de documento ni errores de JavaScript. Es comprobación de viewport, no certificación de todos los dispositivos o de Safari nativo.

El gesto real de drag and drop de escritorio produjo PATCH 200 y la etapa se conservó al recargar. Una prueba adicional con eventos táctiles de Chromium en viewport móvil también movió la tarjeta y comprobó la persistencia. El selector alternativo de etapa sigue disponible.

Las interacciones comprobaron el chat con pregunta y respuesta separadas, sin duplicados, y el rechazo de una consulta ajena a la operación. Se corrigió el envío del subtipo fuera de PYMES y la reconciliación del mensaje optimista. Español/inglés y light/dark persistieron al recargar; el ojo mostró/ocultó la contraseña; el menú móvil abrió y las animaciones no tienen botones de pausa ni repetición. La preferencia de movimiento reducido del dispositivo se respeta.

Una revisión independiente de sólo lectura trazó interfaz, API y persistencia. Los hallazgos confirmados de contrato del chat, subtipo, afirmaciones de acciones y cobertura de idioma se corrigieron y se comprobaron las rutas afectadas.

## Estado y límites

El endpoint de salud y el manifiesto de rutas respondieron correctamente. El estado real del correo es `emailEnabled=false` y proveedor `none`: hay flujo seguro de recuperación, pero el envío requiere Resend o SMTP configurado. No se afirmó entrega de correo. No hay contraseñas recuperables ni enviadas por email.

Las claves propias requieren `ETC_LLM_ENCRYPTION_KEY` protegida antes de guardarse por cliente. Sin ella se bloquea la escritura: no hay un fallback a almacenamiento en texto claro. La demo no admite claves reales. Al publicar debe configurarse `ETC_PUBLIC_ORIGIN` con el origen HTTPS real, preservando la lista autorizada de solicitudes y enlaces de recuperación.

La operación real de WhatsApp, el número y los requisitos de Meta no se han activado ni probado. No incluye SLA, campañas masivas, aprobaciones de plantillas, invitaciones multiusuario ni agente autónomo real. Las cuentas propias aún no verifican la propiedad del correo al registrarse.

Google permanece como destino pendiente, no como un enlace roto o inventado. Los enlaces de marca y sus comprobaciones están en `docs/BRAND-LINKS.md`.

## GitHub y publicación

El repositorio privado conectado es `https://github.com/HenrykSoto99/etc-everythingcounts`. Su versión anterior fue transferida y confirmada. Esta ampliación se guarda como un nuevo commit sin reescribir la historia; confirmar su SHA en el recibo de checkpoint y GitHub.

Con GitHub como repositorio activo, la publicación se realiza desde el panel del proyecto. No se afirma una publicación ni URL permanente a partir de un build, Preview o commit. La conexión real, el correo y las claves propias continúan pendientes de configuración protegida.
