# ETC - EveryThingCounts

Ruta A aprobada por el usuario: demo administrada, adaptando elementos del CRM open source y conservando atribuciones. No es un fork íntegro ni un despliegue del stack original. Se conservan su modelo de bandeja, pipeline, perfil/conocimiento del agente, ventana de WhatsApp y handoff humano; las conexiones se adaptan al backend administrado. Fuente autorizada: https://github.com/kevinrivm/vocero-crm. No copiar marcas ni textos propietarios de otros productos.

## Producto y funcionamiento

Landing pública original en español, con CTA a una demo operativa y a un espacio privado. Frontdesk con resumen, bandeja de tres paneles, mensajes y estados, pipeline, contactos, conocimiento, seguimiento y ajustes del negocio. El backend almacena todos los cambios en MySQL administrado. La demo usa una sesión real de demostración con identificador opaco y datos ficticios aislados por visitante; no es un bypass de autenticación del espacio privado. El espacio privado requiere una cuenta propia por email/contraseña u OAuth, pertenece al usuario autenticado y comienza sin conversaciones reales inventadas. El copiloto usa el servicio de IA real del proyecto, contenido autorizado, presupuesto limitado, límites de solicitudes y fallback explícito. La toma de conversación desactiva el envío automático del agente. No se enviarán mensajes a WhatsApp real en la demo.

Conexión real preparada mediante Cloud API: env privadas, vinculación explícita al espacio del cliente, validación HMAC, ventana de 24h y controles de consentimiento; desactivada por defecto y pendiente de credenciales del negocio. No se solicitarán ahora valores opcionales que bloqueen la publicación de la demo. No se incluyen campañas masivas, cobros ni promesas de SLA. Las métricas de la demo serán conteos de su base ficticia, no resultados comerciales.

## Arquitectura y carpetas

- `client/src/pages/etc/`: landing y páginas del CRM.
- `client/src/components/etc/`: identidad y componentes compartidos.
- `server/etc/`: API REST, scoping/autorización, persistencia, IA y adaptador WhatsApp.
- `shared/etc/`: contratos de datos y reglas reutilizadas/adaptadas con licencia MIT.
- `drizzle/`: esquema y migraciones aditivas.
- `docs/`: operación, adaptación por cliente, conexión real y procedencia open source.

Frontend React/TypeScript y backend Express en el proyecto administrado. Base MySQL, sesiones propias opacas y OAuth existentes, IA por API y sin servicios externos de CRM. Mantener las integraciones existentes del starter para publicación y autenticación. El modo privado y el demo nunca comparten registros.

## Diseño

Referencia visual y paleta explícitamente elegidas por el usuario. Azul #1B4079 como identidad; #4D7C8A como secundario; #7F9C96 y #8FAD88 para estados; #CBDF90 para CTA y acentos. Fondo claro ligeramente cálido, contraste suficiente y azules oscuros en sidebar/hero. Landing editorial con tipografía dominante, detalles de terminal y vista de producto, no imágenes decorativas. CRM utilitario con sidebar compacto, área de trabajo amplia y bandeja de tres paneles; en móvil navegación desplegable y paneles alternados, no tablas aplastadas.

El CSS público de la referencia tipográfica usa JetBrains Mono; usaremos esa familia libre, no su fuente propietaria de logo. JetBrains Mono para títulos, cuerpo, cifras y etiquetas con pesos diferenciados. Identidad propia: monograma ETC entre esquinas abiertas y punto de estado, sin copiar logotipos. Firma cromática: azul profundo con acento lima; personalidad: precisa, cercana, tranquila. Voz: «Cada conversación cuenta.» y «La IA ayuda. Tu equipo decide.». Animaciones discretas, estados de carga visibles, errores recuperables y respeto de reduced-motion.

## Entrega

Demo usable en Preview y versión guardada; publicación solicitada por el usuario con el flujo de confirmación que requiera la plataforma. GitHub privado mediante el flujo autorizado de conexión del proyecto. Conservar licencia MIT y procedencia de las piezas adaptadas; no incluir secretos, PDFs de investigación ni nombres o dominios excluidos. Documentar qué está implementado y qué necesita credenciales/configuración por cliente. No afirmar conexión de WhatsApp real o publicación hasta confirmación efectiva.

## Ampliación solicitada el 27 de octubre

El usuario solicita acceso propio por email y contraseña, control de mostrar/ocultar contraseña, recuperación por correo, modos claro/oscuro y español/inglés. Se conservará OAuth como acceso alternativo a espacios existentes, sin vincular cuentas automáticamente por coincidencia de email. Las cuentas propias usarán hashes de contraseña scrypt con sal y sesiones opacas almacenadas por hash; nunca se devolverá una contraseña ni se enviará por correo. «¿Olvidaste tu contraseña?» enviará un enlace de restablecimiento de un solo uso y vencimiento corto cuando esté configurado el proveedor de correo. La selección de proveedor de email está pendiente de respuesta; no simular entrega.

La barra lateral incorporará Consultas IA. El agente sólo tratará operación del segmento configurado en ese espacio, con subtipo de negocio para PYMES. Se agregan Servicios financieros y PYMES a ajustes, plantillas y landing; PYMES incluye consultorios dentales, médicos, veterinarios, estéticas, barberías, fondas, restaurantes, cafeterías y otros negocios locales. Las consultas no son asesoría clínica, veterinaria, crediticia ni de inversión y no ejecutan acciones financieras. El historial estará separado por espacio, segmento y subtipo, con límites de uso y errores visibles.

Ajustes incorporará proveedor, modelo y clave API del cliente. El servicio administrado actual seguirá siendo la opción inicial. Las claves propias sólo podrán guardarse por el propietario autenticado, cifradas AES-256-GCM con una clave maestra independiente server-side; no estarán disponibles en la demo pública ni se devolverán al navegador. OpenAI, Gemini y Anthropic utilizarán hosts oficiales fijos y transporte correspondiente; no se aceptarán URLs arbitrarias. El cambio a un proveedor propio requiere elección explícita y no enviará datos a otro proveedor silenciosamente ante un error.

Se añaden controles persistentes de tema e idioma en landing, login y frontdesk. La interfaz se traduce, no las notas o datos ingresados por usuarios. Se conserva la paleta y JetBrains Mono. El pie llevará «Hecho por» con enlace a https://www.karmabytesociety.com y los símbolos de marca de redes con los enlaces aportados; enlaces rotos no se presentarán como perfiles verificados. Se mantendrán responsive, drag and drop y el aislamiento del MVP. Código modular: auth propia en `server/etc/auth/`, proveedores y consultas separados, contextos globales de idioma/tema y páginas de acceso específicas.

### Animaciones y recursos solicitados

La landing añadirá microanimaciones originales de interfaz inspiradas sólo en el comportamiento de las referencias: aparición de conversaciones, indicador de escritura, asistencia y transferencia humana. No se copiarán las imágenes o GIF que incluyan marcas ajenas. Se mantendrá texto legible, adaptación responsive, reproducción automática sin controles visibles y `prefers-reduced-motion`; las demostraciones visuales no harán llamadas reales ni prometerán acciones todavía no implementadas.

La sección «Comienza con herramientas y guías» enlazará recursos funcionales propios: Primeros pasos, Todo sobre ETC/WhatsApp/Meta, Referencia de la API, Plataforma de agentes, Integraciones y Alianzas. Se incluirá una página índice y una por recurso, bilingües y con contenido HTML público. Las capacidades actuales (CRM interno, CSV, copiloto y consultas) se diferenciarán de la conexión Cloud API pendiente de credenciales y de conectores futuros. La referencia de marca en el texto de ejemplo se adapta exclusivamente a ETC, conservando la prohibición de identidad anterior.

El usuario precisa que las animaciones deben funcionar automáticamente y sin botones de pausa, movimiento o repetición. Esta preferencia reemplaza los controles visibles propuestos: las animaciones se reproducirán en bucle mientras la sección esté visible, sin controles adicionales, manteniendo el respeto a `prefers-reduced-motion` del dispositivo y pausando procesamiento fuera de viewport sin intervención del usuario.
