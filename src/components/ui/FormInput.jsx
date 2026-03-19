/**
 * Input de formulario con label
 */
export function FormInput({
  label, id, type = 'text', value, onChange, placeholder,
  min, max, step, readOnly, required, className = '', note,
  uppercase, onKeyDown,
}) {
  const handleChange = e => {
    if (uppercase) {
      e.target.value = e.target.value.toUpperCase();
    }
    onChange?.(e);
  };

  const inputCls = `w-full bg-bg2 dark:bg-bg2 border border-border dark:border-border rounded-xl px-3 py-2.5
    text-sm text-txt dark:text-txt placeholder:text-txt3 focus:outline-none focus:border-accent
    transition-colors ${uppercase ? 'font-mono uppercase tracking-widest text-base' : ''} ${className}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-txt2 dark:text-txt2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        required={required}
        onKeyDown={onKeyDown}
        className={inputCls}
      />
      {note && <span className="text-xs text-txt3 dark:text-txt3">{note}</span>}
    </div>
  );
}

/**
 * Textarea de formulario con label
 */
export function FormTextarea({ label, id, value, onChange, placeholder, rows = 3, className = '' }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-txt2 dark:text-txt2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full bg-bg2 dark:bg-bg2 border border-border dark:border-border rounded-xl px-3 py-2.5
          text-sm text-txt dark:text-txt placeholder:text-txt3 focus:outline-none focus:border-accent
          transition-colors resize-none ${className}`}
      />
    </div>
  );
}
