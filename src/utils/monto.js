import { formatFecha } from './fecha';

/**
 * Formatea monto a string con símbolo de sol peruano
 * @returns {string} "S/ X.XX"
 */
export function formatMonto(monto) {
  return `S/ ${(monto || 0).toFixed(2)}`;
}

/**
 * Calcula el costo de la estadía con período de gracia y penalidad.
 * - Mínimo 1 día para estancias menores a 24h.
 * - Gracia: hasta 3h extra sin cargo adicional.
 * - Penalidad: más de 3h extra → se cobran todas las horas extra.
 * @returns {{ dias, horasExtra, costoTotal, aplicaPenalidad }}
 */
export function calcularCostoEstadia(fechaEntrada, tarifaDiaria) {
  const inicio       = formatFecha(fechaEntrada);
  const ahora        = new Date();
  const horasTotales = (ahora - inicio) / 3600000;

  let dias       = Math.floor(horasTotales / 24);
  let horasExtra = Math.floor(horasTotales % 24);

  if (horasTotales < 24) {
    dias       = 1;
    horasExtra = 0;
  }

  const costoPorHora    = tarifaDiaria / 24;
  const aplicaPenalidad = horasExtra > 3;

  const costoTotal = aplicaPenalidad
    ? (dias * tarifaDiaria) + (horasExtra * costoPorHora)
    : (dias * tarifaDiaria);

  return { dias, horasExtra, costoTotal, aplicaPenalidad };
}
