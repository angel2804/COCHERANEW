import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export async function buscarPorPlaca(placa) {
  if (!placa || placa.length < 3) return null;
  const snap = await getDocs(
    query(
      collection(db, 'clientes'),
      where('placas', 'array-contains', placa.toUpperCase()),
      limit(1)
    )
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getAll() {
  const snap = await getDocs(collection(db, 'clientes'));
  const lista = [];
  snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
  lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  return lista;
}

export async function addCliente(data) {
  data.placas   = (data.placas || []).map(p => p.toUpperCase().trim()).filter(Boolean);
  data.creadoEn = new Date();
  const ref = await addDoc(collection(db, 'clientes'), data);
  return { id: ref.id, ...data };
}

export async function updateCliente(id, data) {
  if (data.placas) data.placas = data.placas.map(p => p.toUpperCase().trim()).filter(Boolean);
  await updateDoc(doc(db, 'clientes', id), data);
}

export async function deleteCliente(id) {
  await deleteDoc(doc(db, 'clientes', id));
}

export async function agregarPlacaAuto(placa, nombre, celular) {
  placa = placa.toUpperCase().trim();
  const existe = await buscarPorPlaca(placa);
  if (existe) return;
  if (!nombre) return;

  if (celular) {
    const snap = await getDocs(
      query(collection(db, 'clientes'), where('celular', '==', celular), limit(1))
    );
    if (!snap.empty) {
      const d = snap.docs[0];
      const placas = d.data().placas || [];
      if (!placas.includes(placa)) {
        await updateDoc(doc(db, 'clientes', d.id), { placas: [...placas, placa] });
      }
      return;
    }
  }
  await addCliente({ nombre, celular: celular || '', placas: [placa] });
}
