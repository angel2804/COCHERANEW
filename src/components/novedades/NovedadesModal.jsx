import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

const VERSION = 'v5.0';

const NOVEDADES = [
  {
    icon: '🎨',
    title: 'Nueva paleta teal + ámbar con modo claro/oscuro',
    desc: 'Diseño renovado en todos los paneles (admin, trabajador y desarrollador). Cambia entre modo oscuro y claro con el botón ☀️/🌙.',
    color: 'border-accent',
  },
  {
    icon: '👷',
    title: 'Sistema multi-trabajador',
    desc: 'Al iniciar sesión como trabajador aparece una pantalla para elegir quién está trabajando. Cada persona gestiona su propio turno y reporte.',
    color: 'border-yellow',
  },
  {
    icon: '💰',
    title: 'Mi Turno: cobros, método de pago y llave',
    desc: 'En la pestaña "Mi Turno" el trabajador ve todos sus cobros del turno actual, el método de pago de cada uno y si el cliente dejó llave.',
    color: 'border-blue',
  },
  {
    icon: '✏️',
    title: 'Editar y anular cobros con motivo',
    desc: 'Desde Mi Turno se puede editar el monto/método o anular un cobro. Se requiere escribir el motivo y la notificación llega al admin en tiempo real.',
    color: 'border-danger',
  },
  {
    icon: '🔔',
    title: 'Notificaciones en tiempo real para el admin',
    desc: 'La campana en la barra superior del admin muestra las anulaciones y ediciones hechas por los trabajadores. Se pueden borrar individualmente o todas a la vez.',
    color: 'border-accent',
  },
  {
    icon: '📋',
    title: 'Historial mejorado: trabajador, páginas y Excel',
    desc: 'El historial ahora muestra el nombre del trabajador, tiene paginación de 20 registros y exporta a Excel con filtros automáticos.',
    color: 'border-yellow',
  },
];

export function NovedadesModal() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    const userId = session.id || session.usuario || 'guest';
    const key = `cochera_novedades_${VERSION}_${userId}`;
    const timer = setTimeout(() => {
      if (!localStorage.getItem(key)) setOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [session]);

  function cerrar() {
    const userId = session?.id || session?.usuario || 'guest';
    localStorage.setItem(`cochera_novedades_${VERSION}_${userId}`, '1');
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      titulo={`✨ Novedades ${VERSION}`}
      onClose={cerrar}
      botones={[{ texto: '¡Entendido!', clase: 'btn-success', onClick: cerrar }]}
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🚀</span>
          <div>
            <div className="font-bold text-accent">Gran actualización {VERSION}</div>
            <div className="text-txt3 text-xs">Revisa las mejoras implementadas en el sistema</div>
          </div>
        </div>
        {NOVEDADES.map((n, i) => (
          <div key={i} className={`bg-surface2 rounded-xl p-3 border-l-4 ${n.color}`}>
            <div className="font-bold text-txt mb-1">{n.icon} {n.title}</div>
            <div className="text-txt3 text-xs">{n.desc}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
