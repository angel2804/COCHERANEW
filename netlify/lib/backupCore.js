import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const COLLECTIONS = [
  'usuarios',
  'trabajadores',
  'turnos',
  'autos',
  'cobros',
  'clientes',
  'configuracion',
  'notificaciones',
];

// Máximo de registros por documento Firestore (evita superar el límite de 1MB)
const CHUNK_SIZE = 300;

function serializarDoc(valor) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor?.toDate === 'function') return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(serializarDoc);
  if (typeof valor === 'object') {
    const resultado = {};
    for (const [k, v] of Object.entries(valor)) {
      resultado[k] = serializarDoc(v);
    }
    return resultado;
  }
  return valor;
}

export async function ejecutarBackup(etiqueta = 'auto') {
  const app = getAdminApp();
  const db  = getFirestore(app);

  const ahora = new Date();

  // 1. Crear documento principal del backup (metadata)
  const backupRef = await db.collection('backups').add({
    fecha:          ahora,
    tipo:           etiqueta,
    totalRegistros: 0,
    colecciones:    [],
    estado:         'en_progreso',
  });

  const backupId = backupRef.id;
  let totalRegistros = 0;
  const resumenColecciones = [];

  // 2. Leer y guardar cada colección en subdocumentos
  for (const col of COLLECTIONS) {
    const snap = await db.collection(col).get();
    const docs = snap.docs.map(d => serializarDoc({ id: d.id, ...d.data() }));
    totalRegistros += docs.length;
    resumenColecciones.push({ nombre: col, cantidad: docs.length });

    // Dividir en chunks para no superar 1MB por documento
    const chunks = [];
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      chunks.push(docs.slice(i, i + CHUNK_SIZE));
    }

    // Si no hay docs, guardar documento vacío igual
    if (chunks.length === 0) {
      await db.collection('backups').doc(backupId)
        .collection('datos').doc(col).set({ registros: [] });
    } else {
      for (let i = 0; i < chunks.length; i++) {
        const docId = chunks.length === 1 ? col : `${col}_${i}`;
        await db.collection('backups').doc(backupId)
          .collection('datos').doc(docId).set({ registros: chunks[i] });
      }
    }

    console.log(`  [${col}] ${docs.length} docs → ${Math.max(1, chunks.length)} chunk(s)`);
  }

  // 3. Actualizar metadata con totales
  await db.collection('backups').doc(backupId).update({
    totalRegistros,
    colecciones: resumenColecciones,
    estado:      'completado',
  });

  console.log(`[Backup OK] id=${backupId} — ${totalRegistros} registros`);

  // 4. Eliminar backups antiguos — conservar solo los 2 más recientes
  await limpiarBackupsAntiguos(db);

  return { backupId, totalRegistros };
}

// Elimina todos los backups excepto los 2 más recientes
async function limpiarBackupsAntiguos(db) {
  const snap = await db.collection('backups')
    .orderBy('fecha', 'desc')
    .get();

  const aEliminar = snap.docs.slice(2); // todo lo que esté después del índice 1

  for (const doc of aEliminar) {
    // Primero borrar subdocumentos de datos/ (Firestore no los borra solo)
    const datosSnap = await db.collection('backups').doc(doc.id)
      .collection('datos').get();
    for (const datoDoc of datosSnap.docs) {
      await datoDoc.ref.delete();
    }
    // Luego borrar el documento padre
    await doc.ref.delete();
    console.log(`[Backup limpieza] Eliminado backup antiguo: ${doc.id}`);
  }
}
