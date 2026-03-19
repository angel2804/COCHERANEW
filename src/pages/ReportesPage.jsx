import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/ToastContext';
import { getTodos } from '../services/turnosService';
import { getByTurno, calcularTotal, generarHTMLReporte, descargarPDF } from '../services/reportesService';
import { imprimirReporteA4 } from '../utils/print';
import { formatFecha } from '../utils/fecha';
import { formatMonto } from '../utils/monto';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export function ReportesPage() {
  const { showToast } = useToast();
  const [turnos, setTurnos] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtroTrabajador, setFiltroTrabajador] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [trabajadores, setTrabajadores] = useState([]);

  const [reporteModal, setReporteModal] = useState(false);
  const [reporteTurno, setReporteTurno] = useState(null);
  const [reporteHTML, setReporteHTML] = useState('');
  const [reporteCobros, setReporteCobros] = useState([]);
  const [loadingReporte, setLoadingReporte] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await getTodos();
      setTurnos(data);
      const set = new Set();
      data.forEach(t => { if (t.trabajador) set.add(t.trabajador); });
      setTrabajadores([...set].sort());
      // Cargar totales en background
      data.forEach(t => cargarTotal(t));
    } catch {
      showToast('Error al cargar turnos', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function cargarTotal(turno) {
    try {
      const cobros = await getByTurno(turno.id);
      const total = calcularTotal(cobros);
      setTotales(prev => ({ ...prev, [turno.id]: total }));
    } catch {}
  }

  async function verReporte(turno) {
    setLoadingReporte(true);
    setReporteTurno(turno);
    setReporteModal(true);
    try {
      const cobros = await getByTurno(turno.id);
      setReporteCobros(cobros);
      setReporteHTML(generarHTMLReporte(cobros, turno));
    } catch {
      showToast('Error al cargar reporte', 'error');
      setReporteModal(false);
    } finally {
      setLoadingReporte(false);
    }
  }

  async function handlePDF(turno) {
    try {
      showToast('Generando PDF...', 'info');
      const cobros = await getByTurno(turno.id);
      await descargarPDF(turno, cobros, null);
    } catch {
      showToast('Error al generar PDF', 'error');
    }
  }

  async function handleImprimir(turno) {
    try {
      const cobros = await getByTurno(turno.id);
      imprimirReporteA4(generarHTMLReporte(cobros, turno));
    } catch {
      showToast('Error al preparar impresión', 'error');
    }
  }

  const filtrados = turnos.filter(t => {
    if (filtroTrabajador && t.trabajador !== filtroTrabajador) return false;
    if (filtroEstado && t.estado !== filtroEstado) return false;
    return true;
  });

  const fmt = { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' };

  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="font-display text-2xl font-bold text-txt">Reportes por Turno</h1>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={filtroTrabajador}
            onChange={e => setFiltroTrabajador(e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-2 text-txt text-sm
                       focus:outline-none focus:border-accent"
          >
            <option value="">Todos los trabajadores</option>
            {trabajadores.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-2 text-txt text-sm
                       focus:outline-none focus:border-accent"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-txt3">
            <div className="text-4xl mb-3">📋</div>
            <p>No se encontraron turnos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(t => {
              const inicio = formatFecha(t.inicio);
              const fin = t.fin ? formatFecha(t.fin) : null;
              const activo = t.estado === 'activo';
              return (
                <div key={t.id} className="bg-surface rounded-2xl p-4 border border-border">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold text-txt">
                        👷 {t.trabajador || 'Sin nombre'} — {t.tipo}
                      </div>
                      <div className="text-sm text-txt2 mt-0.5">
                        Inicio: {inicio.toLocaleString('es-PE', fmt)}
                      </div>
                      <div className="text-sm text-txt2">
                        Fin: {fin ? fin.toLocaleString('es-PE', fmt) : 'En curso'}
                      </div>
                      <div className="mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          activo
                            ? 'bg-accent/10 text-accent'
                            : 'bg-surface2 text-txt3'
                        }`}>
                          {activo ? '🟢 ACTIVO' : '⚫ CERRADO'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-txt3 uppercase tracking-widest font-bold">TOTAL</div>
                      <div className="font-display text-xl font-bold text-accent">
                        {totales[t.id] != null ? formatMonto(totales[t.id]) : <Spinner />}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button variant="secondary" onClick={() => verReporte(t)} className="text-xs px-3 py-1.5">
                      👁️ Ver Reporte
                    </Button>
                    <Button variant="secondary" onClick={() => handleImprimir(t)} className="text-xs px-3 py-1.5">
                      🖨️ Imprimir
                    </Button>
                    <Button variant="secondary" onClick={() => handlePDF(t)} className="text-xs px-3 py-1.5">
                      📄 PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal reporte */}
      <Modal
        open={reporteModal}
        title={reporteTurno ? `📋 Reporte — ${reporteTurno.trabajador} (${reporteTurno.tipo})` : 'Reporte'}
        onClose={() => setReporteModal(false)}
        buttons={[
          {
            label: '🖨️ Imprimir',
            variant: 'secondary',
            onClick: () => reporteTurno && handleImprimir(reporteTurno),
          },
          {
            label: '📄 PDF',
            variant: 'secondary',
            onClick: () => reporteTurno && handlePDF(reporteTurno),
          },
          { label: 'Cerrar', variant: 'secondary', onClick: () => setReporteModal(false) },
        ]}
      >
        {loadingReporte ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div
            className="text-sm text-txt"
            dangerouslySetInnerHTML={{ __html: reporteHTML }}
          />
        )}
      </Modal>
    </div>
  );
}
