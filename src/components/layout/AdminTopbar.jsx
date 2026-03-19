import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock } from '../ui/Clock';
import { DarkModeToggle } from './DarkModeToggle';
import { suscribirNotificaciones, borrarNotificacion } from '../../services/notificacionesService';

const TITULOS = {
  '/dashboard':              'Dashboard',
  '/dashboard/registro':     'Entrada / Salida',
  '/dashboard/cochera':      'En Cochera',
  '/dashboard/historial':    'Historial',
  '/dashboard/trabajadores': 'Trabajadores',
  '/dashboard/usuarios':     'Usuarios',
  '/dashboard/clientes':     'Clientes',
  '/dashboard/reportes':     'Reportes',
  '/dashboard/horarios':     'Horarios',
  '/dashboard/config':       'Configuración',
};

function fechaRelativa(fecha) {
  if (!fecha) return '';
  const d = fecha?.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString('es-PE');
}

export function AdminTopbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const titulo = TITULOS[pathname] || 'Dashboard';

  const [notifs, setNotifs] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const unsub = suscribirNotificaciones(lista => setNotifs(lista));
    return () => unsub();
  }, []);

  // Cerrar panel al hacer click fuera
  useEffect(() => {
    function onClickOut(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [panelOpen]);

  const count = notifs.length;

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-bg2 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-surface2 text-txt2 hover:text-txt transition-colors"
        >☰</button>
        <h2 className="font-display text-lg font-semibold text-txt tracking-wide">{titulo}</h2>
      </div>

      <div className="flex items-center gap-3">
        <Clock />

        {/* Campana de notificaciones */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen(v => !v)}
            className="relative p-2 rounded-lg hover:bg-surface2 transition-colors text-txt2 hover:text-txt"
            title="Notificaciones de trabajadores"
          >
            🔔
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="font-display font-semibold text-txt text-sm">
                  Notificaciones {count > 0 && <span className="text-danger">({count})</span>}
                </span>
                {count > 0 && (
                  <button
                    onClick={async () => {
                      for (const n of notifs) await borrarNotificacion(n.id).catch(() => {});
                    }}
                    className="text-xs text-txt3 hover:text-danger transition-colors"
                  >Borrar todas</button>
                )}
              </div>

              {count === 0 ? (
                <div className="px-4 py-6 text-center text-txt3 text-sm">Sin notificaciones pendientes</div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                  {notifs.map(n => (
                    <div key={n.id} className="px-4 py-3 hover:bg-surface2 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                              ${n.tipo === 'anulacion' ? 'bg-danger/15 text-danger' : 'bg-blue/15 text-blue'}`}>
                              {n.tipo === 'anulacion' ? 'Anulación' : 'Edición'}
                            </span>
                            <span className="font-mono font-bold text-txt text-xs">{n.placa}</span>
                          </div>
                          <p className="text-xs text-txt2 mb-1">
                            <span className="font-semibold">{n.trabajador}</span>
                            {n.tipo === 'anulacion'
                              ? ` anuló un cobro de ${n.montoOriginal != null ? `S/. ${n.montoOriginal}` : ''}`
                              : ` editó de S/. ${n.montoOriginal} → S/. ${n.montoNuevo}`
                            }
                            {n.clienteNombre && ` · ${n.clienteNombre}`}
                          </p>
                          <p className="text-xs text-txt3 italic">"{n.motivo}"</p>
                          <p className="text-[10px] text-txt3 mt-1">{fechaRelativa(n.fecha)}</p>
                        </div>
                        <button
                          onClick={() => borrarNotificacion(n.id).catch(() => {})}
                          className="text-txt3 hover:text-danger text-xl leading-none flex-shrink-0 mt-0.5 transition-colors"
                          title="Borrar notificación"
                        >×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DarkModeToggle />
      </div>
    </header>
  );
}
