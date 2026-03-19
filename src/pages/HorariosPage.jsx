import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/ui/ToastContext';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { getTodosLosTrabajadores } from '../services/trabajadoresService';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TURNOS_OPTS = ['Libre', 'Mañana', 'Tarde', 'Noche', 'Todo el día'];

const TURNO_COLOR = {
  'Mañana':     'bg-yellow/10 text-yellow',
  'Tarde':      'bg-accent/10 text-accent',
  'Noche':      'bg-blue/10 text-blue',
  'Todo el día':'bg-danger/10 text-danger',
};

export function HorariosPage() {
  const { showToast } = useToast();
  const [trabajadores, setTrabajadores] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [horarioActual, setHorarioActual] = useState(null);
  const [semana, setSemana] = useState({});
  const [loadingTrab, setLoadingTrab] = useState(true);
  const [loadingHor, setLoadingHor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumen, setResumen] = useState([]);
  const [loadingResumen, setLoadingResumen] = useState(true);

  useEffect(() => {
    cargarTrabajadores();
    cargarResumen();
  }, []);

  async function cargarTrabajadores() {
    setLoadingTrab(true);
    try {
      const lista = await getTodosLosTrabajadores();
      setTrabajadores(lista);
    } catch {
      showToast('Error al cargar trabajadores', 'error');
    } finally {
      setLoadingTrab(false);
    }
  }

  async function cargarHorario(trabajadorId) {
    if (!trabajadorId) { setHorarioActual(null); setSemana({}); return; }
    setLoadingHor(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'horarios'), where('trabajadorId', '==', trabajadorId))
      );
      if (!snap.empty) {
        const d = snap.docs[0];
        setHorarioActual({ id: d.id, ...d.data() });
        setSemana(d.data().semana || {});
      } else {
        setHorarioActual(null);
        setSemana({});
      }
    } catch {
      showToast('Error al cargar horario', 'error');
    } finally {
      setLoadingHor(false);
    }
  }

  async function cargarResumen() {
    setLoadingResumen(true);
    try {
      const snap = await getDocs(collection(db, 'horarios'));
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.trabajador || '').localeCompare(b.trabajador || ''));
      setResumen(lista);
    } catch {} finally {
      setLoadingResumen(false);
    }
  }

  function onSelectTrabajador(id) {
    setSelectedId(id);
    cargarHorario(id);
  }

  function onDiaChange(dia, valor) {
    setSemana(prev => ({ ...prev, [dia]: valor || null }));
  }

  async function guardar() {
    if (!selectedId) return;
    const trabajador = trabajadores.find(t => t.id === selectedId);
    setSaving(true);
    try {
      const data = {
        semana,
        updatedAt: new Date(),
      };
      if (horarioActual) {
        await updateDoc(doc(db, 'horarios', horarioActual.id), data);
      } else {
        const ref = await addDoc(collection(db, 'horarios'), {
          trabajadorId: selectedId,
          trabajador: trabajador?.nombre || '',
          semana,
          creadoEn: new Date(),
        });
        setHorarioActual({ id: ref.id, trabajadorId: selectedId, semana });
      }
      showToast('Horario guardado correctamente', 'success');
      await cargarResumen();
    } catch {
      showToast('Error al guardar horario', 'error');
    } finally {
      setSaving(false);
    }
  }

  const trabajadorSeleccionado = trabajadores.find(t => t.id === selectedId);

  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold text-txt">Gestión de Horarios</h1>

        {/* Selector de trabajador */}
        <div className="bg-surface rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-txt">Editar horario de trabajador</h3>
          {loadingTrab ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <select
              value={selectedId}
              onChange={e => onSelectTrabajador(e.target.value)}
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                         text-txt focus:outline-none focus:border-accent"
            >
              <option value="">-- Selecciona un trabajador --</option>
              {trabajadores.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          )}

          {selectedId && (
            <>
              {loadingHor ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : (
                <>
                  <h4 className="text-sm font-semibold text-txt2">
                    Horario semanal — {trabajadorSeleccionado?.nombre}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left text-xs text-txt3 uppercase tracking-widest py-2 px-2 font-bold">
                            Día
                          </th>
                          <th className="text-left text-xs text-txt3 uppercase tracking-widest py-2 px-2 font-bold">
                            Turno asignado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {DIAS.map((dia, i) => (
                          <tr key={dia} className="border-t border-border/40">
                            <td className="py-2 px-2 font-semibold text-txt2 w-32">
                              {DIAS_LABEL[i]}
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={semana[dia] || ''}
                                onChange={e => onDiaChange(dia, e.target.value)}
                                className="bg-bg2 border border-border rounded-lg px-2 py-1.5
                                           text-txt text-sm focus:outline-none focus:border-accent"
                              >
                                {TURNOS_OPTS.map(opt => (
                                  <option key={opt} value={opt === 'Libre' ? '' : opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="success"
                    onClick={guardar}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? 'Guardando...' : '💾 Guardar Horario'}
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        {/* Resumen de todos los horarios */}
        <div className="bg-surface rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-txt">Resumen de horarios</h3>
          {loadingResumen ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : resumen.length === 0 ? (
            <p className="text-txt3 text-sm">No hay horarios configurados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-txt3 uppercase tracking-widest py-2 px-3 font-bold bg-bg3">
                      Trabajador
                    </th>
                    {DIAS_LABEL.map(d => (
                      <th key={d} className="text-center text-xs text-txt3 uppercase tracking-widest py-2 px-2 font-bold bg-bg3">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumen.map(h => (
                    <tr key={h.id} className="border-b border-border/40">
                      <td className="py-2 px-3 font-semibold text-txt">{h.trabajador || '—'}</td>
                      {DIAS.map(dia => {
                        const turno = h.semana?.[dia] || null;
                        const cls = turno ? TURNO_COLOR[turno] || 'bg-surface2 text-txt2' : '';
                        return (
                          <td key={dia} className="py-2 px-2 text-center">
                            {turno ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
                                {turno}
                              </span>
                            ) : (
                              <span className="text-txt3 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
