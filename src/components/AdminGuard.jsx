import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Allowed admin emails - only these can access /admin routes
const SUPER_ADMIN_EMAIL = 'kawishkaperera134@gmail.com';

export default function AdminGuard() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'allowed' | 'denied'

  useEffect(() => {
    const verify = async () => {
      try {
        // 1. Check live Supabase session - must be logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('denied');
          return;
        }

        const userEmail = session.user.email?.toLowerCase();
        const adminRole = localStorage.getItem('admin_role');

        // 2. Super Admin check
        if (userEmail === SUPER_ADMIN_EMAIL && adminRole === 'super_admin') {
          setStatus('allowed');
          return;
        }

        // 3. Instructor check - verify against DB (not just localStorage)
        if (adminRole === 'instructor') {
          const instructorId = localStorage.getItem('instructor_id');
          if (!instructorId) { setStatus('denied'); return; }

          const { data: instructor } = await supabase
            .from('instructors')
            .select('id, email, is_blocked, access_expiry_date')
            .eq('id', instructorId)
            .maybeSingle();

          if (!instructor) { setStatus('denied'); return; }
          if (instructor.is_blocked) { setStatus('denied'); return; }
          if (instructor.email?.toLowerCase() !== userEmail) { setStatus('denied'); return; }
          if (instructor.access_expiry_date && new Date(instructor.access_expiry_date) < new Date()) {
            setStatus('denied');
            return;
          }

          setStatus('allowed');
          return;
        }

        // 4. No valid admin role
        setStatus('denied');
      } catch (e) {
        console.error('AdminGuard error:', e);
        setStatus('denied');
      }
    };

    verify();
  }, []);

  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e11d48', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b', fontWeight: 600 }}>Verifying access...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'denied') {
    // Clear any stale localStorage
    localStorage.removeItem('admin_role');
    localStorage.removeItem('instructor_id');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
