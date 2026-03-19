import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const mostrarToast = useCallback((mensaje, tipo = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast, showToast: mostrarToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const ICONOS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

const COLORES = {
  success: 'bg-green-900/80 border-green-500 text-green-100',
  error:   'bg-red-900/80 border-red-500 text-red-100',
  warning: 'bg-yellow-900/80 border-yellow-400 text-yellow-100',
  info:    'bg-blue-900/80 border-blue-400 text-blue-100',
};

function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg
            text-sm font-semibold pointer-events-auto animate-fadeIn max-w-xs
            ${COLORES[t.tipo] || COLORES.info}`}
        >
          <span>{ICONOS[t.tipo] || '✅'}</span>
          <span>{t.mensaje}</span>
        </div>
      ))}
    </div>
  );
}
