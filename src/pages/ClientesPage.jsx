import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/ToastContext';
import { getAll, addCliente, updateCliente, deleteCliente } from '../services/clientesService';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

const PAGE_SIZE = 20;

export function ClientesPage() {
  const { showToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  // Modal
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [placasStr, setPlacasStr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await getAll();
      setClientes(data);
    } catch {
      showToast('Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtrados = busqueda
    ? clientes.filter(c =>
        (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.celular || '').includes(busqueda)
      )
    : clientes;

  const totalPags = Math.ceil(filtrados.length / PAGE_SIZE);
  const pagActual = Math.min(pagina, totalPags || 1);
  const vista = filtrados.slice((pagActual - 1) * PAGE_SIZE, pagActual * PAGE_SIZE);

  function onBusqueda(v) { setBusqueda(v); setPagina(1); }

  function abrirNuevo() {
    setEditId(null);
    setNombre(''); setCelular(''); setPlacasStr('');
    setModal(true);
  }

  function abrirEditar(c) {
    setEditId(c.id);
    setNombre(c.nombre || '');
    setCelular(c.celular || '');
    setPlacasStr((c.placas || []).join(', '));
    setModal(true);
  }

  async function guardar() {
    if (!nombre.trim()) { showToast('El nombre es requerido', 'warning'); return; }
    const placas = placasStr
      ? placasStr.split(',').map(p => p.trim().toUpperCase()).filter(Boolean)
      : [];
    setSaving(true);
    try {
      if (editId) {
        await updateCliente(editId, { nombre: nombre.trim(), celular: celular.trim(), placas });
        showToast('Cliente actualizado', 'success');
      } else {
        await addCliente({ nombre: nombre.trim(), celular: celular.trim(), placas });
        showToast('Cliente creado', 'success');
      }
      setModal(false);
      await cargar();
    } catch {
      showToast(`Error al ${editId ? 'actualizar' : 'crear'} cliente`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar al cliente "${c.nombre}"?`)) return;
    try {
      await deleteCliente(c.id);
      showToast('Cliente eliminado', 'success');
      await cargar();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold text-txt">Clientes</h1>
          <Button variant="success" onClick={abrirNuevo}>+ Nuevo Cliente</Button>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={e => onBusqueda(e.target.value)}
          placeholder="Buscar por nombre o celular..."
          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5
                     text-txt text-sm focus:outline-none focus:border-accent placeholder-txt3"
        />

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : vista.length === 0 ? (
          <div className="text-center py-16 text-txt3">
            <div className="text-4xl mb-3">👤</div>
            <p>No se encontraron clientes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vista.map(c => (
              <div key={c.id} className="bg-surface rounded-2xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-surface2 rounded-xl flex items-center justify-center text-xl shrink-0">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-txt truncate">{c.nombre || 'Sin nombre'}</div>
                    <div className="text-sm text-txt3">{c.celular || 'Sin celular'}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(c.placas || []).length > 0
                        ? (c.placas).map(p => (
                            <span key={p} className="text-xs bg-blue/10 text-blue px-2 py-0.5 rounded-full font-mono font-bold">
                              {p}
                            </span>
                          ))
                        : <span className="text-xs text-txt3">Sin placas</span>
                      }
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" onClick={() => abrirEditar(c)} className="flex-1 text-xs py-1.5">
                    ✏️ Editar
                  </Button>
                  <Button variant="danger" onClick={() => eliminar(c)} className="text-xs px-3 py-1.5">
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPags > 1 && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagActual <= 1}
              className="text-sm"
            >
              ← Anterior
            </Button>
            <span className="text-sm text-txt3">
              {((pagActual - 1) * PAGE_SIZE) + 1}–{Math.min(pagActual * PAGE_SIZE, filtrados.length)} de {filtrados.length}
            </span>
            <Button
              variant="secondary"
              onClick={() => setPagina(p => p + 1)}
              disabled={pagActual >= totalPags}
              className="text-sm"
            >
              Siguiente →
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={modal}
        title={editId ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
        onClose={() => setModal(false)}
        buttons={[
          { label: saving ? 'Guardando...' : (editId ? 'Guardar' : 'Crear'), variant: 'success', onClick: guardar, disabled: saving },
          { label: 'Cancelar', variant: 'secondary', onClick: () => setModal(false) },
        ]}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-txt3 mb-1">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                         text-txt focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-txt3 mb-1">Celular</label>
            <input
              type="text"
              value={celular}
              onChange={e => setCelular(e.target.value)}
              placeholder="Número de celular"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                         text-txt focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-txt3 mb-1">Placas (separadas por coma)</label>
            <input
              type="text"
              value={placasStr}
              onChange={e => setPlacasStr(e.target.value.toUpperCase())}
              placeholder="ABC123, XYZ789"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5
                         text-txt font-mono uppercase focus:outline-none focus:border-accent"
            />
            <p className="text-xs text-txt3 mt-1">Ejemplo: ABC123, DEF456</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
