import { useEffect, useState } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, doc, query, where, limit,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Button } from '../../../components/ui/Button';
import { FormInput } from '../../../components/ui/FormInput';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/ToastContext';

export function UsuariosSection() {
  const { mostrarToast } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm]         = useState({ usuario: '', nombre: '', password: '', rol: 'trabajador' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const snap = await getDocs(collection(db, 'usuarios')).finally(() => setLoading(false));
    const lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
    lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    setUsuarios(lista);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm({ usuario: '', nombre: '', password: '', rol: 'trabajador' });
    setModal(true);
  }

  function abrirEditar(u) {
    setEditando(u);
    setForm({ usuario: u.usuario, nombre: u.nombre, password: '', rol: u.rol });
    setModal(true);
  }

  async function guardar() {
    if (!form.usuario || !form.nombre) { mostrarToast('Completa usuario y nombre', 'warning'); return; }
    if (!editando && !form.password)   { mostrarToast('La contraseña es requerida', 'warning'); return; }
    setSaving(true);
    try {
      if (editando) {
        const data = { nombre: form.nombre, rol: form.rol };
        if (form.password) data.password = form.password;
        await updateDoc(doc(db, 'usuarios', editando.id), data);
        mostrarToast('Usuario actualizado', 'success');
      } else {
        // Verificar si ya existe
        const existe = await getDocs(query(collection(db, 'usuarios'), where('usuario', '==', form.usuario), limit(1)));
        if (!existe.empty) { mostrarToast('Ese usuario ya existe', 'error'); return; }
        await addDoc(collection(db, 'usuarios'), {
          usuario: form.usuario, nombre: form.nombre, password: form.password,
          rol: form.rol, activo: true, creadoEn: new Date(),
        });
        mostrarToast('Usuario creado', 'success');
      }
      setModal(false);
      cargar();
    } catch (e) {
      mostrarToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(u) {
    await updateDoc(doc(db, 'usuarios', u.id), { activo: !u.activo });
    mostrarToast(u.activo ? 'Usuario desactivado' : 'Usuario activado', 'success');
    cargar();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg font-semibold text-txt">Usuarios del sistema</h3>
        <Button variant="success" onClick={abrirNuevo}>+ Nuevo usuario</Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface dark:bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg3 text-txt3 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3 text-left">Nombre</th>
              <th className="px-3 py-3 text-left">Usuario</th>
              <th className="px-3 py-3 text-left">Rol</th>
              <th className="px-3 py-3 text-center">Estado</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-8"><Spinner /></td></tr>}
            {!loading && usuarios.map(u => (
              <tr key={u.id} className="border-t border-border hover:bg-surface2 transition-colors">
                <td className="px-3 py-3 font-semibold text-txt">{u.nombre}</td>
                <td className="px-3 py-3 font-mono text-txt2">{u.usuario}</td>
                <td className="px-3 py-3 text-txt2 capitalize">{u.rol}</td>
                <td className="px-3 py-3 text-center">
                  <Badge variant={u.activo ? 'success' : 'danger'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                </td>
                <td className="px-3 py-3 text-right flex gap-2 justify-end">
                  <button onClick={() => abrirEditar(u)} className="text-xs text-accent hover:underline">Editar</button>
                  <button onClick={() => toggleActivo(u)} className="text-xs text-txt2 hover:underline">
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} titulo={editando ? 'Editar Usuario' : 'Nuevo Usuario'}
        onClose={() => setModal(false)}
        botones={[
          { texto: saving ? 'Guardando...' : 'Guardar', clase: 'btn-success', onClick: guardar },
          { texto: 'Cancelar', clase: 'btn-secondary', onClick: () => setModal(false) },
        ]}>
        <div className="space-y-3">
          <FormInput label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <FormInput label="Usuario" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} readOnly={!!editando} />
          <FormInput label={editando ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-txt2 uppercase tracking-wide">Rol</label>
            <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
              className="bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-txt focus:outline-none focus:border-accent">
              <option value="trabajador">Trabajador</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
