import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ExternalLink,
  FileCode2,
  Layers3,
  MoveRight,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import Brand from "../../components/etc/Brand";
import BrandAttribution from "../../components/etc/BrandAttribution";
import PreferencesControl from "../../components/etc/PreferencesControl";
import { useI18n } from "../../contexts/I18nContext";
import { getResource, resources } from "./resources";
import "./motion-resources.css";

type GuidesProps = { slug?: string };

function ResourceHeader() {
  const { t } = useI18n();
  return (
    <header className="resource-page-header">
      <Link href="/" aria-label={t("ETC inicio")}>
        <Brand />
      </Link>
      <nav aria-label={t("Navegación de recursos")}>
        <Link href="/recursos">{t("Todas las guías")}</Link>
        <Link href="/demo">{t("Explorar demo")}</Link>
        <PreferencesControl compact />
      </nav>
    </header>
  );
}

function ResourceFooter() {
  const { t } = useI18n();
  return (
    <footer className="landing-footer resource-page-footer">
      <div>
        <Link href="/" aria-label={t("ETC inicio")}>
          <Brand />
        </Link>
        <p>{t("Cada conversación cuenta.")}</p>
      </div>
      <div>
        <Link href="/demo">
          {t("Explorar demo")} <ArrowUpRight size={15} />
        </Link>
        <Link href="/privacidad">{t("Privacidad y alcance")}</Link>
        <a
          href="https://www.karmabytesociety.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("KarmaByte Society")} <ExternalLink size={14} />
        </a>
      </div>
      <div className="footer-last">
        <span>{t("ETC — EveryThingCounts")}</span>
        <span>{t("MVP · Hecho para PyMEs mexicanas")}</span>
        <small>{t("Sin afiliación ni certificación de Meta implícita.")}</small>
        <BrandAttribution />
      </div>
    </footer>
  );
}

function ResourceCard({ slug }: { slug: string }) {
  const { t } = useI18n();
  const resource = getResource(slug);
  if (!resource) return null;
  return (
    <article className="resource-card">
      <div className="resource-card-head">
        <span>{t(resource.kind)}</span>
        <span className="resource-card-code">{resource.code}</span>
      </div>
      <h3>{t(resource.title)}</h3>
      <p>{t(resource.summary)}</p>
      <Link className="resource-card-link" href={resource.href}>
        {t(resource.cta)} <ArrowRight size={14} />
      </Link>
    </article>
  );
}

function ResourceIndex() {
  const { t } = useI18n();
  return (
    <div className="resource-page">
      <ResourceHeader />
      <main className="resource-page-main">
        <span className="resource-index-kicker">{t("ETC / RECURSOS")}</span>
        <h1>
          {t("Herramientas claras.")}
          <br />
          {t("Decisiones con contexto.")}
        </h1>
        <p className="resource-page-intro">
          {t(
            "Guías breves para explorar ETC, entender la conexión de WhatsApp, consultar el API y presentar el producto con alcance real."
          )}
        </p>
        <div className="resource-index-grid">
          {resources.map(resource => (
            <ResourceCard key={resource.slug} slug={resource.slug} />
          ))}
        </div>
      </main>
      <ResourceFooter />
    </div>
  );
}

function GuideIllustration({ slug }: { slug: string }) {
  const { t } = useI18n();
  if (slug === "api") {
    return (
      <div className="resource-guide-ascii" aria-hidden="true">
        <FileCode2 size={20} />
        <span>GET /api/etc/contacts</span>
        <span>Authorization: Bearer &lt;TOKEN&gt;</span>
      </div>
    );
  }
  if (slug === "agentes") {
    return (
      <div className="resource-guide-ascii" aria-hidden="true">
        <Sparkles size={20} />
        <span>{t("borrador sugerido")}</span>
        <MoveRight size={15} />
        <span>{t("revisión humana")}</span>
      </div>
    );
  }
  return (
    <div className="resource-guide-ascii" aria-hidden="true">
      <Layers3 size={20} />
      <span>{t("contexto aprobado")}</span>
      <MoveRight size={15} />
      <span>{t("siguiente paso")}</span>
    </div>
  );
}

function GuideDetail({ slug }: { slug: string }) {
  const { t } = useI18n();
  const resource = getResource(slug);
  if (!resource) return <ResourceNotFound />;
  return (
    <div className="resource-page">
      <ResourceHeader />
      <main className="resource-page-main resource-detail">
        <header>
          <span className="resource-detail-kicker">
            {resource.code} / {t(resource.kind)}
          </span>
          <h1>{t(resource.title)}</h1>
          <p className="resource-page-intro">{t(resource.guide.intro)}</p>
        </header>
        <div className="resource-detail-content">
          <div className="resource-detail-copy">
            {resource.guide.paragraphs.map(paragraph => (
              <p key={paragraph}>{t(paragraph)}</p>
            ))}
            <GuideIllustration slug={slug} />
            <section className="resource-checklist">
              <h2>{t("Checklist para llevarlo a la práctica")}</h2>
              <ul>
                {resource.guide.checklist.map(item => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            </section>
            {resource.guide.codeSamples &&
              resource.guide.codeSamples.length > 0 && (
                <section className="resource-code-list">
                  <h2>{t("Ejemplos curl")}</h2>
                  {resource.guide.codeSamples.map(sample => (
                    <article className="resource-code-block" key={sample.title}>
                      <header>
                        <span>{t(sample.title)}</span>
                        <Check size={14} />
                      </header>
                      <pre>{sample.code}</pre>
                      <p>{t(sample.note)}</p>
                    </article>
                  ))}
                </section>
              )}
            <p className="resource-detail-closing">
              {t(resource.guide.closing)}
            </p>
          </div>
          <aside className="resource-detail-aside">
            <span>{t("LECTURA RELACIONADA")}</span>
            <strong>{t("Cada conversación cuenta.")}</strong>
            <p>
              {t(
                "Vuelve a la demo para probar el recorrido con datos ficticios y sin conectar tu número."
              )}
            </p>
            <Link href="/demo">
              {t("Explorar demo")} <ArrowUpRight size={14} />
            </Link>
          </aside>
        </div>
        <div className="resource-detail-footer">
          <Link href="/recursos">
            <ArrowLeft size={15} /> {t("Volver a recursos")}
          </Link>
          <Link href="/">
            {t("Volver a ETC")} <ArrowUpRight size={15} />
          </Link>
        </div>
      </main>
      <ResourceFooter />
    </div>
  );
}

function ResourceNotFound() {
  const { t } = useI18n();
  return (
    <div className="resource-page">
      <ResourceHeader />
      <main className="resource-not-found">
        <span className="resource-detail-kicker">
          404 / {t("Recurso no encontrado")}
        </span>
        <h1>{t("Esta guía no existe.")}</h1>
        <p>{t("Revisa la ruta o vuelve al índice de recursos.")}</p>
        <Link href="/recursos">{t("Ver todas las guías")}</Link>
      </main>
      <ResourceFooter />
    </div>
  );
}

export default function Guides({ slug }: GuidesProps = {}) {
  return slug ? <GuideDetail slug={slug} /> : <ResourceIndex />;
}
