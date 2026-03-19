import { useEffect, useRef, useState } from 'react';
import { FormInput, FormTextarea } from '../ui/FormInput';
import { MetodoPagoPills } from '../ui/PillButton';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { registrarSalida, getEnCochera } from '../../services/vehiculosService';
import { calcularCostoEstadia } from '../../utils/monto';
import { fechaStr, calcularTiempo } from '../../utils/fecha';
import { beep } from '../../utils/audio';
import { useToast } from '../ui/ToastContext';

export function SalidaPanel({ turno, sesion, refreshKey }) {
  const { mostrarToast } = useToast();

  const [listaCochera, setListaCochera]   = useState([]);
  const [query_, setQuery]                = useState('');
  const [autoSalida, setAutoSalida]       = useState(null);
  const [metodoPago, setMetodoPago]       = useState('Efectivo');
  const [modalOpen, setModalOpen]         = useState(false);
  const [modalData, setModalData]         = useState(null);
  const [saldoCobrar, setSaldoCobrar]     = useState('');
  const [motivo, setMotivo]               = useState('');
  const [loading, setLoading]             = useState(false);
  const [cargandoLista, setCargandoLista] = useState(false);

  useEffect(() => { cargarLista(); }, [refreshKey]);

  async function cargarLista() {
    setCargandoLista(true);
    try {
      setListaCochera(await getEnCochera());
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoLista(false);
    }
  }

  const listaFiltrada = query_
    ? listaCochera.filter(a => a.placa.includes(query_.toUpperCase()))
    : listaCochera;

  function seleccionarAuto(auto) {
    setAutoSalida(auto);
    setQuery(auto.placa);
    setMetodoPago('Efectivo');
  }

  function abrirModalSalida() {
    if (!autoSalida) { mostrarToast('Busca un vehículo primero', 'warning'); beep('error'); return; }
    const tarifa = autoSalida.tarifaPactada || 0;
    if (tarifa > 0) {
      const desglose = calcularCostoEstadia(autoSalida.horaEntrada, tarifa);
      const pagadoIngreso = autoSalida.cobradoAlIngreso ? (autoSalida.montoIngreso || 0) : 0;
      const saldo = Math.max(0, desglose.costoTotal - pagadoIngreso);
      setModalData({ auto: autoSalida, tarifa, desglose, pagadoIngreso, saldo });
      setSaldoCobrar(saldo.toFixed(2));
      setMotivo('');
      setModalOpen(true);
    } else {
      ejecutarSalida(0, 0, '', 0, null);
    }
  }

  async function confirmarSalida() {
    const montoReal = parseFloat(saldoCobrar) || 0;
    const saldoExpected = modalData.saldo;
    const hayDif = Math.abs(montoReal - saldoExpected) > 0.01;
    if (hayDif && !motivo.trim()) {
      mostrarToast('Debes ingresar el motivo del cambio de precio', 'warning');
      return;
    }
    setModalOpen(false);
    await ejecutarSalida(
      montoReal,
      modalData.desglose.costoTotal,
      motivo.trim(),
      modalData.pagadoIngreso,
      saldoExpected > 0 ? metodoPago : null
    );
  }

  async function ejecutarSalida(montoReal, costoSistema, motivoMod, pagadoIngreso, metodo) {
    setLoading(true);
    try {
      await registrarSalida(
        autoSalida.id, montoReal, turno, sesion,
        { montoCalculadoSistema: costoSistema, motivoModificacion: motivoMod, pagadoIngreso, metodoPago: metodo }
      );
      beep('success');
      mostrarToast(`Salida registrada: ${autoSalida.placa}`, 'success');
      resetSalida();
      await cargarLista();
    } catch (err) {
      beep('error');
      if (err.message === 'ya_salio') mostrarToast('Este vehículo ya registró salida', 'warning');
      else { mostrarToast('Error al registrar salida', 'error'); console.error(err); }
    } finally {
      setLoading(false);
    }
  }

  function resetSalida() {
    setAutoSalida(null); setQuery(''); setMetodoPago('Efectivo');
  }

  const saldoPendienteActual = modalData
    ? Math.max(0, modalData.desglose.costoTotal - modalData.pagadoIngreso) : 0;
  const hayDifModal = Math.abs((parseFloat(saldoCobrar) || 0) - saldoPendienteActual) > 0.01;

  return (
    <div className="flex flex-col gap-3">
      <FormInput
        label="Buscar por placa"
        value={query_}
        onChange={e => setQuery(e.target.value.toUpperCase())}
        placeholder="Filtrar..."
        uppercase
      />

      <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-bg2">
        {cargandoLista ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : listaFiltrada.length === 0 ? (
          <p className="text-center text-txt3 py-4 text-sm">
            {query_ ? 'Sin coincidencias' : 'Cochera vacía'}
          </p>
        ) : listaFiltrada.map(auto => (
          <button
            key={auto.id}
            type="button"
            onClick={() => seleccionarAuto(auto)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border-b border-border last:border-0
              hover:bg-surface2 transition-colors text-left
              ${autoSalida?.id === auto.id ? 'bg-accent/10 text-accent' : 'text-txt'}`}
          >
            <span className="font-mono font-bold">{auto.placa}</span>
            <span className="text-txt3 text-xs">{auto.tipo}</span>
            <span className="text-txt3 text-xs">{calcularTiempo(auto.horaEntrada)}</span>
          </button>
        ))}
      </div>

      {autoSalida && (
        <div className="bg-bg3 border border-border rounded-xl p-3 space-y-1.5 text-sm">
          <div className="font-mono text-xl font-bold text-txt text-center">{autoSalida.placa}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <InfoRow label="Tipo"     value={autoSalida.tipo} />
            <InfoRow label="Cliente"  value={autoSalida.clienteNombre} />
            <InfoRow label="Entrada"  value={fechaStr(autoSalida.horaEntrada, true)} />
            <InfoRow label="Tiempo"   value={calcularTiempo(autoSalida.horaEntrada)} />
            {autoSalida.tarifaPactada > 0 && (
              <InfoRow label="Tarifa" value={`S/ ${autoSalida.tarifaPactada.toFixed(2)}/día`} />
            )}
          </div>
        </div>
      )}

      {autoSalida && (
        <Button variant="warning" onClick={abrirModalSalida} disabled={loading} fullWidth>
          {loading ? <Spinner size="sm" /> : '🏁 Registrar Salida'}
        </Button>
      )}

      <Modal
        open={modalOpen}
        titulo="🏁 Registrar Salida"
        onClose={() => setModalOpen(false)}
        botones={[
          { texto: '✅ Confirmar', clase: 'btn-warning', onClick: confirmarSalida },
          { texto: 'Cancelar',    clase: 'btn-secondary', onClick: () => setModalOpen(false) },
        ]}
      >
        {modalData && (
          <div className="space-y-4 text-sm">
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-txt">{modalData.auto.placa}</div>
              <div className="text-txt3">{modalData.auto.clienteNombre}</div>
            </div>

            <div className="bg-bg2 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-txt3 uppercase tracking-wide mb-2">📊 Estadía</div>
              <Row label="Días completos" value={`${modalData.desglose.dias} día(s)`} />
              {modalData.desglose.horasExtra > 0 && (
                <Row
                  label={`Horas extra (${modalData.desglose.horasExtra}h)`}
                  value={modalData.desglose.aplicaPenalidad
                    ? `⚠️ +S/ ${((modalData.desglose.horasExtra * modalData.tarifa) / 24).toFixed(2)}`
                    : '✓ Gracia (sin cargo)'
                  }
                  highlight={modalData.desglose.aplicaPenalidad}
                />
              )}
              <Row label="Tarifa"        value={`S/ ${modalData.tarifa.toFixed(2)} / día`} />
              <Row label="Total sistema" value={`S/ ${modalData.desglose.costoTotal.toFixed(2)}`} />
              <div className="flex justify-between font-bold pt-2 border-t border-border">
                <span>Monto a cobrar</span>
                <span className="text-accent">S/ {modalData.saldo.toFixed(2)}</span>
              </div>
            </div>

            <FormInput
              label="Monto a cobrar (S/)"
              type="number"
              value={saldoCobrar}
              onChange={e => setSaldoCobrar(e.target.value)}
              min="0" step="0.50"
            />

            {modalData.saldo > 0 && (
              <div>
                <label className="text-xs font-semibold text-txt2 uppercase tracking-wide block mb-1.5">Método de pago</label>
                <MetodoPagoPills value={metodoPago} onChange={setMetodoPago} />
              </div>
            )}

            {hayDifModal && (
              <FormTextarea
                label="⚠️ Motivo del cambio (requerido para auditoría)"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Explica por qué modificaste el monto calculado..."
                rows={2}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <span className="text-txt3">{label}: </span>
      <span className="text-txt font-semibold">{value}</span>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className={`flex justify-between text-sm ${highlight ? 'text-yellow' : 'text-txt'}`}>
      <span className="text-txt2">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
