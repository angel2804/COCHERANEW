export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-surface2 text-txt2',
    success: 'bg-green-900/40 text-green-300 border border-green-700',
    warning: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
    danger:  'bg-red-900/40 text-red-300 border border-red-700',
    accent:  'bg-accent/15 text-accent border border-accent/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
}
