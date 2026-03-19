import { useEffect, useState } from 'react';
import {
  collection, getDocs, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { formatFecha, fechaStr } from '../../../utils/fecha';
import { formatMonto } from '../../../utils/monto';
import { anularRegistro } from '../../../services/vehiculosService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui/ToastContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 20;

export function HistorialSection() {
  const { session } = useAuth();
  const { mostrarToast } = useToast();

  const [filtro, setFiltro]     = useState('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [autos, setAutos]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [pagina, setPagina]     = useState(1);

  useEffect(() => {
    setPagina(1);
    cargar();
  }, [filtro]);

  async function cargar() {
    setLoading(true);
    try {
      let datos = [];
      const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy.getTime() + 86400000);
      const ayer   = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
      const semana = new Date(hoy); semana.setDate(semana.getDate() - 7);
      const mes    = new Date(hoy); mes.setMonth(mes.getMonth() - 1);

      let q;
      if (filtro === 'todo') {
        q = query(collection(db, 'autos'), orderBy('horaEntrada', 'desc'));
      } else if (filtro === 'ayer') {
        q = query(collection(db, 'autos'), where('fecha', '>=', ayer), where('fecha', '<', hoy));
      } else {
        const desde = filtro === 'hoy' ? hoy : filtro === 'semana' ? semana : mes;
        q = query(collection(db, 'autos'), where('fecha', '>=', desde), where('fecha', '<', manana));
      }

      const snap = await getDocs(q);
      snap.forEach(d => datos.push({ id: d.id, ...d.data() }));
      if (filtro !== 'todo') {
        datos.sort((a, b) => formatFecha(b.horaEntrada) - formatFecha(a.horaEntrada));
      }
      setAutos(datos);
    } finally {
      setLoading(false);
    }
  }

  const datosFiltrados = busqueda
    ? autos.filter(a =>
        (a.placa || '').toUpperCase().includes(busqueda.toUpperCase()) ||
        (a.clienteNombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (a.trabajadorEntrada || '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : autos;

  const totalPaginas = Math.max(1, Math.ceil(datosFiltrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const datosPagina  = datosFiltrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  function paginasVisibles() {
    const rango = [];
    let inicio = Math.max(1, paginaActual - 2);
    let fin    = Math.min(totalPaginas, inicio + 4);
    inicio     = Math.max(1, fin - 4);
    for (let i = inicio; i <= fin; i++) rango.push(i);
    return rango;
  }

  function exportarExcel() {
    const filas = datosFiltrados.map(a => ({
      Placa:          a.placa             || '',
      Tipo:           a.tipo              || '',
      Cliente:        a.clienteNombre     || '',
      Celular:        a.clienteCelular    || '',
      Trabajador:     a.trabajadorEntrada || '',
      Entrada:        a.horaEntrada ? fechaStr(a.horaEntrada) : '',
      Salida:         a.horaSalida  ? fechaStr(a.horaSalida)  : '',
      'Tarifa/día':   a.tarifaPactada || 0,
      'Monto ingreso':a.montoIngreso  || 0,
      'Monto salida': a.montoSalida   || 0,
      Total:          a.precioTotal   || 0,
      Estado:         a.estado        || '',
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 16 },
      { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 13 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    ];
    const rango = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: 11 } });
    ws['!autofilter'] = { ref: rango };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    const fecha = new Date().toLocaleDateString('es-PE').replace(/\//g, '-');
    XLSX.writeFile(wb, `historial-cochera-${fecha}.xlsx`);
  }

  async function handleAnular(id) {
    if (!window.confirm('¿Anular este registro? (No se puede deshacer)')) return;
    try {
      await anularRegistro(id, session);
      mostrarToast('Registro anulado', 'success');
      cargar();
    } catch (e) {
      mostrarToast(e.message === 'ya_anulado' ? 'Ya está anulado' : 'Error al anular', 'error');
    }
  }

  const estadoBadge = {
    dentro:  { v: 'accent',  l: 'En cochera' },
    salido:  { v: 'default', l: 'Salido'      },
    anulado: { v: 'danger',  l: 'Anulado'     },
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center">
        {['hoy','ayer','semana','mes','todo'].map(f => (
          <button key={f} onClick={() => { setFiltro(f); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all
              ${filtro === f ? 'bg-accent/20 border-accent text-accent' : 'bg-surface border-border text-txt2 hover:border-accent/50'}`}>
            {f === 'hoy' ? 'Hoy' : f === 'ayer' ? 'Ayer' : f === 'semana' ? 'Semana' : f === 'mes' ? 'Mes' : 'Todo'}
          </button>
        ))}
        <input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
          placeholder="Buscar placa, cliente, trabajador..."
          className="bg-bg2 border border-border rounded-lg px-3 py-1.5 text-sm text-txt placeholder:text-txt3 focus:outline-none focus:border-accent flex-1 min-w-44"
        />
        <Button variant="secondary" onClick={exportarExcel}>📊 Excel</Button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg3 text-txt3 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3 text-left">Placa</th>
              <th className="px-3 py-3 text-left">Cliente</th>
              <th className="px-3 py-3 text-left">Trabajador</th>
              <th className="px-3 py-3 text-left">Tipo</th>
              <th className="px-3 py-3 text-left">Entrada</th>
              <th className="px-3 py-3 text-left">Salida</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-center">Estado</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center py-8"><Spinner /></td></tr>
            )}
            {!loading && datosPagina.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-txt3">Sin registros</td></tr>
            )}
            {datosPagina.map(a => {
              const b = estadoBadge[a.estado] || estadoBadge.salido;
              return (
                <tr key={a.id} className="border-t border-border hover:bg-surface2 transition-colors">
                  <td className="px-3 py-3 font-mono font-bold text-txt">{a.placa}</td>
                  <td className="px-3 py-3 text-txt2">{a.clienteNombre || '—'}</td>
                  <td className="px-3 py-3 text-txt2 text-xs">{a.trabajadorEntrada || '—'}</td>
                  <td className="px-3 py-3 text-txt2">{a.tipo}</td>
                  <td className="px-3 py-3 text-txt2 text-xs">{fechaStr(a.horaEntrada)}</td>
                  <td className="px-3 py-3 text-txt2 text-xs">{a.horaSalida ? fechaStr(a.horaSalida) : '—'}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-txt">{formatMonto(a.precioTotal)}</td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant={b.v}>{b.l}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {a.estado === 'salido' && (
                      <button onClick={() => handleAnular(a.id)} className="text-xs text-danger hover:underline">Anular</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-txt3">
            {datosFiltrados.length} registros · página {paginaActual} de {totalPaginas}
          </span>
          <div className="flex items-center gap-1">
            <PagBtn onClick={() => setPagina(1)}            disabled={paginaActual === 1}>«</PagBtn>
            <PagBtn onClick={() => setPagina(p => p - 1)}  disabled={paginaActual === 1}>‹</PagBtn>
            {paginasVisibles().map(n => (
              <PagBtn key={n} onClick={() => setPagina(n)} active={n === paginaActual}>{n}</PagBtn>
            ))}
            <PagBtn onClick={() => setPagina(p => p + 1)}  disabled={paginaActual === totalPaginas}>›</PagBtn>
            <PagBtn onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas}>»</PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function PagBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[28px] px-2 py-1 rounded text-xs border font-semibold transition-all
        ${active
          ? 'bg-accent/20 border-accent text-accent'
          : disabled
            ? 'border-border text-txt3 opacity-30 cursor-not-allowed'
            : 'border-border text-txt2 hover:border-accent/50 hover:text-txt'
        }`}
    >{children}</button>
  );
}
