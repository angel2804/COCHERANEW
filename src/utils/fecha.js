/**
 * Convierte un timestamp Firestore, Date o string a objeto Date
 */
export function formatFecha(ts) {
  if (!ts) return new Date();
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

/**
 * Formatea una fecha a string legible en español (es-PE)
 * @param {boolean} soloHora - true para mostrar solo "HH:MM"
 */
export function fechaStr(ts, soloHora = false) {
  const d = formatFecha(ts);
  if (soloHora) return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Calcula tiempo transcurrido desde una fecha hasta ahora
 * @returns {string} "X min" o "Xh Ymin"
 */
export function calcularTiempo(desde) {
  const inicio = formatFecha(desde);
  const ahora  = new Date();
  const mins   = Math.floor((ahora - inicio) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}min`;
}

/**
 * Calcula tiempo entre dos fechas
 * @returns {string} "X min" o "Xh Ymin"
 */
export function calcularTiempoEntre(desde, hasta) {
  const inicio = formatFecha(desde);
  const fin    = formatFecha(hasta);
  const mins   = Math.floor((fin - inicio) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}min`;
}
