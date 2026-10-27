import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Brand from '../components/etc/Brand';
export default function NotFound() {
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex';
    document.head.appendChild(robots);
    if (window.location.pathname.replace(/\/$/, '') !== '/404') window.location.replace('/404');
    return () => robots.remove();
  }, []);
  return <main className="privacy-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}><Brand /><p className="eyebrow" style={{ marginTop: 45 }}>ETC / 404</p><h1 style={{ marginTop: 20 }}>Esta página no está<br />en la conversación.</h1><p>La dirección no existe o ya no está disponible.</p><a href="/" className="button" style={{ marginTop: 18, textDecoration: 'none', color: '#fff' }}><ArrowLeft size={16} /> Volver a ETC</a></main>;
}
