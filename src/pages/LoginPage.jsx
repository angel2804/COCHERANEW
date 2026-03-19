import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  login,
  verificarPrimerUso,
  verificarUsuarioDesarrollador,
  cargarLogoUrl,
} from '../services/authService';
import { Spinner } from '../components/ui/Spinner';

export function LoginPage() {
  const { session, login: setSession } = useAuth();
  const navigate = useNavigate();

  const [usuario, setUsuario]     = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [primerUso, setPrimerUso] = useState(false);
  const [logoUrl, setLogoUrl]     = useState(null);
  const usuarioRef = useRef(null);

  useEffect(() => {
    if (session) {
      navigate(session.rol === 'admin' || session.rol === 'desarrollador' ? '/dashboard' : '/turno', { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    verificarPrimerUso().then(esPrimero => { if (esPrimero) setPrimerUso(true); });
    verificarUsuarioDesarrollador();
    cargarLogoUrl().then(url => { if (url) setLogoUrl(url); });
    usuarioRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!usuario.trim() || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      const sesion = await login(usuario.trim(), password);
      setSession(sesion);
      navigate(sesion.rol === 'admin' || sesion.rol === 'desarrollador' ? '/dashboard' : '/turno', { replace: true });
    } catch (err) {
      if (err.message === 'no_encontrado')           setError('Usuario no encontrado o inactivo.');
      else if (err.message === 'password_incorrecta') setError('Contraseña incorrecta.');
      else setError('Error al conectar. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div
        className="hidden md:flex md:w-[55%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d3d3d 0%, #0a4f4f 50%, #0d5c5c 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 70%, #26d0ce 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1a9e9e 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-6 px-12 text-center">
          <div className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 shadow-2xl">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
            ) : (
              <span className="text-6xl">🅿</span>
            )}
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-white tracking-wider mb-2">COCHERA POS</h1>
            <p className="text-white/60 text-base">Sistema de Gestión de Estacionamiento</p>
          </div>
          <div className="flex gap-3 mt-2">
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-40 h-40 rounded-tl-full opacity-10"
          style={{ background: '#26d0ce' }}
        />
      </div>

      {/* Panel derecho — formulario */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 md:p-12"
        style={{ background: 'linear-gradient(135deg, #f5a623 0%, #f7b733 100%)' }}
      >
        {/* Logo en móvil */}
        <div className="md:hidden flex flex-col items-center gap-2 mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
          ) : (
            <span className="text-5xl">🅿</span>
          )}
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">COCHERA POS</h1>
        </div>

        {/* Tarjeta */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#f5a623' }}>
              Bienvenido
            </p>
            <h2 className="text-xl font-bold text-gray-800">Iniciar Sesión</h2>
          </div>

          {primerUso && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center">
              👋 Primera vez: <strong>admin</strong> / <strong>admin123</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              ref={usuarioRef}
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              placeholder="Usuario"
              autoComplete="username"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800
                placeholder:text-gray-400 focus:outline-none focus:border-[#0a4f4f] transition-colors bg-gray-50"
            />

            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm text-gray-800
                  placeholder:text-gray-400 focus:outline-none focus:border-[#0a4f4f] transition-colors bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                text-white transition-all disabled:opacity-60 shadow-lg hover:shadow-xl active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0d3d3d, #0a5f5f)' }}
            >
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Verificando...' : 'INGRESAR'}
            </button>
          </form>
        </div>

        <p className="text-white/50 text-xs mt-6">v4.1 · COCHERA POS</p>
      </div>
    </div>
  );
}
