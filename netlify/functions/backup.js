import { schedule } from '@netlify/functions';
import { ejecutarBackup } from '../lib/backupCore.js';

// Cron: 0 13 * * *  →  13:00 UTC  =  08:00 AM hora Perú (UTC-5)
export const handler = schedule('0 13 * * *', async () => {
  console.log('[Backup Diario] Iniciando...');
  await ejecutarBackup('auto');
  return new Response('Backup completado', { status: 200 });
});
