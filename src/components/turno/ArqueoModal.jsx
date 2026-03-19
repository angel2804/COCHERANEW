import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { FormInput } from '../ui/FormInput';

export function ArqueoModal({ open, turno, cobros, onConfirmar, onCancel }) {
  const [efectivo, setEfectivo]   = useState('');
  const [yape, setYape]           = useState('');

  useEffect(() => {
    if (open) { setEfectivo(''); setYape(''); }
  }, [open]);

  if (!turno) return null;

  const totalIngresos = cobros.filter(c => c.tipo === 'ingreso').reduce((s, c) => s + (c.monto || 0), 0);
  const totalSalidas  = cobros.filter(c => c.tipo === 'salida' ).reduce((s, c) => s + (c.monto || 0), 0);
  const totalGeneral  = totalIngresos + totalSalidas;

  const suma = m => cobros.filter(c => (c.metodoPago || 'Efectivo') === m).reduce((s, c) => s + (c.monto || 0), 0);
  const totEf   = suma('Efectivo');
  const totYape = suma('Yape');
  const totVisa = suma('Visa');

  const efIngresado   = parseFloat(efectivo) || 0;
  const yapeIngresado = parseFloat(yape) || 0;
  const dEf   = efIngresado - totEf;
  const dYape = yapeIngresado - totYape;

  function difLabel(d) {
    if (Math.abs(d) < 0.01) return { text: 'S/ 0.00 ✓ Exacto', cls: 'text-green-400' };
    if (d > 0)  return { text: `+S/ ${d.toFixed(2)} (sobrante)`, cls: 'text-yellow' };
    return { text: `-S/ ${Math.abs(d).toFixed(2)} (faltante)`, cls: 'text-danger' };
  }

  function handleConfirmar() {
    onConfirmar({
      efectivoEntregado: efIngresado,
      yapeRecibido: yapeIngresado,
      totalEsperado: totalGeneral,
      diferencia: efIngresado - totEf,
    });
  }

  return (
    <Modal
      open={open}
      titulo="🔴 Cerrar Turno — Arqueo"
      onClose={onCancel}
      botones={[
        { texto: '🔴 Confirmar cierre', clase: 'btn-danger', onClick: handleConfirmar },
        { texto: 'Cancelar', clase: 'btn-secondary', onClick: onCancel },
      ]}
    >
      <div className="space-y-4 text-sm">
        {/* Confirmación */}
        <div className="text-center py-2">
          <div className="text-3xl mb-2">🔴</div>
          <p className="text-txt">¿Cerrar el turno <strong>{turno.tipo}</strong>?</p>
        </div>

        {/* Resumen */}
        <div className="bg-bg2 dark:bg-bg2 rounded-xl p-3 space-y-1.5">
          <div className="text-xs font-bold text-txt3 uppercase tracking-wide mb-2">📊 Resumen del Turno</div>
          <ResRow label="Cobros al ingreso"  value={`S/ ${totalIngresos.toFixed(2)}`} />
          <ResRow label="Cobros a la salida" value={`S/ ${totalSalidas.toFixed(2)}`}  />
          <ResRow label="Total registrado"   value={`S/ ${totalGeneral.toFixed(2)}`} accent />
          <ResRow label="Cantidad de cobros" value={`${cobros.length} cobro(s)`} />
        </div>

        {/* Desglose por método */}
        <div className="grid grid-cols-3 gap-2">
          <MetodoCard icon="💵" label="Efectivo" value={`S/ ${totEf.toFixed(2)}`} />
          <MetodoCard icon="💜" label="Yape"     value={`S/ ${totYape.toFixed(2)}`} />
          <MetodoCard icon="💳" label="Visa"     value={`S/ ${totVisa.toFixed(2)}`} />
        </div>

        {/* Efectivo a entregar */}
        <div className="space-y-1">
          <FormInput
            label="💵 Efectivo a entregar (S/)"
            type="number"
            value={efectivo}
            onChange={e => setEfectivo(e.target.value)}
            placeholder="0.00"
            min="0" step="0.50"
            note={`Esperado en caja: S/ ${totEf.toFixed(2)}`}
          />
          <DifBox {...difLabel(dEf)} />
        </div>

        {/* Yape (solo si hay cobros Yape) */}
        {totYape > 0 && (
          <div className="space-y-1">
            <FormInput
              label="💜 Yape recibido (S/)"
              type="number"
              value={yape}
              onChange={e => setYape(e.target.value)}
              placeholder={totYape.toFixed(2)}
              min="0" step="0.50"
              note={`Yape registrado: S/ ${totYape.toFixed(2)}`}
            />
            <DifBox {...difLabel(dYape)} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function ResRow({ label, value, accent }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-txt2">{label}</span>
      <span className={`font-semibold ${accent ? 'text-accent' : 'text-txt'}`}>{value}</span>
    </div>
  );
}

function MetodoCard({ icon, label, value }) {
  return (
    <div className="bg-bg3 dark:bg-bg3 border border-border rounded-xl p-2.5 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-[10px] text-txt3">{label}</div>
      <div className="font-mono font-bold text-xs text-txt mt-0.5">{value}</div>
    </div>
  );
}

function DifBox({ text, cls }) {
  return (
    <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg bg-bg3 border border-border ${cls}`}>
      {text}
    </div>
  );
}
