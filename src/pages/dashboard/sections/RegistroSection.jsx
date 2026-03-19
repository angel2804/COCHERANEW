import { useEffect, useState } from 'react';
import { EntradaForm } from '../../../components/vehiculos/EntradaForm';
import { SalidaPanel } from '../../../components/vehiculos/SalidaPanel';
import { useAuth } from '../../../context/AuthContext';
import { getActivo } from '../../../services/turnosService';
import { getTrabajadores } from '../../../services/trabajadoresService';
import { Spinner } from '../../../components/ui/Spinner';

export function RegistroSection() {
  const { session } = useAuth();
  const [turno, setTurno] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarTurno(); }, []);

  async function cargarTurno() {
    setLoading(true);
    try {
      const [activoGlobal, workers] = await Promise.all([getActivo(), getTrabajadores()]);
      // Solo usar el turno si pertenece a un trabajador físico registrado
      if (activoGlobal && workers.some(w => w.id === activoGlobal.trabajadorId)) {
        setTurno(activoGlobal);
      } else {
        setTurno(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div className="space-y-3">
      {turno ? (
        <div className="text-sm bg-yellow/10 border border-yellow/30 text-yellow rounded-xl px-4 py-2.5 font-semibold">
          🔄 Registrando en turno activo de: <span className="font-bold">{turno.trabajador}</span>
          <span className="text-xs font-normal ml-2 opacity-80">— {turno.tipo}</span>
        </div>
      ) : (
        <div className="text-sm bg-danger/10 border border-danger/30 text-danger rounded-xl px-4 py-2.5 font-semibold">
          ⚠️ Sin turno activo — los registros no se asignarán a ningún turno
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-display text-lg font-semibold text-accent mb-4">🚗 Registrar Entrada</h3>
          <EntradaForm
            turno={turno}
            sesion={session}
            onEntradaRegistrada={() => setRefreshKey(k => k + 1)}
          />
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-display text-lg font-semibold text-yellow mb-4">🏁 Registrar Salida</h3>
          <SalidaPanel
            turno={turno}
            sesion={session}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </div>
  );
}
