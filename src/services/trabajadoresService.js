import {
  collection, getDocs, addDoc, updateDoc, doc, query, where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export async function getTrabajadores() {
  const snap = await getDocs(
    query(collection(db, 'trabajadores'), where('activo', '==', true))
  );
  const lista = [];
  snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function getTodosLosTrabajadores() {
  const snap = await getDocs(collection(db, 'trabajadores'));
  const lista = [];
  snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function crearTrabajador(nombre) {
  const data = {
    nombre: nombre.trim(),
    activo: true,
    creadoEn: new Date(),
  };
  const ref = await addDoc(collection(db, 'trabajadores'), data);
  return { id: ref.id, ...data };
}

export async function actualizarTrabajador(id, nombre) {
  await updateDoc(doc(db, 'trabajadores', id), { nombre: nombre.trim() });
}

export async function desactivarTrabajador(id) {
  await updateDoc(doc(db, 'trabajadores', id), { activo: false });
}

export async function reactivarTrabajador(id) {
  await updateDoc(doc(db, 'trabajadores', id), { activo: true });
}
