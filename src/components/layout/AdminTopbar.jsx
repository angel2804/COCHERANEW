import { useLocation } from 'react-router-dom';
import { Clock } from '../ui/Clock';
import { DarkModeToggle } from './DarkModeToggle';

const TITULOS = {
  '/dashboard':              'Dashboard',
  '/dashboard/registro':     'Entrada / Salida',
  '/dashboard/cochera':      'En Cochera',
  '/dashboard/historial':    'Historial',
  '/dashboard/estadisticas': 'Estadísticas',
  '/dashboard/usuarios':     'Usuarios',
  '/dashboard/clientes':     'Clientes',
  '/dashboard/reportes':     'Reportes',
  '/dashboard/horarios':     'Horarios',
  '/dashboard/pre-registro': 'Pre-registro',
  '/dashboard/alertas':      'Alertas de Caja',
  '/dashboard/config':       'Configuración',
};

export function AdminTopbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const titulo = TITULOS[pathname] || 'Dashboard';

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border dark:border-border bg-bg2 dark:bg-bg2 flex-shrink-0">
      {/* Hamburger (móvil) + Título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-surface2 text-txt2 hover:text-txt transition-colors"
        >
          ☰
        </button>
        <h2 className="font-display text-lg font-semibold text-txt tracking-wide">{titulo}</h2>
      </div>

      {/* Derecha: reloj + toggle */}
      <div className="flex items-center gap-3">
        <Clock />
        <DarkModeToggle />
      </div>
    </header>
  );
}
