import { useState } from 'react';
import { BookOpen, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { sendSMS } from '../../utils/smsGateway';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lockedInstructor, setLockedInstructor] = useState(null);
  const [pendingSlip, setPendingSlip] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      
      const userEmail = email.toLowerCase();
      if (userEmail === 'kawishkaperera134@gmail.com') {
          localStorage.setItem('admin_role', 'super_admin');
          navigate('/admin/dashboard');
          return;
      }
      
      const { data: instructorCheck } = await supabase
          .from('instructors')
          .select('id, name, email, access_expiry_date, is_blocked, commission_status')
          .ilike('email', userEmail)
          .maybeSingle();

      if (instructorCheck) {
          if (instructorCheck.is_blocked) {
              await supabase.auth.signOut();
              throw new Error("⚠️ Your account has been temporarily blocked by the administrator.");
          }
          if (instructorCheck.commission_status === 'Pending' || (instructorCheck.access_expiry_date && new Date(instructorCheck.access_expiry_date) < new Date())) {
              // Check for ANY pending payment slip
              const { data: existingPending } = await supabase
                  .from('instructor_payments')
                  .select('*')
                  .eq('instructor_id', instructorCheck.id)
                  .eq('status', 'pending')
                  .maybeSingle();
              
              setPendingSlip(existingPending);
              setLockedInstructor(instructorCheck);
              throw new Error("⚠️ Your access is locked because your monthly commission is pending.");
          }
          localStorage.setItem('admin_role', 'instructor');
          localStorage.setItem('instructor_id', instructorCheck.id);
          navigate('/admin/dashboard');
          return;
      }

      localStorage.removeItem('admin_role');
      
      const userId = authData?.user?.id;
      if (userId) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, is_blocked')
            .eq('id', userId)
            .single();
            
          if (profileError || !profile) {
              await supabase.auth.signOut();
              throw new Error('This account has been permanently deleted by an administrator.');
          }
          
          if (profile.is_blocked) {
              await supabase.auth.signOut();
              throw new Error('⚠️ Your access has been temporarily blocked by the administrator.');
          }
      }
      
      showToast('Log in Successful! Welcome back.', 'success');
      navigate('/dashboard');

    } catch (err) {
      showToast(err.message || 'Invalid Email address or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadUnlockSlip = async (e) => {
      const file = e.target.files[0];
      if (!file || !lockedInstructor) return;
      
      // Clean numeric input: remove "Rs.", commas, etc.
      const cleanAmount = paymentAmount.toString().replace(/[^0-9.]/g, '');

      if (!cleanAmount || isNaN(cleanAmount) || Number(cleanAmount) <= 0) {
          showToast("Please enter a valid payment amount (Numbers only) before uploading the slip.", 'error');
          e.target.value = ''; // Reset file input
          return;
      }
      
      setUploadLoading(true);
      try {
          // 1. Image Restriction
          if (!file.type.startsWith('image/')) {
              throw new Error("⚠️ Invalid File: Please upload an image of your payment receipt. Video files are not supported.");
          }

          // 2. Duplicate Detection
          const calculateHash = async (f) => {
              const buffer = await f.arrayBuffer();
              const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          };
          const fileHash = await calculateHash(file);

          const { data: duplicate } = await supabase
              .from('instructor_payments')
              .select('id, instructors(name)')
              .eq('slip_hash', fileHash)
              .maybeSingle();

          if (duplicate) {
              throw new Error(`⚠️ DUPLICATE SLIP: This receipt has already been used by ${duplicate.instructors?.name || 'another instructor'}. Submission of duplicate slips is monitored.`);
          }

          const fileExt = file.name.split('.').pop();
          const fileName = `${lockedInstructor.id}_unlock_${Date.now()}.${fileExt}`;
          const filePath = `commissions/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('site-media').upload(filePath, file);
          if (uploadError) throw new Error("STORAGE_ERROR: " + uploadError.message);

          const { data: { publicUrl } } = supabase.storage.from('site-media').getPublicUrl(filePath);

          const { error: dbError } = await supabase.from('instructor_payments').insert([{ 
              instructor_id: lockedInstructor.id, 
              slip_url: publicUrl, 
              slip_hash: fileHash,
              amount: Number(cleanAmount),
              status: 'pending' 
          }]);
          
          if (dbError) throw new Error("DATABASE_ERROR: " + dbError.message);
          
          try {
              console.log("Attempting to send Super Admin SMS from Login...");
              const smsResult = await sendSMS('0721803785', `Nexus: Unlock Request! Sir ${lockedInstructor.name || lockedInstructor.email} uploaded a slip at login. Pls check Sales Hub.`);
              console.log("SMS result from Gateway:", smsResult);
              if (!smsResult || !smsResult.success) {
                  showToast("Warning: Admin SMS Notification failed: " + (smsResult?.message || 'Unknown'), 'warning');
              }
          } catch (smsErr) {
              console.error("SMS notification exception:", smsErr);
              showToast("Warning: Admin SMS Notification failed to send.", 'warning');
          }

          showToast("Payment Slip Uploaded! Once the Admin confirms it, your account will be unlocked automatically.", 'success');
          setLockedInstructor(null);
          await supabase.auth.signOut();
      } catch (err) {
          showToast("Upload failed: " + err.message, 'error');
      } finally {
          setUploadLoading(false);
      }
  };


  return (
    <div className="auth-wrapper" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', border: 'none' }}>
        
        {lockedInstructor ? (
            <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--color-danger)', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <span style={{ fontSize: '2rem' }}>🔒</span>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', color: '#000' }}>Account Locked</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>Your monthly instructor commission is pending. Please upload the payment receipt below to request an unlock.</p>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '1.5rem', border: '2px dashed #e2e8f0', marginBottom: '2rem' }}>
                    {pendingSlip ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '48px', height: '48px', backgroundColor: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>⏳</span>
                            </div>
                            <p style={{ fontWeight: 800, marginBottom: '0.5rem', fontSize: '1rem', color: '#B45309' }}>PAYMENT PENDING REVIEW</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>You've already uploaded a slip on {new Date(pendingSlip.created_at).toLocaleDateString()}. Please wait for approval.</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem' }}>Enter Payment Amount (Rs.)</p>
                            <input 
                                type="number" 
                                className="input-field" 
                                placeholder="Example: 5000" 
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                style={{ marginBottom: '1rem', width: '100%' }}
                            />
                            
                            <p style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem' }}>Upload Commission Slip (Receipt)</p>
                            <label className="btn btn-primary" style={{ width: '100%', cursor: 'pointer', justifyContent: 'center', opacity: !paymentAmount ? 0.5 : 1 }}>
                                <Upload size={18} style={{ marginRight: '8px' }} />
                                {uploadLoading ? 'Uploading...' : 'Choose Receipt Image'}
                                <input type="file" accept="image/*" onChange={handleUploadUnlockSlip} style={{ display: 'none' }} disabled={uploadLoading || !paymentAmount} />
                            </label>
                        </>
                    )}
                </div>

                <button onClick={() => { setLockedInstructor(null); setError(''); }} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Back to Login</button>
            </div>
        ) : (
            <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'white', boxShadow: '0 4px 14px 0 rgba(225, 29, 72, 0.39)' }}>
                        <BookOpen size={36} />
                    </div>
                    <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 900, letterSpacing: '-0.025em' }}>Welcome Back</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontWeight: 500, fontSize: '1.05rem' }}>Sign in to Nexus Online</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label className="input-label">Email Address</label>
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
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                            <Link to="/forgot-password" style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'none' }}>Forgot?</Link>
                        </div>
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
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>
                
                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Register here</Link>
                </div>
            </>
        )}
      </div>


    </div>
  );
}
