import { createContext, useCallback, useContext, useState } from 'react';

const SESSION_KEY = 'cochera_session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((data) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    setSession(data);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const isAdmin = useCallback(() => {
    return session?.rol === 'admin' || session?.rol === 'desarrollador';
  }, [session]);

  const isWorker = useCallback(() => {
    return session?.rol === 'trabajador';
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, login, logout, isAdmin, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
