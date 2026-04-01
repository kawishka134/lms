import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [instructorMode, setInstructorMode] = useState(false);
  const [requestedPassword, setRequestedPassword] = useState('');
  const [adminRequestSent, setAdminRequestSent] = useState(false);

  // Constants
  const isInstructor = instructorMode;

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // 1. Check if this is an Instructor or Student
      const { data: inst } = await supabase.from('instructors').select('id, name').ilike('email', email).maybeSingle();

      if (inst) {
          // If Instructor - They must ask for admin approval
          setInstructorMode(true);
          setLoading(false);
          return;
      }

      // 2. If Student - Normal self-reset link
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) throw error;
      setSuccess(true);
      
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminApprovalRequest = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          if (!requestedPassword || requestedPassword.length < 6) {
              throw new Error("Please enter a new password you want (min 6 chars).");
          }

          const { error } = await supabase
              .from('instructors')
              .update({
                  new_password_requested: requestedPassword,
                  password_status: 'pending'
              })
              .ilike('email', email);
          
          if (error) throw error;
          setAdminRequestSent(true);
      } catch (err) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="auth-wrapper" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--color-surface)', border: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', textAlign: 'center' }}>
           <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-warning)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'white', boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.39)' }}>
               <Mail size={36} />
           </div>
           <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 900, letterSpacing: '-0.025em' }}>Passcode Recovery</h1>
           <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontWeight: 500, fontSize: '1.05rem' }}>Enter your email to receive a secure link.</p>
        </div>

        {error && (
            <div style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
            </div>
        )}

        {adminRequestSent ? (
            <div style={{ textAlign: 'center' }}>
                <div style={{ backgroundColor: '#f0fdf4', color: '#10b981', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700, border: '1px solid #dcfce7', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle size={40} />
                    Request sent successfully! Your admin will review and approve your new password shortly.
                </div>
                <Link to="/login" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Back to Login</Link>
            </div>
        ) : success ? (
            <div style={{ textAlign: 'center' }}>
                <div style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle size={40} />
                    Reset link securely dispatched! Please check your email inbox (and spam folder).
                </div>
                <Link to="/login" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Back to Login</Link>
            </div>
        ) : instructorMode ? (
            <form onSubmit={handleAdminApprovalRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--color-warning)', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>
                      <b>Teacher Flow:</b> Your account is strictly managed. Please enter the new password you want below. The Admin will verify and activate it.
                  </p>
              </div>
              <div>
                <label className="input-label">Instructor Email</label>
                <input className="input-field" type="email" value={email} disabled style={{ backgroundColor: '#f1f5f9', opacity: 0.7 }} />
              </div>
              <div>
                <label className="input-label">Desirable New Password</label>
                <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Minimum 6 characters" 
                    value={requestedPassword}
                    onChange={(e) => setRequestedPassword(e.target.value)}
                    required 
                    minLength={6}
                    style={{ marginBottom: 0 }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem', fontSize: '1.125rem', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Submitting Request...' : 'Send Password to Admin'}
              </button>
              <button type="button" onClick={() => { setInstructorMode(false); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>Not an Instructor? Go back</button>
            </form>
        ) : (
            <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label">Student Email Address</label>
                <input 
                    type="email" 
                    className="input-field" 
                    placeholder="kamal@gmail.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    style={{ marginBottom: 0 }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem', fontSize: '1.125rem', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending Request...' : 'Send Magic Reset Link'}
              </button>
            </form>
        )}
        
        {!success && (
            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Remember your password? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Log in</Link>
            </div>
        )}
      </div>
    </div>
  );
}
