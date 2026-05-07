import { useState } from 'react';
import { Mail, CheckCircle, Phone, KeyRound, UserCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // Used internally for student, or manually for instructor
  
  const [isTeacherFlow, setIsTeacherFlow] = useState(false);
  
  // Instructor States
  const [requestedPassword, setRequestedPassword] = useState('');
  const [adminRequestSent, setAdminRequestSent] = useState(false);
  const [instructorValidated, setInstructorValidated] = useState(false);

  // Student OTP States
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Use RPC function to bypass RLS - direct table query blocked for logged-out users
      const { data: results, error: dbErr } = await supabase
        .rpc('find_profile_by_phone', { search_phone: phone });
      
      const profile = results && results.length > 0 ? results[0] : null;
      
      if (dbErr) throw dbErr;

      if (profile && profile.email) {
          setEmail(profile.email);
          
          // Send via Firebase Phone Auth
          let formattedPhone = profile.phone.trim();
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '+94' + formattedPhone.slice(1);
          } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
          }

          // Clean up existing recaptcha if any
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear();
            } catch (e) {
              console.error("Error clearing recaptcha:", e);
            }
            window.recaptchaVerifier = null;
          }

          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response) => {
              // reCAPTCHA solved
            }
          });

          const appVerifier = window.recaptchaVerifier;
          const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
          
          setConfirmationResult(result);
          setStep(2);
      } else if (profile && !profile.email) {
          setError("Your account was found but no email is linked. Please contact support to recover your account.");
      } else {
          setError("Mobile number not found. If you are a teacher, use the Teacher flow.");
      }
    } catch (err) {
      setError("Failed to verify number: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        // Verify OTP with Firebase
        if (!confirmationResult) throw new Error("OTP session expired. Please try again.");
        await confirmationResult.confirm(enteredOtp);

        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
        
        if (resetErr) throw resetErr;
        setSuccess(true);
        setStep(3);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleTeacherEmailCheck = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
          const { data: inst } = await supabase.from('instructors').select('id, name').ilike('email', email).maybeSingle();
          if (inst) {
              setInstructorValidated(true);
          } else {
              setError("Instructor email not found. Please check spelling.");
          }
      } catch (err) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleAdminApprovalRequest = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
          if (!requestedPassword || requestedPassword.length < 6) throw new Error("Password must be at least 6 characters.");

          const { error: updateErr } = await supabase
              .from('instructors')
              .update({
                  new_password_requested: requestedPassword,
                  password_status: 'pending'
              })
              .ilike('email', email);
          
          if (updateErr) throw updateErr;
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
               {isTeacherFlow ? <UserCircle size={36} /> : <Phone size={36} />}
           </div>
           <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 900, letterSpacing: '-0.025em' }}>Passcode Recovery</h1>
           <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontWeight: 500, fontSize: '1.05rem' }}>
               {isTeacherFlow ? 'Teacher Account Recovery' : 'Verify your phone number with OTP.'}
           </p>
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
                    OTP Verified! A secure password reset link has been dispatched to your email inbox. Please click it to set your new password.
                </div>
                <Link to="/login" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Back to Login</Link>
            </div>
        ) : isTeacherFlow ? (
            !instructorValidated ? (
                <form onSubmit={handleTeacherEmailCheck} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--color-warning)', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>
                            <b>Teacher Flow:</b> Your account is strictly managed. Please enter your email to proceed.
                        </p>
                    </div>
                    <div>
                        <label className="input-label">Instructor Email</label>
                        <input className="input-field" type="email" placeholder="sir@nexus.lk" value={email} onChange={e => setEmail(e.target.value)} required style={{ marginBottom: 0 }} />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem' }}>
                        {loading ? 'Checking...' : 'Continue'}
                    </button>
                    <button type="button" onClick={() => { setIsTeacherFlow(false); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>I am a Student</button>
                </form>
            ) : (
                <form onSubmit={handleAdminApprovalRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--color-success)', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
                            Account verified. Enter your desired new password below. It will be sent to the Admin for final approval.
                        </p>
                    </div>
                    <div>
                        <label className="input-label">Desirable New Password</label>
                        <input type="text" className="input-field" placeholder="Minimum 6 characters" value={requestedPassword} onChange={e => setRequestedPassword(e.target.value)} required minLength={6} style={{ marginBottom: 0 }} />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem' }}>
                        {loading ? 'Submitting...' : 'Send Password to Admin'}
                    </button>
                </form>
            )
        ) : (
            // STUDENT FLOW
            <>
            <div id="recaptcha-container"></div>
            {step === 1 ? (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px dashed #38bdf8', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>
                            Enter your registered mobile number. We will send you an OTP to verify your identity.
                        </p>
                    </div>
                    <div>
                        <label className="input-label">Student Mobile Number</label>
                        <input type="tel" className="input-field" placeholder="07XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} required style={{ marginBottom: 0 }} />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem', fontSize: '1.125rem' }}>
                        {loading ? 'Sending OTP...' : 'Send OTP Code'}
                    </button>
                    <button type="button" onClick={() => { setIsTeacherFlow(true); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>I am a Teacher</button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>
                            We sent a 6-digit OTP to your phone. Enter it below.
                        </p>
                    </div>
                    <div>
                        <label className="input-label">OTP Code</label>
                        <input type="text" className="input-field" placeholder="123456" value={enteredOtp} onChange={e => setEnteredOtp(e.target.value)} required maxLength={6} style={{ marginBottom: 0, letterSpacing: '8px', fontSize: '1.25rem', textAlign: 'center', fontWeight: 800 }} />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem', fontSize: '1.125rem' }}>
                        {loading ? 'Verifying...' : 'Verify & Send Reset Link'}
                    </button>
                    <button type="button" onClick={() => { setStep(1); setEnteredOtp(''); setConfirmationResult(null); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 700 }}>Resend OTP / Change Number</button>
                </form>
            )}
            </>
        )}
        
        {!success && !adminRequestSent && (
            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Remember your password? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Log in</Link>
            </div>
        )}
      </div>
    </div>
  );
}
