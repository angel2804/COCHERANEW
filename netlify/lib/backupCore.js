import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
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
  const app     = getAdminApp();
  const db      = getFirestore(app);
  const storage = getStorage(app);

  const ahora    = new Date();
  const fechaStr = ahora.toISOString().slice(0, 10);
  const horaStr  = ahora.toISOString().slice(11, 16).replace(':', '-');
  const archivo  = `backups/${fechaStr}_${horaStr}_${etiqueta}.json`;

  const datos = {};
  let totalRegistros = 0;
  const resumenColecciones = [];

  for (const col of COLLECTIONS) {
    const snap = await db.collection(col).get();
    const docs = snap.docs.map(d => serializarDoc({ id: d.id, ...d.data() }));
    datos[col] = docs;
    totalRegistros += docs.length;
    resumenColecciones.push({ nombre: col, cantidad: docs.length });
    console.log(`  [${col}] ${docs.length} documentos`);
  }

  const payload = JSON.stringify({ generadoEn: ahora.toISOString(), tipo: etiqueta, datos }, null, 2);
  const buffer  = Buffer.from(payload, 'utf-8');

  const bucket = storage.bucket();
  const file   = bucket.file(archivo);
  await file.save(buffer, { metadata: { contentType: 'application/json' } });
  await file.makePublic();

  const urlDescarga = `https://storage.googleapis.com/${bucket.name}/${archivo}`;

  await db.collection('backups').add({
    fecha:         ahora,
    tipo:          etiqueta,
    nombreArchivo: archivo,
    urlDescarga,
    tamanoBytes:   buffer.length,
    totalRegistros,
    colecciones:   resumenColecciones,
  });

  console.log(`[Backup OK] ${archivo} — ${totalRegistros} registros — ${(buffer.length / 1024).toFixed(1)} KB`);

  return { archivo, urlDescarga, totalRegistros, tamanoBytes: buffer.length };
}
