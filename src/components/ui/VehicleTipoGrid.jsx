import { TIPOS_VEHICULO } from '../../utils/vehiculoTipos';

/**
 * Grid de botones para seleccionar tipo de vehículo
 */
export function VehicleTipoGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {TIPOS_VEHICULO.map(({ tipo, icono }) => (
        <button
          key={tipo}
          type="button"
          onClick={() => onChange(tipo)}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl border text-xs font-semibold transition-all
            ${value === tipo
              ? 'bg-accent/20 border-accent text-accent'
              : 'bg-bg3 dark:bg-bg3 border-border dark:border-border text-txt2 dark:text-txt2 hover:border-accent/50 hover:text-txt'
            }`}
        >
          <span className="text-lg leading-none">{icono}</span>
          <span className="text-[10px] leading-tight">{tipo}</span>
        </button>
      ))}
    </div>
  );
}
