import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, Mail, ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import Brand from '../../components/etc/Brand';
import BrandAttribution from '../../components/etc/BrandAttribution';
import PreferencesControl from '../../components/etc/PreferencesControl';
import { useI18n } from '../../contexts/I18nContext';
import { saveAccountToken } from '../../lib/etc-account';
import { startLogin } from '../../const';
import { SEGMENTS, SEGMENT_NAMES, BUSINESS_TYPES, BUSINESS_TYPE_NAMES, type BusinessType } from '@shared/etc/segments';
import type { Segment } from '@shared/etc/types';

type AccessMode = 'login' | 'register' | 'forgot' | 'reset';
export default function Access({ mode = 'login' }: { mode?: AccessMode }) {
  const { t, language } = useI18n();
  const [, navigate] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mailEnabled, setMailEnabled] = useState<boolean | null>(null);
  const [segment, setSegment] = useState<Segment>('servicios');
  const [businessType, setBusinessType] = useState<BusinessType>('general');
  const [resetToken] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('token') || '');
  useEffect(() => {
    let active = true;
    fetch('/api/etc/auth/status').then(response => response.json()).then(body => { if (active) setMailEnabled(Boolean(body.emailEnabled)); }).catch(() => { if (active) setMailEnabled(null); });
    return () => { active = false; };
  }, []);
  const title = mode === 'register' ? 'Tu negocio empieza aquí.' : mode === 'forgot' ? 'Recupera tu acceso.' : mode === 'reset' ? 'Una nueva contraseña.' : 'Cada día, todo cuenta.';
  const subtitle = mode === 'register' ? 'Crea tu espacio privado. Tus datos, tu operación y tu asistente.' : mode === 'forgot' ? 'Te ayudamos a restablecer tu contraseña de forma segura.' : mode === 'reset' ? 'Elige una contraseña nueva para tu espacio privado.' : 'Entra a tu frontdesk y continúa donde lo dejaste.';
  const action = mode === 'register' ? 'Crear cuenta' : mode === 'forgot' ? 'Solicitar enlace' : mode === 'reset' ? 'Guardar nueva contraseña' : 'Iniciar sesión';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setError('');
    if ((mode === 'register' || mode === 'reset') && password !== confirm) { setError(t('Las contraseñas no coinciden.')); return; }
    if (mode !== 'forgot' && (mode === 'register' || mode === 'reset') && password.length < 12) { setError(t('Usa al menos 12 caracteres.')); return; }
    if (mode === 'reset' && !resetToken) { setError(t('El enlace no es válido. Solicita uno nuevo.')); return; }
    setPending(true);
    try {
      const endpoint = mode === 'register' ? 'register' : mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : 'login';
      const payload = mode === 'register' ? { name: name.trim(), email: email.trim(), password, segment, businessType: segment === 'pymes' ? businessType : 'general', language } : mode === 'forgot' ? { email: email.trim(), frontendOrigin: window.location.origin, language } : mode === 'reset' ? { token: resetToken, password, language } : { email: email.trim(), password, language };
      const response = await fetch(`/api/etc/auth/${endpoint}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-ETC-Intent': 'workspace', 'Accept-Language': language }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(t(typeof body.error === 'string' ? body.error : 'No se pudo completar la solicitud.'));
      if (mode === 'login' || mode === 'register') {
        if (typeof body.token !== 'string' || !body.token) throw new Error(t('La sesión no devolvió una credencial válida.'));
        saveAccountToken(body.token); setPassword(''); setConfirm(''); navigate('/app');
      } else { setSuccess(true); setPassword(''); setConfirm(''); if (mode === 'reset') window.history.replaceState({}, '', '/reset-password'); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('No se pudo completar la solicitud.')); }
    finally { setPending(false); }
  };
  return <div className="etc-access">
    <header className="access-header"><Link href="/" aria-label="ETC"><Brand/></Link><PreferencesControl/></header>
    <main className="access-main">
      <section className="access-intro"><p className="eyebrow"><span className="status-dot"/> ETC / FRONTDESK</p><h1>{t(title)}</h1><p>{t(subtitle)}</p><div className="access-line-art" aria-hidden="true"><span>[ ETC ]</span><i/><small>EVERY.THING.COUNTS</small></div><div className="access-security"><ShieldCheck size={20}/><span>{t('La IA ayuda. Tu equipo decide.')}</span></div><Link href="/demo" className="access-demo">{t('Primero quiero explorar la demo')} <ArrowUpRight size={16}/></Link></section>
      <section className="access-panel" aria-label={t(action)}>
        <div className="access-panel-icon">{mode === 'forgot' ? <Mail size={23}/> : <LockKeyhole size={23}/>}</div>
        <h2>{t(mode === 'login' ? 'Tu espacio privado' : mode === 'register' ? 'Crear cuenta' : mode === 'forgot' ? '¿Olvidaste tu contraseña?' : 'Restablecer contraseña')}</h2>
        <p className="access-panel-note">{t(mode === 'login' ? 'Usa el email y la contraseña de tu cuenta ETC.' : mode === 'register' ? 'La cuenta se crea sin mezclar datos de otros espacios.' : 'Nunca enviamos tu contraseña por correo.')}</p>
        {success ? <div className="access-success" role="status"><ShieldCheck size={30}/><h3>{t(mode === 'reset' ? 'Contraseña actualizada.' : 'Solicitud registrada.')}</h3><p>{t(mode === 'reset' ? 'Las sesiones anteriores se cerraron. Entra de nuevo con tu nueva contraseña.' : mailEnabled === false ? 'El envío de correos aún no está configurado. Tu administrador debe habilitarlo para entregar el enlace.' : 'Si ese email está registrado y el servicio de correo está disponible, recibirás un enlace de restablecimiento.')}</p><Link href="/login" className="button">{t('Volver al acceso')} <ArrowUpRight size={17}/></Link></div> : <form onSubmit={submit} className="access-form">
          {mode === 'register' && <label>{t('Nombre del negocio o responsable')}<input value={name} onChange={event => setName(event.target.value)} maxLength={160} autoComplete="organization" required placeholder={t('Tu nombre o negocio')}/></label>}
          {mode !== 'reset' && <label>{t('Email')}<div className="access-input-icon"><Mail size={17}/><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={320} required placeholder="nombre@tuempresa.com"/></div></label>}
          {mode !== 'forgot' && <><label>{t('Contraseña')}<div className="access-password"><input type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? undefined : 12} maxLength={128} required placeholder={mode === 'login' ? '••••••••••••' : t('Al menos 12 caracteres')}/><button type="button" onClick={() => setVisible(value => !value)} aria-pressed={visible} aria-label={t(visible ? 'Ocultar contraseña' : 'Mostrar contraseña')}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>{mode !== 'login' && <label>{t('Confirmar contraseña')}<input type={visible ? 'text' : 'password'} value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required/></label>}</>}
          {mode === 'register' && <><label>{t('Segmento')}<select value={segment} onChange={event => setSegment(event.target.value as Segment)}>{SEGMENTS.map(value => <option value={value} key={value}>{SEGMENT_NAMES[value][language]}</option>)}</select></label>{segment === 'pymes' && <label>{t('Tipo de negocio')}<select value={businessType} onChange={event => setBusinessType(event.target.value as BusinessType)}>{BUSINESS_TYPES.map(value => <option key={value} value={value}>{BUSINESS_TYPE_NAMES[value][language]}</option>)}</select></label>}<p className="access-help">{t('Tu cuenta inicia con un espacio propio. La verificación del correo y recuperación requieren el servicio de email configurado.')}</p></>}
          {mode === 'login' && <Link href="/forgot-password" className="access-forgot">{t('¿Olvidaste tu contraseña?')}</Link>}
          {mode === 'forgot' && mailEnabled === false && <div className="access-mail-note"><Mail size={16}/><span>{t('Envío de correos pendiente de configuración. No se simulará una entrega.')}</span></div>}
          {mode === 'reset' && !resetToken && <div className="access-error" role="alert">{t('El enlace no es válido. Solicita uno nuevo.')} <Link href="/forgot-password">{t('Solicitar enlace')}</Link></div>}
          {error && <p className="access-error" role="alert">{error}</p>}
          <button type="submit" className="button access-submit" disabled={pending || (mode === 'reset' && !resetToken)}>{pending ? <LoaderCircle size={18} className="crm-spin"/> : null}{t(pending ? 'Procesando…' : action)} {!pending && <ArrowUpRight size={18}/>}</button>
        </form>}
        {mode === 'login' && <><div className="access-divider"><span>{t('o continúa con')}</span></div><button type="button" className="access-oauth" onClick={() => startLogin()}>{t('Manus · acceso a tus espacios existentes')} <ArrowUpRight size={15}/></button><p className="access-account-link">{t('¿Aún no tienes una cuenta?')} <Link href="/register">{t('Crear cuenta')}</Link></p></>}
        {mode !== 'login' && <Link className="access-back" href="/login"><ArrowLeft size={15}/>{t('Volver al acceso')}</Link>}
      </section>
    </main><footer className="access-footer"><BrandAttribution/></footer>
  </div>;
}
