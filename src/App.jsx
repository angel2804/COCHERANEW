import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/ToastContext';
import { AdminRoute } from './router/AdminRoute';
import { WorkerRoute } from './router/WorkerRoute';

import { LoginPage }    from './pages/LoginPage';
import { TurnoPage }    from './pages/TurnoPage';
import { CocheraPage }  from './pages/CocheraPage';
import { ClientesPage } from './pages/ClientesPage';
import { ReportesPage } from './pages/ReportesPage';
import { HorariosPage } from './pages/HorariosPage';

import { DashboardLayout }  from './pages/dashboard/DashboardLayout';
import { DashboardHome }    from './pages/dashboard/sections/DashboardHome';
import { RegistroSection }  from './pages/dashboard/sections/RegistroSection';
import { HistorialSection } from './pages/dashboard/sections/HistorialSection';
import { UsuariosSection }  from './pages/dashboard/sections/UsuariosSection';
import { ConfigSection }       from './pages/dashboard/sections/ConfigSection';
import { TrabajadoresSection } from './pages/dashboard/sections/TrabajadoresSection';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas admin */}
            <Route element={<AdminRoute />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index           element={<DashboardHome />} />
                <Route path="registro"  element={<RegistroSection />} />
                <Route path="historial" element={<HistorialSection />} />
                <Route path="usuarios"  element={<UsuariosSection />} />
                <Route path="config"        element={<ConfigSection />} />
                <Route path="trabajadores" element={<TrabajadoresSection />} />
                <Route path="cochera"   element={<CocheraPage />} />
                <Route path="clientes"  element={<ClientesPage />} />
                <Route path="reportes"  element={<ReportesPage />} />
                <Route path="horarios"  element={<HorariosPage />} />
              </Route>
            </Route>

            {/* Rutas trabajador */}
            <Route element={<WorkerRoute />}>
              <Route path="/turno"   element={<TurnoPage />} />
              <Route path="/cochera" element={<CocheraPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
