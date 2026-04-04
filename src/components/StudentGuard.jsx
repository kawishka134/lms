import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function StudentGuard() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const verify = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('denied');
          return;
        }
        // Must NOT be an admin trying to access student area
        const adminRole = localStorage.getItem('admin_role');
        if (adminRole) {
          setStatus('denied');
          return;
        }
        setStatus('allowed');
      } catch (e) {
        setStatus('denied');
      }
    };
    verify();
  }, []);

  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e11d48', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'denied') return <Navigate to="/login" replace />;
  return <Outlet />;
}
