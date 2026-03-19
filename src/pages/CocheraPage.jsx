import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/ToastContext';
import { getEnCochera, getTotalEspacios, registrarSalida } from '../services/vehiculosService';
import { getActivo } from '../services/turnosService';
import { fechaStr, calcularTiempo, formatFecha } from '../utils/fecha';
import { formatMonto, calcularCostoEstadia } from '../utils/monto';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export function CocheraPage() {
  const { session, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [autos, setAutos] = useState([]);
  const [totalEspacios, setTotalEspacios] = useState(30);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [ultimaAct, setUltimaAct] = useState('');

  // Modal edicion
  const [editModal, setEditModal] = useState(false);
  const [editAuto, setEditAuto] = useState(null);
  const [editPlaca, setEditPlaca] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editTarifa, setEditTarifa] = useState('');
  const [editMotivo, setEditMotivo] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal salida
  const [salidaModal, setSalidaModal] = useState(false);
  const [salidaAuto, setSalidaAuto] = useState(null);
  const [salidaMonto, setSalidaMonto] = useState('0');
  const [procesandoSalida, setProcesandoSalida] = useState(false);

  // Ticker para tiempo
  const [tick, setTick] = useState(0);
  const tickRef = useRef(null);

  useEffect(() => {
    inicializar();
    tickRef.current = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(tickRef.current);
  }, []);

  async function inicializar() {
    setLoading(true);
    try {
      const [esp, autos] = await Promise.all([
        getTotalEspacios(),
        getEnCochera(),
      ]);
      setTotalEspacios(esp);
      setAutos(autos);
      setUltimaAct(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));

      try { setTurnoActivo(await getActivo()); } catch {}
    } catch (e) {
      showToast('Error al cargar vehículos', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function recargar() {
    try {
      const data = await getEnCochera();
      setAutos(data);
      setUltimaAct(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
    } catch {}
  }

  const autosFiltrados = busqueda
    ? autos.filter(a => a.placa.includes(busqueda.toUpperCase()))
    : autos;

  // ── Modal edición ──────────────────────────────────────────────────────
  function abrirEdicion(auto) {
    const entrada = formatFecha(auto.horaEntrada);
    entrada.setMinutes(entrada.getMinutes() - entrada.getTimezoneOffset());
    setEditAuto(auto);
    setEditPlaca(auto.placa);
    setEditFecha(entrada.toISOString().slice(0, 16));
    setEditTarifa(String((auto.tarifaPactada || 0).toFixed(2)));
    setEditMotivo('');
    setEditModal(true);
  }

  const tarifaCambio = editAuto && Math.abs(parseFloat(editTarifa) - (editAuto?.tarifaPactada || 0)) > 0.01;

  async function guardarEdicion() {
    const nuevaPlaca = editPlaca.trim().toUpperCase();
    const nuevaTarifa = parseFloat(editTarifa) || 0;
    const nuevaFecha = new Date(editFecha);

    if (nuevaPlaca.length < 3) { showToast('Placa inválida (mínimo 3 caracteres)', 'warning'); return; }
    if (!editFecha) { showToast('Ingresa la fecha y hora de entrada', 'warning'); return; }
    if (isNaN(nuevaFecha.getTime()) || nuevaFecha > new Date()) {
      showToast('La fecha de entrada no puede ser futura', 'warning'); return;
    }
    if (nuevaTarifa <= 0) { showToast('La tarifa debe ser mayor a 0', 'warning'); return; }
    if (tarifaCambio && !editMotivo.trim()) {
      showToast('Debes ingresar el motivo del cambio de tarifa', 'warning'); return;
    }

    setSavingEdit(true);
    try {
      const autoId = editAuto.id;
      const placaOriginal = editAuto.placa;
      const placaCambio = nuevaPlaca !== placaOriginal;

      const updates = {
        horaEntrada: nuevaFecha,
        tarifaPactada: nuevaTarifa,
        editadoEn: new Date(),
        editadoPor: session.nombre || session.usuario,
      };
      if (tarifaCambio) {
        updates.tarifaAnterior = editAuto.tarifaPactada || 0;
        updates.motivoCambioTarifa = editMotivo.trim();
      }
      if (placaCambio) updates.placa = nuevaPlaca;

      if (placaCambio) {
        // Verificar que la nueva placa no esté en uso
        const lockSnap = await getDoc(doc(db, 'autos_activos', nuevaPlaca));
        if (lockSnap.exists() && lockSnap.data().autoId !== autoId) {
          showToast(`La placa ${nuevaPlaca} ya está en cochera`, 'warning');
          return;
        }
        await runTransaction(db, async t => {
          t.update(doc(db, 'autos', autoId), updates);
          t.delete(doc(db, 'autos_activos', placaOriginal));
          t.set(doc(db, 'autos_activos', nuevaPlaca), {
            placa: nuevaPlaca, autoId, horaEntrada: nuevaFecha
          });
        });
      } else {
        await updateDoc(doc(db, 'autos', autoId), updates);
      }

      showToast('Registro actualizado', 'success');
      setEditModal(false);
      await recargar();
    } catch (e) {
      showToast('Error al guardar cambios', 'error');
      console.error(e);
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Modal salida ──────────────────────────────────────────────────────
  function abrirSalida(auto) {
    const costo = calcularCostoEstadia(auto.horaEntrada, auto.tarifaPactada, auto.cobradoAlIngreso ? (auto.montoIngreso || 0) : 0);
    setSalidaAuto(auto);
    setSalidaMonto(String(costo.toFixed(2)));
    setSalidaModal(true);
  }

  async function procesarSalida() {
    if (!salidaAuto) return;
    const monto = parseFloat(salidaMonto) || 0;
    setProcesandoSalida(true);
    try {
      const resultado = await registrarSalida(salidaAuto.id, monto, turnoActivo, session);
      showToast(`Salida registrada: ${resultado.placa}`, 'success');
      setSalidaModal(false);
      await recargar();
    } catch (e) {
      if (e.message === 'ya_salio') showToast('Este vehículo ya registró salida', 'warning');
      else showToast('Error al registrar salida', 'error');
      await recargar();
    } finally {
      setProcesandoSalida(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg dark:bg-bg p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold text-txt">Vehículos en Cochera</h1>
          <Button variant="secondary" onClick={recargar} className="text-sm">
            Actualizar
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-2xl p-4 text-center">
            <div className="font-display text-2xl font-bold text-accent">{autos.length}</div>
            <div className="text-xs text-txt3 mt-1">En cochera</div>
          </div>
          <div className="bg-surface rounded-2xl p-4 text-center">
            <div className="font-display text-2xl font-bold text-txt">
              {Math.max(0, totalEspacios - autos.length)}
            </div>
            <div className="text-xs text-txt3 mt-1">Disponibles</div>
          </div>
          <div className="bg-surface rounded-2xl p-4 text-center">
            <div className="font-display text-2xl font-bold text-txt2">{totalEspacios}</div>
            <div className="text-xs text-txt3 mt-1">Total</div>
          </div>
        </div>

        {ultimaAct && (
          <p className="text-xs text-txt3">Actualizado: {ultimaAct}</p>
        )}

        {/* Búsqueda */}
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por placa..."
          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5
                     text-txt text-sm focus:outline-none focus:border-accent font-mono
                     placeholder-txt3 uppercase"
        />

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : autosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-txt3">
            <div className="text-4xl mb-3">🅿️</div>
            <p>No hay vehículos en cochera en este momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {autosFiltrados.map(auto => {
              const entrada = formatFecha(auto.horaEntrada);
              const entStr = entrada.toLocaleString('es-PE', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              });
              return (
                <div key={auto.id}
                  className="bg-surface rounded-2xl p-4 border border-border">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-lg text-txt tracking-widest">
                          {auto.placa}
                        </span>
                        {auto.esPreRegistro && (
                          <span className="text-xs bg-yellow/10 text-yellow px-2 py-0.5 rounded-full font-bold">
                            PRE
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-txt2 mt-0.5">
                        {auto.tipo} · {auto.clienteNombre || '—'}
                      </div>
                      {auto.clienteCelular && (
                        <div className="text-xs text-txt3 font-mono">{auto.clienteCelular}</div>
                      )}
                      <div className="text-xs text-txt3 mt-1">
                        Entrada: {entStr} · {auto.trabajadorEntrada || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow font-bold font-mono text-sm">
                        {calcularTiempo(auto.horaEntrada)}
                      </div>
                      {auto.tarifaPactada > 0 && (
                        <div className="text-xs text-accent">
                          {formatMonto(auto.tarifaPactada)}/día
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button variant="secondary" onClick={() => abrirEdicion(auto)} className="text-xs px-3 py-1.5">
                      ✏️ Editar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal edición */}
      <Modal
        open={editModal}
        title="✏️ Editar Registro"
        onClose={() => setEditModal(false)}
        buttons={[
          { label: savingEdit ? 'Guardando...' : 'Guardar cambios', variant: 'success', onClick: guardarEdicion, disabled: savingEdit },
          { label: 'Cancelar', variant: 'secondary', onClick: () => setEditModal(false) },
        ]}
      >
        <div className="space-y-3">
          <div className="bg-yellow/5 border border-yellow/20 rounded-lg px-3 py-2 text-xs text-yellow font-semibold">
            ✏️ Editando {editAuto?.placa}. Los cambios quedan auditados.
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-txt3 mb-1">Placa</label>
            <input
              type="text"
              value={editPlaca}
              onChange={e => setEditPlaca(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                         text-txt font-mono uppercase focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-txt3 mb-1">Fecha y hora de entrada</label>
            <input
              type="datetime-local"
              value={editFecha}
              onChange={e => setEditFecha(e.target.value)}
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                         text-txt focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-txt3 mb-1">Tarifa por día (S/)</label>
            <input
              type="number"
              value={editTarifa}
              onChange={e => setEditTarifa(e.target.value)}
              min="0"
              step="0.50"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                         text-txt font-mono focus:outline-none focus:border-accent"
            />
          </div>
          {tarifaCambio && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-yellow mb-1">
                ⚠️ Motivo del cambio de tarifa (obligatorio)
              </label>
              <textarea
                value={editMotivo}
                onChange={e => setEditMotivo(e.target.value)}
                rows={2}
                placeholder="Explica el motivo del cambio de tarifa..."
                className="w-full bg-bg2 border border-yellow/40 rounded-xl px-3 py-2.5
                           text-txt text-sm focus:outline-none focus:border-yellow resize-none"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Modal salida */}
      <Modal
        open={salidaModal}
        title="🏁 Registrar Salida"
        onClose={() => setSalidaModal(false)}
        buttons={[
          { label: procesandoSalida ? 'Procesando...' : 'Confirmar Salida', variant: 'warning', onClick: procesarSalida, disabled: procesandoSalida },
          { label: 'Cancelar', variant: 'secondary', onClick: () => setSalidaModal(false) },
        ]}
      >
        {salidaAuto && (
          <div className="space-y-4">
            <div className="font-mono font-bold text-xl text-txt tracking-widest">
              {salidaAuto.placa}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-txt3 uppercase font-bold tracking-widest mb-0.5">Tipo</div>
                <div className="font-semibold text-txt">{salidaAuto.tipo}</div>
              </div>
              <div>
                <div className="text-xs text-txt3 uppercase font-bold tracking-widest mb-0.5">Cliente</div>
                <div className="font-semibold text-txt">{salidaAuto.clienteNombre}</div>
              </div>
              <div>
                <div className="text-xs text-txt3 uppercase font-bold tracking-widest mb-0.5">Tiempo</div>
                <div className="font-semibold text-yellow">{calcularTiempo(salidaAuto.horaEntrada)}</div>
              </div>
              <div>
                <div className="text-xs text-txt3 uppercase font-bold tracking-widest mb-0.5">Cobrado ingreso</div>
                <div className="font-semibold text-accent">
                  {salidaAuto.cobradoAlIngreso ? formatMonto(salidaAuto.montoIngreso || 0) : 'Sin cobro'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-txt3 mb-1">
                Monto de salida (S/)
              </label>
              <input
                type="number"
                value={salidaMonto}
                onChange={e => setSalidaMonto(e.target.value)}
                min="0"
                step="0.50"
                className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                           text-txt font-mono text-lg focus:outline-none focus:border-accent"
              />
              <p className="text-xs text-txt3 mt-1">Dejar en 0 si no se cobra en la salida</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
