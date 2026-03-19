import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getTotalEspacios } from '../../../services/vehiculosService';
import { getActivo } from '../../../services/turnosService';
import { formatMonto } from '../../../utils/monto';
import { fechaStr } from '../../../utils/fecha';

export function DashboardHome() {
  const [stats, setStats] = useState({
    dentroCount: 0, totalEspacios: 30, libres: 30,
    totalHoy: 0, metEf: 0, metYape: 0, metVisa: 0, atendidos: 0,
  });
  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      const [totalEspacios, turnoActivo] = await Promise.all([
        getTotalEspacios(),
        getActivo(),
      ]);
      setTurno(turnoActivo);

      // Autos en cochera
      const enCocheraSnap = await getDocs(query(collection(db, 'autos'), where('estado', '==', 'dentro')));
      const dentroCount = enCocheraSnap.size;

      // Cobros de hoy
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);

      const cobrosSnap = await getDocs(
        query(collection(db, 'cobros'), where('fechaCobro', '>=', hoy), where('fechaCobro', '<', manana))
      );
      let totalHoy = 0, metEf = 0, metYape = 0, metVisa = 0;
      cobrosSnap.forEach(d => {
        const c = d.data();
        totalHoy += c.monto || 0;
        const m = c.metodoPago || 'Efectivo';
        if (m === 'Yape') metYape += c.monto || 0;
        else if (m === 'Visa') metVisa += c.monto || 0;
        else metEf += c.monto || 0;
      });

      // Atendidos hoy
      const autosHoySnap = await getDocs(
        query(collection(db, 'autos'), where('fecha', '>=', hoy), where('fecha', '<', manana))
      );

      setStats({
        dentroCount, totalEspacios, libres: Math.max(0, totalEspacios - dentroCount),
        totalHoy, metEf, metYape, metVisa, atendidos: autosHoySnap.size,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const pct = stats.totalEspacios > 0
    ? Math.round((stats.dentroCount / stats.totalEspacios) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Banner turno */}
      {!loading && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold
          ${turno
            ? 'bg-accent/10 border-accent/30 text-accent'
            : 'bg-yellow/10 border-yellow/30 text-yellow'
          }`}
        >
          <span>
            {turno
              ? `🔄 Turno activo: ${turno.trabajador} — ${turno.tipo} — desde ${fechaStr(turno.inicio, true)}`
              : '⚠️ No hay turno activo en este momento'
            }
          </span>
          <Link to="/dashboard/reportes" className="text-xs underline opacity-80">Ver reportes →</Link>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🚗" label="En Cochera" value={loading ? '…' : stats.dentroCount} color="accent" />
        <StatCard icon="💰" label="Ingresos Hoy" value={loading ? '…' : formatMonto(stats.totalHoy)} color="green" />
        <StatCard icon="🅿" label="Disponibles" value={loading ? '…' : stats.libres} color="blue" />
        <StatCard icon="✅" label="Atendidos Hoy" value={loading ? '…' : stats.atendidos} color="yellow" />
      </div>

      {/* Métodos de pago hoy */}
      <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-2xl p-5">
        <h3 className="font-semibold text-txt mb-4">💳 Cobros de hoy por método</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetodoCard icon="💵" label="Efectivo" value={formatMonto(stats.metEf)} />
          <MetodoCard icon="💜" label="Yape"     value={formatMonto(stats.metYape)} />
          <MetodoCard icon="💳" label="Visa"     value={formatMonto(stats.metVisa)} />
        </div>
      </div>

      {/* Barra de ocupación */}
      <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-txt">Ocupación</h3>
          <span className="text-sm text-txt2">{stats.dentroCount} / {stats.totalEspacios} ({pct}%)</span>
        </div>
        <div className="h-3 bg-bg3 dark:bg-bg3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct > 90 ? 'bg-danger' : pct > 60 ? 'bg-yellow' : 'bg-accent'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/dashboard/registro',  icon: '🚗', label: 'Entrada / Salida' },
          { to: '/dashboard/cochera',   icon: '🅿',  label: 'Ver Cochera' },
          { to: '/dashboard/historial', icon: '📋', label: 'Historial' },
          { to: '/dashboard/reportes',  icon: '📄', label: 'Reportes' },
        ].map(a => (
          <Link
            key={a.to}
            to={a.to}
            className="flex flex-col items-center gap-2 p-4 bg-surface dark:bg-surface border border-border dark:border-border
              rounded-2xl hover:border-accent/50 hover:bg-surface2 transition-all text-txt text-sm font-semibold"
          >
            <span className="text-2xl">{a.icon}</span>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    accent: 'text-accent bg-accent/10',
    green:  'text-green-400 bg-green-900/20',
    blue:   'text-blue bg-blue/10',
    yellow: 'text-yellow bg-yellow/10',
  };
  return (
    <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-2xl p-4">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3 ${colors[color] || colors.accent}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold font-mono text-txt">{value}</div>
      <div className="text-xs text-txt3 mt-1">{label}</div>
    </div>
  );
}

function MetodoCard({ icon, label, value }) {
  return (
    <div className="bg-bg2 dark:bg-bg2 border border-border dark:border-border rounded-xl p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xs text-txt3 mb-1">{label}</div>
      <div className="font-mono font-bold text-sm text-txt">{value}</div>
    </div>
  );
}
