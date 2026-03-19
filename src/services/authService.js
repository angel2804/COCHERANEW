import {
  collection, doc, getDocs, addDoc, query, where, limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Verifica primer uso y crea admin por defecto si no hay usuarios
 */
export async function verificarPrimerUso() {
  try {
    const snap = await getDocs(query(collection(db, 'usuarios'), limit(1)));
    if (snap.empty) {
      await addDoc(collection(db, 'usuarios'), {
        usuario:  'admin',
        nombre:   'Administrador',
        password: 'admin123',
        rol:      'admin',
        activo:   true,
        creadoEn: new Date(),
      });
      return true; // primer uso detectado
    }
  } catch (e) {
    console.warn('Error verificando primer uso:', e);
  }
  return false;
}

/**
 * Crea el usuario desarrollador si no existe
 */
export async function verificarUsuarioDesarrollador() {
  try {
    const snap = await getDocs(
      query(collection(db, 'usuarios'), where('usuario', '==', 'angel'), limit(1))
    );
    if (snap.empty) {
      await addDoc(collection(db, 'usuarios'), {
        usuario:  'angel',
        nombre:   'Desarrollador',
        password: 'angelccasa284',
        rol:      'desarrollador',
        activo:   true,
        creadoEn: new Date(),
      });
    }
  } catch (e) {
    console.warn('Error verificando usuario desarrollador:', e);
  }
}

/**
 * Carga el logo desde Firestore
 * @returns {string|null} URL del logo o null
 */
export async function cargarLogoUrl() {
  try {
    const snap = await getDocs(
      query(collection(db, 'configuracion'))
    );
    // Usamos getDoc directo en su lugar
    const { getDoc } = await import('firebase/firestore');
    const docSnap = await getDoc(doc(db, 'configuracion', 'general'));
    return docSnap.exists() ? (docSnap.data().logoUrl || null) : null;
  } catch {
    return null;
  }
}

/**
 * Autentica al usuario contra Firestore
 * @returns {{ id, usuario, nombre, rol }} sesión
 * @throws Error con mensaje 'no_encontrado' | 'password_incorrecta' | 'error_conexion'
 */
export async function login(usuario, password) {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'usuarios'),
        where('usuario', '==', usuario),
        where('activo',  '==', true),
        limit(1)
      )
    );

    if (snap.empty) throw new Error('no_encontrado');

    const docSnap = snap.docs[0];
    const data    = docSnap.data();

    if (data.password !== password) throw new Error('password_incorrecta');

    return {
      id:      docSnap.id,
      usuario: data.usuario,
      nombre:  data.nombre || data.usuario,
      rol:     data.rol,
    };
  } catch (e) {
    if (e.message === 'no_encontrado' || e.message === 'password_incorrecta') throw e;
    throw new Error('error_conexion');
  }
}
