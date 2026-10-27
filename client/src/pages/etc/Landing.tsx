import { useState } from "react";
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
  Circle,
} from "lucide-react";
import Brand from "../../components/etc/Brand";

const segments = [
  {
    id: "inmobiliaria",
    code: "01",
    name: "Inmobiliarias",
    text: "Del primer interés a la visita. Ordena prospectos, preferencias y próximos pasos.",
    tags: "Interés · Presupuesto · Visita",
  },
  {
    id: "educacion",
    code: "02",
    name: "Educación",
    text: "Acompaña cada consulta sobre programas, requisitos y admisiones.",
    tags: "Programa · Modalidad · Inscripción",
  },
  {
    id: "retail",
    code: "03",
    name: "Retail",
    text: "Resuelve dudas de productos y mantén el seguimiento en un solo lugar.",
    tags: "Producto · Consulta · Seguimiento",
  },
  {
    id: "servicios",
    code: "04",
    name: "Servicios",
    text: "Recibe solicitudes, entiende lo que necesitan y prepara la siguiente acción.",
    tags: "Servicio · Necesidad · Cotización",
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
];

function ProductPreview() {
  return (
    <div
      className="product-scene"
      aria-label="Vista ilustrativa del frontdesk ETC"
    >
      <div className="scene-note">
        <span className="status-dot" /> TU EQUIPO Y TU IA, EN EL MISMO LUGAR
      </div>
      <div className="preview-window">
        <div className="preview-chrome">
          <div>
            <i />
            <i />
            <i />
          </div>
          <span>ETC / frontdesk</span>
          <span className="preview-live">VISTA ILUSTRATIVA</span>
        </div>
        <div className="preview-app">
          <aside className="preview-sidebar">
            <Brand compact light />
            <div className="preview-nav">
              <LayoutDashboard />
              <span>Resumen</span>
            </div>
            <div className="preview-nav selected">
              <Inbox />
              <span>Bandeja</span>
              <b>3</b>
            </div>
            <div className="preview-nav">
              <Kanban />
              <span>Pipeline</span>
            </div>
            <div className="preview-nav">
              <Contact />
              <span>Contactos</span>
            </div>
            <div className="preview-nav">
              <BookOpen />
              <span>Conocimiento</span>
            </div>
            <div className="preview-sidebar-bottom">
              <span className="status-dot" />
              <span>Modo de ejemplo</span>
            </div>
          </aside>
          <div className="preview-inbox">
            <div className="preview-title">
              Bandeja <span>↗</span>
            </div>
            <div className="preview-search">Buscar una conversación</div>
            <div className="preview-person chosen">
              <span className="avatar sage">AL</span>
              <div>
                <strong>Ana López</strong>
                <span>Me interesa agendar una visita.</span>
                <small>
                  <i /> En atención
                </small>
              </div>
              <time>Ahora</time>
            </div>
            <div className="preview-person">
              <span className="avatar blue">MR</span>
              <div>
                <strong>Marco Ruiz</strong>
                <span>¿Tienen disponibilidad?</span>
                <small>Nuevo prospecto</small>
              </div>
            </div>
            <div className="preview-person">
              <span className="avatar lime">CS</span>
              <div>
                <strong>Carla Soto</strong>
                <span>Gracias por la información.</span>
                <small>Seguimiento</small>
              </div>
            </div>
            <div className="preview-mini-stat">
              <span>Todo tiene su siguiente paso.</span>
              <div className="mini-stage-track">
                <i />
                <i />
                <i />
                <i />
              </div>
              <small>Nuevo → Atención → Calificado → Cierre</small>
            </div>
          </div>
          <div className="preview-chat">
            <header>
              <div className="avatar sage">AL</div>
              <div>
                <strong>Ana López</strong>
                <span>Ejemplo · Inmobiliaria</span>
              </div>
              <span className="preview-ai">
                <Sparkles size={11} /> IA
              </span>
            </header>
            <div className="preview-chat-body">
              <span className="chat-day">CONVERSACIÓN DE EJEMPLO</span>
              <div className="sample-bubble incoming">
                Hola, me interesa un departamento de dos recámaras.
              </div>
              <div className="sample-bubble outgoing">
                ¡Hola, Ana! Con gusto te ayudo. ¿En qué zona estás buscando?
              </div>
              <div className="sample-bubble incoming">
                En la zona norte. ¿Puedo agendar una visita?
              </div>
              <div className="sample-handoff">
                <Users size={13} />
                <span>Tu equipo toma la conversación</span>
                <Check size={13} />
              </div>
              <div className="sample-bubble outgoing human">
                Claro. Te ayudo a coordinarla con un asesor.
                <span>
                  <CheckCheck size={11} /> Ejemplo
                </span>
              </div>
            </div>
            <div className="preview-composer">
              <span>Escribe tu respuesta…</span>
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
          <strong>La IA ayuda. Tu equipo decide.</strong>
          <span>Transferencia humana, sin perder contexto.</span>
        </div>
      </div>
      <div className="scene-caption">
        <span>01 / EL FRONTDESK</span>
        <span>Una vista. Toda la conversación.</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const [segment, setSegment] = useState("inmobiliaria");
  return (
    <div className="etc-landing">
      <header className="landing-nav">
        <a href="/" aria-label="ETC inicio">
          <Brand />
        </a>
        <nav
          className={menu ? "nav-open" : ""}
          aria-label="Navegación principal"
        >
          <a href="#producto" onClick={() => setMenu(false)}>
            El producto
          </a>
          <a href="#como-funciona" onClick={() => setMenu(false)}>
            Cómo funciona
          </a>
          <a href="#segmentos" onClick={() => setMenu(false)}>
            Tu negocio
          </a>
          <a href="#preguntas" onClick={() => setMenu(false)}>
            Preguntas
          </a>
        </nav>
        <a href="/demo" className="button button-small nav-demo">
          Explorar demo <ArrowUpRight size={16} />
        </a>
        <button
          className="mobile-menu"
          aria-label={menu ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> WHATSAPP + IA, CON CRITERIO
            </p>
            <h1>
              Cada
              <br />
              conversación
              <br />
              <span>cuenta.</span>
              <i className="heading-cursor" />
            </h1>
            <p className="hero-description">
              Menos chats sueltos.
              <br />
              Más oportunidades con siguiente paso.
            </p>
            <p className="hero-support">
              Tu WhatsApp, tu equipo y un asistente de IA en un frontdesk hecho
              para PyMEs mexicanas.
            </p>
            <div className="hero-actions">
              <a href="/demo" className="button">
                Entrar a la demo <ArrowUpRight size={19} />
              </a>
              <a href="/app" className="text-link">
                Mi espacio privado <ArrowRight size={17} />
              </a>
            </div>
            <p className="hero-note">
              <Check size={13} /> Sin conectar tu número · Datos de ejemplo
            </p>
          </div>
          <ProductPreview />
          <div className="hero-footer">
            <span>EveryThingCounts</span>
            <span>ORDEN PARA VENDER. CONTEXTO PARA ATENDER.</span>
            <a href="#producto" aria-label="Descubrir el producto">
              ↓
            </a>
          </div>
        </section>
        <section className="problem-strip">
          <div>
            <span className="mono-label">NO ES OTRO CHAT.</span>
            <p>
              Es el lugar donde cada conversación
              <br />
              <strong>se convierte en una siguiente acción.</strong>
            </p>
          </div>
          <div className="problem-tags">
            <span>
              <MessageSquare size={17} /> Conversaciones
            </span>
            <i>+</i>
            <span>
              <Users size={17} /> Equipo
            </span>
            <i>+</i>
            <span>
              <Sparkles size={17} /> IA
            </span>
            <i>=</i>
            <span className="tag-result">ETC</span>
          </div>
        </section>
        <section className="product-section section-wrap" id="producto">
          <div className="section-heading">
            <p className="eyebrow">01 / EL PRODUCTO</p>
            <h2>
              Menos ruido.
              <br />
              Más claridad.
            </h2>
            <p>
              Lo importante, conectado.
              <br />
              Sin un CRM que necesite otro CRM.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature feature-wide">
              <div className="feature-top">
                <Inbox />
                <span>01</span>
              </div>
              <h3>
                Una bandeja.
                <br />
                Ningún contexto perdido.
              </h3>
              <p>
                Historial, contacto y siguiente paso en la misma vista. Toma una
                conversación y pausa al asistente cuando tu equipo necesita
                intervenir.
              </p>
              <div className="feature-handoff">
                <span className="avatar sage">IA</span>
                <div className="handoff-line">
                  <i />
                  <span>Contexto compartido</span>
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
                Un pipeline
                <br />
                que sí se entiende.
              </h3>
              <p>
                De nuevo prospecto a cierre, con etapas, prioridad y notas. Cada
                oportunidad tiene un lugar.
              </p>
              <div className="feature-pipeline">
                <div>
                  <span>Nuevo</span>
                  <i />
                  <i />
                </div>
                <div>
                  <span>En atención</span>
                  <i />
                </div>
                <div>
                  <span>Calificado</span>
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
                Asistencia con
                <br />
                tu conocimiento.
              </h3>
              <p>
                Preguntas frecuentes revisadas por ti y borradores de respuesta
                para tu equipo. Si hace falta una persona, el contexto se queda.
              </p>
              <div className="feature-knowledge">
                <BookOpen size={16} />
                <span>Conocimiento aprobado</span>
                <Check size={16} />
              </div>
            </article>
            <article className="feature feature-wide feature-sage">
              <div className="feature-top">
                <SlidersHorizontal />
                <span>04</span>
              </div>
              <h3>
                Tu operación.
                <br />
                Tus reglas.
              </h3>
              <p>
                Adapta el negocio, el tono y el asistente por cliente. Gestiona
                seguimientos y exporta contactos a CSV sin conectar herramientas
                de más.
              </p>
              <div className="feature-config">
                <span>Segmento</span>
                <strong>
                  Tu negocio <SlidersHorizontal size={14} />
                </strong>
                <span>Tu asistente</span>
                <strong>
                  Tu voz <Check size={14} />
                </strong>
              </div>
            </article>
          </div>
        </section>
        <section className="steps-section" id="como-funciona">
          <div className="section-wrap">
            <div className="steps-heading">
              <p className="eyebrow">02 / ASÍ SE CONECTA TODO</p>
              <h2>
                Del mensaje
                <br />
                al siguiente paso.
              </h2>
              <p>Una operación sencilla, con personas al centro.</p>
            </div>
            <div className="steps">
              <article>
                <span className="step-number">01</span>
                <MessageSquare />
                <h3>Recibe</h3>
                <p>
                  El mensaje entra en una bandeja compartida, junto con el
                  historial del contacto.
                </p>
              </article>
              <span className="step-arrow">
                <MoveRight />
              </span>
              <article>
                <span className="step-number">02</span>
                <Sparkles />
                <h3>Entiende</h3>
                <p>
                  El copiloto usa tu conocimiento aprobado para ayudar a
                  responder y dar contexto.
                </p>
              </article>
              <span className="step-arrow">
                <MoveRight />
              </span>
              <article>
                <span className="step-number">03</span>
                <Users />
                <h3>Acompaña</h3>
                <p>
                  Tu equipo interviene cuando hace falta y la IA deja espacio a
                  la atención humana.
                </p>
              </article>
              <span className="step-arrow">
                <MoveRight />
              </span>
              <article>
                <span className="step-number">04</span>
                <CheckCheck />
                <h3>Avanza</h3>
                <p>
                  Mueve el prospecto, registra una nota y deja preparado su
                  próximo seguimiento.
                </p>
              </article>
            </div>
            <div className="steps-note">
              <ShieldCheck size={18} />
              <p>
                En la demo, los mensajes son simulados. Para operación real, se
                configura la API oficial de WhatsApp con las credenciales de
                cada negocio.
              </p>
            </div>
          </div>
        </section>
        <section className="segments-section section-wrap" id="segmentos">
          <div className="section-heading">
            <p className="eyebrow">03 / HECHO PARA TU NEGOCIO</p>
            <h2>
              La misma base.
              <br />
              Tu forma de trabajar.
            </h2>
            <p>Cambia el segmento. Conserva la claridad.</p>
          </div>
          <div className="segment-list">
            {segments.map(s => (
              <button
                key={s.id}
                className={`segment-row ${segment === s.id ? "is-active" : ""}`}
                onClick={() => setSegment(s.id)}
                aria-expanded={segment === s.id}
              >
                <span className="segment-code">{s.code}</span>
                <div>
                  <h3>{s.name}</h3>
                  {segment === s.id && (
                    <>
                      <p>{s.text}</p>
                      <span className="segment-tags">{s.tags}</span>
                    </>
                  )}
                </div>
                <span className="segment-arrow">
                  {segment === s.id ? <Minus /> : <Plus />}
                </span>
              </button>
            ))}
          </div>
          <p className="segment-footnote">
            Perfiles de ejemplo configurables. No son casos de éxito ni clientes
            de ETC.
          </p>
        </section>
        <section className="cta-section section-wrap">
          <div className="cta-card">
            <span className="eyebrow">
              <span className="status-dot" /> PRUÉBALO, SIN CONECTAR NADA
            </span>
            <h2>
              Que tu próxima
              <br />
              conversación cuente.
            </h2>
            <p>
              Explora la bandeja, prueba la IA y mueve tu primer prospecto.
              <br />
              Todo en un espacio de demostración propio.
            </p>
            <a href="/demo" className="button button-lime">
              Explorar ETC <ArrowUpRight size={20} />
            </a>
            <span className="cta-code">[ ETC / EVERY.THING.COUNTS ]</span>
          </div>
        </section>
        <section className="faq-section section-wrap" id="preguntas">
          <div className="section-heading">
            <p className="eyebrow">04 / SIN LETRA CHIQUITA</p>
            <h2>
              Antes de
              <br />
              conversar.
            </h2>
            <p>Qué puedes probar y qué necesita configuración.</p>
          </div>
          <div className="faq-list">
            {faqs.map(([q, a], i) => (
              <div className={`faq-item ${faq === i ? "is-open" : ""}`} key={q}>
                <button
                  aria-expanded={faq === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setFaq(faq === i ? null : i)}
                >
                  <span>{q}</span>
                  {faq === i ? <Minus size={18} /> : <Plus size={18} />}
                </button>
                {faq === i && <p id={`faq-${i}`}>{a}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <a href="/" aria-label="ETC inicio">
            <Brand />
          </a>
          <p>Cada conversación cuenta.</p>
        </div>
        <div>
          <a href="/demo">
            Explorar demo <ArrowUpRight size={15} />
          </a>
          <a href="/app">
            Espacio privado <ArrowUpRight size={15} />
          </a>
          <a href="/privacidad">Privacidad y alcance</a>
        </div>
        <div className="footer-last">
          <span>ETC — EveryThingCounts</span>
          <span>MVP · Hecho para PyMEs mexicanas</span>
          <small>Sin afiliación ni certificación de Meta implícita.</small>
        </div>
      </footer>
    </div>
  );
}
