import { faLinkedinIn, faInstagram, faFacebookF, faGoogle, type IconDefinition } from '@fortawesome/free-brands-svg-icons';
import { useI18n } from '../../contexts/I18nContext';
const links: { name: string; href: string; icon: IconDefinition }[] = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/karmabyte-society-ai-agency-automation/', icon: faLinkedinIn },
  { name: 'Instagram', href: 'https://www.instagram.com/karmabytesocietyagency/', icon: faInstagram },
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61594707387349', icon: faFacebookF },
];
export default function BrandAttribution() {
  const { t } = useI18n();
  return <div className="etc-attribution"><span>{t('Hecho por')} <a href="https://www.karmabytesociety.com" target="_blank" rel="noopener noreferrer">KarmaByte Society <span aria-hidden="true">↗</span></a></span><div className="etc-social-links">{links.map(item => <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.name} — KarmaByte Society`} title={item.name}><svg viewBox={`0 0 ${item.icon.icon[0]} ${item.icon.icon[1]}`} aria-hidden="true" focusable="false">{(Array.isArray(item.icon.icon[4]) ? item.icon.icon[4] : [item.icon.icon[4]]).map((d, i) => <path key={i} d={d}/>)}</svg></a>)}<span className="social-pending" role="img" aria-label={t('Google: enlace pendiente de confirmar')} title={t('Google: enlace pendiente de confirmar')}><svg viewBox={`0 0 ${faGoogle.icon[0]} ${faGoogle.icon[1]}`} aria-hidden="true"><path d={faGoogle.icon[4] as string}/></svg></span></div></div>;
}
