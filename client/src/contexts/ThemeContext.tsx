import React, { createContext, useContext, useEffect, useState } from 'react';
type Theme = 'light' | 'dark';
interface ThemeContextType { theme: Theme; toggleTheme?: () => void; switchable: boolean; }
const ThemeContext = createContext<ThemeContextType>({ theme: 'light', switchable: false });
interface ThemeProviderProps { children: React.ReactNode; defaultTheme?: Theme; switchable?: boolean; }
export function ThemeProvider({ children, defaultTheme = 'light', switchable = true }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (!switchable || typeof window === 'undefined') return defaultTheme;
    try { const value = localStorage.getItem('etc-theme'); return value === 'light' || value === 'dark' ? value : defaultTheme; } catch { return defaultTheme; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    if (switchable) { try { localStorage.setItem('etc-theme', theme); } catch { /* Keep preference in memory. */ } }
  }, [theme, switchable]);
  const toggleTheme = switchable ? () => setTheme(value => value === 'light' ? 'dark' : 'light') : undefined;
  return <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
