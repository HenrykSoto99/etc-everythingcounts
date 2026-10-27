import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Check,
  ShieldCheck,
  Users,
  SlidersHorizontal,
  BookOpen,
  MoveRight,
  Plus,
  Minus,
  Menu,
  X,
  Inbox,
  LayoutDashboard,
  Contact,
  Kanban,
  CheckCheck,
  Code2,
  FileText,
  GitBranch,
} from "lucide-react";
import Brand from "../../components/etc/Brand";
import BrandAttribution from "@/components/etc/BrandAttribution";
import PreferencesControl from "@/components/etc/PreferencesControl";
import { useI18n } from "../../contexts/I18nContext";
import { resources } from "./resources";
import "./motion-resources.css";

const segments = [
  {
    id: "inmobiliaria",
    code: "01",
    name: "Inmobiliarias",
    text: "Del primer interés a la visita. Ordena prospectos, preferencias y próximos pasos.",
    tags: "Interés · Presupuesto · Visita",
    cta: "Explorar este segmento",
  },
  {
    id: "educacion",
    code: "02",
    name: "Educación",
    text: "Acompaña cada consulta sobre programas, requisitos y admisiones.",
    tags: "Programa · Modalidad · Inscripción",
    cta: "Explorar este segmento",
  },
  {
    id: "retail",
    code: "03",
    name: "Retail",
    text: "Resuelve dudas de productos y mantén el seguimiento en un solo lugar.",
    tags: "Producto · Consulta · Seguimiento",
    cta: "Explorar este segmento",
  },
  {
    id: "servicios",
    code: "04",
    name: "Servicios",
    text: "Recibe solicitudes, entiende lo que necesitan y prepara la siguiente acción.",
    tags: "Servicio · Necesidad · Cotización",
    cta: "Explorar este segmento",
  },
  {
    id: "financieros",
    code: "05",
    name: "Servicios financieros",
    text: "Organiza consultas, documentación y próximos pasos con un seguimiento claro. La IA no ofrece asesoría financiera, crediticia ni de inversión.",
    tags: "Consulta · Documentación · Seguimiento",
    cta: "Explorar este segmento",
  },
  {
    id: "pymes",
    code: "06",
    name: "PYMES",
    text: "Organiza consultas, citas, seguimiento y tareas operativas para consultorios dentales, consultorios médicos, veterinarias, estéticas, barberías, fondas, restaurantes, cafeterías y otros negocios locales. Su enfoque es operativo: no ofrece consejo médico ni sustituye la atención profesional.",
    tags: "Consultas · Citas · Operación",
    cta: "Explorar este segmento",
  },
];

const faqs = [
  [
    "¿La demo envía mensajes a WhatsApp?",
    "No. La demo usa conversaciones ficticias, aisladas por visitante. Puedes enviar mensajes de prueba, usar el copiloto y mover prospectos sin contactar a personas reales.",
  ],
  [
    "¿Qué necesito para usarlo con mi negocio?",
    "Un espacio privado, la configuración de tu negocio, contenido revisado y credenciales de la API oficial de WhatsApp. La activación del número depende de los requisitos de Meta. La demo no sustituye esa configuración.",
  ],
  [
    "¿La IA puede responder cualquier cosa?",
    "No debería. ETC usa el conocimiento que apruebas y ofrece asistencia supervisada. Si una consulta necesita a una persona, la conversación puede transferirse al equipo. Las respuestas de IA deben revisarse; ningún modelo es infalible.",
  ],
  [
    "¿Tengo que conectar otro CRM?",
    "No. Contactos, etapas y seguimientos viven dentro de ETC. Puedes exportar los contactos a CSV. Las integraciones adicionales se evalúan cuando realmente las necesitas.",
  ],
  [
    "¿Puedo adaptarlo a cada cliente?",
    "Sí. El nombre del negocio, el segmento, el asistente, su tono, el conocimiento y el color de acento son configurables por espacio. Los mensajes y contactos de cada espacio permanecen separados.",
  ],
  [
    "¿Cuánto cuesta?",
    "El precio comercial está por definir según el alcance. El consumo de IA, la mensajería y el alojamiento son conceptos distintos. No mostramos tarifas ni resultados que todavía no hayan sido validados.",
  ],
] as const;

function ProductPreview() {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.24 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const motionClass = [
    "product-scene",
    "etc-motion-stage",
    isInView ? "is-inview" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={stageRef}
      className={motionClass}
      aria-label={t("Vista ilustrativa del frontdesk ETC")}
    >
      <div className="scene-note">
        <span className="status-dot" />{" "}
        {t("TU EQUIPO Y TU IA, EN EL MISMO LUGAR")}
      </div>
      <div className="preview-window">
        <div className="preview-chrome">
          <div>
            <i />
            <i />
            <i />
          </div>
          <span>{t("ETC / frontdesk")}</span>
          <span className="preview-live">{t("VISTA ILUSTRATIVA")}</span>
        </div>
        <div className="preview-app">
          <aside className="preview-sidebar">
            <Brand compact light />
            <div className="preview-nav">
              <LayoutDashboard />
              <span>{t("Resumen")}</span>
            </div>
            <div className="preview-nav selected">
              <Inbox />
              <span>{t("Bandeja")}</span>
              <b>3</b>
            </div>
            <div className="preview-nav">
              <Kanban />
              <span>{t("Pipeline")}</span>
            </div>
            <div className="preview-nav">
              <Contact />
              <span>{t("Contactos")}</span>
            </div>
            <div className="preview-nav">
              <BookOpen />
              <span>{t("Conocimiento")}</span>
            </div>
            <div className="preview-sidebar-bottom">
              <span className="status-dot" />
              <span>{t("Modo de ejemplo")}</span>
            </div>
          </aside>
          <div className="preview-inbox">
            <div className="preview-title">
              {t("Bandeja")} <span>↗</span>
            </div>
            <div className="preview-search">{t("Buscar una conversación")}</div>
            <div className="preview-person chosen motion-item">
              <span className="avatar sage">AL</span>
              <div>
                <strong>Ana López</strong>
                <span>{t("Me interesa agendar una visita.")}</span>
                <small>
                  <i /> {t("En atención")}
                </small>
              </div>
              <time>{t("Ahora")}</time>
            </div>
            <div className="preview-person">
              <span className="avatar blue">MR</span>
              <div>
                <strong>Marco Ruiz</strong>
                <span>{t("¿Tienen disponibilidad?")}</span>
                <small>{t("Nuevo prospecto")}</small>
              </div>
            </div>
            <div className="preview-person">
              <span className="avatar lime">CS</span>
              <div>
                <strong>Carla Soto</strong>
                <span>{t("Gracias por la información.")}</span>
                <small>{t("Seguimiento")}</small>
              </div>
            </div>
            <div className="preview-mini-stat">
              <span>{t("Todo tiene su siguiente paso.")}</span>
              <div className="mini-stage-track">
                <i className="motion-item" />
                <i className="motion-item" />
                <i className="motion-item" />
                <i className="motion-item" />
              </div>
              <small>{t("Nuevo → Atención → Calificado → Cierre")}</small>
            </div>
          </div>
          <div className="preview-chat">
            <header>
              <div className="avatar sage">AL</div>
              <div>
                <strong>Ana López</strong>
                <span>{t("Ejemplo · Inmobiliaria")}</span>
              </div>
              <span className="preview-ai">
                <Sparkles size={11} /> {t("IA")}
              </span>
            </header>
            <div className="preview-chat-body">
              <span className="chat-day">{t("CONVERSACIÓN DE EJEMPLO")}</span>
              <div className="sample-bubble incoming motion-item">
                {t("Hola, me interesa un departamento de dos recámaras.")}
              </div>
              <div className="sample-bubble outgoing motion-item">
                {t(
                  "¡Hola, Ana! Con gusto te ayudo. ¿En qué zona estás buscando?"
                )}
              </div>
              <div className="sample-bubble incoming late-incoming motion-item">
                {t("En la zona norte. ¿Puedo agendar una visita?")}
              </div>
              <div className="preview-typing motion-item">
                <span className="avatar sage">IA</span>
                <span>{t("Borrador sugerido, para revisar")}</span>
                <span
                  className="typing-dots motion-item"
                  aria-label={t("Escribiendo")}
                >
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="sample-handoff motion-item">
                <Users size={13} />
                <span>{t("Tu equipo toma la conversación")}</span>
                <Check size={13} />
              </div>
              <div className="sample-bubble outgoing human motion-item">
                {t("Claro. Te ayudo a coordinarla con un asesor.")}
                <span>
                  <CheckCheck size={11} /> {t("Ejemplo")}
                </span>
              </div>
            </div>
            <div className="preview-composer">
              <span>{t("Escribe tu respuesta…")}</span>
              <ArrowUpRight size={15} />
            </div>
          </div>
        </div>
      </div>
      <div className="scene-floating">
        <span className="floating-icon">
          <ShieldCheck size={20} />
        </span>
        <div>
          <strong>{t("La IA ayuda. Tu equipo decide.")}</strong>
          <span>{t("Transferencia humana, sin perder contexto.")}</span>
        </div>
      </div>
      <div className="scene-caption">
        <span>{t("01 / EL FRONTDESK")}</span>
        <span>{t("Una vista. Toda la conversación.")}</span>
      </div>
    </div>
  );
}

function MicroDemos() {
  const { t } = useI18n();

  return (
    <section className="microdemos-section">
      <div className="section-wrap">
        <div className="microdemos-heading">
          <div>
            <p className="eyebrow">{t("03 / ASÍ SE VE EL CRITERIO")}</p>
            <h2>
              {t("Interfaz para decidir.")}
              <br />
              {t("No para improvisar.")}
            </h2>
          </div>
          <p>
            {t(
              "Microdemostraciones ilustrativas del copiloto, la toma humana y la calificación de contactos. No son un chat real ni acciones autónomas."
            )}
          </p>
        </div>
        <div className="microdemos-grid">
          <article className="microdemo-card">
            <div className="microdemo-meta">
              <span>{t("01 / COPILOTO")}</span>
              <span>{t("Borrador")}</span>
            </div>
            <h3>{t("Una sugerencia para revisar.")}</h3>
            <p>
              {t(
                "El conocimiento aprobado ayuda a preparar una respuesta; la persona decide si la usa, la edita o la descarta."
              )}
            </p>
            <div className="microdemo-illustration">
              <div className="microdemo-draft">
                <span className="avatar sage">IA</span>
                <div className="microdemo-draft-body">
                  <strong>
                    {t("Borrador sugerido")}
                    <span>{t("Revisar")}</span>
                  </strong>
                  <p>{t("Basado en conocimiento aprobado.")}</p>
                  <div className="microdemo-actions" aria-hidden="true">
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article className="microdemo-card">
            <div className="microdemo-meta">
              <span>{t("02 / HANDOFF")}</span>
              <span>{t("Equipo")}</span>
            </div>
            <h3>{t("El contexto se queda cuando intervienes.")}</h3>
            <p>
              {t(
                "La conversación puede pausarse para que el equipo responda con historial, contacto y siguiente paso a la vista."
              )}
            </p>
            <div className="microdemo-illustration">
              <div className="microdemo-handoff">
                <div className="microdemo-bubble">
                  {t("¿Puedo agendar una visita?")}
                  <small>
                    <span className="status-dot" /> {t("Entrada simulada")}
                  </small>
                </div>
                <span className="microdemo-arrow" aria-hidden="true" />
                <div className="microdemo-bubble out">
                  {t("Te atiende Ana del equipo.")}
                  <small>
                    <span className="avatar blue">AL</span> {t("Pausa humana")}
                  </small>
                </div>
              </div>
            </div>
          </article>
          <article className="microdemo-card">
            <div className="microdemo-meta">
              <span>{t("03 / PIPELINE")}</span>
              <span>{t("Contacto")}</span>
            </div>
            <h3>{t("Calificar también es dar contexto.")}</h3>
            <p>
              {t(
                "Una etapa, una prioridad y una nota ayudan a que el siguiente seguimiento no dependa de la memoria del equipo."
              )}
            </p>
            <div className="microdemo-illustration">
              <div className="microdemo-pipeline">
                <div className="microdemo-pipeline-top">
                  <strong>{t("Ana López")}</strong>
                  <span>{t("Calificado")}</span>
                </div>
                <div className="microdemo-pipeline-track" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </article>
        </div>
        <p className="microdemo-footnote">
          {t(
            "Ejemplo visual de contexto: las tarjetas no representan mensajes enviados ni automatizaciones CRM fuera del alcance actual."
          )}
        </p>
      </div>
    </section>
  );
}

function ResourceIcon({ kind }: { kind: string }) {
  if (kind === "Referencia") return <Code2 />;
  if (kind === "Mapa") return <GitBranch />;
  if (kind === "Nota") return <FileText />;
  return <BookOpen />;
}

function ResourcesSection() {
  const { t } = useI18n();

  return (
    <section className="resources-section" id="recursos">
      <div className="section-wrap">
        <div className="resources-heading">
          <div>
            <p className="eyebrow">{t("04 / PARA SEGUIR EXPLORANDO")}</p>
            <h2>
              {t("Comienza con")}
              <br />
              {t("herramientas y guías")}
            </h2>
          </div>
          <p>
            {t(
              "Rutas breves para entender el producto, consultar el API y hablar de integraciones con el alcance correcto."
            )}
          </p>
        </div>
        <div className="resource-grid">
          {resources.map(resource => (
            <article className="resource-card" key={resource.slug}>
              <div className="resource-card-head">
                <ResourceIcon kind={resource.kind} />
                <span>{t(resource.kind)}</span>
                <span className="resource-card-code">{resource.code}</span>
              </div>
              <h3>{t(resource.title)}</h3>
              <p>{t(resource.summary)}</p>
              <a className="resource-card-link" href={resource.href}>
                {t(resource.cta)} <ArrowUpRight size={14} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const [segment, setSegment] = useState("inmobiliaria");
  const selectSegment = (id: string) => {
    setSegment(id);
    setMenu(false);
  };

  return (
    <div className="etc-landing">
      <header className="landing-nav">
        <a href="/" aria-label={t("ETC inicio")}>
          <Brand />
        </a>
        <nav
          className={menu ? "nav-open" : ""}
          aria-label={t("Navegación principal")}
        >
          <a href="#producto" onClick={() => setMenu(false)}>
            {t("El producto")}
          </a>
          <a href="#como-funciona" onClick={() => setMenu(false)}>
            {t("Cómo funciona")}
          </a>
          <a href="#segmentos" onClick={() => selectSegment("inmobiliaria")}>
            {t("Tu negocio")}
          </a>
          <a href="#segmentos" onClick={() => selectSegment("financieros")}>
            {t("Servicios financieros")}
          </a>
          <a href="#segmentos" onClick={() => selectSegment("pymes")}>
            {t("PYMES")}
          </a>
          <a href="#preguntas" onClick={() => setMenu(false)}>
            {t("Preguntas")}
          </a>
          <a href="/recursos" onClick={() => setMenu(false)}>
            {t("Recursos")}
          </a>
        </nav>
        <PreferencesControl compact />
        <a href="/login" className="text-link nav-login">
          {t("Iniciar sesión")} <ArrowUpRight size={14} />
        </a>
        <a href="/demo" className="button button-small nav-demo">
          {t("Explorar demo")} <ArrowUpRight size={16} />
        </a>
        <button
          type="button"
          className="mobile-menu"
          aria-label={t(menu ? "Cerrar menú" : "Abrir menú")}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> {t("WHATSAPP + IA, CON CRITERIO")}
            </p>
            <h1>
              {t("Cada")}
              <br />
              {t("conversación")}
              <br />
              <span>{t("cuenta.")}</span>
              <i className="heading-cursor" />
            </h1>
            <p className="hero-description">
              {t("Menos chats sueltos.")}
              <br />
              {t("Más oportunidades con siguiente paso.")}
            </p>
            <p className="hero-support">
              {t(
                "Tu WhatsApp, tu equipo y un asistente de IA en un frontdesk hecho para PyMEs mexicanas."
              )}
            </p>
            <div className="hero-actions">
              <a href="/demo" className="button">
                {t("Entrar a la demo")} <ArrowUpRight size={19} />
              </a>
              <a href="/app" className="text-link">
                {t("Mi espacio privado")} <ArrowRight size={17} />
              </a>
            </div>
            <p className="hero-note">
              <Check size={13} />{" "}
              {t("Sin conectar tu número · Datos de ejemplo")}
            </p>
          </div>
          <ProductPreview />
          <div className="hero-footer">
            <span>EveryThingCounts</span>
            <span>{t("ORDEN PARA VENDER. CONTEXTO PARA ATENDER.")}</span>
            <a href="#producto" aria-label={t("Descubrir el producto")}>
              ↓
            </a>
          </div>
        </section>
        <section className="problem-strip">
          <div>
            <span className="mono-label">{t("NO ES OTRO CHAT.")}</span>
            <p>
              {t("Es el lugar donde cada conversación")}
              <br />
              <strong>{t("se convierte en una siguiente acción.")}</strong>
            </p>
          </div>
          <div className="problem-tags">
            <span>
              <MessageSquare size={17} /> {t("Conversaciones")}
            </span>
            <i>+</i>
            <span>
              <Users size={17} /> {t("Equipo")}
            </span>
            <i>+</i>
            <span>
              <Sparkles size={17} /> {t("IA")}
            </span>
            <i>=</i>
            <span className="tag-result">ETC</span>
          </div>
        </section>
        <section className="product-section section-wrap" id="producto">
          <div className="section-heading">
            <p className="eyebrow">{t("01 / EL PRODUCTO")}</p>
            <h2>
              {t("Menos ruido.")}
              <br />
              {t("Más claridad.")}
            </h2>
            <p>
              {t("Lo importante, conectado.")}
              <br />
              {t("Sin un CRM que necesite otro CRM.")}
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature feature-wide">
              <div className="feature-top">
                <Inbox />
                <span>01</span>
              </div>
              <h3>
                {t("Una bandeja.")}
                <br />
                {t("Ningún contexto perdido.")}
              </h3>
              <p>
                {t(
                  "Historial, contacto y siguiente paso en la misma vista. Toma una conversación y pausa al asistente cuando tu equipo necesita intervenir."
                )}
              </p>
              <div className="feature-handoff">
                <span className="avatar sage">{t("IA")}</span>
                <div className="handoff-line">
                  <i />
                  <span>{t("Contexto compartido")}</span>
                  <i />
                </div>
                <span className="avatar blue">
                  <Users size={20} />
                </span>
              </div>
            </article>
            <article className="feature">
              <div className="feature-top">
                <Kanban />
                <span>02</span>
              </div>
              <h3>
                {t("Un pipeline")}
                <br />
                {t("que sí se entiende.")}
              </h3>
              <p>
                {t(
                  "De nuevo prospecto a cierre, con etapas, prioridad y notas. Cada oportunidad tiene un lugar."
                )}
              </p>
              <div className="feature-pipeline">
                <div>
                  <span>{t("Nuevo")}</span>
                  <i />
                  <i />
                </div>
                <div>
                  <span>{t("En atención")}</span>
                  <i />
                </div>
                <div>
                  <span>{t("Calificado")}</span>
                  <i />
                </div>
              </div>
            </article>
            <article className="feature">
              <div className="feature-top">
                <Sparkles />
                <span>03</span>
              </div>
              <h3>
                {t("Asistencia con")}
                <br />
                {t("tu conocimiento.")}
              </h3>
              <p>
                {t(
                  "Preguntas frecuentes revisadas por ti y borradores de respuesta para tu equipo. Si hace falta una persona, el contexto se queda."
                )}
              </p>
              <div className="feature-knowledge">
                <BookOpen size={16} />
                <span>{t("Conocimiento aprobado")}</span>
                <Check size={16} />
              </div>
            </article>
            <article className="feature feature-wide feature-sage">
              <div className="feature-top">
                <SlidersHorizontal />
                <span>04</span>
              </div>
              <h3>
                {t("Tu operación.")}
                <br />
                {t("Tus reglas.")}
              </h3>
              <p>
                {t(
                  "Adapta el negocio, el tono y el asistente por cliente. Gestiona seguimientos y exporta contactos a CSV sin conectar herramientas de más."
                )}
              </p>
              <div className="feature-config">
                <span>{t("Segmento")}</span>
                <strong>
                  {t("Tu negocio")} <SlidersHorizontal size={14} />
                </strong>
                <span>{t("Tu asistente")}</span>
                <strong>
                  {t("Tu voz")} <Check size={14} />
                </strong>
              </div>
            </article>
          </div>
        </section>
        <section className="steps-section" id="como-funciona">
          <div className="section-wrap">
            <div className="steps-heading">
              <p className="eyebrow">{t("02 / ASÍ SE CONECTA TODO")}</p>
              <h2>
                {t("Del mensaje")}
                <br />
                {t("al siguiente paso.")}
              </h2>
              <p>{t("Una operación sencilla, con personas al centro.")}</p>
            </div>
            <div className="steps">
              <article>
                <span className="step-number">01</span>
                <MessageSquare />
                <h3>{t("Recibe")}</h3>
                <p>
                  {t(
                    "El mensaje entra en una bandeja compartida, junto con el historial del contacto."
                  )}
                </p>
              </article>
              <span className="step-arrow">
                <MoveRight />
              </span>
              <article>
                <span className="step-number">02</span>
                <Sparkles />
                <h3>{t("Entiende")}</h3>
                <p>
                  {t(
                    "El copiloto usa tu conocimiento aprobado para ayudar a responder y dar contexto."
                  )}
                </p>
              </article>
              <span className="step-arrow">
                <MoveRight />
              </span>
              <article>
                <span className="step-number">03</span>
                <Users />
                <h3>{t("Acompaña")}</h3>
                <p>
                  {t(
                    "Tu equipo interviene cuando hace falta y la IA deja espacio a la atención humana."
                  )}
                </p>
              </article>
              <span className="step-arrow">
                <MoveRight />
              </span>
              <article>
                <span className="step-number">04</span>
                <CheckCheck />
                <h3>{t("Avanza")}</h3>
                <p>
                  {t(
                    "Mueve el prospecto, registra una nota y deja preparado su próximo seguimiento."
                  )}
                </p>
              </article>
            </div>
            <div className="steps-note">
              <ShieldCheck size={18} />
              <p>
                {t(
                  "En la demo, los mensajes son simulados. Para operación real, se configura la API oficial de WhatsApp con las credenciales de cada negocio."
                )}
              </p>
            </div>
          </div>
        </section>
        <MicroDemos />
        <ResourcesSection />
        <section className="segments-section section-wrap" id="segmentos">
          <div className="section-heading">
            <p className="eyebrow">{t("03 / HECHO PARA TU NEGOCIO")}</p>
            <h2>
              {t("La misma base.")}
              <br />
              {t("Tu forma de trabajar.")}
            </h2>
            <p>{t("Cambia el segmento. Conserva la claridad.")}</p>
          </div>
          <div className="segment-list">
            {segments.map(s => (
              <div key={s.id} className="segment-row-shell">
                <button
                  type="button"
                  className={`segment-row ${segment === s.id ? "is-active" : ""}`}
                  onClick={() => setSegment(s.id)}
                  aria-expanded={segment === s.id}
                >
                  <span className="segment-code">{s.code}</span>
                  <div>
                    <h3>{t(s.name)}</h3>
                    {segment === s.id && (
                      <>
                        <p>{t(s.text)}</p>
                        <span className="segment-tags">{t(s.tags)}</span>
                      </>
                    )}
                  </div>
                  <span className="segment-arrow">
                    {segment === s.id ? <Minus /> : <Plus />}
                  </span>
                </button>
                {segment === s.id && (
                  <a
                    className="text-link segment-cta"
                    href={`/demo?segment=${s.id}`}
                  >
                    {t(s.cta)} <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="segment-footnote">
            {t(
              "Perfiles de ejemplo configurables. No son casos de éxito ni clientes de ETC."
            )}
          </p>
        </section>
        <section className="cta-section section-wrap">
          <div className="cta-card">
            <span className="eyebrow">
              <span className="status-dot" /> {t("PRUÉBALO, SIN CONECTAR NADA")}
            </span>
            <h2>
              {t("Que tu próxima")}
              <br />
              {t("conversación cuente.")}
            </h2>
            <p>
              {t(
                "Explora la bandeja, prueba la IA y mueve tu primer prospecto."
              )}
              <br />
              {t("Todo en un espacio de demostración propio.")}
            </p>
            <a href="/demo" className="button button-lime">
              {t("Explorar ETC")} <ArrowUpRight size={20} />
            </a>
            <span className="cta-code">[ ETC / EVERY.THING.COUNTS ]</span>
          </div>
        </section>
        <section className="faq-section section-wrap" id="preguntas">
          <div className="section-heading">
            <p className="eyebrow">{t("04 / SIN LETRA CHIQUITA")}</p>
            <h2>
              {t("Antes de")}
              <br />
              {t("conversar.")}
            </h2>
            <p>{t("Qué puedes probar y qué necesita configuración.")}</p>
          </div>
          <div className="faq-list">
            {faqs.map(([q, a], i) => (
              <div className={`faq-item ${faq === i ? "is-open" : ""}`} key={q}>
                <button
                  type="button"
                  aria-expanded={faq === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setFaq(faq === i ? null : i)}
                >
                  <span>{t(q)}</span>
                  {faq === i ? <Minus size={18} /> : <Plus size={18} />}
                </button>
                {faq === i && <p id={`faq-${i}`}>{t(a)}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <a href="/" aria-label={t("ETC inicio")}>
            <Brand />
          </a>
          <p>{t("Cada conversación cuenta.")}</p>
        </div>
        <div>
          <a href="/demo">
            {t("Explorar demo")} <ArrowUpRight size={15} />
          </a>
          <a href="/login">
            {t("Iniciar sesión")} <ArrowUpRight size={15} />
          </a>
          <a href="/app">
            {t("Espacio privado")} <ArrowUpRight size={15} />
          </a>
          <a href="/recursos">
            {t("Herramientas y guías")} <ArrowUpRight size={15} />
          </a>
          <a href="/privacidad">{t("Privacidad y alcance")}</a>
        </div>
        <div className="footer-last">
          <span>{t("ETC — EveryThingCounts")}</span>
          <span>{t("MVP · Hecho para PyMEs mexicanas")}</span>
          <small>
            {t("Sin afiliación ni certificación de Meta implícita.")}
          </small>
          <BrandAttribution />
        </div>
      </footer>
    </div>
  );
}
