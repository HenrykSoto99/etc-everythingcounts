# Resultados del MVP ETC

- [x] Landing original ETC - EveryThingCounts en español, con paleta #1B4079/#4D7C8A/#7F9C96/#8FAD88/#CBDF90 y JetBrains Mono inspirada en la referencia; CTA reales a demo y espacio privado, FAQ y aviso de datos ficticios, sin precios, métricas ni clientes inventados.
- [x] Demo administrada de frontdesk y backend operativos: cada visitante obtiene un espacio ficticio aislado con persistencia; nunca accede a datos privados ni envía mensajes reales. Comprobado por smoke test contra MySQL.
- [x] Espacio privado con OAuth real, autorización y registros separados por propietario; estados de sesión/carga/error y controles server-side implementados. JWT y rechazo anónimo comprobados; login manual desde navegador pendiente de prueba del usuario.
- [x] Bandeja con historial, contacto, mensajes, estados, búsqueda y transferencia humana; IA pausada cuando una persona toma el chat y reactivación explícita. Mensajes humanos toman el chat de forma atómica.
- [x] Contactos y pipeline mínimo editables y persistentes, con campos comerciales, consentimiento, prioridad, notas y exportación CSV autorizada. El pipeline incluye drag and drop para mover prospectos entre etapas, guardar el cambio en el backend y revertir/mostrar error si falla; además ofrece una alternativa accesible sin arrastrar. Persistencia y gestos de escritorio/táctiles verificados en navegador, con etapa conservada al recargar.
- [x] Conocimiento aprobado editable y copiloto con IA real, alcance limitado, error/fallback visible, topes de solicitudes y sin promesas de respuestas infalibles. Respuesta real del proveedor comprobada.
- [x] Seguimientos y configuración por cliente/segmento, con plantillas de negocio adaptables sin sobrescribir automáticamente datos reales; no depender de HubSpot o Salesforce. Nuevas FAQ de plantilla quedan como borrador en privado.
- [x] Adaptador Cloud API preparado y desactivado por defecto: secretos server-side, scoping a cliente, HMAC y deduplicación de entradas, controles de ventana; conexión real pendiente sin credenciales y versión validada de Meta.
- [x] Navegación y formularios responsive, acciones persistentes con avisos de éxito/error y distinción entre simulación y operación real; sin botones de notificaciones ficticios.
- [x] Atribución y licencia de las piezas open source adaptadas; documentación de despliegue, diferencias de arquitectura, preparación por cliente y limitaciones; escaneo de identidad excluida y secretos antes de guardar.
- [x] Tipos, build y pruebas de scoping/handoff/ventana correctos; revisión de integración completada y checkpoint confirmado `83f5fdb5cd8687392de56e5de9b492b489d241c7`.
- [x] GitHub privado con confirmación del propietario y transferencia verificada/completada en `HenrykSoto99/etc-everythingcounts`.
- [ ] Publicación con URL permanente: GitHub permanece como repositorio privado activo; el panel y la publicación automática habilitada para nuevos commits en `main` son los flujos disponibles. Nueva autorización de GitHub verificada el 27 de octubre de 2026; nuevo intento mediante actualización documental de entrega. Confirmar resultado y versión antes de afirmar una URL pública o un despliegue exitoso. No se completó un cambio al repositorio administrado.

Evidencia y límites de las comprobaciones en `docs/VALIDATION.md`. No se activó ni se probó WhatsApp real.

## Ampliación: acceso, preferencias y consultas por segmento

- [x] Entrada por email y password con botón de mostrar/ocultar, validación, cuenta propia y sesión segura; conservar acceso OAuth alternativo sin mezclar cuentas por email ni exponer contraseñas.
- [x] «¿Olvidaste tu contraseña?» con enlace seguro de restablecimiento al email registrado, token hashado de un solo uso, vencimiento, nueva contraseña e invalidación de sesiones; nunca enviar la contraseña. Mostrar estado real del proveedor y dejar pendiente la entrega si faltan credenciales.
- [x] Versiones light/dark en landing, acceso y CRM, con contraste y preferencia persistente. Versiones español/inglés de interfaz, navegación, formularios, avisos y consultas, conservando los datos de cliente en su idioma original.
- [x] Pie al final de la página con «Hecho por» y enlace https://www.karmabytesociety.com; iconos de marca para LinkedIn, Instagram y Facebook con sus destinos. El enlace Google suministrado es una ruta de error: validar y no inventar su perfil; registrar la corrección pendiente si no existe un destino válido.
- [x] Nueva sección «Consultas IA» en el menú lateral mostrado: interacción sobre la operación únicamente del segmento seleccionado, historial aislado por espacio/segmento/subtipo, guardas de alcance, límites de uso y respuesta real o error/fallback explícito.
- [x] Agregar «Servicios financieros» y «PYMES» a servicios/segmentos del menú, ajustes, demos y landing «Hecho para tu negocio». PYMES incluye consultorios dentales, médicos, veterinarios, estéticas, barberías, fondas, restaurantes, cafeterías y otros; configurar su subtipo para acotar el agente. No dar asesoría clínica, veterinaria, crediticia o de inversión.
- [x] En Ajustes, selección de proveedor/modelo y campo protegido para conectar la API key preferida del cliente: sólo propietario privado, cifrado server-side con clave maestra independiente, nunca incluir claves en GitHub ni devolverlas al navegador. Demo pública sin almacenamiento de claves reales. Hosts oficiales fijos; no cambiar silenciosamente de proveedor al fallar.
- [x] Migraciones aditivas preservando datos, pruebas de auth/scoping/cifrado/alcance y revisión de integración de la ampliación; código guardado en el repositorio privado. Publicar desde el panel si corresponde, sin afirmar publicación no confirmada.

- [x] Landing con animaciones originales de conversación, asistencia y handoff en las ubicaciones correspondientes a las referencias, sin incrustar assets con marcas ajenas; automáticas continuas sin botones de pausa/movimiento/repetición, eficientes, responsive y compatibles con la preferencia de movimiento reducido del dispositivo.
- [x] Sección «Comienza con herramientas y guías»: Primeros pasos; Todo sobre ETC, WhatsApp y Meta; Referencia de API; Plataforma de agentes; Integraciones; y Construye nuevas alianzas y clientes con ETC. Enlaces reales a recursos útiles, bilingües y con HTML público; no anunciar integraciones ni funciones futuras como activas.

- [x] Revisión y ajuste de vistas para laptop, tablet y celular: landing, menú lateral, acceso, formularios, consultas, ajustes y pipeline. Evitar scroll horizontal de la página y recortes; el desplazamiento horizontal del tablero/tabla debe ser intencional y contenido. Conservar drag and drop y controles táctiles.
- [x] Actualizar al final el repositorio GitHub conectado con todos los cambios comprobados, preservando la historia y la identidad excluida. Versión guardada en un nuevo commit; SHA visible en el recibo y en el historial de GitHub.

La reproducción es automática y continua mientras sea visible, SIN botones de pausa, movimiento ni repetición. Se respeta la preferencia de movimiento reducido del dispositivo.

Activaciones pendientes: proveedor de correo; clave maestra de cifrado para API keys propias; origen HTTPS real al publicar; enlace Google válido; número/credenciales de Meta. Estos pendientes son configuración externa, no una entrega de correo, conexión real o publicación ya ejecutada.
