import {
  collection, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatFecha } from '../utils/fecha';

// ── Cobros por turno ──────────────────────────────────────────────────────────
export async function getByTurno(turnoId) {
  const snap = await getDocs(
    query(collection(db, 'cobros'), where('turnoId', '==', turnoId))
  );
  const lista = [];
  snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
  lista.sort((a, b) => formatFecha(a.fechaCobro) - formatFecha(b.fechaCobro));
  return lista;
}

export function calcularTotal(cobros) {
  return cobros.reduce((s, c) => s + (c.monto || 0), 0);
}

// ── HTML Reporte de Turno ─────────────────────────────────────────────────────
export function generarHTMLReporte(cobros, turno, arqueo) {
  const inicio = formatFecha(turno.inicio);
  const fin    = turno.fin ? formatFecha(turno.fin) : null;
  const fmt    = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };

  const totalIngresos = cobros.filter(c => c.tipo === 'ingreso').reduce((s, c) => s + (c.monto || 0), 0);
  const totalSalidas  = cobros.filter(c => c.tipo === 'salida' ).reduce((s, c) => s + (c.monto || 0), 0);
  const totalGeneral  = totalIngresos + totalSalidas;

  const sumM    = m => cobros.filter(c => (c.metodoPago || 'Efectivo') === m).reduce((s, c) => s + (c.monto || 0), 0);
  const totEf   = sumM('Efectivo');
  const totYape = sumM('Yape');
  const totVisa = sumM('Visa');

  const filas = cobros.map((c, i) => {
    const ent    = formatFecha(c.horaEntradaAuto);
    const sal    = c.horaSalidaAuto ? formatFecha(c.horaSalidaAuto) : null;
    const metodo = c.metodoPago || (c.monto > 0 ? 'Efectivo' : '-');
    const mIcon  = metodo === 'Yape' ? '💜' : metodo === 'Visa' ? '💳' : metodo === 'Efectivo' ? '💵' : '';
    const esBg   = i % 2 === 0 ? '#ffffff' : '#f4f7fb';
    const tipoLbl  = c.tipo === 'ingreso' ? 'ING' : 'SAL';
    const tipoClr  = c.tipo === 'ingreso' ? '#0a5e47' : '#7a5c00';
    const tipoBg2  = c.tipo === 'ingreso' ? '#d4f5eb' : '#fdf5d4';
    const entStr = ent.toLocaleString('es-PE', fmt).replace(',', '');
    const salStr = c.tipo === 'ingreso'
      ? '<em style="color:#8fa3c0;font-size:7.5px">al ingreso</em>'
      : (sal ? sal.toLocaleString('es-PE', fmt).replace(',', '') : '—');
    return `<tr style="background:${esBg}">
      <td style="padding:4px 6px;font-family:monospace;font-weight:700;font-size:9.5px;letter-spacing:1px;white-space:nowrap;color:#0f1e30">${c.placa}</td>
      <td style="padding:4px 6px;font-size:9px">${(c.clienteNombre || '-').substring(0, 14)}</td>
      <td style="padding:4px 6px;text-align:center"><span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${tipoBg2};color:${tipoClr}">${tipoLbl}</span></td>
      <td style="padding:4px 6px;font-family:monospace;font-size:8.5px;white-space:nowrap">${entStr}</td>
      <td style="padding:4px 6px;font-family:monospace;font-size:8.5px;white-space:nowrap">${salStr}</td>
      <td style="padding:4px 6px;font-size:9px;white-space:nowrap">${mIcon} ${metodo !== '-' ? metodo : '—'}</td>
      <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700;font-size:9.5px;color:#0a5e47">S/${(c.monto || 0).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const sig = d => d >= 0 ? `+S/ ${d.toFixed(2)}` : `−S/ ${Math.abs(d).toFixed(2)}`;
  const clr = d => Math.abs(d) < 0.01 ? '#0a5e47' : (d >= 0 ? '#0a5e47' : '#cc2233');

  const htmlArqueo = arqueo ? (() => {
    const efDif   = (arqueo.efectivoEntregado || 0) - totEf;
    const yapeDif = (arqueo.yapeRecibido      || 0) - totYape;
    return `
    <div style="margin-top:10px;page-break-inside:avoid">
      <table style="width:100%;border-collapse:collapse;font-size:8px">
        <thead>
          <tr style="background:#1a2535;color:#e8edf5">
            <th style="padding:4px 6px;text-align:left;font-size:8.5px;letter-spacing:1px;text-transform:uppercase" colspan="4">📊 Arqueo de Caja</th>
          </tr>
          <tr style="background:#2a3548;color:#a0b0c8;font-size:7.5px">
            <th style="padding:3px 6px;text-align:left;font-weight:600">Concepto</th>
            <th style="padding:3px 6px;text-align:right;font-weight:600">Sistema</th>
            <th style="padding:3px 6px;text-align:right;font-weight:600">Entregado</th>
            <th style="padding:3px 6px;text-align:right;font-weight:600">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#f8fbff">
            <td style="padding:4px 6px;font-weight:600">💵 Efectivo</td>
            <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700">S/ ${totEf.toFixed(2)}</td>
            <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700;color:#1a5ccc">S/ ${(arqueo.efectivoEntregado || 0).toFixed(2)}</td>
            <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700;color:${clr(efDif)}">${sig(efDif)}</td>
          </tr>
          ${totYape > 0 || (arqueo.yapeRecibido || 0) > 0 ? `
          <tr style="background:#faf8ff">
            <td style="padding:4px 6px;font-weight:600">💜 Yape</td>
            <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700">S/ ${totYape.toFixed(2)}</td>
            <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700;color:#6b35c8">S/ ${(arqueo.yapeRecibido || 0).toFixed(2)}</td>
            <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700;color:${clr(yapeDif)}">${sig(yapeDif)}</td>
          </tr>` : ''}
          ${totVisa > 0 ? `
          <tr>
            <td style="padding:4px 6px;font-weight:600">💳 Visa</td>
            <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:700">S/ ${totVisa.toFixed(2)}</td>
            <td style="padding:4px 6px;text-align:right;color:#888" colspan="2">Pago digital — sin entrega física</td>
          </tr>` : ''}
          <tr style="background:#1a2535;color:#fff">
            <td colspan="2" style="padding:5px 6px;font-weight:700;font-size:8.5px">TOTAL COBRADO</td>
            <td colspan="2" style="padding:5px 6px;text-align:right;font-family:monospace;font-size:10px;font-weight:800;color:#00d4aa">S/ ${totalGeneral.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
  })() : '';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1a2535;background:#fff;font-size:9px;line-height:1.45">
      <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid #1a2535">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:800;letter-spacing:2px;margin-bottom:2px;color:#0f1e30">🅿 COCHERA POS</div>
          <div style="font-size:10px;font-weight:700;color:#0a5e47;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase">
            Reporte de Turno — ${turno.tipo || ''}
          </div>
          <div style="font-size:9.5px;line-height:2">
            <span style="color:#5a6f8a;display:inline-block;width:68px">Trabajador</span><strong>${turno.trabajador || '—'}</strong><br>
            <span style="color:#5a6f8a;display:inline-block;width:68px">Inicio</span><span style="font-family:monospace">${inicio.toLocaleString('es-PE', fmt).replace(',','')}</span><br>
            ${fin ? `<span style="color:#5a6f8a;display:inline-block;width:68px">Fin</span><span style="font-family:monospace">${fin.toLocaleString('es-PE', fmt).replace(',','')}</span><br>` : ''}
            <span style="color:#5a6f8a;display:inline-block;width:68px">Cobros</span><span>${cobros.length} registro(s)</span>
          </div>
        </div>
        <div style="background:#f4f7fb;border:1px solid #d0daea;border-radius:7px;padding:11px 15px;min-width:185px;flex-shrink:0">
          <div style="font-size:8px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#5a6f8a;margin-bottom:9px">Resumen de cobros</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <tr><td style="padding:3px 0">💵 Efectivo</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#0a5e47">S/ ${totEf.toFixed(2)}</td></tr>
            <tr><td style="padding:3px 0">💜 Yape</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#6b35c8">S/ ${totYape.toFixed(2)}</td></tr>
            ${totVisa > 0 ? `<tr><td style="padding:3px 0">💳 Visa</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#1a5ccc">S/ ${totVisa.toFixed(2)}</td></tr>` : ''}
            <tr style="border-top:2px solid #c0ccd8">
              <td style="padding:5px 0 0;font-weight:800;font-size:11px">TOTAL</td>
              <td style="text-align:right;font-family:monospace;font-weight:800;color:#0a5e47;padding:5px 0 0;font-size:12px">S/ ${totalGeneral.toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </div>
      ${cobros.length === 0
        ? '<p style="text-align:center;color:#8fa3c0;padding:16px;font-size:9px">Sin cobros registrados en este turno</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:8.5px">
            <thead>
              <tr style="background:#1a2535;color:#e8edf5">
                <th style="padding:4px 5px;text-align:left;font-weight:600;letter-spacing:0.5px">Placa</th>
                <th style="padding:4px 5px;text-align:left;font-weight:600">Cliente</th>
                <th style="padding:4px 5px;text-align:center;font-weight:600">Tipo</th>
                <th style="padding:4px 5px;text-align:left;font-weight:600">Entrada</th>
                <th style="padding:4px 5px;text-align:left;font-weight:600">Salida</th>
                <th style="padding:4px 5px;text-align:left;font-weight:600">Método</th>
                <th style="padding:4px 5px;text-align:right;font-weight:600">Monto</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="padding:5px;text-align:right;font-weight:700;font-size:8.5px;border-top:2px solid #1a2535">TOTAL COBRADO</td>
                <td style="padding:5px;text-align:right;font-weight:800;font-size:10px;font-family:monospace;color:#0a5e47;border-top:2px solid #1a2535">S/ ${totalGeneral.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>`
      }
      ${htmlArqueo}
      <div style="text-align:center;font-size:7px;color:#a0b0c8;margin-top:8px;border-top:1px solid #e0e6ef;padding-top:5px">
        Generado: ${new Date().toLocaleString('es-PE')} · COCHERA POS
      </div>
    </div>`;
}

// ── Descargar PDF ─────────────────────────────────────────────────────────────
export function descargarPDF(turno, cobros, arqueo) {
  import('html2pdf.js').then(({ default: html2pdf }) => {
    const htmlReporte = generarHTMLReporte(cobros, turno, arqueo);
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      font-family: Arial, sans-serif;
      color: #1a2535; background: white;
      padding: 14px 18px; width: 750px; box-sizing: border-box;
    `;
    wrapper.innerHTML = htmlReporte;
    document.body.appendChild(wrapper);

    const inicio       = formatFecha(turno.inicio);
    const fechaStrPdf  = inicio.toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).replace(/\//g, '-');
    const nombreArchivo = `reporte-turno-${turno.trabajador || 'turno'}-${fechaStrPdf}.pdf`;

    html2pdf()
      .set({
        margin:      [10, 10, 10, 10],
        filename:    nombreArchivo,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(wrapper)
      .save()
      .finally(() => document.body.removeChild(wrapper));
  }).catch(() => {
    alert('Error al cargar html2pdf');
  });
}
