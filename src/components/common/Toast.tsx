import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { CheckCircle2, AlertCircle, Info, Lock, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-halo-gold shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
          lock: <Lock className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />,
        };

        const bgStyles = {
          success: 'bg-halo-card/90 border-halo-gold/30 text-halo-dark',
          error: 'bg-halo-card/90 border-rose-500/30 text-halo-dark',
          info: 'bg-halo-card/90 border-cyan-500/30 text-halo-dark',
          lock: 'bg-amber-950/90 border-amber-500/50 text-amber-100',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-top-2 ${bgStyles[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm tracking-tight">{toast.title}</h4>
              <p className="text-xs text-halo-text-secondary mt-0.5 leading-relaxed">{toast.description}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-halo-text-tertiary hover:text-halo-dark p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
