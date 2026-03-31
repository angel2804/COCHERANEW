import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_PRINCIPAL = [
  { to: '/dashboard',              label: 'Dashboard',        icon: '📊' },
  { to: '/dashboard/registro',     label: 'Entrada / Salida', icon: '🚗' },
  { to: '/dashboard/cochera',      label: 'En Cochera',       icon: '🅿' },
  { to: '/dashboard/historial',    label: 'Historial',        icon: '📋' },
];

const NAV_ADMIN = [
  { to: '/dashboard/trabajadores',  label: 'Trabajadores',   icon: '👷' },
  { to: '/dashboard/clientes',      label: 'Clientes',       icon: '📇' },
  { to: '/dashboard/reportes',      label: 'Reportes',       icon: '📄' },
  { to: '/dashboard/horarios',      label: 'Horarios',       icon: '📅' },
];

const NAV_DEV = [
  { to: '/dashboard/usuarios',  label: 'Usuarios',       icon: '👥' },
  { to: '/dashboard/config',    label: 'Configuración',  icon: '⚙️' },
  { to: '/dashboard/backups',   label: 'Backups',        icon: '💾' },
];

function NavItem({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
        ${isActive
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-txt2 hover:bg-surface2 hover:text-txt'
        }`
      }
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export function AdminSidebar({ open, onClose }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const isDev = session?.rol === 'desarrollador';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50 w-64 bg-bg2 border-r border-border
        flex flex-col overflow-hidden transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-5 py-5 border-b border-border">
          <div className="font-display text-xl font-bold text-txt tracking-wider">🅿 COCHERA POS</div>
          <div className="text-xs text-txt3 mt-0.5">Panel de Administración</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="text-[10px] font-bold text-txt3 uppercase tracking-wider px-3 mb-2">Principal</div>
          {NAV_PRINCIPAL.map(n => (
            <NavItem key={n.to} {...n} end={n.to === '/dashboard'} />
          ))}

          <div className="text-[10px] font-bold text-txt3 uppercase tracking-wider px-3 mt-5 mb-2">Administración</div>
          {NAV_ADMIN.map(n => (
            <NavItem key={n.to} {...n} />
          ))}

          {isDev && (
            <>
              <div className="text-[10px] font-bold text-txt3 uppercase tracking-wider px-3 mt-5 mb-2">Desarrollador</div>
              {NAV_DEV.map(n => (
                <NavItem key={n.to} {...n} />
              ))}
            </>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
              {(session?.nombre || session?.usuario || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-txt truncate">{session?.nombre || session?.usuario}</div>
              <div className="text-xs text-txt3 capitalize">{session?.rol}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm
              bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 transition-colors font-semibold"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
