export type ResourceKind = "Guía" | "Referencia" | "Mapa" | "Nota";

export type ResourceCodeSample = {
  title: string;
  code: string;
  note: string;
};

export type ResourceGuide = {
  intro: string;
  paragraphs: readonly string[];
  checklist: readonly string[];
  codeSamples?: readonly ResourceCodeSample[];
  closing: string;
};

export type Resource = {
  slug: string;
  code: string;
  kind: ResourceKind;
  title: string;
  summary: string;
  href: string;
  cta: string;
  external?: boolean;
  guide: ResourceGuide;
};

const sharedApiHeaders = `-H 'Authorization: Bearer <TOKEN>' \\
-H 'X-ETC-Intent: workspace' \\
-H 'Accept: application/json'`;

export const resources: readonly Resource[] = [
  {
    slug: "primeros-pasos",
    code: "01",
    kind: "Guía",
    title: "Primeros pasos",
    summary:
      "Explora ETC paso a paso: demo, bandeja, contactos y siguiente acción.",
    href: "/recursos/primeros-pasos",
    cta: "Abrir guía",
    guide: {
      intro:
        "Una ruta corta para entender ETC sin conectar un número ni cargar información real.",
      paragraphs: [
        "ETC es un frontdesk y CRM de WhatsApp + IA para PyMEs mexicanas. La demo crea un espacio ficticio aislado por visitante; sirve para explorar la operación, no para contactar a personas reales.",
        "Empieza en la demo y elige un segmento de ejemplo. Encontrarás conversaciones, contactos y etapas precargadas para que puedas observar el recorrido de un prospecto sin preparar una cuenta de producción.",
        "En la bandeja, abre una conversación y revisa el historial junto al contacto. La toma humana pausa al asistente de forma durable; el equipo conserva el contexto antes de decidir qué responder.",
        "El copiloto puede proponer un borrador manual usando el conocimiento aprobado del espacio. El borrador se revisa antes de enviarse y no representa una respuesta autónoma ni una promesa de precisión.",
        "Desde Contactos puedes crear y editar registros, ajustar etapa, prioridad, etiquetas, notas y consentimiento. Pipeline es una vista operativa de esos cambios, no un flujo autónomo de ventas.",
        "Las tareas ayudan a dejar un seguimiento con fecha y, cuando haga falta, un contacto relacionado. La demo conserva los cambios en su espacio ficticio y tiene límites explícitos para proteger la experiencia.",
        "Cuando termines, vuelve a la landing o abre Privacidad y alcance. Para operación real se necesita un espacio privado, contenido aprobado, responsables definidos y la configuración de la API oficial de WhatsApp.",
      ],
      checklist: [
        "Usa nombres y conversaciones ficticias en la demo.",
        "Prueba la toma humana y comprueba que el asistente quede pausado.",
        "Mueve un contacto entre Nuevo, En atención y Calificado.",
        "Crea una tarea y revisa su fecha de seguimiento.",
        "No pegues información clínica, bancaria ni sensible.",
      ],
      closing:
        "Explorar paso a paso es la forma más clara de ver qué hace ETC hoy y qué requiere configuración.",
    },
  },
  {
    slug: "whatsapp-meta",
    code: "02",
    kind: "Guía",
    title: "Todo sobre ETC, WhatsApp y Meta",
    summary:
      "Distingue la demo simulada de la conexión oficial que cada negocio debe configurar.",
    href: "/recursos/whatsapp-meta",
    cta: "Leer la guía",
    guide: {
      intro:
        "La demo no envía mensajes. Esta guía explica qué está preparado, qué falta y dónde intervienen tus credenciales.",
      paragraphs: [
        "La experiencia pública de ETC usa conversaciones ficticias y un token de demo limitado a su workspace. Puedes probar mensajes, copiloto y cambios de pipeline sin contactar a una persona real ni a un número de WhatsApp.",
        "El adaptador de `/api/etc/whatsapp/webhook` está preparado para la validación de Meta, mensajes inbound, deduplicación y estados outbound. Sin las variables completas y una versión Graph válida, permanece bloqueado y no acepta entradas.",
        "La operación real exige un espacio privado autenticado, credenciales protegidas, vinculación del número y cumplimiento de los requisitos y políticas de Meta. ETC no implica afiliación, certificación ni soporte de Meta.",
        "El webhook verifica la firma HMAC sobre el cuerpo crudo. También descarta timestamps inválidos o futuros, evita retrocesos de `last_inbound_at` y actualiza estados salientes solo cuando existe un mensaje con hash externo y workspace coincidente.",
        "En producción no hay IA automática declarada en el webhook. La primera operación real es humana o de copiloto: una persona revisa la sugerencia, pausa el asistente cuando corresponde y decide qué mensaje enviar.",
        "La ventana de conversación y las reservas de mensajes tienen reglas de idempotencia. Un `clientId` repetido con el mismo payload devuelve el mensaje existente; un payload diferente recibe conflicto en vez de duplicarse.",
        "Antes de activar un número, prepara aviso de privacidad, responsables, finalidades, permisos, conservación y atención de derechos. La demo y esta guía no sustituyen la documentación legal ni la revisión de Meta.",
      ],
      checklist: [
        "Mantén la demo separada de cualquier teléfono real.",
        "Configura y protege las credenciales en el servidor; nunca en el navegador.",
        "Valida `WA_GRAPH_API_VERSION` con el formato `vN.0`.",
        "Configura el secreto de firma HMAC y prueba el webhook con payload controlado.",
        "Confirma que la conexión aparezca activa antes de publicar mensajes.",
      ],
      closing:
        "Si aún no tienes credenciales y número vinculado, usa la demo como simulación honesta y no como evidencia de conexión productiva.",
    },
  },
  {
    slug: "api",
    code: "03",
    kind: "Referencia",
    title: "Referencia API",
    summary:
      "Rutas REST actuales, autenticación por workspace y ejemplos curl sin secretos reales.",
    href: "/recursos/api",
    cta: "Ver referencia",
    guide: {
      intro:
        'Contrato REST directo en `/api/etc`: JSON sin envoltura `data`, errores como `{"error":"..."}` y scope por workspace.',
      paragraphs: [
        "Las rutas privadas aceptan la sesión propia creada con email y contraseña, una sesión OAuth válida o el token de demo. Usa `Authorization: Bearer <TOKEN>` y `X-ETC-Intent: workspace`; cada credencial limita el acceso a su espacio y la demo sólo permite datos ficticios.",
        'Crea una demo con `POST /api/etc/demo` y un body opcional como `{"segment":"inmobiliaria"}`. La respuesta entrega un token temporal; el TTL documentado es de ocho horas y cada demo parte aislada.',
        "Para leer el espacio usa `GET /session`, `GET /stats`, `GET /contacts`, `GET /conversations`, `GET /knowledge` y `GET /tasks`. Las conversaciones individuales se leen con `GET /conversations/:id` y devuelven historial junto a la conversación.",
        "Los cambios operativos usan `POST /contacts`, `PATCH /contacts/:id`, `PATCH /conversations/:id`, `POST /conversations/:id/messages`, `POST /conversations/:id/suggest`, además de los endpoints CRUD de knowledge y tasks descritos en el contrato.",
        "`GET /contacts/export` devuelve un CSV utilizable. Sheets y Airtable se pueden trabajar mediante exportación o importación manual de archivos CSV; no hay conectores nativos activos en este MVP.",
        "`GET /connection` expone únicamente estado, faltantes, workspace y ruta de webhook; nunca devuelve secretos. El webhook es `/api/etc/whatsapp/webhook` y necesita credenciales y validación antes de aceptar eventos.",
        "Trata las respuestas de IA como sugerencias revisables. El endpoint `suggest` no envía ni persiste una respuesta saliente; el endpoint `simulate` es exclusivo de demo y nunca llama ni envía a Meta.",
        "Consultas IA usa `GET /consultations` y `POST /consultations`, con segmento, subtipo PYMES, idioma y clientId. El propietario configura su modelo con `GET/PATCH /llm/config`, `POST /llm/test` y `DELETE /llm/config`; las claves requieren cifrado habilitado y no se pueden leer de vuelta.",
      ],
      checklist: [
        "Usa placeholders como `<TOKEN>` y `<CONVERSATION_ID>`; nunca pegues secretos reales en documentación o frontend.",
        "Incluye `X-ETC-Intent: workspace` en las llamadas privadas.",
        "Comprueba HTTP y cuerpo JSON antes de asumir éxito.",
        "Genera `clientId` estable para reintentos idempotentes de mensajes.",
        "Mantén la operación de WhatsApp desactivada hasta configurar credenciales y versión Graph.",
      ],
      codeSamples: [
        {
          title: "Crear una demo",
          code: `curl -X POST 'https://tu-dominio.example/api/etc/demo' \\
  -H 'Content-Type: application/json' \\
  -H 'X-ETC-Intent: workspace' \\
  -d '{"segment":"inmobiliaria"}'`,
          note: "La respuesta incluye un token de demo temporal. Sustituye el dominio de ejemplo por tu origen y conserva el token fuera del código público.",
        },
        {
          title: "Listar contactos",
          code: `curl 'https://tu-dominio.example/api/etc/contacts?search=ana' \\
  ${sharedApiHeaders}`,
          note: "`<TOKEN>` es un placeholder; no es una credencial de ETC.",
        },
        {
          title: "Consultar conexión",
          code: `curl 'https://tu-dominio.example/api/etc/connection' \\
  ${sharedApiHeaders}`,
          note: "Devuelve estado y faltantes sin exponer secretos. La ruta del webhook actual es `/api/etc/whatsapp/webhook`.",
        },
      ],
      closing:
        "Para cambios de contrato, consulta `docs/API-CONTRACT.md` junto con los tipos en `shared/etc/types.ts` antes de integrar.",
    },
  },
  {
    slug: "agentes",
    code: "04",
    kind: "Mapa",
    title: "Plataforma de agentes",
    summary:
      "Qué puede hacer el copiloto, qué conocimiento usa y dónde decide el equipo.",
    href: "/recursos/agentes",
    cta: "Entender el modelo",
    guide: {
      intro:
        "ETC plantea la IA como copiloto supervisado: aporta contexto y borradores, mientras la operación conserva una decisión humana.",
      paragraphs: [
        "El copiloto recibe el perfil vigente del workspace y el conocimiento aprobado para generar una sugerencia acotada. No es un agente general con permiso para operar todas las áreas del CRM.",
        "Una sugerencia manual se solicita desde una conversación abierta. El endpoint devuelve texto, modo, razón opcional y saldo de IA; no envía ni persiste la respuesta saliente.",
        "El contenido aprobado es editable por el propietario. Las entradas nuevas pueden mantenerse como borrador hasta que alguien confirme horarios, requisitos, políticas o cualquier dato que el negocio quiera usar como contexto.",
        "La toma humana es una frontera explícita: al intervenir, la conversación puede quedar pausada para que el equipo responda y revise la situación. Cerrar una conversación también fija `aiPaused=true`.",
        "La demo puede simular la llegada de un cliente y, si el espacio ficticio lo permite, devolver una sugerencia. Esa asistencia pertenece al escenario de prueba y no demuestra que el webhook real responda autónomamente.",
        "Las respuestas de un modelo pueden ser incompletas o equivocadas. Para finanzas, crédito, inversión, medicina y otros casos sensibles, ETC solo ofrece operaciones de seguimiento y no asesoría profesional.",
        "Diseña el conocimiento como pequeñas reglas revisables: qué sí responder, qué pedir a una persona y qué nunca afirmar. La claridad del contexto es más valiosa que una automatización que no puedas auditar.",
      ],
      checklist: [
        "Revisa y aprueba el conocimiento antes de usarlo como contexto.",
        "Presenta cada texto generado como borrador, no como respuesta enviada.",
        "Pausa el asistente cuando entra una persona o existe una excepción.",
        "Define temas que siempre requieren revisión humana.",
        "No prometas autonomía, resúmenes automáticos ni acciones CRM no implementadas.",
      ],
      closing:
        "Un buen agente en ETC sabe cuándo sugerir y cuándo dejar espacio para la atención humana.",
    },
  },
  {
    slug: "integraciones",
    code: "05",
    kind: "Nota",
    title: "Integraciones",
    summary:
      "Estado real de WhatsApp, CSV y conectores que todavía quedan por configurar.",
    href: "/recursos/integraciones",
    cta: "Ver estado",
    guide: {
      intro:
        "La integración principal preparada es la API oficial de WhatsApp; el resto se organiza con exportaciones claras y límites honestos.",
      paragraphs: [
        "Dentro de ETC ya viven contactos, conversaciones, etapas, conocimiento y tareas. Para el alcance actual no necesitas conectar otro CRM para usar el núcleo operativo.",
        "La exportación `GET /api/etc/contacts/export` genera un CSV. Es un camino funcional para respaldar contactos o moverlos manualmente a una hoja de cálculo, con la revisión que cada negocio necesite.",
        "Sheets y Airtable pueden recibir o entregar archivos CSV mediante un proceso manual. No los presentamos como integraciones nativas, sincronizaciones en tiempo real o conectores ya implementados.",
        "WhatsApp usa un adaptador de webhook preparado, con validación Meta, HMAC y deduplicación. Requiere credenciales del negocio, una versión Graph válida y configuración del número antes de activarse.",
        "El estado de conexión se consulta desde `GET /api/etc/connection`. El endpoint devuelve faltantes y ruta de webhook sin devolver secretos; cualquier faltante bloquea el envío real de mensajes, no la publicación de la demo.",
        "HubSpot, Salesforce y otros conectores nativos no forman parte de este MVP. Si una alianza o cliente los necesita, deben evaluarse y marcarse como por configurar, no como una capacidad disponible hoy.",
        "Una integración responsable empieza con un dueño, un alcance de datos, permisos, retención, manejo de errores y una salida manual. Es preferible un CSV trazable a una sincronización que nadie pueda revisar.",
      ],
      checklist: [
        "Usa CSV cuando necesites mover datos a Sheets o Airtable.",
        "Verifica el estado de conexión antes de hablar de WhatsApp activo.",
        "Nunca muestres secretos ni tokens en la interfaz pública.",
        "Documenta responsable, campos y frecuencia de cada intercambio manual.",
        "Marca los conectores futuros como ‘por configurar / no implementado’.",
      ],
      closing:
        "ETC prioriza un núcleo operativo comprobable antes de sumar conectores que añadan dependencia o ruido.",
    },
  },
  {
    slug: "alianzas",
    code: "06",
    kind: "Nota",
    title: "Construye nuevas alianzas y clientes con ETC",
    summary:
      "Una guía para presentar ETC con alcance claro, pilotos verificables y conversaciones honestas.",
    href: "/recursos/alianzas",
    cta: "Abrir guía",
    guide: {
      intro:
        "Una alianza sana no necesita inflar el producto: muestra la demo, define el problema y acuerda qué se puede validar.",
      paragraphs: [
        "Presenta ETC como un frontdesk y CRM operativo para PyMEs mexicanas que necesitan ordenar conversaciones de WhatsApp, contactos, pipeline y seguimientos. Evita describirlo como una plataforma autónoma que decide por el negocio.",
        "Usa la demo para enseñar la secuencia completa: una conversación ficticia entra, el copiloto propone un borrador, una persona toma el control y el contacto avanza de etapa con una siguiente acción.",
        "Antes de un piloto, acuerda segmento, número de usuarios, conocimiento aprobado, responsables y criterios de revisión. No prometas tiempos de configuración garantizados ni resultados comerciales que aún no hayan sido validados.",
        "Para sectores financieros o médicos, limita la propuesta a operaciones, seguimiento y coordinación. La IA no ofrece consejo financiero, crediticio, de inversión ni médico y no sustituye profesionales.",
        "Define qué datos se usarán, dónde se guardan, quién puede acceder y cómo se atienden solicitudes. La demo no debe recibir datos reales, clínicos, bancarios ni sensibles.",
        "Las integraciones se presentan con su estado real: WhatsApp requiere credenciales y activación; CSV funciona; Sheets, Airtable y conectores CRM se manejan manualmente o quedan por configurar según el caso.",
        "Si buscas colaboración comercial, el siguiente paso es conversar con KarmaByte Society sobre un piloto delimitado. La marca de ETC no implica afiliación con Meta ni con otras plataformas.",
      ],
      checklist: [
        "Lleva un caso de uso acotado y una métrica verificable.",
        "Aclara qué es demo, qué funciona hoy y qué requiere configuración.",
        "Obtén consentimiento y evita datos sensibles durante la exploración.",
        "Deja por escrito responsables, alcance, permisos y salida del piloto.",
        "Contacta a KarmaByte Society para una conversación de alianza, no para un formulario ficticio.",
      ],
      closing:
        "Una alianza que respeta los límites del producto construye confianza antes que una promesa difícil de sostener.",
    },
  },
];

export const RESOURCE_SLUGS = resources.map(resource => resource.slug);

export function getResource(slug?: string): Resource | undefined {
  return resources.find(resource => resource.slug === slug);
}
