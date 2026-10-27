export const RESOURCE_EN: Record<string, string> = {
  Guía: "Guide",
  Referencia: "Reference",
  Mapa: "Map",
  Nota: "Note",
  "Primeros pasos": "First steps",
  "Explora ETC paso a paso: demo, bandeja, contactos y siguiente acción.":
    "Explore ETC step by step: demo, inbox, contacts, and next action.",
  "Abrir guía": "Open guide",
  "Una ruta corta para entender ETC sin conectar un número ni cargar información real.":
    "A short route to understand ETC without connecting a number or uploading real information.",
  "ETC es un frontdesk y CRM de WhatsApp + IA para PyMEs mexicanas. La demo crea un espacio ficticio aislado por visitante; sirve para explorar la operación, no para contactar a personas reales.":
    "ETC is a WhatsApp + AI front desk and CRM for Mexican small businesses. The demo creates a fictional space isolated per visitor; it is for exploring the operation, not contacting real people.",
  "Empieza en la demo y elige un segmento de ejemplo. Encontrarás conversaciones, contactos y etapas precargadas para que puedas observar el recorrido de un prospecto sin preparar una cuenta de producción.":
    "Start in the demo and choose an example segment. You will find preloaded conversations, contacts, and stages so you can observe a prospect journey without preparing a production account.",
  "En la bandeja, abre una conversación y revisa el historial junto al contacto. La toma humana pausa al asistente de forma durable; el equipo conserva el contexto antes de decidir qué responder.":
    "In the inbox, open a conversation and review the history alongside the contact. Human takeover durably pauses the assistant; the team keeps the context before deciding what to answer.",
  "El copiloto puede proponer un borrador manual usando el conocimiento aprobado del espacio. El borrador se revisa antes de enviarse y no representa una respuesta autónoma ni una promesa de precisión.":
    "The copilot can propose a manual draft using the workspace's approved knowledge. The draft is reviewed before sending and does not represent an autonomous answer or a promise of accuracy.",
  "Desde Contactos puedes crear y editar registros, ajustar etapa, prioridad, etiquetas, notas y consentimiento. Pipeline es una vista operativa de esos cambios, no un flujo autónomo de ventas.":
    "From Contacts you can create and edit records, adjust stage, priority, tags, notes, and consent. Pipeline is an operational view of those changes, not an autonomous sales flow.",
  "Las tareas ayudan a dejar un seguimiento con fecha y, cuando haga falta, un contacto relacionado. La demo conserva los cambios en su espacio ficticio y tiene límites explícitos para proteger la experiencia.":
    "Tasks help leave a dated follow-up and, when useful, a related contact. The demo keeps changes in its fictional space and has explicit limits to protect the experience.",
  "Cuando termines, vuelve a la landing o abre Privacidad y alcance. Para operación real se necesita un espacio privado, contenido aprobado, responsables definidos y la configuración de la API oficial de WhatsApp.":
    "When you finish, return to the landing page or open Privacy and scope. Real operations require a private space, approved content, defined owners, and official WhatsApp API configuration.",
  "Usa nombres y conversaciones ficticias en la demo.":
    "Use fictional names and conversations in the demo.",
  "Prueba la toma humana y comprueba que el asistente quede pausado.":
    "Try human takeover and confirm that the assistant is paused.",
  "Mueve un contacto entre Nuevo, En atención y Calificado.":
    "Move a contact between New, Being handled, and Qualified.",
  "Crea una tarea y revisa su fecha de seguimiento.":
    "Create a task and review its follow-up date.",
  "No pegues información clínica, bancaria ni sensible.":
    "Do not paste clinical, banking, or sensitive information.",
  "Explorar paso a paso es la forma más clara de ver qué hace ETC hoy y qué requiere configuración.":
    "Exploring step by step is the clearest way to see what ETC does today and what requires configuration.",
  "Todo sobre ETC, WhatsApp y Meta": "Everything about ETC, WhatsApp, and Meta",
  "Distingue la demo simulada de la conexión oficial que cada negocio debe configurar.":
    "Distinguish the simulated demo from the official connection each business must configure.",
  "Leer la guía": "Read the guide",
  "La demo no envía mensajes. Esta guía explica qué está preparado, qué falta y dónde intervienen tus credenciales.":
    "The demo does not send messages. This guide explains what is prepared, what is missing, and where your credentials are involved.",
  "La experiencia pública de ETC usa conversaciones ficticias y un token de demo limitado a su workspace. Puedes probar mensajes, copiloto y cambios de pipeline sin contactar a una persona real ni a un número de WhatsApp.":
    "ETC's public experience uses fictional conversations and a demo token limited to its workspace. You can try messages, the copilot, and pipeline changes without contacting a real person or WhatsApp number.",
  "El adaptador de `/api/etc/whatsapp/webhook` está preparado para la validación de Meta, mensajes inbound, deduplicación y estados outbound. Sin las variables completas y una versión Graph válida, permanece bloqueado y no acepta entradas.":
    "The `/api/etc/whatsapp/webhook` adapter is prepared for Meta validation, inbound messages, deduplication, and outbound statuses. Without complete variables and a valid Graph version, it remains blocked and accepts no events.",
  "La operación real exige un espacio privado autenticado, credenciales protegidas, vinculación del número y cumplimiento de los requisitos y políticas de Meta. ETC no implica afiliación, certificación ni soporte de Meta.":
    "Real operations require an authenticated private space, protected credentials, number linking, and compliance with Meta requirements and policies. ETC does not imply Meta affiliation, certification, or support.",
  "El webhook verifica la firma HMAC sobre el cuerpo crudo. También descarta timestamps inválidos o futuros, evita retrocesos de `last_inbound_at` y actualiza estados salientes solo cuando existe un mensaje con hash externo y workspace coincidente.":
    "The webhook verifies the HMAC signature over the raw body. It also discards invalid or future timestamps, prevents `last_inbound_at` regressions, and updates outbound statuses only when a message with an external hash and matching workspace exists.",
  "En producción no hay IA automática declarada en el webhook. La primera operación real es humana o de copiloto: una persona revisa la sugerencia, pausa el asistente cuando corresponde y decide qué mensaje enviar.":
    "There is no declared automatic AI in the production webhook. The first real operation is human or copilot-assisted: a person reviews the suggestion, pauses the assistant when appropriate, and decides what message to send.",
  "La ventana de conversación y las reservas de mensajes tienen reglas de idempotencia. Un `clientId` repetido con el mismo payload devuelve el mensaje existente; un payload diferente recibe conflicto en vez de duplicarse.":
    "The conversation window and message reservations have idempotency rules. A repeated `clientId` with the same payload returns the existing message; a different payload receives a conflict instead of duplicating.",
  "Antes de activar un número, prepara aviso de privacidad, responsables, finalidades, permisos, conservación y atención de derechos. La demo y esta guía no sustituyen la documentación legal ni la revisión de Meta.":
    "Before activating a number, prepare a privacy notice, owners, purposes, permissions, retention, and rights handling. The demo and this guide do not replace legal documentation or Meta review.",
  "Mantén la demo separada de cualquier teléfono real.":
    "Keep the demo separate from any real phone.",
  "Configura y protege las credenciales en el servidor; nunca en el navegador.":
    "Configure and protect credentials on the server; never in the browser.",
  "Valida `WA_GRAPH_API_VERSION` con el formato `vN.0`.":
    "Validate `WA_GRAPH_API_VERSION` with the `vN.0` format.",
  "Configura el secreto de firma HMAC y prueba el webhook con payload controlado.":
    "Configure the HMAC signing secret and test the webhook with a controlled payload.",
  "Confirma que la conexión aparezca activa antes de publicar mensajes.":
    "Confirm that the connection appears active before publishing messages.",
  "Si aún no tienes credenciales y número vinculado, usa la demo como simulación honesta y no como evidencia de conexión productiva.":
    "If you do not yet have credentials and a linked number, use the demo as an honest simulation, not as evidence of a production connection.",
  "Referencia API": "API reference",
  "Rutas REST actuales, autenticación por workspace y ejemplos curl sin secretos reales.":
    "Current REST routes, workspace authentication, and curl examples without real secrets.",
  "Ver referencia": "View reference",
  'Contrato REST directo en `/api/etc`: JSON sin envoltura `data`, errores como `{"error":"..."}` y scope por workspace.':
    'Direct REST contract at `/api/etc`: JSON without a `data` wrapper, errors such as `{"error":"..."}`, and workspace scoping.',
  "Todas las rutas privadas requieren una sesión OAuth válida o un token de demo en `Authorization: Bearer <TOKEN>`. Además envían `X-ETC-Intent: workspace`; el token de demo solo permite leer y modificar su instancia ficticia.":
    "All private routes require a valid OAuth session or a demo token in `Authorization: Bearer <TOKEN>`. They also send `X-ETC-Intent: workspace`; a demo token can only read and modify its fictional instance.",
  'Crea una demo con `POST /api/etc/demo` y un body opcional como `{"segment":"inmobiliaria"}`. La respuesta entrega un token temporal; el TTL documentado es de ocho horas y cada demo parte aislada.':
    'Create a demo with `POST /api/etc/demo` and an optional body such as `{"segment":"inmobiliaria"}`. The response returns a temporary token; the documented TTL is eight hours and each demo starts isolated.',
  "Para leer el espacio usa `GET /session`, `GET /stats`, `GET /contacts`, `GET /conversations`, `GET /knowledge` y `GET /tasks`. Las conversaciones individuales se leen con `GET /conversations/:id` y devuelven historial junto a la conversación.":
    "To read the workspace use `GET /session`, `GET /stats`, `GET /contacts`, `GET /conversations`, `GET /knowledge`, and `GET /tasks`. Individual conversations are read with `GET /conversations/:id` and return history alongside the conversation.",
  "Los cambios operativos usan `POST /contacts`, `PATCH /contacts/:id`, `PATCH /conversations/:id`, `POST /conversations/:id/messages`, `POST /conversations/:id/suggest`, además de los endpoints CRUD de knowledge y tasks descritos en el contrato.":
    "Operational changes use `POST /contacts`, `PATCH /contacts/:id`, `PATCH /conversations/:id`, `POST /conversations/:id/messages`, `POST /conversations/:id/suggest`, plus the knowledge and task CRUD endpoints described in the contract.",
  "`GET /contacts/export` devuelve un CSV utilizable. Sheets y Airtable se pueden trabajar mediante exportación o importación manual de archivos CSV; no hay conectores nativos activos en este MVP.":
    "`GET /contacts/export` returns a usable CSV. Sheets and Airtable can be handled through manual CSV export or import; there are no active native connectors in this MVP.",
  "`GET /connection` expone únicamente estado, faltantes, workspace y ruta de webhook; nunca devuelve secretos. El webhook es `/api/etc/whatsapp/webhook` y necesita credenciales y validación antes de aceptar eventos.":
    "`GET /connection` exposes only status, missing items, workspace, and webhook path; it never returns secrets. The webhook is `/api/etc/whatsapp/webhook` and needs credentials and validation before accepting events.",
  "Trata las respuestas de IA como sugerencias revisables. El endpoint `suggest` no envía ni persiste una respuesta saliente; el endpoint `simulate` es exclusivo de demo y nunca llama ni envía a Meta.":
    "Treat AI responses as reviewable suggestions. The `suggest` endpoint does not send or persist an outbound response; the `simulate` endpoint is demo-only and never calls or sends to Meta.",
  "Usa placeholders como `<TOKEN>` y `<CONVERSATION_ID>`; nunca pegues secretos reales en documentación o frontend.":
    "Use placeholders such as `<TOKEN>` and `<CONVERSATION_ID>`; never paste real secrets into documentation or the frontend.",
  "Incluye `X-ETC-Intent: workspace` en las llamadas privadas.":
    "Include `X-ETC-Intent: workspace` in private calls.",
  "Comprueba HTTP y cuerpo JSON antes de asumir éxito.":
    "Check the HTTP status and JSON body before assuming success.",
  "Genera `clientId` estable para reintentos idempotentes de mensajes.":
    "Generate a stable `clientId` for idempotent message retries.",
  "Mantén la operación de WhatsApp desactivada hasta configurar credenciales y versión Graph.":
    "Keep WhatsApp operations disabled until credentials and a Graph version are configured.",
  "Crear una demo": "Create a demo",
  "La respuesta incluye un token de demo temporal. Sustituye el dominio de ejemplo por tu origen y conserva el token fuera del código público.":
    "The response includes a temporary demo token. Replace the example domain with your origin and keep the token out of public code.",
  "Listar contactos": "List contacts",
  "`<TOKEN>` es un placeholder; no es una credencial de ETC.":
    "`<TOKEN>` is a placeholder; it is not an ETC credential.",
  "Consultar conexión": "Check connection",
  "Devuelve estado y faltantes sin exponer secretos. La ruta del webhook actual es `/api/etc/whatsapp/webhook`.":
    "Returns status and missing items without exposing secrets. The current webhook path is `/api/etc/whatsapp/webhook`.",
  "Para cambios de contrato, consulta `docs/API-CONTRACT.md` junto con los tipos en `shared/etc/types.ts` antes de integrar.":
    "For contract changes, consult `docs/API-CONTRACT.md` together with the types in `shared/etc/types.ts` before integrating.",
  "Plataforma de agentes": "Agent platform",
  "Qué puede hacer el copiloto, qué conocimiento usa y dónde decide el equipo.":
    "What the copilot can do, what knowledge it uses, and where the team decides.",
  "Entender el modelo": "Understand the model",
  "ETC plantea la IA como copiloto supervisado: aporta contexto y borradores, mientras la operación conserva una decisión humana.":
    "ETC frames AI as a supervised copilot: it provides context and drafts while operations retain a human decision.",
  "Una sugerencia manual se solicita desde una conversación abierta. El endpoint devuelve texto, modo, razón opcional y saldo de IA; no envía ni persiste la respuesta saliente.":
    "A manual suggestion is requested from an open conversation. The endpoint returns text, mode, an optional reason, and remaining AI balance; it does not send or persist the outbound response.",
  "El contenido aprobado es editable por el propietario. Las entradas nuevas pueden mantenerse como borrador hasta que alguien confirme horarios, requisitos, políticas o cualquier dato que el negocio quiera usar como contexto.":
    "Approved content is editable by the owner. New entries can remain drafts until someone confirms hours, requirements, policies, or any information the business wants to use as context.",
  "La toma humana es una frontera explícita: al intervenir, la conversación puede quedar pausada para que el equipo responda y revise la situación. Cerrar una conversación también fija `aiPaused=true`.":
    "Human takeover is an explicit boundary: when someone intervenes, the conversation can be paused so the team can respond and review the situation. Closing a conversation also sets `aiPaused=true`.",
  "La demo puede simular la llegada de un cliente y, si el espacio ficticio lo permite, devolver una sugerencia. Esa asistencia pertenece al escenario de prueba y no demuestra que el webhook real responda autónomamente.":
    "The demo can simulate a customer arrival and, when the fictional workspace allows it, return a suggestion. That assistance belongs to the test scenario and does not show that the real webhook responds autonomously.",
  "Las respuestas de un modelo pueden ser incompletas o equivocadas. Para finanzas, crédito, inversión, medicina y otros casos sensibles, ETC solo ofrece operaciones de seguimiento y no asesoría profesional.":
    "Model responses can be incomplete or wrong. For finance, credit, investment, medicine, and other sensitive cases, ETC only offers follow-up operations and not professional advice.",
  "Diseña el conocimiento como pequeñas reglas revisables: qué sí responder, qué pedir a una persona y qué nunca afirmar. La claridad del contexto es más valiosa que una automatización que no puedas auditar.":
    "Design knowledge as small, reviewable rules: what to answer, what to hand to a person, and what never to claim. Clear context is more valuable than automation you cannot audit.",
  "Revisa y aprueba el conocimiento antes de usarlo como contexto.":
    "Review and approve knowledge before using it as context.",
  "Presenta cada texto generado como borrador, no como respuesta enviada.":
    "Present every generated text as a draft, not a sent response.",
  "Pausa el asistente cuando entra una persona o existe una excepción.":
    "Pause the assistant when a person steps in or an exception exists.",
  "Define temas que siempre requieren revisión humana.":
    "Define topics that always require human review.",
  "No prometas autonomía, resúmenes automáticos ni acciones CRM no implementadas.":
    "Do not promise autonomy, automatic summaries, or unimplemented CRM actions.",
  "Un buen agente en ETC sabe cuándo sugerir y cuándo dejar espacio para la atención humana.":
    "A good ETC agent knows when to suggest and when to leave room for human attention.",
  Integraciones: "Integrations",
  "Estado real de WhatsApp, CSV y conectores que todavía quedan por configurar.":
    "The real status of WhatsApp, CSV, and connectors that still need configuration.",
  "Ver estado": "View status",
  "La integración principal preparada es la API oficial de WhatsApp; el resto se organiza con exportaciones claras y límites honestos.":
    "The main prepared integration is the official WhatsApp API; the rest is organized through clear exports and honest limits.",
  "Dentro de ETC ya viven contactos, conversaciones, etapas, conocimiento y tareas. Para el alcance actual no necesitas conectar otro CRM para usar el núcleo operativo.":
    "Contacts, conversations, stages, knowledge, and tasks already live inside ETC. For the current scope you do not need to connect another CRM to use the operational core.",
  "La exportación `GET /api/etc/contacts/export` genera un CSV. Es un camino funcional para respaldar contactos o moverlos manualmente a una hoja de cálculo, con la revisión que cada negocio necesite.":
    "The `GET /api/etc/contacts/export` export generates a CSV. It is a functional path to back up contacts or move them manually to a spreadsheet, with whatever review each business needs.",
  "Sheets y Airtable pueden recibir o entregar archivos CSV mediante un proceso manual. No los presentamos como integraciones nativas, sincronizaciones en tiempo real o conectores ya implementados.":
    "Sheets and Airtable can receive or provide CSV files through a manual process. We do not present them as native integrations, real-time syncs, or implemented connectors.",
  "WhatsApp usa un adaptador de webhook preparado, con validación Meta, HMAC y deduplicación. Requiere credenciales del negocio, una versión Graph válida y configuración del número antes de activarse.":
    "WhatsApp uses a prepared webhook adapter with Meta validation, HMAC, and deduplication. It requires business credentials, a valid Graph version, and number configuration before activation.",
  "El estado de conexión se consulta desde `GET /api/etc/connection`. El endpoint devuelve faltantes y ruta de webhook sin devolver secretos; cualquier faltante bloquea la publicación.":
    "Connection status is checked through `GET /api/etc/connection`. The endpoint returns missing items and webhook path without returning secrets; any missing item blocks publication.",
  "HubSpot, Salesforce y otros conectores nativos no forman parte de este MVP. Si una alianza o cliente los necesita, deben evaluarse y marcarse como por configurar, no como una capacidad disponible hoy.":
    "HubSpot, Salesforce, and other native connectors are not part of this MVP. If a partner or client needs them, they must be evaluated and marked as to be configured, not as a capability available today.",
  "Una integración responsable empieza con un dueño, un alcance de datos, permisos, retención, manejo de errores y una salida manual. Es preferible un CSV trazable a una sincronización que nadie pueda revisar.":
    "A responsible integration starts with an owner, data scope, permissions, retention, error handling, and a manual exit. A traceable CSV is preferable to a sync nobody can review.",
  "Usa CSV cuando necesites mover datos a Sheets o Airtable.":
    "Use CSV when you need to move data to Sheets or Airtable.",
  "Verifica el estado de conexión antes de hablar de WhatsApp activo.":
    "Verify connection status before talking about WhatsApp being active.",
  "Nunca muestres secretos ni tokens en la interfaz pública.":
    "Never show secrets or tokens in the public interface.",
  "Documenta responsable, campos y frecuencia de cada intercambio manual.":
    "Document the owner, fields, and frequency of each manual exchange.",
  "Marca los conectores futuros como ‘por configurar / no implementado’.":
    "Mark future connectors as ‘to be configured / not implemented’.",
  "ETC prioriza un núcleo operativo comprobable antes de sumar conectores que añadan dependencia o ruido.":
    "ETC prioritizes a verifiable operational core before adding connectors that add dependency or noise.",
  "Construye nuevas alianzas y clientes con ETC":
    "Build new partnerships and clients with ETC",
  "Una guía para presentar ETC con alcance claro, pilotos verificables y conversaciones honestas.":
    "A guide to presenting ETC with clear scope, verifiable pilots, and honest conversations.",
  "Una alianza sana no necesita inflar el producto: muestra la demo, define el problema y acuerda qué se puede validar.":
    "A healthy partnership does not need to inflate the product: show the demo, define the problem, and agree on what can be validated.",
  "Presenta ETC como un frontdesk y CRM operativo para PyMEs mexicanas que necesitan ordenar conversaciones de WhatsApp, contactos, pipeline y seguimientos. Evita describirlo como una plataforma autónoma que decide por el negocio.":
    "Present ETC as an operational front desk and CRM for Mexican small businesses that need to organize WhatsApp conversations, contacts, pipeline, and follow-ups. Avoid describing it as an autonomous platform that decides for the business.",
  "Usa la demo para enseñar la secuencia completa: una conversación ficticia entra, el copiloto propone un borrador, una persona toma el control y el contacto avanza de etapa con una siguiente acción.":
    "Use the demo to show the full sequence: a fictional conversation arrives, the copilot proposes a draft, a person takes control, and the contact advances stages with a next action.",
  "Antes de un piloto, acuerda segmento, número de usuarios, conocimiento aprobado, responsables y criterios de revisión. No prometas tiempos de configuración garantizados ni resultados comerciales que aún no hayan sido validados.":
    "Before a pilot, agree on segment, number of users, approved knowledge, owners, and review criteria. Do not promise guaranteed setup times or commercial results that have not yet been validated.",
  "Para sectores financieros o médicos, limita la propuesta a operaciones, seguimiento y coordinación. La IA no ofrece consejo financiero, crediticio, de inversión ni médico y no sustituye profesionales.":
    "For financial or medical sectors, limit the proposal to operations, follow-up, and coordination. AI does not offer financial, credit, investment, or medical advice and does not replace professionals.",
  "Define qué datos se usarán, dónde se guardan, quién puede acceder y cómo se atienden solicitudes. La demo no debe recibir datos reales, clínicos, bancarios ni sensibles.":
    "Define what data will be used, where it is stored, who can access it, and how requests are handled. The demo must not receive real, clinical, banking, or sensitive data.",
  "Las integraciones se presentan con su estado real: WhatsApp requiere credenciales y activación; CSV funciona; Sheets, Airtable y conectores CRM se manejan manualmente o quedan por configurar según el caso.":
    "Present integrations with their real status: WhatsApp requires credentials and activation; CSV works; Sheets, Airtable, and CRM connectors are handled manually or remain to be configured depending on the case.",
  "Si buscas colaboración comercial, el siguiente paso es conversar con KarmaByte Society sobre un piloto delimitado. La marca de ETC no implica afiliación con Meta ni con otras plataformas.":
    "If you are looking for commercial collaboration, the next step is to talk with KarmaByte Society about a scoped pilot. The ETC brand does not imply affiliation with Meta or other platforms.",
  "Lleva un caso de uso acotado y una métrica verificable.":
    "Bring a scoped use case and a verifiable metric.",
  "Aclara qué es demo, qué funciona hoy y qué requiere configuración.":
    "Clarify what is demo, what works today, and what requires configuration.",
  "Obtén consentimiento y evita datos sensibles durante la exploración.":
    "Obtain consent and avoid sensitive data during exploration.",
  "Deja por escrito responsables, alcance, permisos y salida del piloto.":
    "Put owners, scope, permissions, and pilot exit in writing.",
  "Contacta a KarmaByte Society para una conversación de alianza, no para un formulario ficticio.":
    "Contact KarmaByte Society for a partnership conversation, not a fictional contact form.",
  "Una alianza que respeta los límites del producto construye confianza antes que una promesa difícil de sostener.":
    "A partnership that respects product limits builds trust before making a promise that is hard to sustain.",
  "Navegación de recursos": "Resource navigation",
  "Todas las guías": "All guides",
  "KarmaByte Society": "KarmaByte Society",
  "Herramientas claras.": "Clear tools.",
  "Decisiones con contexto.": "Contextual decisions.",
  "Guías breves para explorar ETC, entender la conexión de WhatsApp, consultar el API y presentar el producto con alcance real.":
    "Short guides to explore ETC, understand the WhatsApp connection, consult the API, and present the product with real scope.",
  "borrador sugerido": "suggested draft",
  "revisión humana": "human review",
  "contexto aprobado": "approved context",
  "siguiente paso": "next step",
  "Checklist para llevarlo a la práctica": "Practical checklist",
  "Ejemplos curl": "curl examples",
  "LECTURA RELACIONADA": "RELATED READING",
  "Vuelve a la demo para probar el recorrido con datos ficticios y sin conectar tu número.":
    "Return to the demo to try the flow with fictional data and without connecting your number.",
  "Volver a recursos": "Back to resources",
  "Volver a ETC": "Back to ETC",
  "Recurso no encontrado": "Resource not found",
  "Esta guía no existe.": "This guide does not exist.",
  "Revisa la ruta o vuelve al índice de recursos.":
    "Check the route or return to the resources index.",
  "Ver todas las guías": "View all guides",
};

export const RESOURCES_EN = RESOURCE_EN;
