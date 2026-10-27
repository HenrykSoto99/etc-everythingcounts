# ETC - EveryThingCounts

Frontdesk y CRM de WhatsApp + IA para PyMEs mexicanas. Ruta administrada React/TypeScript, Express y MySQL. Incluye landing original, demostración aislada por visitante y espacio privado con autenticación real.

## Funciones del MVP

Bandeja unificada con historial y toma humana, contactos, pipeline de cinco etapas con drag and drop persistente, conocimiento aprobado, copiloto IA, seguimientos y perfil adaptable por negocio/segmento. Los contactos se exportan a CSV. El modo demo muestra datos ficticios y no envía mensajes a personas reales.

La integración Cloud API está preparada y desactivada hasta configurar las credenciales y el espacio del cliente. La asistencia autónoma de la demo no significa que el webhook de producción ya responda automáticamente; la primera operación real es humana/copiloto. El piloto tiene un propietario autenticado por espacio; invitaciones y colaboración multiusuario con permisos granulares son evolución posterior. No incluye campañas masivas, plantillas aprobadas de Meta, facturación, HubSpot, Salesforce ni SLA.

## Desarrollo

El proyecto usa pnpm 10.18.0 y Node 22. Las variables de la plataforma se suministran al entorno; no se guardan en archivos.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm build
```

`DATABASE_URL` pertenece a la base administrada. No compilar con credenciales embebidas. Consultar `server/etc/README.md` para la migración aditiva de tablas CRM. La base de desarrollo y publicación es la misma: no usar pruebas destructivas.

Con el servicio iniciado, `node scripts/smoke-demo.mjs` crea únicamente dos espacios ficticios y comprueba aislamiento, persistencia y operaciones del MVP. `ETC_SMOKE_AI=1 node scripts/smoke-demo.mjs` añade una llamada al copiloto, con consumo de créditos del proyecto. Nunca usa una sesión privada ni envía a Meta.

## Rutas

`/` landing; `/demo` y `/demo/:section` demostración; `/app` y `/app/:section` espacio privado; `/privacidad` alcance y privacidad de la demostración. API en `/api/etc`. El modo demo usa tokens opacos limitados al espacio ficticio; nunca concede acceso a datos privados.

## Adecuación y operación

[Preparación por cliente](docs/CLIENT-SETUP.md) describe el perfil del negocio, contenido aprobado, secretos protegidos y activación del número. [Contrato REST](docs/API-CONTRACT.md) contiene la interfaz frontend/backend. [Fuentes y procedencia](docs/SOURCES.md) describe las piezas adaptadas y la referencia tipográfica.

## Licencias y procedencia

ETC adapta elementos funcionales de [Vocero CRM](https://github.com/kevinrivm/vocero-crm); no es un fork íntegro del repositorio. La regla de ventana de WhatsApp en `shared/etc/window.ts` se adapta de `src/server/inbox/window.ts`. La licencia MIT y copyright originales se conservan en `docs/third-party/vocero-crm-LICENSE`, junto con la revisión fuente. No se implica afiliación ni soporte del autor original.

La marca, diseño y copy de ETC son propios. La paleta fue aportada por el usuario y se usa JetBrains Mono como referencia tipográfica libre. No se incluyen secretos ni archivos de investigación.
