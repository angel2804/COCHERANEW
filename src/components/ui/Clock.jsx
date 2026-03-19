import { useClock } from '../../hooks/useClock';

export function Clock({ className = '' }) {
  const tiempo = useClock();
  return (
    <span className={`font-mono text-sm text-txt2 dark:text-txt2 ${className}`}>
      {tiempo}
    </span>
  );
}
