import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Crea una notificación de anulación o edición de cobro.
 * @param {{ tipo, cobroId, placa, clienteNombre, montoOriginal,
 *           montoNuevo, metodoPagoNuevo, motivo, trabajador,
 *           trabajadorId, turnoId }} data
 */
export async function crearNotificacion(data) {
  await addDoc(collection(db, 'notificaciones'), {
    ...data,
    leida: false,
    fecha: new Date(),
  });
}

/** Suscripción en tiempo real (para admin). Devuelve unsubscribe(). */
export function suscribirNotificaciones(callback) {
  const q = query(collection(db, 'notificaciones'), orderBy('fecha', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function borrarNotificacion(id) {
  await deleteDoc(doc(db, 'notificaciones', id));
}
