import { useCallback, useEffect, useRef, useState } from 'react';
import { FormInput } from '../ui/FormInput';
import { VehicleTipoGrid } from '../ui/VehicleTipoGrid';
import { MetodoPagoPills } from '../ui/PillButton';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { buscarPorPlaca } from '../../services/clientesService';
import { registrarEntrada, registrarEntradaInmediata } from '../../services/vehiculosService';
import { beep } from '../../utils/audio';
import { useToast } from '../ui/ToastContext';
import { useClock } from '../../hooks/useClock';

/**
 * Formulario de entrada.
 *
 * Comportamiento:
 *  - Por defecto cobra al INGRESO: el cliente paga ahora, el auto queda registrado
 *    y se marca como salido automáticamente (no aparece en cochera).
 *  - Si el usuario marca "Cobrar a la salida": el auto entra a cochera y pagará
 *    al retirar el vehículo. En ese caso se muestra la tarifa por día.
 */
export function EntradaForm({ turno, sesion, onEntradaRegistrada }) {
  const { mostrarToast } = useToast();
  const horaActual = useClock();

  const [placa, setPlaca]                 = useState('');
  const [tipo, setTipo]                   = useState('Auto');
  const [nombre, setNombre]               = useState('');
  const [celular, setCelular]             = useState('');
  const [monto, setMonto]                 = useState('');
  const [metodoPago, setMetodo]           = useState('Efectivo');
  const [dejoLlave, setDejoLlave]         = useState(false);
  const [cobrarEnSalida, setCobrarSalida] = useState(false);
  const [tarifa, setTarifa]               = useState('');
  const [loading, setLoading]             = useState(false);
  const [clienteAC, setClienteAC]         = useState(null);

  const acTimeoutRef = useRef(null);
  const placaRef     = useRef(null);

  // Autocomplete cliente al escribir placa
  useEffect(() => {
    clearTimeout(acTimeoutRef.current);
    if (placa.length < 3) { setClienteAC(null); return; }
    acTimeoutRef.current = setTimeout(async () => {
      const c = await buscarPorPlaca(placa).catch(() => null);
      setClienteAC(c || null);
    }, 400);
    return () => clearTimeout(acTimeoutRef.current);
  }, [placa]);

  const usarCliente = useCallback(() => {
    if (!clienteAC) return;
    setNombre(clienteAC.nombre);
    setCelular(clienteAC.celular || '');
    setClienteAC(null);
    mostrarToast('Cliente cargado', 'success');
  }, [clienteAC, mostrarToast]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!placa) { beep('error'); mostrarToast('Ingresa la placa del vehículo', 'warning'); return; }

    if (!cobrarEnSalida) {
      if (!(parseFloat(monto) > 0)) {
        beep('error'); mostrarToast('Ingresa el monto a cobrar', 'warning'); return;
      }
    } else {
      if (!(parseFloat(tarifa) > 0)) {
        beep('error'); mostrarToast('Ingresa la tarifa pactada por día', 'warning'); return;
      }
    }

    setLoading(true);
    try {
      const datos = {
        placa,
        tipo,
        clienteNombre:    nombre.trim() || 'Sin nombre',
        clienteCelular:   celular.trim(),
        cobradoAlIngreso: !cobrarEnSalida,
        montoIngreso:     cobrarEnSalida ? 0 : parseFloat(monto) || 0,
        tarifaPactada:    cobrarEnSalida ? (parseFloat(tarifa) || 0) : 0,
        metodoPago:       !cobrarEnSalida ? metodoPago : null,
        dejoLlave,
        esPreRegistro:    false,
      };

      if (cobrarEnSalida) {
        await registrarEntrada(datos, turno, sesion);
        mostrarToast(`Entrada registrada: ${placa}`, 'success');
      } else {
        await registrarEntradaInmediata(datos, turno, sesion);
        mostrarToast(`Cobrado al ingreso: ${placa} — S/ ${parseFloat(monto).toFixed(2)}`, 'success');
      }

      beep('success');
      resetForm();
      onEntradaRegistrada?.();
      placaRef.current?.focus();
    } catch (err) {
      beep('error');
      if (err.message === 'duplicado')        mostrarToast(`${placa} ya está en cochera`, 'warning');
      else if (err.message === 'sin_espacio') mostrarToast('No hay espacios disponibles', 'error');
      else { mostrarToast('Error al registrar entrada', 'error'); console.error(err); }
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setPlaca(''); setTipo('Auto'); setNombre(''); setCelular('');
    setMonto(''); setMetodo('Efectivo'); setDejoLlave(false);
    setCobrarSalida(false); setTarifa(''); setClienteAC(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Placa */}
      <FormInput
        ref={placaRef}
        label="Placa"
        id="ent-placa"
        value={placa}
        onChange={e => setPlaca(e.target.value.toUpperCase().trim())}
        placeholder="ABC-123"
        uppercase
      />

      {/* Autocomplete cliente */}
      {clienteAC && (
        <div className="bg-bg3 border border-accent/40 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-semibold text-txt">{clienteAC.nombre}</span>
            <span className="text-txt3 ml-2">{clienteAC.celular || 'Sin celular'}</span>
          </div>
          <Button variant="success" onClick={usarCliente} type="button">Usar</Button>
        </div>
      )}

      {/* Tipo vehículo */}
      <div>
        <label className="text-xs font-semibold text-txt2 uppercase tracking-wide block mb-1.5">Tipo de Vehículo</label>
        <VehicleTipoGrid value={tipo} onChange={setTipo} />
      </div>

      {/* Cliente */}
      <FormInput label="Nombre del cliente" id="ent-nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Sin nombre" />
      <FormInput label="Celular" id="ent-celular" value={celular} onChange={e => setCelular(e.target.value)} placeholder="9XXXXXXXX" type="tel" />

      {/* Monto + método de pago — oculto si cobrar en salida */}
      {!cobrarEnSalida && (
        <div className="flex flex-col gap-2 bg-bg3 p-3 rounded-xl border border-border">
          <FormInput label="Monto (S/)" id="ent-monto" type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" min="0" step="0.50" />
          <div>
            <label className="text-xs font-semibold text-txt2 uppercase tracking-wide block mb-1.5">Método de pago</label>
            <MetodoPagoPills value={metodoPago} onChange={setMetodo} />
          </div>
        </div>
      )}

      {/* Dejó llave */}
      <button
        type="button"
        onClick={() => setDejoLlave(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all
          ${dejoLlave
            ? 'bg-yellow/15 border-yellow text-yellow'
            : 'bg-bg3 border-border text-txt2 hover:border-yellow/50'
          }`}
      >
        🔑 {dejoLlave ? 'Dejó llave ✓' : 'Dejó llave'}
      </button>

      {/* Cobrar a la salida */}
      <label className="flex items-center gap-3 cursor-pointer select-none px-1">
        <input
          type="checkbox"
          checked={cobrarEnSalida}
          onChange={e => setCobrarSalida(e.target.checked)}
          className="w-4 h-4 accent-accent"
        />
        <span className="text-sm font-semibold text-txt">Cobrar a la salida</span>
      </label>

      {/* Tarifa — solo si cobrar a la salida */}
      {cobrarEnSalida && (
        <FormInput
          label="Tarifa por día (S/)"
          id="ent-tarifa"
          type="number"
          value={tarifa}
          onChange={e => setTarifa(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.50"
        />
      )}

      {/* Hora */}
      <div className="text-xs text-txt3 text-center font-mono">{horaActual}</div>

      <Button type="submit" variant="success" disabled={loading} fullWidth>
        {loading ? <Spinner size="sm" /> : null}
        {loading ? 'Registrando...' : cobrarEnSalida ? '🚗 Registrar (paga al salir)' : '💰 Cobrar y Registrar'}
      </Button>
    </form>
  );
}
