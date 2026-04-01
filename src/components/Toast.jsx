import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const isSuccess = toast.type === 'success';

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onRemove(toast.id);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [toast, onRemove]);

  return (
    <div className="glass-premium" style={{
      width: '350px',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      overflow: 'hidden',
      pointerEvents: 'auto',
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      border: '1px solid var(--color-surface-border)',
      position: 'relative'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
      
      <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{
          backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
          color: isSuccess ? '#10b981' : '#ef4444',
          padding: '8px',
          borderRadius: '12px',
          display: 'flex'
        }}>
          {isSuccess ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '0.8rem', 
            fontWeight: 800, 
            color: 'var(--color-text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            marginBottom: '4px'
          }}>
            Nexus Online Says:
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.4 }}>
            {toast.message}
          </div>
        </div>

        <button 
          onClick={() => onRemove(toast.id)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar Container */}
      <div style={{ height: '4px', width: '100%', backgroundColor: '#f1f5f9', position: 'relative' }}>
         {/* Draining Progress Bar */}
         <div style={{
            height: '100%',
            backgroundColor: isSuccess ? '#10b981' : '#ef4444',
            width: `${progress}%`,
            transition: 'width 10ms linear'
         }} />
      </div>
    </div>
  );
};
