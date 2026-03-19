import { useCallback, useEffect, useState } from 'react';

/**
 * Hook para manejar el modo oscuro/claro.
 * - Por defecto: modo oscuro (clase 'dark' en <html>)
 * - Persiste en localStorage('darkMode')
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== 'light'; // dark es el default
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = useCallback(() => setIsDark(v => !v), []);

  return { isDark, toggle };
}
