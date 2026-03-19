import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const VARIANT_CLASS = {
  success: 'btn-success', danger: 'btn-danger',
  warning: 'btn-warning', secondary: 'btn-secondary', ghost: 'btn-secondary',
};

/**
 * Modal controlado — se renderiza en un portal en document.body
 * Acepta titulo/title, botones/buttons (con texto/label y clase/variant)
 */
export function Modal({ open, titulo, title, children, botones, buttons, onClose }) {
  const tituloFinal = titulo ?? title ?? '';
  const botonesFinal = (botones ?? buttons ?? []).map(b => ({
    texto:    b.texto    ?? b.label ?? '',
    clase:    b.clase    ?? (b.variant ? (VARIANT_CLASS[b.variant] ?? 'btn-secondary') : 'btn-secondary'),
    onClick:  b.onClick,
    disabled: b.disabled,
  }));

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display text-lg font-semibold text-txt">{tituloFinal}</h3>
          <button
            onClick={onClose}
            className="text-txt2 hover:text-txt transition-colors text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 flex-1 text-txt">
          {children}
        </div>

        {/* Actions */}
        {botonesFinal.length > 0 && (
          <div className="flex gap-2 justify-end px-5 py-4 border-t border-border flex-wrap">
            {botonesFinal.map((b, i) => (
              <button
                key={i}
                onClick={b.onClick}
                disabled={b.disabled}
                className={`btn ${b.clase} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {b.texto}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
