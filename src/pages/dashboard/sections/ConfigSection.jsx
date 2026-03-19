import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getActivo } from '../../../services/turnosService';
import { useAuth } from '../../../context/AuthContext';
import { sincronizarContador } from '../../../services/vehiculosService';
import { useToast } from '../../../components/ui/ToastContext';
import { Button } from '../../../components/ui/Button';
import { FormInput } from '../../../components/ui/FormInput';
import { Spinner } from '../../../components/ui/Spinner';

export function ConfigSection() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const isDev = session?.rol === 'desarrollador';

  const [espacios, setEspacios] = useState('');
  const [loadingEspacios, setLoadingEspacios] = useState(true);
  const [savingEspacios, setSavingEspacios] = useState(false);

  const [logoUrl, setLogoUrl] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [syncingContador, setSyncingContador] = useState(false);
  const [sembrandoDatos, setSembrandoDatos] = useState(false);
  const [cerrandoTurno, setCerrandoTurno] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    cargarConfig();
  }, []);

  async function cargarConfig() {
    setLoadingEspacios(true);
    try {
      const snap = await getDoc(doc(db, 'configuracion', 'general'));
      if (snap.exists()) {
        setEspacios(String(snap.data().totalEspacios || 30));
        if (isDev) setLogoUrl(snap.data().logoUrl || null);
      } else {
        setEspacios('30');
      }
    } catch (e) {
      showToast('Error al cargar configuración', 'error');
    } finally {
      setLoadingEspacios(false);
    }
  }

  async function guardarEspacios() {
    const val = parseInt(espacios);
    if (!val || val < 1) { showToast('Número de espacios inválido', 'warning'); return; }
    setSavingEspacios(true);
    try {
      await setDoc(doc(db, 'configuracion', 'general'), { totalEspacios: val }, { merge: true });
      showToast('Configuración guardada', 'success');
    } catch (e) {
      showToast('Error al guardar', 'error');
    } finally {
      setSavingEspacios(false);
    }
  }

  function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoDataUrl(ev.target.result);
      setLogoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function guardarLogo() {
    if (!logoDataUrl) return;
    setSavingLogo(true);
    try {
      await setDoc(doc(db, 'configuracion', 'general'), { logoUrl: logoDataUrl }, { merge: true });
      setLogoUrl(logoDataUrl);
      setLogoDataUrl(null);
      showToast('Logo guardado', 'success');
    } catch (e) {
      showToast('Error al guardar logo', 'error');
    } finally {
      setSavingLogo(false);
    }
  }

  async function borrarLogo() {
    setSavingLogo(true);
    try {
      await setDoc(doc(db, 'configuracion', 'general'), { logoUrl: null }, { merge: true });
      setLogoUrl(null);
      setLogoPreview(null);
      setLogoDataUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Logo eliminado', 'success');
    } catch (e) {
      showToast('Error al eliminar logo', 'error');
    } finally {
      setSavingLogo(false);
    }
  }

  async function sembrarDatos() {
    if (!confirm('¿Crear datos de ejemplo en Firestore? Esto añade turnos, autos y cobros de prueba.')) return;
    setSembrandoDatos(true);
    try {
      const ahora = new Date();
      const hace2h = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);
      const hace5h = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
      const hace26h = new Date(ahora.getTime() - 26 * 60 * 60 * 1000);
      const trabajador = session.nombre || session.usuario;
      const trabajadorId = session.id;

      // Turno de ejemplo
      const turnoRef = await addDoc(collection(db, 'turnos'), {
        trabajadorId, trabajador, tipo: 'Mañana',
        inicio: hace5h, fin: null, estado: 'activo', fecha: hace5h,
      });
      const turnoId = turnoRef.id;

      // Auto 1: pagado al ingreso (estado salido)
      await addDoc(collection(db, 'autos'), {
        placa: 'TEST-01', tipo: 'Moto',
        clienteNombre: 'Juan Perez', clienteCelular: '987654321',
        horaEntrada: hace5h, horaSalida: hace5h, estado: 'salido',
        cobradoAlIngreso: true, montoIngreso: 5, metodoPagoIngreso: 'Efectivo',
        tarifaPactada: 0, montoSalida: 0, precioTotal: 5,
        turnoEntradaId: turnoId, trabajadorEntradaId: trabajadorId, trabajadorEntrada: trabajador,
        turnoSalidaId: turnoId, trabajadorSalidaId: trabajadorId, trabajadorSalida: trabajador,
        dejoLlave: false, esPreRegistro: false, fecha: hace5h, ticketNumero: 9001,
      });
      await addDoc(collection(db, 'cobros'), {
        placa: 'TEST-01', clienteNombre: 'Juan Perez', clienteCelular: '987654321',
        tipo: 'ingreso', monto: 5, metodoPago: 'Efectivo',
        turnoId, trabajadorId, trabajador,
        horaEntradaAuto: hace5h, horaSalidaAuto: null,
        fecha: hace5h, fechaCobro: hace5h,
      });

      // Auto 2: en cochera, paga a la salida
      await addDoc(collection(db, 'autos'), {
        placa: 'TEST-02', tipo: 'Auto',
        clienteNombre: 'Maria Lopez', clienteCelular: '912345678',
        horaEntrada: hace2h, horaSalida: null, estado: 'dentro',
        cobradoAlIngreso: false, montoIngreso: 0, metodoPagoIngreso: null,
        tarifaPactada: 30, montoSalida: 0, precioTotal: 0,
        turnoEntradaId: turnoId, trabajadorEntradaId: trabajadorId, trabajadorEntrada: trabajador,
        turnoSalidaId: null, trabajadorSalidaId: null, trabajadorSalida: null,
        dejoLlave: true, esPreRegistro: false, fecha: hace2h, ticketNumero: 9002,
      });

      // Auto 3: camión, pagado a la salida y ya salió
      await addDoc(collection(db, 'autos'), {
        placa: 'TEST-03', tipo: 'Camión',
        clienteNombre: 'Pedro Quispe', clienteCelular: '',
        horaEntrada: hace26h, horaSalida: hace2h, estado: 'salido',
        cobradoAlIngreso: false, montoIngreso: 0, metodoPagoIngreso: null,
        tarifaPactada: 50, montoSalida: 50, precioTotal: 50,
        turnoEntradaId: turnoId, trabajadorEntradaId: trabajadorId, trabajadorEntrada: trabajador,
        turnoSalidaId: turnoId, trabajadorSalidaId: trabajadorId, trabajadorSalida: trabajador,
        dejoLlave: false, esPreRegistro: false, fecha: hace26h, ticketNumero: 9003,
      });
      await addDoc(collection(db, 'cobros'), {
        placa: 'TEST-03', clienteNombre: 'Pedro Quispe', clienteCelular: '',
        tipo: 'salida', monto: 50, metodoPago: 'Yape',
        montoCalculadoSistema: 50, alertaAuditoria: false, motivoModificacion: null,
        turnoId, trabajadorId, trabajador,
        horaEntradaAuto: hace26h, horaSalidaAuto: hace2h,
        fecha: hace2h, fechaCobro: hace2h,
      });

      showToast('✅ Datos de ejemplo creados: 1 turno, 3 autos, 2 cobros', 'success');
    } catch (e) {
      showToast('Error al crear datos de ejemplo', 'error');
      console.error(e);
    } finally {
      setSembrandoDatos(false);
    }
  }

  async function cerrarTurnoActivo() {
    const turno = await getActivo();
    if (!turno) { showToast('No hay ningún turno activo', 'warning'); return; }
    if (!confirm(`¿Cerrar el turno activo de "${turno.trabajador}" (${turno.tipo})? Esta acción no se puede deshacer.`)) return;
    setCerrandoTurno(true);
    try {
      await updateDoc(doc(db, 'turnos', turno.id), { fin: new Date(), estado: 'cerrado' });
      showToast(`Turno de ${turno.trabajador} cerrado correctamente`, 'success');
    } catch (e) {
      showToast('Error al cerrar turno', 'error');
    } finally {
      setCerrandoTurno(false);
    }
  }

  async function borrarTodosLosDatos() {
    const confirmacion = prompt(
      'Esta acción borrará TODOS los autos, cobros, turnos y horarios.\n\nEscribe BORRAR para confirmar:'
    );
    if (confirmacion !== 'BORRAR') { showToast('Cancelado', 'warning'); return; }
    setBorrando(true);
    try {
      const colecciones = ['autos', 'cobros', 'turnos', 'horarios'];
      let totalBorrados = 0;
      for (const col of colecciones) {
        const snap = await getDocs(collection(db, col));
        // Borrar en lotes de 500 (límite de Firestore)
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        totalBorrados += docs.length;
      }
      showToast(`Datos borrados: ${totalBorrados} documentos eliminados`, 'success');
    } catch (e) {
      showToast('Error al borrar datos', 'error');
      console.error(e);
    } finally {
      setBorrando(false);
    }
  }

  async function handleSincronizar() {
    if (!confirm('¿Sincronizar el contador de ocupación con los vehículos actuales en cochera?')) return;
    setSyncingContador(true);
    try {
      const nuevo = await sincronizarContador();
      showToast(`Contador sincronizado: ${nuevo} vehículos`, 'success');
    } catch (e) {
      showToast('Error al sincronizar', 'error');
    } finally {
      setSyncingContador(false);
    }
  }

  if (loadingEspacios) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h3 className="font-display text-lg font-semibold text-txt">Configuración General</h3>

      {/* Espacios */}
      <div className="bg-surface rounded-2xl p-5 space-y-4">
        <h4 className="font-semibold text-txt text-sm uppercase tracking-widest text-txt3">
          Capacidad de Cochera
        </h4>
        <FormInput
          label="Total de espacios disponibles"
          type="number"
          value={espacios}
          onChange={e => setEspacios(e.target.value)}
          min="1"
          placeholder="30"
        />
        <Button
          variant="success"
          onClick={guardarEspacios}
          disabled={savingEspacios}
          className="w-full"
        >
          {savingEspacios ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>

      {/* Dev-only cards */}
      {isDev && (
        <>
          {/* Logo */}
          <div className="bg-surface rounded-2xl p-5 space-y-4 border border-blue/20">
            <h4 className="font-semibold text-txt text-sm uppercase tracking-widest text-txt3">
              Logo de empresa <span className="text-blue text-xs normal-case">(solo desarrollador)</span>
            </h4>

            {(logoPreview || logoUrl) && (
              <div className="flex items-center gap-3">
                <img
                  src={logoPreview || logoUrl}
                  alt="Logo"
                  className="h-16 w-auto rounded-lg border border-border object-contain bg-white p-1"
                />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="block w-full text-sm text-txt3 file:mr-3 file:py-2 file:px-4
                         file:rounded-lg file:border-0 file:text-xs file:font-semibold
                         file:bg-surface2 file:text-txt cursor-pointer"
            />

            <div className="flex gap-2">
              {logoDataUrl && (
                <Button variant="success" onClick={guardarLogo} disabled={savingLogo} className="flex-1">
                  {savingLogo ? 'Guardando...' : 'Guardar Logo'}
                </Button>
              )}
              {(logoUrl || logoPreview) && (
                <Button variant="danger" onClick={borrarLogo} disabled={savingLogo} className="flex-1">
                  Eliminar Logo
                </Button>
              )}
            </div>
          </div>

          {/* Cerrar turno activo */}
          <div className="bg-surface rounded-2xl p-5 space-y-3 border border-danger/20">
            <h4 className="font-semibold text-txt text-sm uppercase tracking-widest text-txt3">
              Cerrar turno activo <span className="text-danger text-xs normal-case">(solo desarrollador)</span>
            </h4>
            <p className="text-xs text-txt3">
              Cierra el turno activo que haya en el sistema. Útil para limpiar turnos residuales del admin
              que bloquean al trabajador.
            </p>
            <Button variant="danger" onClick={cerrarTurnoActivo} disabled={cerrandoTurno} className="w-full">
              {cerrandoTurno ? 'Cerrando...' : '🔴 Cerrar Turno Activo'}
            </Button>
          </div>

          {/* Sincronizar contador */}
          <div className="bg-surface rounded-2xl p-5 space-y-3 border border-yellow/20">
            <h4 className="font-semibold text-txt text-sm uppercase tracking-widest text-txt3">
              Herramientas de desarrollo <span className="text-yellow text-xs normal-case">(solo desarrollador)</span>
            </h4>
            <p className="text-xs text-txt3">
              Sincroniza el contador de ocupación de Firestore con los registros reales. Útil si el
              contador quedó desincronizado tras una migración o corrección manual de datos.
            </p>
            <Button variant="warning" onClick={handleSincronizar} disabled={syncingContador} className="w-full">
              {syncingContador ? 'Sincronizando...' : 'Sincronizar Contador de Ocupación'}
            </Button>
          </div>

          {/* Semilla de datos de ejemplo */}
          <div className="bg-surface rounded-2xl p-5 space-y-3 border border-green-500/20">
            <h4 className="font-semibold text-txt text-sm uppercase tracking-widest text-txt3">
              Datos de ejemplo <span className="text-green-400 text-xs normal-case">(solo desarrollador)</span>
            </h4>
            <p className="text-xs text-txt3">
              Crea un turno activo con 3 vehículos de prueba (1 moto pagada al ingreso, 1 auto en cochera,
              1 camión con salida registrada) y los cobros correspondientes. Útil para verificar que todo
              el sistema funciona correctamente.
            </p>
            <Button
              variant="success"
              onClick={sembrarDatos}
              disabled={sembrandoDatos}
              className="w-full"
            >
              {sembrandoDatos ? 'Creando datos...' : '🧪 Crear datos de ejemplo'}
            </Button>
          </div>

          {/* Borrar todos los datos */}
          <div className="bg-surface rounded-2xl p-5 space-y-3 border border-danger/30">
            <h4 className="font-semibold text-txt text-sm uppercase tracking-widest text-txt3">
              Limpiar base de datos <span className="text-danger text-xs normal-case">(solo desarrollador)</span>
            </h4>
            <p className="text-xs text-txt3">
              Elimina <strong className="text-txt">todos</strong> los autos, cobros, turnos y horarios.
              No afecta usuarios, trabajadores, ni la configuración (logo, espacios).
              Se pedirá confirmación escribiendo <code className="text-danger font-mono">BORRAR</code>.
            </p>
            <Button
              variant="danger"
              onClick={borrarTodosLosDatos}
              disabled={borrando}
              className="w-full"
            >
              {borrando ? 'Borrando...' : '🗑️ Limpiar todos los datos'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
