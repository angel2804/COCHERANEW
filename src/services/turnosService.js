import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, limit, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatFecha } from '../utils/fecha';

export const TIPOS_TURNO = ['Mañana', 'Tarde', 'Noche', 'Todo el día'];

export async function getActivo() {
  const snap = await getDocs(
    query(collection(db, 'turnos'), where('estado', '==', 'activo'), limit(1))
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// Busca el turno activo para un trabajador físico (ID de colección `trabajadores`)
export async function getActivoDelTrabajador(trabajadorPersonaId) {
  const snap = await getDocs(
    query(
      collection(db, 'turnos'),
      where('trabajadorId', '==', trabajadorPersonaId),
      where('estado',       '==', 'activo'),
      limit(1)
    )
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// Inicia turno para un trabajador físico seleccionado.
// trabajadorPersona = { id, nombre } de la colección `trabajadores`
// workerIds = lista de IDs válidos de la colección `trabajadores` (para distinguir admin/test turnos)
export async function iniciarTurno(tipo, trabajadorPersona, workerIds = []) {
  // Si este trabajador ya tiene un turno activo, devolverlo
  const propio = await getActivoDelTrabajador(trabajadorPersona.id);
  if (propio) return propio;

  // Solo bloquear si el turno activo pertenece a OTRO trabajador físico
  const activo = await getActivo();
  if (activo && workerIds.length > 0 && workerIds.includes(activo.trabajadorId)) {
    throw new Error('ya_hay_turno');
  }

  const data = {
    trabajadorId: trabajadorPersona.id,
    trabajador:   trabajadorPersona.nombre,
    tipo,
    inicio:       new Date(),
    fin:          null,
    estado:       'activo',
    fecha:        new Date(),
  };
  const ref = await addDoc(collection(db, 'turnos'), data);
  return { id: ref.id, ...data };
}

export async function cerrarTurno(turnoId, arqueo) {
  const update = { fin: new Date(), estado: 'cerrado' };
  if (arqueo) {
    update.arqueoEfectivo   = arqueo.efectivoEntregado || 0;
    update.arqueoEsperado   = arqueo.totalEsperado     || 0;
    update.arqueoDiferencia = arqueo.diferencia        || 0;
  }
  await updateDoc(doc(db, 'turnos', turnoId), update);
}

export async function getTurnoById(id) {
  const snap = await getDoc(doc(db, 'turnos', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getTodos() {
  const snap = await getDocs(query(collection(db, 'turnos'), limit(200)));
  const lista = [];
  snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
  lista.sort((a, b) => formatFecha(b.inicio) - formatFecha(a.inicio));
  return lista;
}
