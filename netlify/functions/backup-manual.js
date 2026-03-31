import { ejecutarBackup } from '../lib/backupCore.js';

// Función HTTP — solo acepta POST
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  console.log('[Backup Manual] Iniciando...');

  try {
    const resultado = await ejecutarBackup('manual');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        archivo:        resultado.archivo,
        totalRegistros: resultado.totalRegistros,
        tamanoBytes:    resultado.tamanoBytes,
      }),
    };
  } catch (err) {
    console.error('[Backup Manual] Error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
