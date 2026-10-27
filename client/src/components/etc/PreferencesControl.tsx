import { Moon, Sun, Languages } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
export default function PreferencesControl({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  return <div className={`etc-preferences ${compact ? 'is-compact' : ''}`}>
    <button type="button" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro')} title={t(theme === 'dark' ? 'Modo claro' : 'Modo oscuro')} aria-pressed={theme === 'dark'}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>
    <label><Languages size={16}/><select value={language} onChange={event => setLanguage(event.target.value === 'en' ? 'en' : 'es')} aria-label={t('Idioma')}><option value="es">ES</option><option value="en">EN</option></select></label>
  </div>;
}
