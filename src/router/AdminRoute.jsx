import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute() {
  const { session, isAdmin } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/turno" replace />;
  return <Outlet />;
}
