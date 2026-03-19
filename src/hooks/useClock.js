import { useState, useEffect } from 'react';

/**
 * Hook que devuelve la hora actual como string "HH:MM:SS" actualizado cada segundo
 */
export function useClock() {
  const [tiempo, setTiempo] = useState('');

  useEffect(() => {
    function tick() {
      setTiempo(
        new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return tiempo;
}
