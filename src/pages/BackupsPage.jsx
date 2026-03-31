import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/ToastContext';
import { getBackups, getBackupData, contarRegistrosAntiguos, purgarRegistrosAntiguos } from '../services/backupsService';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
  return d.toLocaleDateString('es-PE', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const OPCIONES_MESES = [
  { valor: 3,  label: 'más de 3 meses' },
  { valor: 6,  label: 'más de 6 meses' },
  { valor: 12, label: 'más de 1 año' },
  { valor: 24, label: 'más de 2 años' },
];

export function BackupsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [backups, setBackups]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [descargando, setDescargando] = useState(null);
  const [generando, setGenerando]   = useState(false);

  // Purga
  const [mesesPurga, setMesesPurga]   = useState(6);
  const [preview, setPreview]         = useState(null);
  const [contando, setContando]       = useState(false);
  const [purgando, setPurgando]       = useState(false);

  if (session?.rol !== 'desarrollador') return <Navigate to="/dashboard" replace />;

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      setBackups(await getBackups());
    } catch {
      showToast('Error al cargar backups', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function generarBackup() {
    if (!confirm('¿Generar un backup manual ahora? Esto puede tardar unos segundos.')) return;
    setGenerando(true);
    try {
      const resp = await fetch('/.netlify/functions/backup-manual', { method: 'POST' });
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch {
        throw new Error(`Error del servidor (${resp.status}): ${text.slice(0, 100)}`);
      }
      if (!resp.ok || !data.ok) throw new Error(data.error || `Error ${resp.status}`);
      showToast(`Backup generado — ${data.totalRegistros} registros`, 'success');
      await cargar();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setGenerando(false);
    }
  }

  async function descargar(backup) {
    setDescargando(backup.id);
    try {
      const datos = await getBackupData(backup.id);
      const fechaStr = backup.fecha?.toDate
        ? backup.fecha.toDate().toISOString()
        : new Date().toISOString();
      const payload = JSON.stringify({ generadoEn: fechaStr, tipo: backup.tipo, datos }, null, 2);
      const blob    = new Blob([payload], { type: 'application/json' });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href        = url;
      a.download    = `backup_${fechaStr.slice(0, 10)}_${backup.tipo || 'auto'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Error al descargar el backup', 'error');
    } finally {
      setDescargando(null);
    }
  }

  async function verPreview() {
    setContando(true);
    setPreview(null);
    try {
      const resultado = await contarRegistrosAntiguos(mesesPurga);
      setPreview(resultado);
    } catch {
      showToast('Error al contar registros', 'error');
    } finally {
      setContando(false);
    }
  }

  async function ejecutarPurga() {
    const totalPreview = preview?.reduce((s, r) => s + r.cantidad, 0) || 0;
    if (!confirm(`⚠️ ¿Estás seguro? Se eliminarán ${totalPreview.toLocaleString()} registros permanentemente.\n\nAsegúrate de haber descargado un backup antes de continuar.`)) return;
    if (!confirm('Segunda confirmación: ¿Eliminar los registros ahora? Esta acción NO se puede deshacer.')) return;
    setPurgando(true);
    try {
      const total = await purgarRegistrosAntiguos(mesesPurga);
      showToast(`Purga completada — ${total.toLocaleString()} registros eliminados`, 'success');
      setPreview(null);
    } catch {
      showToast('Error durante la purga', 'error');
    } finally {
      setPurgando(false);
    }
  }

  const totalPreview = preview?.reduce((s, r) => s + r.cantidad, 0) ?? null;

  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Encabezado */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-txt">Backups del Sistema</h1>
            <p className="text-sm text-txt3 mt-0.5">Respaldos automáticos diarios — solo visible para el desarrollador</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={cargar}>↻ Actualizar</Button>
            <Button variant="warning" onClick={generarBackup} disabled={generando}>
              {generando ? '⏳ Generando...' : '📦 Generar Backup Ahora'}
            </Button>
          </div>
        </div>

        {/* Aviso informativo */}
        <div className="bg-surface border border-border rounded-2xl p-4 text-sm text-txt3">
          <span className="font-semibold text-txt">ℹ️ Información:</span> Los backups se generan automáticamente
          cada día a las <strong className="text-txt">8:00 AM</strong> (hora Perú). Se conservan los <strong className="text-txt">2 más recientes</strong>.
          Haz clic en <strong className="text-txt">⬇️ Descargar JSON</strong> para guardar el archivo en tu PC.
        </div>

        {/* Lista de backups */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : backups.length === 0 ? (
          <div className="text-center py-16 text-txt3">
            <div className="text-5xl mb-3">💾</div>
            <p className="font-semibold text-txt">Aún no hay backups</p>
            <p className="text-sm mt-1">El primer backup se creará automáticamente mañana a las 8:00 AM.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map(b => (
              <div key={b.id} className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface2 rounded-xl flex items-center justify-center text-xl shrink-0">
                      💾
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-txt">{formatFecha(b.fecha)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.tipo === 'manual'
                            ? 'bg-yellow/20 text-yellow'
                            : 'bg-accent/15 text-accent'
                        }`}>
                          {b.tipo === 'manual' ? 'MANUAL' : 'AUTO'}
                        </span>
                      </div>
                      <div className="text-xs text-txt3 mt-0.5">
                        {(b.totalRegistros || 0).toLocaleString()} registros · {formatBytes(b.tamanoBytes)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="success"
                    onClick={() => descargar(b)}
                    disabled={descargando === b.id || b.estado === 'en_progreso'}
                    className="text-sm shrink-0"
                  >
                    {descargando === b.id ? '⏳ Descargando...' : '⬇️ Descargar JSON'}
                  </Button>
                </div>

                {b.colecciones?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                    {b.colecciones.map(c => (
                      <span key={c.nombre} className="text-xs bg-surface2 text-txt3 px-2.5 py-1 rounded-full">
                        {c.nombre}: <span className="font-semibold text-txt">{c.cantidad}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Sección de purga ── */}
        <div className="bg-surface border border-danger/30 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-txt">🗑️ Purgar registros antiguos</h2>
            <p className="text-sm text-txt3 mt-0.5">
              Elimina historial transaccional antiguo para liberar espacio en Firestore.
              <strong className="text-txt"> No elimina</strong>: usuarios, trabajadores, clientes ni configuración.
            </p>
          </div>

          {/* Advertencia */}
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-sm text-danger font-semibold">
            ⚠️ Descarga un backup antes de purgar. Los datos eliminados no se pueden recuperar.
          </div>

          {/* Selector de antigüedad */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-txt3">Eliminar registros con:</span>
            <select
              value={mesesPurga}
              onChange={e => { setMesesPurga(Number(e.target.value)); setPreview(null); }}
              className="bg-surface2 border border-border rounded-xl px-3 py-2 text-sm text-txt focus:outline-none focus:border-accent"
            >
              {OPCIONES_MESES.map(o => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={verPreview} disabled={contando} className="text-sm">
              {contando ? <><Spinner size="sm" /> Contando...</> : '🔍 Ver cuántos se eliminarían'}
            </Button>
          </div>

          {/* Preview de resultados */}
          {preview && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {preview.map(r => (
                  <div key={r.col} className="bg-surface2 rounded-xl p-3 text-center">
                    <div className="text-xs text-txt3 uppercase tracking-wider">{r.col}</div>
                    <div className={`text-lg font-bold mt-0.5 ${r.cantidad > 0 ? 'text-danger' : 'text-txt3'}`}>
                      {r.cantidad.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                <span className="text-sm text-txt3">
                  Total a eliminar: <strong className="text-danger">{totalPreview?.toLocaleString()}</strong> registros
                </span>
                <Button
                  variant="danger"
                  onClick={ejecutarPurga}
                  disabled={purgando || totalPreview === 0}
                  className="text-sm"
                >
                  {purgando ? '⏳ Purgando...' : `🗑️ Purgar ${totalPreview?.toLocaleString()} registros`}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
