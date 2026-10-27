# Backend ETC

## Estado exacto

`registerEtcRoutes(app)` está registrado en `server/_core/index.ts` antes de los parsers globales, OAuth y Vite. El router instala sus propios parsers: JSON limitado para REST y `express.raw()` para el webhook. La migración finita es aditiva/idempotente y no modifica `users` ni borra datos. El pool ETC se mantiene compartido y expone `closeEtcPool()` para pruebas o procesos finitos.

## Registro y migración

El arranque ya registra las rutas:

```ts
import { registerEtcRoutes } from "../etc/routes";
registerEtcRoutes(app);
```

La migración aditiva se ejecuta explícitamente con:

```bash
pnpm exec tsx server/etc/migrate.ts
```

Crea las tablas `etc_workspaces`, `etc_demo_sessions`, `etc_contacts`, `etc_conversations`, `etc_messages`, `etc_knowledge`, `etc_tasks` y `etc_usage_counters` sin DDL destructivo.

## Sesiones, autorización e idempotencia

`POST /api/etc/demo` acepta un segmento opcional y devuelve un token opaco de 32 bytes. Sólo se almacena SHA-256 del token; expira en 8 horas. Cada demo tiene workspace, contactos, conversaciones, mensajes, tareas y conocimiento ficticio aislados. El modo privado resuelve `sdk.authenticateRequest(req)` y obtiene el propietario desde el usuario OAuth real.

Todas las lecturas y escrituras filtran por `workspace_id`. Los `contactId`, `conversationId`, `taskId`, `knowledgeId` y `clientId` se validan dentro del workspace o conversación correspondiente. Repetir un `clientId` con el mismo payload devuelve el registro ya guardado; cambiar el payload devuelve 409. Sólo el propietario cambia configuración y aplica presets. No se usa `NODE_ENV` para autenticar ni se convierte el rol global OAuth en propietario de otro espacio.

Las escrituras privadas (`POST`, `PATCH`, `DELETE`, incluido `/suggest`) requieren `X-ETC-Intent: workspace`. La demo pública y el webhook quedan exentos. El manejo final del router devuelve JSON sanitizado: JSON malformado es 400, cuerpo demasiado grande 413 y excepciones no previstas 500 sin SQL, stack, secretos ni PII.

## Copiloto, pausa humana y handoff

Las llamadas usan el proveedor del proyecto sólo con `MANUS_API_URL` y `MANUS_API_KEY`, modelo `gpt-6-luna`, `reasoning: { effort: "none" }`, `max_completion_tokens: 700`, timeout de 20 segundos y esquema JSON estricto `{text, handoff}`. El prompt recibe el perfil vigente acotado del workspace (`name`, `agentName`, `tone`, `description`) y sólo conocimiento aprobado. No promete resultados, agenda, envíos ni notificaciones inventadas.

La reserva de un mensaje live exige `clientId`, se hace antes de llamar a Meta, deja `status=pending`, pausa `ai_paused` y aumenta `version` en una misma transacción. Una entrega confirmada sólo pasa a `sent` después de leer `messages[0].id`; el `external_id` es SHA-256 de `${workspaceId}:${providerId}`. Timeout, red, 5xx o respuesta sin identificador dejan `uncertain`; un 4xx deja `failed`. Ninguno se reintenta automáticamente por el mismo `clientId`; `sent`, `delivered` y `read` se devuelven sin llamar otra vez al proveedor.

Los mensajes humanos demo y live pausan automáticamente la conversación y versionan de forma atómica. Cerrar una conversación también la pausa. `/simulate` rechaza conversaciones cerradas, deduplica antes de consumir IA y devuelve el snapshot completo del historial. Si el resultado tiene `handoff=true`, persiste un texto neutral de revisión humana y pausa el chat dentro de la transacción; no afirma que alguien haya sido notificado. La verificación de versión/pausa ocurre justo antes de persistir la respuesta.

## Conexión real opcional

La conexión sólo se considera configurada si `ETC_LIVE_WHATSAPP_ENABLED=true`, `WA_WORKSPACE_ID` coincide con el workspace OAuth propietario, están presentes `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_VERIFY_TOKEN`, `META_APP_SECRET` y `WA_GRAPH_API_VERSION` cumple `/^v[0-9]{1,3}\.0$/`. Sin versión validada o sin cualquier secreto, `configured=false`, `enabled=false` y `/connection` declara el nombre faltante sin revelar valores. La URL Graph usa exclusivamente el host fijo `graph.facebook.com` y la versión validada del entorno; no hay una versión hardcodeada.

El webhook valida challenge, HMAC-SHA256 sobre el body crudo y el identificador de número configurado. Guarda cada inbound antes del 200, deduplica el identificador externo mediante una clave hashada con workspace, crea contactos nuevos con `consent=false`, y no ejecuta IA automática. Timestamps no finitos o futuros se descartan; un inbound antiguo nunca retrocede `last_inbound_at`. Los status de Meta sólo actualizan mensajes outbound ya existentes dentro del workspace y nunca crean ni reclaman una entrega ficticia. Una carrera de unique externo revierte la transacción y se responde 200 sin duplicar contactos.

## Cuotas demo persistentes

La demo aplica límites consultando SQL antes de escribir: 100 contactos, 30 registros de conocimiento, 100 tareas y 200 mensajes por conversación. La creación global diaria de demos permite 100 sesiones; el contador de IA mantiene sus topes persistentes globales y por workspace. Estas cuotas de recursos demo no se aplican al modo privado. No se borran demos ni espacios privados, y el TTL demo existente de 8 horas se conserva.
