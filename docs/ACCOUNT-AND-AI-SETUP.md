# Acceso propio y proveedores de IA

## Cuentas

`/login` permite email y contraseña; `/register` crea un espacio separado por cuenta. El acceso alternativo OAuth conserva los espacios existentes. No se vinculan automáticamente por email: un registro nuevo no toma posesión de los datos de una cuenta anterior. Las cuentas locales todavía no tienen un proceso de verificación de email; no deben presentarse como correos verificados.

`/forgot-password` solicita un enlace de restablecimiento, no la contraseña. El token dura 30 minutos, sólo se guarda por hash y se invalida al usarse; el cambio revoca las sesiones de la cuenta. El estado actual del proyecto se consulta en `/api/etc/auth/status`. El envío permanece deshabilitado si el proveedor de correo no está configurado; el formulario nunca afirma una entrega inexistente.

El administrador debe elegir `ETC_EMAIL_PROVIDER=resend` o `smtp`. Para Resend hacen falta `RESEND_API_KEY` y `ETC_EMAIL_FROM`, con un dominio/remitente verificado por el proveedor. Para SMTP hacen falta `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `ETC_EMAIL_FROM` y la configuración TLS documentada en `server/etc/auth/README.md`. El correo se envía únicamente a la dirección de la cuenta, no a una dirección arbitraria de la petición.

Configure `ETC_PUBLIC_ORIGIN` con el origen HTTPS publicado. La URL de recuperación sólo se construye desde ese origen o desde el Preview permitido en el servidor; no se confía en el Host o una URL de cualquier solicitante. No quite la lista de orígenes permitidos para hacer funcionar un dominio distinto: añada únicamente el dominio auténtico y controle la configuración.

## Proveedor propio por cliente

Ajustes permite la IA administrada inicial o un proveedor OpenAI, Gemini o Anthropic, con ID del modelo propio. Esas claves pertenecen a la cuenta del cliente, no al catálogo administrado de ETC. Su validez y modelos habilitados se comprueban contra el proveedor seleccionado. Las solicitudes usan hosts oficiales fijos; no se aceptan endpoints arbitrarios.

Para habilitar almacenamiento propio, configure primero `ETC_LLM_ENCRYPTION_KEY`: 32 bytes aleatorios codificados como 64 caracteres hexadecimales o base64 de 32 bytes. Esta clave maestra es distinta de las claves del modelo y debe conservarse protegida fuera del código, archivos y logs. Use el formulario protegido de secretos del proyecto. No la cambie sin una estrategia de rotación: sin la clave original no se podrán descifrar las credenciales ya guardadas.

Después, cada propietario autenticado guarda la API key de su negocio en Ajustes. Se cifra AES-256-GCM y la API de lectura sólo devuelve su estado y los últimos cuatro caracteres. La demo pública no admite almacenar claves reales. Si falta la clave maestra, el panel y backend informan el bloqueo; no guardan texto legible ni simulan una conexión.

El copiloto y Consultas IA usan el proveedor elegido para ese espacio. Si falla un proveedor propio, no se transmite la información silenciosamente al proveedor administrado: se informa el respaldo con conocimiento aprobado. Las consultas se limitan al segmento y subtipo seleccionados y no ejecutan acciones clínicas ni financieras.

## Alcance del MVP

Los datos y notas del cliente se conservan en su idioma original; las etiquetas, controles y respuestas generadas de la interfaz admiten español/inglés. Las preferencias visuales se guardan localmente con fallback en memoria si el navegador restringe almacenamiento. Para operación comercial, complete aviso de privacidad, dominio, correo, soporte y activación de WhatsApp antes de invitar clientes reales.

## Dominio de publicación

Antes de ofrecer el acceso por email en el sitio publicado, configure `ETC_PUBLIC_ORIGIN` con su origen HTTPS real (sin ruta). Este origen se añade al filtro de solicitudes de autenticación. El Preview y localhost ya están autorizados, pero un dominio de producción distinto no se acepta automáticamente. Los cambios del entorno requieren reiniciar Preview o publicar una nueva versión para cargar la configuración correspondiente. No se utilizó un wildcard de dominios que permita fabricar enlaces de recuperación hacia otro sitio.
