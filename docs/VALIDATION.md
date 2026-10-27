# Validación del MVP ETC

Fecha: 26 de octubre de 2026. Proyecto administrado con backend Express y MySQL persistente. Las comprobaciones de escritura usaron exclusivamente espacios ficticios creados para la demo; no se enviaron mensajes a Meta ni se probaron con datos privados de clientes.

## Resultados comprobados

`pnpm check` pasó. `pnpm test` pasó con 10 pruebas de reglas, sesiones de plataforma y logout. `pnpm build` generó frontend, HTML público prerenderizado de landing/privacidad/404 y bundle de servidor. Los avisos del build sobre tamaño de bundle y el script de configuración de la plataforma no impidieron compilar.

`ETC_SMOKE_AI=1 node scripts/smoke-demo.mjs` pasó contra el servicio real y la base administrada. Comprobó sesiones demo distintas, acceso no autenticado rechazado, scoping de contactos/conversaciones/tareas entre espacios, cambio de etapa persistente, rechazo de consentimiento enviado como texto, pausa humana, simulación sin respuesta automática cuando hay pausa, idempotencia de mensaje humano, conocimiento como borrador, creación/completado de tarea y CSV.

El mismo smoke test obtuvo una respuesta del proveedor real de IA, no un fallback. El producto identifica por separado respuestas reales y de respaldo y mantiene límites de uso. Esto no demuestra infalibilidad del modelo ni valida respuestas comerciales de un negocio real.

El endpoint de salud respondió 200, las rutas declaradas se sirvieron como JSON y el webhook desactivado respondió 503. El HTML generado incluye contenido público y títulos desde la primera carga; no se prerenderizan conversaciones privadas.

## Revisión de integración

Una revisión de solo lectura trazó UI, API y persistencia. Los hallazgos de consentimiento, duplicación de historial, borradores cruzados entre contactos, estado de conexión y deduplicación concurrente se corrigieron. El pipeline usa DndKit con MouseSensor y TouchSensor, handle de arrastre, columnas droppable, PATCH persistente, rollback y selector accesible. La persistencia de etapa se verificó por API; no se realizó una prueba de gesto de puntero en navegador.

El handoff usa versión durable y bloqueo de fila antes de guardar una respuesta automática. El envío live reserva un mensaje antes de llamar al proveedor y distingue entrega confirmada, fallo y estado incierto. Estos caminos reales permanecen desactivados sin credenciales/versionado de Meta y requieren pruebas con un número de prueba antes de operar con clientes.

## Alcance pendiente

La conexión real de WhatsApp y el onboarding del número del cliente no se han activado ni probado. La demo no equivale a un servicio con SLA, campañas masivas, plantillas Meta aprobadas, invitaciones multiusuario ni agente autónomo real. La autenticación usa el flujo y validación reales de plataforma; la revisión verificó controles de JWT y ausencia de acceso anónimo, no un login manual completo de un cliente desde navegador.

La publicación y la transferencia a GitHub se confirman por sus recibos de plataforma; no se deben inferir a partir de un build, de Preview o de un commit local.

## Estado de entrega

El checkpoint funcional `83f5fdb5cd8687392de56e5de9b492b489d241c7` fue confirmado por la plataforma. La transferencia al repositorio privado `https://github.com/HenrykSoto99/etc-everythingcounts` fue verificada y completada, y GitHub es el repositorio activo del proyecto.

El servicio de Preview fue reiniciado con el entorno sincronizado y respondió correctamente. La publicación por la herramienta del asistente fue rechazada porque el repositorio activo está en GitHub: para este proyecto la publicación se realiza desde el panel del proyecto. Queda pendiente pulsar Publicar en dicho panel y comprobar su resultado. No hay todavía una URL pública permanente confirmada; Preview no equivale a una publicación.
