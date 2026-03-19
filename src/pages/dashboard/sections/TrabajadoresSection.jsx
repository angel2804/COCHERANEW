import { useEffect, useState } from 'react';
import {
  getTodosLosTrabajadores, crearTrabajador,
  actualizarTrabajador, desactivarTrabajador, reactivarTrabajador,
} from '../../../services/trabajadoresService';
import { useToast } from '../../../components/ui/ToastContext';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';

export function TrabajadoresSection() {
  const { showToast } = useToast();
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      setTrabajadores(await getTodosLosTrabajadores());
    } catch {
      showToast('Error al cargar trabajadores', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!nuevoNombre.trim()) { showToast('Ingresa un nombre', 'warning'); return; }
    setCreando(true);
    try {
      const nuevo = await crearTrabajador(nuevoNombre);
      setTrabajadores(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNuevoNombre('');
      showToast(`Trabajador "${nuevo.nombre}" agregado`, 'success');
    } catch {
      showToast('Error al agregar trabajador', 'error');
    } finally {
      setCreando(false);
    }
  }

  async function handleGuardarEdit(id) {
    if (!editNombre.trim()) { showToast('El nombre no puede estar vacío', 'warning'); return; }
    try {
      await actualizarTrabajador(id, editNombre);
      setTrabajadores(prev =>
        prev.map(t => t.id === id ? { ...t, nombre: editNombre.trim() } : t)
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setEditandoId(null);
      showToast('Nombre actualizado', 'success');
    } catch {
      showToast('Error al actualizar', 'error');
    }
  }

  async function handleToggleActivo(trabajador) {
    const accion = trabajador.activo ? desactivarTrabajador : reactivarTrabajador;
    const label  = trabajador.activo ? 'desactivado' : 'reactivado';
    try {
      await accion(trabajador.id);
      setTrabajadores(prev =>
        prev.map(t => t.id === trabajador.id ? { ...t, activo: !t.activo } : t)
      );
      showToast(`"${trabajador.nombre}" ${label}`, 'success');
    } catch {
      showToast('Error al cambiar estado', 'error');
    }
  }

  const activos    = trabajadores.filter(t => t.activo);
  const inactivos  = trabajadores.filter(t => !t.activo);

  return (
    <div className="space-y-6 max-w-lg">
      <h3 className="font-display text-lg font-semibold text-txt">Trabajadores</h3>
      <p className="text-xs text-txt3">
        Estas son las personas físicas que usarán la cuenta "trabajador". Sus nombres aparecen en la
        pantalla de selección al iniciar turno.
      </p>

      {/* Agregar nuevo */}
      <div className="bg-surface rounded-2xl p-5 space-y-3 border border-border">
        <h4 className="text-sm font-semibold text-txt3 uppercase tracking-widest">Agregar trabajador</h4>
        <form onSubmit={handleCrear} className="flex gap-2">
          <input
            type="text"
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            placeholder="Nombre del trabajador"
            className="flex-1 bg-bg2 border border-border rounded-xl px-3 py-2.5 text-txt text-sm focus:outline-none focus:border-accent"
          />
          <Button type="submit" variant="success" disabled={creando}>
            {creando ? <Spinner size="sm" /> : '+ Agregar'}
          </Button>
        </form>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          {activos.length === 0 && inactivos.length === 0 ? (
            <p className="text-center text-txt3 py-8 text-sm">No hay trabajadores registrados aún.</p>
          ) : (
            <>
              {activos.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                    {t.nombre[0].toUpperCase()}
                  </div>
                  {editandoId === t.id ? (
                    <input
                      autoFocus
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleGuardarEdit(t.id); if (e.key === 'Escape') setEditandoId(null); }}
                      className="flex-1 bg-bg2 border border-accent/50 rounded-lg px-2 py-1.5 text-sm text-txt focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 font-semibold text-txt">{t.nombre}</span>
                  )}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {editandoId === t.id ? (
                      <>
                        <Button variant="success" className="text-xs px-2 py-1" onClick={() => handleGuardarEdit(t.id)}>✓</Button>
                        <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setEditandoId(null)}>✕</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => { setEditandoId(t.id); setEditNombre(t.nombre); }}>
                          ✏️
                        </Button>
                        <Button variant="danger" className="text-xs px-2 py-1" onClick={() => handleToggleActivo(t)}>
                          Desactivar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {inactivos.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-bg3 text-xs font-bold text-txt3 uppercase tracking-widest">
                    Inactivos
                  </div>
                  {inactivos.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 opacity-50">
                      <div className="w-9 h-9 rounded-full bg-bg3 flex items-center justify-center text-txt3 font-bold text-sm flex-shrink-0">
                        {t.nombre[0].toUpperCase()}
                      </div>
                      <span className="flex-1 text-txt3 line-through">{t.nombre}</span>
                      <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => handleToggleActivo(t)}>
                        Reactivar
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
