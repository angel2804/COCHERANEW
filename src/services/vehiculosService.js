import {
  collection, doc, getDocs, addDoc, updateDoc,
  runTransaction, query, where, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatFecha } from '../utils/fecha';
import { agregarPlacaAuto } from './clientesService';

// ── Referencias de configuración ─────────────────────────────────────────────
const _ref = {
  ticket:    () => doc(db, 'configuracion', 'ticket'),
  general:   () => doc(db, 'configuracion', 'general'),
  ocupacion: () => doc(db, 'configuracion', 'ocupacion'),
  lock:   (placa) => doc(db, 'autos_activos', placa),
};

// ── Registrar Entrada ─────────────────────────────────────────────────────────
// Transacción atómica: lock + ocupacion + ticket + auto doc
export async function registrarEntrada(datos, turno, sesion) {
  const placa             = datos.placa.toUpperCase().trim();
  const ahora             = datos.horaEntrada ? new Date(datos.horaEntrada) : new Date();
  const turnoId           = turno?.id || null;
  const turnoTrabajadorId = turno?.trabajadorId || sesion.id;
  const turnoTrabajador   = turno?.trabajador   || sesion.nombre || sesion.usuario;
  const cobro             = datos.cobradoAlIngreso && datos.montoIngreso > 0;

  // ID pre-generado para usar dentro de la transacción
  const autoRef    = doc(collection(db, 'autos'));
  const lockRef    = _ref.lock(placa);
  const ocupRef    = _ref.ocupacion();
  const generalRef = _ref.general();
  const ticketRef  = _ref.ticket();

  const docBase = {
    placa,
    tipo:                datos.tipo || 'Auto',
    clienteNombre:       datos.clienteNombre || 'Sin nombre',
    clienteCelular:      datos.clienteCelular || '',
    horaEntrada:         ahora,
    horaSalida:          null,
    estado:              'dentro',
    esPreRegistro:       datos.esPreRegistro || false,
    tarifaPactada:       parseFloat(datos.tarifaPactada) || 0,
    turnoEntradaId:      turnoId,
    trabajadorEntradaId: turnoTrabajadorId,
    trabajadorEntrada:   turnoTrabajador,
    cobradoAlIngreso:    cobro,
    montoIngreso:        cobro ? (parseFloat(datos.montoIngreso) || 0) : 0,
    metodoPagoIngreso:   cobro ? (datos.metodoPago || 'Efectivo') : null,
    dejoLlave:           datos.dejoLlave || false,
    turnoSalidaId:       null,
    trabajadorSalidaId:  null,
    trabajadorSalida:    null,
    montoSalida:         0,
    precioTotal:         cobro ? (parseFloat(datos.montoIngreso) || 0) : 0,
    fecha:               ahora,
  };

  const ticketNum = await runTransaction(db, async t => {
    const lockSnap    = await t.get(lockRef);
    const ocupSnap    = await t.get(ocupRef);
    const generalSnap = await t.get(generalRef);
    const ticketSnap  = await t.get(ticketRef);

    // Validar duplicado
    if (lockSnap.exists()) {
      const existingAutoId = lockSnap.data()?.autoId;
      if (existingAutoId) {
        const existingSnap = await t.get(doc(db, 'autos', existingAutoId));
        const estaAdentro  = existingSnap.exists() && existingSnap.data().estado === 'dentro';
        if (estaAdentro) throw new Error('duplicado');
      } else {
        throw new Error('duplicado');
      }
    }

    const totalEspacios = generalSnap.exists()
      ? (generalSnap.data().totalEspacios || 30) : 30;
    const ocupActual = ocupSnap.exists()
      ? (ocupSnap.data().count || 0) : 0;

    if (ocupActual >= totalEspacios) throw new Error('sin_espacio');

    const numTicket = (ticketSnap.exists() ? ticketSnap.data().ultimo : 0) + 1;

    t.set(lockRef,   { placa, autoId: autoRef.id, horaEntrada: ahora });
    t.set(ocupRef,   { count: ocupActual + 1 });
    t.set(ticketRef, { ultimo: numTicket });
    t.set(autoRef,   { ...docBase, ticketNumero: numTicket });

    return numTicket;
  });

  const autoId = autoRef.id;

  // Cobro al ingreso — fuera de transacción (puramente aditivo)
  if (cobro && turnoId) {
    await addDoc(collection(db, 'cobros'), {
      autoId,
      placa,
      clienteNombre:   docBase.clienteNombre,
      clienteCelular:  docBase.clienteCelular,
      tipo:            'ingreso',
      monto:           docBase.montoIngreso,
      metodoPago:      docBase.metodoPagoIngreso,
      turnoId,
      trabajadorId:    turnoTrabajadorId,
      trabajador:      turnoTrabajador,
      horaEntradaAuto: ahora,
      horaSalidaAuto:  null,
      fecha:           ahora,
      fechaCobro:      ahora,
    });
  }

  // Auto-registrar cliente en background
  if (datos.clienteNombre && placa) {
    agregarPlacaAuto(placa, datos.clienteNombre, datos.clienteCelular).catch(() => {});
  }

  return { id: autoId, ...docBase, ticketNumero: ticketNum };
}

// ── Registrar Salida ──────────────────────────────────────────────────────────
export async function registrarSalida(autoId, monto, turno, sesion, opciones = {}) {
  const autoDoc = await getDoc(doc(db, 'autos', autoId));
  if (!autoDoc.exists()) throw new Error('no_encontrado');
  const auto = { id: autoDoc.id, ...autoDoc.data() };

  const ahora             = new Date();
  const turnoId           = turno?.id || null;
  const turnoTrabajadorId = turno?.trabajadorId || sesion.id;
  const turnoTrabajador   = turno?.trabajador   || sesion.nombre || sesion.usuario;
  const montoSalida       = parseFloat(monto) || 0;
  const precioTotal       = (auto.montoIngreso || 0) + montoSalida;

  const montoCalculadoSistema = opciones.montoCalculadoSistema ?? montoSalida;
  const motivoModificacion    = opciones.motivoModificacion || null;
  const pagadoIngreso         = opciones.pagadoIngreso || 0;
  const metodoPago            = opciones.metodoPago || null;
  const saldoEsperado         = Math.max(0, montoCalculadoSistema - pagadoIngreso);
  const alertaAuditoria       = Math.abs(montoSalida - saldoEsperado) > 0.01;

  const autoRef = doc(db, 'autos', autoId);
  const lockRef = _ref.lock(auto.placa);
  const ocupRef = _ref.ocupacion();

  await runTransaction(db, async t => {
    const autoSnap = await t.get(autoRef);
    const ocupSnap = await t.get(ocupRef);

    if (!autoSnap.exists() || autoSnap.data().estado !== 'dentro') {
      throw new Error('ya_salio');
    }

    const ocupActual = ocupSnap.exists() ? (ocupSnap.data().count || 0) : 0;

    t.update(autoRef, {
      horaSalida:         ahora,
      estado:             'salido',
      turnoSalidaId:      turnoId,
      trabajadorSalidaId: turnoTrabajadorId,
      trabajadorSalida:   turnoTrabajador,
      montoSalida,
      precioTotal,
    });
    t.delete(lockRef);
    t.set(ocupRef, { count: Math.max(0, ocupActual - 1) });
  });

  if (turnoId) {
    await addDoc(collection(db, 'cobros'), {
      autoId,
      placa:                  auto.placa,
      clienteNombre:          auto.clienteNombre,
      clienteCelular:         auto.clienteCelular,
      tipo:                   'salida',
      monto:                  montoSalida,
      metodoPago:             montoSalida > 0 ? (metodoPago || 'Efectivo') : null,
      montoCalculadoSistema,
      alertaAuditoria,
      motivoModificacion:     alertaAuditoria ? motivoModificacion : null,
      turnoId,
      trabajadorId:           turnoTrabajadorId,
      trabajador:             turnoTrabajador,
      horaEntradaAuto:        formatFecha(auto.horaEntrada),
      horaSalidaAuto:         ahora,
      fecha:                  ahora,
      fechaCobro:             ahora,
    });
  }

  return { ...auto, horaSalida: ahora, montoSalida, precioTotal };
}

// ── Registrar Entrada + Salida Inmediata (cobro al ingreso, no va a cochera) ──
// Crea el registro completo, guarda cobro 'ingreso' y cierra el auto al instante.
export async function registrarEntradaInmediata(datos, turno, sesion) {
  const resultado = await registrarEntrada(datos, turno, sesion);
  const autoRef   = doc(db, 'autos', resultado.id);
  const lockRef   = _ref.lock(resultado.placa);
  const ocupRef   = _ref.ocupacion();
  const ahora     = new Date();
  const turnoTrabajadorId = turno?.trabajadorId || sesion.id;
  const turnoTrabajador   = turno?.trabajador   || sesion.nombre || sesion.usuario;

  await runTransaction(db, async t => {
    const ocupSnap = await t.get(ocupRef);
    const ocupActual = ocupSnap.exists() ? (ocupSnap.data().count || 0) : 0;
    t.update(autoRef, {
      horaSalida:         ahora,
      estado:             'salido',
      turnoSalidaId:      turno?.id || null,
      trabajadorSalidaId: turnoTrabajadorId,
      trabajadorSalida:   turnoTrabajador,
      montoSalida:        0,
    });
    t.delete(lockRef);
    t.set(ocupRef, { count: Math.max(0, ocupActual - 1) });
  });

  return { ...resultado, horaSalida: ahora, estado: 'salido' };
}

// ── Anular Registro ───────────────────────────────────────────────────────────
export async function anularRegistro(id, sesion) {
  const autoDoc = await getDoc(doc(db, 'autos', id));
  if (!autoDoc.exists()) throw new Error('no_encontrado');
  if (autoDoc.data().estado === 'anulado') throw new Error('ya_anulado');

  await updateDoc(doc(db, 'autos', id), {
    estado:       'anulado',
    anuladoEn:    new Date(),
    anuladoPor:   sesion.nombre || sesion.usuario,
    anuladoPorId: sesion.id,
  });
}

// ── Total de espacios configurados ───────────────────────────────────────────
export async function getTotalEspacios() {
  const snap = await getDoc(_ref.general());
  return snap.exists() ? (snap.data().totalEspacios || 30) : 30;
}

// ── Vehículos en cochera ──────────────────────────────────────────────────────
export async function getEnCochera() {
  const snap = await getDocs(
    query(collection(db, 'autos'), where('estado', '==', 'dentro'))
  );
  const lista = [];
  snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
  lista.sort((a, b) => formatFecha(a.horaEntrada) - formatFecha(b.horaEntrada));
  return lista;
}

export async function getAutoById(id) {
  const snap = await getDoc(doc(db, 'autos', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ── Sincronizar contador de ocupación (admin) ─────────────────────────────────
export async function sincronizarContador() {
  const snap = await getDocs(
    query(collection(db, 'autos'), where('estado', '==', 'dentro'))
  );
  await updateDoc(doc(db, 'configuracion', 'ocupacion'), { count: snap.size })
    .catch(() =>
      addDoc(collection(db, 'configuracion'), { count: snap.size })
    );
}
