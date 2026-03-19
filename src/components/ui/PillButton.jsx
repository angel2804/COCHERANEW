import { METODOS_PAGO } from '../../utils/vehiculoTipos';

/**
 * Grupo de pills para seleccionar método de pago
 */
export function MetodoPagoPills({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {METODOS_PAGO.map(({ metodo, icono }) => (
        <button
          key={metodo}
          type="button"
          onClick={() => onChange(metodo)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all
            ${value === metodo
              ? metodo === 'Efectivo' ? 'bg-green-600/20 border-green-400 text-green-300'
                : metodo === 'Yape'  ? 'bg-purple-600/20 border-purple-400 text-purple-300'
                : 'bg-blue-600/20 border-blue-400 text-blue-300'
              : 'bg-bg3 dark:bg-bg3 border-border dark:border-border text-txt2 hover:border-accent/50'
            }`}
        >
          <span>{icono}</span>
          <span>{metodo}</span>
        </button>
      ))}
    </div>
  );
}
