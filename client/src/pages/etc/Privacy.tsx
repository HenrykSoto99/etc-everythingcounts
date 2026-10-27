import Brand from '../../components/etc/Brand';
import BrandAttribution from '../../components/etc/BrandAttribution';
import PreferencesControl from '../../components/etc/PreferencesControl';
import { useI18n } from '../../contexts/I18nContext';
const sections = [
 ['Datos de demostración', 'La demo comienza con nombres, contactos y conversaciones ficticias. Cada visitante tiene un espacio aislado. Los cambios se guardan en la base de la demo. No ingreses datos sensibles ni información real de terceros.'],
 ['IA y proveedores', 'El copiloto y las consultas envían el contenido aprobado y contexto acotado al proveedor seleccionado. No hay garantía de respuestas infalibles. Revisa cada respuesta. Los errores y respuestas de respaldo se identifican por separado.'],
 ['Cuentas y credenciales', 'Las contraseñas se almacenan como hashes con sal, nunca como texto legible. La recuperación usa enlaces de un solo uso cuando el servicio de correo está configurado. Las claves API del cliente sólo pueden guardarse en espacios privados y requieren cifrado del servidor.'],
 ['WhatsApp real', 'La demo no envía mensajes a WhatsApp. La operación real requiere credenciales protegidas, vinculación del número y cumplimiento de las políticas de Meta. ETC no implica afiliación ni certificación de Meta.'],
 ['Espacios privados', 'Los registros se separan por propietario y espacio. No se vinculan automáticamente cuentas propias con usuarios OAuth que compartan email. Las consultas del agente se limitan al segmento y tipo de negocio configurados.'],
 ['Preparación por cliente', 'Antes de tratar datos de clientes, cada negocio debe revisar y publicar su aviso de privacidad, definir responsable, finalidades, permisos, conservación y atención de derechos. Esta página de alcance no sustituye ese aviso. No ingreses información clínica, bancaria o sensible en las consultas.'],
];
export default function Privacy() {
 const { t } = useI18n();
 return <main className="privacy-page"><header className="privacy-header"><a href="/"><Brand/></a><PreferencesControl/></header><h1>{t('Privacidad y alcance del MVP')}</h1><p>{t('ETC — EveryThingCounts es un MVP de frontdesk y CRM. La demostración no debe presentarse como una operación de producción ya conectada.')}</p>{sections.map(([title,body]) => <section key={title}><h2>{t(title)}</h2><p>{t(body)}</p></section>)}<p><a href="/demo">{t('Explorar la demo')}</a> · <a href="/">{t('Volver a ETC')}</a></p><BrandAttribution/></main>;
}
