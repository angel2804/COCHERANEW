import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';

const VERSION = 'v4.1';
const KEY = `cochera_novedades_${VERSION}`;

export function NovedadesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!localStorage.getItem(KEY)) setOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  function cerrar() {
    localStorage.setItem(KEY, '1');
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
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🚀</span>
          <div>
            <div className="font-bold text-accent">Actualización {VERSION} disponible</div>
            <div className="text-txt3 text-xs">Revisa las mejoras implementadas en el sistema</div>
          </div>
        </div>
        {[
          { icon: '💵', title: 'Métodos de pago: Efectivo, Yape y Visa', desc: 'Al registrar una entrada o salida puedes elegir cómo pagó el cliente. Los reportes y el arqueo muestran el desglose por método.', color: 'border-accent' },
          { icon: '🔑', title: 'Botón "Dejó llave"', desc: 'Al ingresar un vehículo puedes marcar si el cliente dejó la llave en la cochera. Queda registrado en el historial.', color: 'border-yellow' },
          { icon: '📊', title: 'Dashboard con ingresos por método', desc: 'La pantalla principal muestra cuánto se cobró en Efectivo, Yape y Visa durante el día.', color: 'border-blue' },
          { icon: '🖨️', title: 'Impresión de reporte mejorada', desc: 'Al imprimir el reporte de turno ahora se ve igual que el PDF: bien cuadrado en hoja A4.', color: 'border-danger' },
        ].map((n, i) => (
          <div key={i} className={`bg-surface2 dark:bg-surface2 rounded-xl p-3 border-l-4 ${n.color}`}>
            <div className="font-bold text-txt mb-1">{n.icon} {n.title}</div>
            <div className="text-txt3 text-xs">{n.desc}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
