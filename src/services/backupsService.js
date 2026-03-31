import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function getBackups() {
  const snap = await getDocs(
    query(collection(db, 'backups'), orderBy('fecha', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
