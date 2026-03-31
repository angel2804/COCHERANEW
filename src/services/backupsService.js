import {
  collection, getDocs, orderBy, query,
  where, Timestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export async function getBackups() {
  const snap = await getDocs(
    query(collection(db, 'backups'), orderBy('fecha', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Lee todos los subdocumentos de datos y reconstruye el JSON completo del backup
export async function getBackupData(backupId) {
  const snap = await getDocs(collection(db, 'backups', backupId, 'datos'));
  const colMap = {};
  snap.docs.forEach(d => {
    const nombre = d.id.replace(/_\d+$/, '');
    if (!colMap[nombre]) colMap[nombre] = [];
    colMap[nombre].push(...(d.data().registros || []));
  });
  return colMap;
}

// ─── Purga de registros antiguos ────────────────────────────────────────────

const BATCH_SIZE = 400;

function getCutoff(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return Timestamp.fromDate(d);
}

async function eliminarEnLotes(docs) {
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const lote = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach(d => lote.delete(d.ref));
    await lote.commit();
  }
}

// Devuelve cuántos registros se eliminarían por colección (sin borrar nada)
export async function contarRegistrosAntiguos(meses) {
  const cutoff = getCutoff(meses);

  const [autosSnap, cobrosSnap, turnosSnap, notiSnap] = await Promise.all([
    getDocs(query(collection(db, 'autos'),          where('horaEntrada', '<', cutoff))),
    getDocs(query(collection(db, 'cobros'),         where('fechaCobro',  '<', cutoff))),
    getDocs(query(collection(db, 'turnos'),         where('fin',         '<', cutoff))),
    getDocs(query(collection(db, 'notificaciones'), where('fecha',       '<', cutoff))),
  ]);

  return [
    { col: 'autos',          cantidad: autosSnap.docs.filter(d => d.data().estado !== 'dentro').length },
    { col: 'cobros',         cantidad: cobrosSnap.size },
    { col: 'turnos',         cantidad: turnosSnap.docs.filter(d => d.data().estado === 'cerrado').length },
    { col: 'notificaciones', cantidad: notiSnap.size },
  ];
}

// Elimina los registros transaccionales más antiguos que `meses` meses
export async function purgarRegistrosAntiguos(meses) {
  const cutoff = getCutoff(meses);
  let totalEliminados = 0;

  // autos: solo los que ya salieron o fueron anulados
  const autosSnap = await getDocs(query(collection(db, 'autos'), where('horaEntrada', '<', cutoff)));
  const autosAEliminar = autosSnap.docs.filter(d => d.data().estado !== 'dentro');
  await eliminarEnLotes(autosAEliminar);
  totalEliminados += autosAEliminar.length;

  // cobros: todos los que tienen fechaCobro antigua
  const cobrosSnap = await getDocs(query(collection(db, 'cobros'), where('fechaCobro', '<', cutoff)));
  await eliminarEnLotes(cobrosSnap.docs);
  totalEliminados += cobrosSnap.size;

  // turnos: solo los cerrados con fin antiguo
  const turnosSnap = await getDocs(query(collection(db, 'turnos'), where('fin', '<', cutoff)));
  const turnosAEliminar = turnosSnap.docs.filter(d => d.data().estado === 'cerrado');
  await eliminarEnLotes(turnosAEliminar);
  totalEliminados += turnosAEliminar.length;

  // notificaciones: todas las antiguas
  const notiSnap = await getDocs(query(collection(db, 'notificaciones'), where('fecha', '<', cutoff)));
  await eliminarEnLotes(notiSnap.docs);
  totalEliminados += notiSnap.size;

  return totalEliminados;
}
