import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/ToastContext';
import { EntradaForm } from '../components/vehiculos/EntradaForm';
import { SalidaPanel } from '../components/vehiculos/SalidaPanel';
import { ArqueoModal } from '../components/turno/ArqueoModal';
import { CocheraPage } from './CocheraPage';
import { Clock } from '../components/ui/Clock';
import { DarkModeToggle } from '../components/layout/DarkModeToggle';
import { Spinner } from '../components/ui/Spinner';
import { TIPOS_TURNO } from '../utils/vehiculoTipos';
import {
  getActivo, getActivoDelTrabajador, iniciarTurno, cerrarTurno,
} from '../services/turnosService';
import { getTrabajadores } from '../services/trabajadoresService';
import { getByTurno, generarHTMLReporte, descargarPDF, calcularTotal } from '../services/reportesService';
import { formatMonto } from '../utils/monto';
import { fechaStr } from '../utils/fecha';
import { NovedadesModal } from '../components/novedades/NovedadesModal';
import { Modal } from '../components/ui/Modal';

const DIAS_KEY   = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
const DIAS_ORDEN = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DIAS_LABEL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

export function TurnoPage() {
  const { session, logout } = useAuth();
  const { mostrarToast }    = useToast();
  const navigate            = useNavigate();

  // Pantallas: 'loading' | 'select' | 'info' | 'turno'
  const [pantalla, setPantalla]           = useState('loading');
  const [trabajadores, setTrabajadores]   = useState([]);
  const [trabajadorSel, setTrabajadorSel] = useState(null); // { id, nombre }
  const [turnoActivo, setTurnoActivo]     = useState(null);
  const [tipoSeleccionado, setTipo]       = useState(null);
  const [errTurno, setErrTurno]           = useState('');
  const [loadingTurno, setLoadingTurno]   = useState(false);
  const [refreshKey, setRefreshKey]       = useState(0);
  const [sidebarOpen, setSidebar]         = useState(false);
  const [vistaActiva, setVista]           = useState('registro');

  const [arqueoOpen, setArqueoOpen]       = useState(false);
  const [arqueoCobrosy, setArqueoCobros]  = useState([]);
  const [turnoAsignado, setTurnoAsignado] = useState('');
  const [horarioBloqueado, setHorarioBloqueado] = useState(false);

  // Mi Turno — cobros
  const [misCobros, setMisCobros]           = useState([]);
  const [cargandoCobros, setCargandoCobros] = useState(false);

  // Horario
  const [horarioSemana, setHorarioSemana]       = useState(null);
  const [cargandoHorario, setCargandoHorario]   = useState(false);
  const [errorHorario, setErrorHorario]         = useState(false);
  const [modalHorario, setModalHorario]         = useState(false);

  const [reporteModal, setReporteModal]   = useState(false);
  const [reporteData, setReporteData]     = useState(null);
  const [reporteArqueo, setReporteArqueo] = useState(null);
  const [reporteHtml, setReporteHtml]     = useState('');

  useEffect(() => {
    if (!session) { navigate('/login', { replace: true }); return; }
    inicializar();
  }, [session]);

  // Cargar datos al cambiar de pestaña
  useEffect(() => {
    if (vistaActiva === 'horario' && trabajadorSel) {
      cargarHorario(trabajadorSel.id);
    }
    if (vistaActiva === 'miturno' && turnoActivo) {
      cargarMisCobros();
    }
  }, [vistaActiva]);

  async function inicializar() {
    try {
      // Cargar lista de trabajadores
      const lista = await getTrabajadores();
      setTrabajadores(lista);

      // Verificar si hay un turno activo de un trabajador físico
      const activo = await getActivo();
      if (activo) {
        const trabajador = lista.find(t => t.id === activo.trabajadorId);
        if (trabajador) {
          // El turno activo pertenece a un trabajador físico → ir directo a turno
          setTrabajadorSel(trabajador);
          setTurnoActivo(activo);
          setPantalla('turno');
          return;
        }
      }
      setPantalla('select');
    } catch (e) {
      console.error(e);
      setPantalla('select');
    }
  }

  async function seleccionarTrabajador(trabajador) {
    setTrabajadorSel(trabajador);
    setErrTurno('');
    setTipo(null);
    setTurnoAsignado('');
    setHorarioBloqueado(false);

    // Verificar si ya tiene turno activo
    const activo = await getActivoDelTrabajador(trabajador.id);
    if (activo) {
      setTurnoActivo(activo);
      setPantalla('turno');
      return;
    }

    // Cargar turno asignado del horario
    const diaHoy = DIAS_KEY[new Date().getDay()];
    try {
      const snap = await getDocs(
        query(collection(db, 'horarios'), where('trabajadorId', '==', trabajador.id), limit(1))
      );
      if (!snap.empty) {
        const tipo = (snap.docs[0].data().semana || {})[diaHoy] || '';
        if (tipo) { setTurnoAsignado(tipo); setTipo(tipo); setHorarioBloqueado(true); }
      }
    } catch {}

    setPantalla('info');
  }

  async function cargarHorario(trabajadorId) {
    setCargandoHorario(true);
    setErrorHorario(false);
    try {
      const snap = await getDocs(
        query(collection(db, 'horarios'), where('trabajadorId', '==', trabajadorId), limit(1))
      );
      setHorarioSemana(snap.empty ? null : (snap.docs[0].data().semana || {}));
    } catch {
      setErrorHorario(true);
      setHorarioSemana(null);
    } finally {
      setCargandoHorario(false);
    }
  }

  async function cargarMisCobros() {
    setCargandoCobros(true);
    try {
      const [cobros, autosSnap] = await Promise.all([
        getByTurno(turnoActivo.id),
        getDocs(query(collection(db, 'autos'), where('turnoEntradaId', '==', turnoActivo.id))),
      ]);
      const llavesMap = {};
      autosSnap.forEach(d => { llavesMap[d.data().placa] = d.data().dejoLlave; });
      setMisCobros(cobros.map(c => ({ ...c, dejoLlave: llavesMap[c.placa] ?? null })));
    } catch {
      setMisCobros([]);
    } finally {
      setCargandoCobros(false);
    }
  }

  async function abrirHorario() {
    setModalHorario(true);
    if (!horarioSemana) await cargarHorario(trabajadorSel.id);
  }

  async function handleIniciarTurno() {
    if (!tipoSeleccionado) { setErrTurno('Selecciona un tipo de turno primero.'); return; }
    setErrTurno('');
    setLoadingTurno(true);
    try {
      const t = await iniciarTurno(tipoSeleccionado, trabajadorSel, trabajadores.map(w => w.id));
      setTurnoActivo(t);
      setPantalla('turno');
      mostrarToast(`Turno ${tipoSeleccionado} iniciado`, 'success');
    } catch (e) {
      if (e.message === 'ya_hay_turno') setErrTurno('⚠️ Ya hay un turno activo de otro trabajador.');
      else setErrTurno('Error al iniciar turno. Intenta de nuevo.');
    } finally {
      setLoadingTurno(false);
    }
  }

  async function abrirArqueo() {
    setSidebar(false);
    if (!turnoActivo) return;
    const cobros = await getByTurno(turnoActivo.id).catch(() => []);
    setArqueoCobros(cobros);
    setArqueoOpen(true);
  }

  async function handleCerrarTurno(arqueo) {
    setArqueoOpen(false);
    try {
      await cerrarTurno(turnoActivo.id, arqueo);
      const turnoData = { ...turnoActivo, fin: new Date() };
      const html = generarHTMLReporte(arqueoCobrosy, turnoData, arqueo);
      setReporteData(turnoData);
      setReporteArqueo(arqueo);
      setReporteHtml(html);
      setReporteModal(true);
      setTurnoActivo(null);
    } catch {
      mostrarToast('Error al cerrar turno', 'error');
    }
  }

  function volverASeleccion() {
    setReporteModal(false);
    setTrabajadorSel(null);
    setTurnoActivo(null);
    setTipo(null);
    setTurnoAsignado('');
    setHorarioBloqueado(false);
    setHorarioSemana(null);
    setVista('registro');
    setPantalla('select');
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function cambiarVista(v) {
    setVista(v);
    setSidebar(false);
  }

  // ── Pantalla: Cargando ─────────────────────────────────────────────────────
  if (pantalla === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Pantalla: Selección de trabajador ──────────────────────────────────────
  if (pantalla === 'select') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 gap-6">
        <div className="fixed top-4 right-4 flex gap-2">
          <DarkModeToggle />
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm bg-danger/10 text-danger border border-danger/20 rounded-lg hover:bg-danger/20 font-semibold"
          >
            Salir
          </button>
        </div>

        <div className="text-center">
          <div className="text-4xl mb-2">🅿</div>
          <h1 className="font-display text-2xl font-bold text-txt">COCHERA POS</h1>
          <p className="text-txt3 text-sm mt-1">¿Quién está trabajando hoy?</p>
        </div>

        {trabajadores.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center max-w-sm w-full">
            <p className="text-txt3 text-sm">No hay trabajadores registrados.<br />El administrador debe agregar trabajadores primero.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {trabajadores.map(t => (
                <button
                  key={t.id}
                  onClick={() => seleccionarTrabajador(t)}
                  className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl border border-border bg-bg3 hover:border-accent/50 hover:bg-accent/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold text-lg flex items-center justify-center group-hover:bg-accent/30">
                    {t.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-txt">{t.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <NovedadesModal />
      </div>
    );
  }

  // ── Pantalla: Info del trabajador ──────────────────────────────────────────
  if (pantalla === 'info') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 gap-6">
        <div className="fixed top-4 right-4 flex gap-2">
          <DarkModeToggle />
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm bg-danger/10 text-danger border border-danger/20 rounded-lg hover:bg-danger/20 font-semibold"
          >
            Salir
          </button>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent/20 text-accent font-bold text-3xl flex items-center justify-center mx-auto mb-3">
            {trabajadorSel?.nombre.charAt(0).toUpperCase()}
          </div>
          <h1 className="font-display text-xl font-bold text-txt">Bienvenido, {trabajadorSel?.nombre}</h1>
        </div>

        {turnoAsignado && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm text-accent text-center max-w-sm w-full">
            📅 Turno asignado hoy: <strong>{turnoAsignado}</strong>
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
          <h2 className="font-display text-base font-semibold text-txt">Selecciona el tipo de turno</h2>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_TURNO.map(tipo => (
              <button
                key={tipo}
                onClick={() => !horarioBloqueado && setTipo(tipo)}
                disabled={horarioBloqueado && tipo !== tipoSeleccionado}
                className={`py-3 rounded-xl border text-sm font-semibold transition-all
                  ${tipoSeleccionado === tipo
                    ? 'bg-accent/20 border-accent text-accent'
                    : horarioBloqueado && tipo !== tipoSeleccionado
                      ? 'opacity-30 cursor-not-allowed bg-bg3 border-border text-txt3'
                      : 'bg-bg3 border-border text-txt2 hover:border-accent/50 hover:text-txt'
                  }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          {errTurno && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{errTurno}</p>
          )}

          <button
            onClick={handleIniciarTurno}
            disabled={loadingTurno}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent2 text-[#0f1117] font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {loadingTurno ? <Spinner size="sm" /> : null}
            {loadingTurno ? 'Iniciando...' : '✅ Iniciar Turno'}
          </button>

          <button
            onClick={abrirHorario}
            className="w-full py-2 text-sm text-txt3 hover:text-txt border border-border rounded-xl transition-colors"
          >
            📅 Ver mi horario
          </button>

          <button
            onClick={() => { setTrabajadorSel(null); setPantalla('select'); }}
            className="w-full text-sm text-txt3 hover:text-txt transition-colors"
          >
            ← Cambiar trabajador
          </button>
        </div>

        {/* Modal horario */}
        <Modal
          open={modalHorario}
          titulo={`📅 Horario de ${trabajadorSel?.nombre}`}
          onClose={() => setModalHorario(false)}
          botones={[{ texto: 'Cerrar', clase: 'btn-secondary', onClick: () => setModalHorario(false) }]}
        >
          {cargandoHorario ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : errorHorario ? (
            <div className="text-center py-4">
              <p className="text-danger text-sm mb-3">Error al cargar el horario.</p>
              <button onClick={() => cargarHorario(trabajadorSel.id)} className="text-sm text-accent underline">Reintentar</button>
            </div>
          ) : horarioSemana ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-txt3 border-b border-border">
                  <th className="py-2">Día</th>
                  <th className="py-2">Turno</th>
                </tr>
              </thead>
              <tbody>
                {DIAS_ORDEN.map((dia, i) => {
                  const t = horarioSemana[dia] || 'Libre';
                  return (
                    <tr key={dia} className="border-b border-border/50">
                      <td className="py-2 text-txt">{DIAS_LABEL[i]}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t === 'Libre' ? 'text-txt3' : 'bg-accent/10 text-accent'}`}>
                          {t}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-txt3 text-center py-4">No hay horario asignado para {trabajadorSel?.nombre}.</p>
          )}
        </Modal>

        <NovedadesModal />
      </div>
    );
  }

  // ── Pantalla: Turno Activo ─────────────────────────────────────────────────
  const vistaTitulo = {
    registro: '🚗 Entrada / Salida',
    cochera:  '🅿 Cochera',
    horario:  '📅 Mi Horario',
    miturno:  '💰 Mi Turno',
  }[vistaActiva];

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 w-56 bg-bg2 border-r border-border flex flex-col
        transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-4 py-4 border-b border-border">
          <div className="font-display font-bold text-txt text-base tracking-wider">🅿 COCHERA POS</div>
          {turnoActivo && (
            <div className="text-xs text-accent mt-0.5">{turnoActivo.tipo} · {trabajadorSel?.nombre}</div>
          )}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1">
          <SidebarNavBtn active={vistaActiva === 'registro'} onClick={() => cambiarVista('registro')}>
            🚗 Entrada / Salida
          </SidebarNavBtn>
          <SidebarNavBtn active={vistaActiva === 'cochera'} onClick={() => cambiarVista('cochera')}>
            🅿 Cochera
          </SidebarNavBtn>
          <SidebarNavBtn active={vistaActiva === 'horario'} onClick={() => cambiarVista('horario')}>
            📅 Mi Horario
          </SidebarNavBtn>
          <SidebarNavBtn active={vistaActiva === 'miturno'} onClick={() => cambiarVista('miturno')}>
            💰 Mi Turno
          </SidebarNavBtn>
          <div className="pt-2 border-t border-border/50 mt-2">
            <SidebarNavBtn danger onClick={abrirArqueo}>
              🔴 Cerrar Turno
            </SidebarNavBtn>
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm
              bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 transition-colors font-semibold"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 bg-bg2 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebar(v => !v)} className="p-2 rounded-lg hover:bg-surface2 text-txt2 text-lg lg:hidden">☰</button>
            <span className="font-display font-semibold text-txt">{vistaTitulo}</span>
            {turnoActivo && (
              <span className="hidden sm:inline text-xs bg-accent/10 text-accent border border-accent/30 px-2 py-1 rounded-lg font-semibold">
                Turno {turnoActivo.tipo} — {fechaStr(turnoActivo.inicio, true)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock />
            <DarkModeToggle />
          </div>
        </header>

        {/* Contenido por vista */}
        <main className="flex-1 overflow-y-auto">

          {/* Vista Registro */}
          {vistaActiva === 'registro' && (
            <div className="grid md:grid-cols-2 gap-4 p-4">
              <div className="bg-surface border border-border rounded-2xl p-4">
                <h3 className="font-display text-lg font-semibold text-accent mb-4">🚗 Registrar Entrada</h3>
                <EntradaForm
                  turno={turnoActivo}
                  sesion={session}
                  onEntradaRegistrada={() => setRefreshKey(k => k + 1)}
                />
              </div>
              <div className="bg-surface border border-border rounded-2xl p-4">
                <h3 className="font-display text-lg font-semibold text-yellow mb-4">🏁 Registrar Salida</h3>
                <SalidaPanel
                  turno={turnoActivo}
                  sesion={session}
                  refreshKey={refreshKey}
                />
              </div>
            </div>
          )}

          {/* Vista Cochera — inline */}
          {vistaActiva === 'cochera' && (
            <CocheraPage />
          )}

          {/* Vista Horario */}
          {vistaActiva === 'horario' && (
            <div className="p-4 max-w-md">
              <div className="bg-surface border border-border rounded-2xl p-5">
                <h3 className="font-display text-lg font-semibold text-txt mb-4">📅 Mi Horario Semanal</h3>
                {cargandoHorario ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : errorHorario ? (
                  <div className="text-center py-6">
                    <p className="text-danger text-sm mb-3">Error al cargar el horario.</p>
                    <button
                      onClick={() => cargarHorario(trabajadorSel.id)}
                      className="text-sm text-accent underline"
                    >Reintentar</button>
                  </div>
                ) : horarioSemana ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-txt3 border-b border-border">
                        <th className="py-2">Día</th>
                        <th className="py-2">Turno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DIAS_ORDEN.map((dia, i) => {
                        const t = horarioSemana[dia] || 'Libre';
                        return (
                          <tr key={dia} className="border-b border-border/50">
                            <td className="py-2 text-txt">{DIAS_LABEL[i]}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t === 'Libre' ? 'text-txt3' : 'bg-accent/10 text-accent'}`}>
                                {t}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-txt3 text-center py-4">No tienes horario asignado aún.</p>
                )}
              </div>
            </div>
          )}

          {/* Vista Mi Turno */}
          {vistaActiva === 'miturno' && (
            <div className="p-4 max-w-2xl">
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-txt">💰 Cobros de mi turno</h3>
                  <button
                    onClick={cargarMisCobros}
                    className="text-xs text-accent hover:underline"
                  >Actualizar</button>
                </div>
                {cargandoCobros ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : misCobros.length === 0 ? (
                  <p className="text-txt3 text-center py-6 text-sm">No hay cobros registrados en este turno aún.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-txt3 text-xs uppercase tracking-wide border-b border-border">
                            <th className="pb-2 pr-3">Placa</th>
                            <th className="pb-2 pr-3">Cliente</th>
                            <th className="pb-2 pr-3">Tipo</th>
                            <th className="pb-2 pr-3">Método</th>
                            <th className="pb-2 pr-3">Llave</th>
                            <th className="pb-2 pr-3">Hora</th>
                            <th className="pb-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {misCobros.map(c => (
                            <tr key={c.id} className="border-b border-border/40">
                              <td className="py-2 pr-3 font-mono font-bold text-txt">{c.placa}</td>
                              <td className="py-2 pr-3 text-txt2">{c.clienteNombre || '—'}</td>
                              <td className="py-2 pr-3">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${c.tipo === 'ingreso' ? 'bg-accent/10 text-accent' : 'bg-yellow/10 text-yellow'}`}>
                                  {c.tipo === 'ingreso' ? 'Ingreso' : 'Salida'}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-txt2 text-xs">{c.metodoPago || '—'}</td>
                              <td className="py-2 pr-3 text-xs">
                                {c.dejoLlave === null ? <span className="text-txt3">—</span>
                                  : c.dejoLlave ? <span className="text-accent font-semibold">Sí</span>
                                  : <span className="text-txt3">No</span>}
                              </td>
                              <td className="py-2 pr-3 text-txt3 text-xs">
                                {c.fechaCobro ? new Date(c.fechaCobro?.seconds ? c.fechaCobro.seconds * 1000 : c.fechaCobro).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-txt">{formatMonto(c.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm text-txt3">{misCobros.length} cobro{misCobros.length !== 1 ? 's' : ''}</span>
                      <span className="font-display font-bold text-accent text-lg">
                        Total: {formatMonto(calcularTotal(misCobros))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Arqueo Modal */}
      <ArqueoModal
        open={arqueoOpen}
        turno={turnoActivo}
        cobros={arqueoCobrosy}
        onConfirmar={handleCerrarTurno}
        onCancel={() => setArqueoOpen(false)}
      />

      {/* Modal reporte final */}
      <Modal
        open={reporteModal}
        titulo="✅ Turno Cerrado — Reporte Final"
        onClose={volverASeleccion}
        botones={[
          { texto: '📄 PDF', clase: 'btn-secondary', onClick: () => descargarPDF(reporteData, arqueoCobrosy, reporteArqueo) },
          { texto: 'Aceptar', clase: 'btn-success', onClick: volverASeleccion },
        ]}
      >
        <div dangerouslySetInnerHTML={{ __html: reporteHtml }} className="text-[#1a2535] bg-white rounded overflow-auto" />
      </Modal>

      <NovedadesModal />
    </div>
  );
}

function SidebarNavBtn({ children, onClick, danger, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors
        ${danger
          ? 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20'
          : active
            ? 'bg-accent/15 text-accent border border-accent/30'
            : 'text-txt2 hover:bg-surface2 hover:text-txt'
        }`}
    >
      {children}
    </button>
  );
}
