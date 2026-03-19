/**
 * Botón con variantes de estilo.
 * Variantes: 'success' | 'danger' | 'warning' | 'secondary' | 'ghost'
 */
export function Button({ children, variant = 'secondary', disabled, onClick, type = 'button', className = '', fullWidth }) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    success:   'bg-accent hover:bg-accent2 text-[#0f1117]',
    danger:    'bg-danger hover:bg-red-600 text-white',
    warning:   'bg-yellow hover:bg-yellow/80 text-[#0f1117]',
    secondary: 'bg-surface2 dark:bg-surface2 hover:bg-border dark:hover:bg-border text-txt dark:text-txt border border-border dark:border-border',
    ghost:     'bg-transparent hover:bg-surface2 text-txt2 dark:text-txt2',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.secondary} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
