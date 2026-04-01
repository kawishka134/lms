import { useState, useEffect } from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');

  // Check if user reached here properly via email magic link session
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
        if (event == 'PASSWORD_RECOVERY') {
            // User is valid and can update password
        }
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if(password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({
          password: password
      });
      
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
          navigate('/login');
      }, 3000);
      
    } catch (err) {
      setError(err.message || 'Failed to update password. Link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--color-surface)', border: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', textAlign: 'center' }}>
           <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-success)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'white', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)' }}>
               <Lock size={36} />
           </div>
           <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 900, letterSpacing: '-0.025em' }}>Set New Password</h1>
           <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontWeight: 500, fontSize: '1.05rem' }}>Create a strong, new secure password.</p>
        </div>

        {error && (
            <div style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
            </div>
        )}

        {success ? (
            <div style={{ textAlign: 'center' }}>
                <div style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle size={40} />
                    Password modernized successfully! Redirecting to login...
                </div>
            </div>
        ) : (
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">New Password</label>
                <input 
                    type="password" 
                    className="input-field" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    style={{ marginBottom: 0 }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem', fontSize: '1.125rem', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Updating Passcode...' : 'Update & Secure Password'}
              </button>
            </form>
        )}
      </div>
    </div>
  );
}
