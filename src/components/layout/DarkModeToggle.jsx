import { useDarkMode } from '../../hooks/useDarkMode';

export function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode();
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="p-2 rounded-lg bg-surface2 dark:bg-surface2 hover:bg-border transition-colors text-base"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
