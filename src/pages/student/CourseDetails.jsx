import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  UploadCloud, CheckCircle, Lock, Download, PlayCircle, Video, CreditCard, 
  ArrowLeft, Clock, FileText, Check, ShieldCheck, Sparkles, X, Youtube
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [accessStatus, setAccessStatus] = useState('unpaid'); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [nicNumber, setNicNumber] = useState('');
  const [activeBankIdx, setActiveBankIdx] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch course with instructors
        const { data: courseData } = await supabase
          .from('courses')
          .select('*, instructors(*)')
          .eq('id', id)
          .single();
        
        if (courseData) setCourse(courseData);

        // Fetch User Session & Profile
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profile) {
              setStudentProfile(profile);
              setNicNumber(profile.nic || '');
          }

          // Check enrollment status
          const { data: enrollData } = await supabase
            .from('enrollments')
            .select('*')
            .eq('course_id', id)
            .eq('student_id', session.user.id)
            .single();
          
          if (enrollData) {
              setAccessStatus(enrollData.status);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        showToast('Please login first to enroll.', 'error');
        navigate('/login');
        return;
    }

    if (!selectedFile || !nicNumber) {
        showToast('Please provide your NIC and payment receipt.', 'error');
        return;
    }

    setIsUploading(true);
    try {
        // 1. Image Only Validation
        if (!selectedFile.type.startsWith('image/')) {
            throw new Error("⚠️ Invalid File Type: Please upload a clear image (JPG, PNG) of your bank receipt. Video files are not allowed.");
        }

        // 2. Duplicate Detection (Hashing)
        const calculateHash = async (file) => {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };

        const fileHash = await calculateHash(selectedFile);

        // Check for duplicates
        const { data: duplicate } = await supabase
            .from('enrollments')
            .select('id, profiles(full_name)')
            .eq('slip_hash', fileHash)
            .maybeSingle();

        if (duplicate) {
            throw new Error(`⚠️ DUPLICATE SLIP: This receipt has already been used by ${duplicate.profiles?.full_name || 'another student'}. Submitting fake or reused receipts will result in your account being blocked.`);
        }

        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `slip-${session.user.id}-${id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('payment_slips').upload(fileName, selectedFile);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('payment_slips').getPublicUrl(fileName);

        const { error: upsertError } = await supabase.from('enrollments').upsert({
            student_id: session.user.id,
            course_id: id,
            slip_url: data.publicUrl,
            slip_hash: fileHash, // Save the hash
            status: 'pending'
        }, { onConflict: 'student_id, course_id' });

        if (upsertError) throw upsertError;

        // Automatically update student profile subject if it's a new subject
        if (course && studentProfile) {
            const currentSubjects = String(studentProfile.subject || '').trim();
            const courseSubject = (course.subject || '').trim();
            if (courseSubject && !currentSubjects.split(' ').some(s => s.toLowerCase() === courseSubject.toLowerCase())) {
                const updatedSubjectString = currentSubjects ? `${currentSubjects} ${courseSubject}` : courseSubject;
                await supabase.from('profiles').update({ subject: updatedSubjectString }).eq('id', studentProfile.id);
            }
        }

        setAccessStatus('pending');
        showToast('Receipt uploaded successfully! Admin will approve it shortly.', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setIsUploading(false);
    }
  };

  const handleFreeTrial = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('Please login first to start your trial.', 'error');
        navigate('/login');
        return;
    }

    setIsUploading(true);
    try {
        const trialDays = course.trial_duration || 7;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(trialDays));

        const { error: upsertError } = await supabase.from('enrollments').upsert({
            student_id: session.user.id,
            course_id: id,
            status: 'approved',
            expires_at: expiryDate.toISOString(),
            payment_method: 'free_trial'
        }, { onConflict: 'student_id, course_id' });

        if (upsertError) throw upsertError;

        // Automatically update student profile subject if it's a new subject
        if (course && studentProfile) {
            const currentSubjects = String(studentProfile.subject || '').trim();
            const courseSubject = (course.subject || '').trim();
            if (courseSubject && !currentSubjects.split(' ').some(s => s.toLowerCase() === courseSubject.toLowerCase())) {
                const updatedSubjectString = currentSubjects ? `${currentSubjects} ${courseSubject}` : courseSubject;
                await supabase.from('profiles').update({ subject: updatedSubjectString }).eq('id', studentProfile.id);
            }
        }

        setAccessStatus('approved');
        showToast(`Trial started! You have full access for ${trialDays} days.`, 'success');
        
        // SMS Notification
        try {
            if (studentProfile?.phone) {
                await sendSMS(studentProfile.phone, `Nexus: Your ${trialDays}-day free trial for ${course.title} has started! Enjoy learning.`);
            }
        } catch(e) {}

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setIsUploading(false);
    }
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/) || 
                  url.match(/youtu\.be\/([^?]+)/) || 
                  url.match(/\/(?:live|embed|shorts)\/([^?&]+)/);
    return match ? match[1] : null;
  };

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="shimmer" style={{ width: '100px', height: '100px', borderRadius: '50%' }}></div>
    </div>
  );

  if (!course) return (
    <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 900 }}>Class Not Found</h2>
        <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Courses</Link>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '2rem 1rem 5rem' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
            
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <Link to="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: '#64748b', fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <ArrowLeft size={18} /> Back to Catalog
                </Link>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span className="badge badge-primary" style={{ padding: '0.5rem 1rem' }}>{course.subject}</span>
                    <span className="badge" style={{ backgroundColor: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}>Grade {course.year}</span>
                </div>
            </div>

            {/* Main Premium Card Container */}
            <div className="card shadow-premium" style={{ width: '100%', padding: window.innerWidth < 768 ? '1.5rem' : '3.5rem', background: 'white', border: '1px solid #f1f5f9', borderRadius: '40px', display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1.1fr 0.9fr', gap: '3.5rem' }}>
                
                {/* Left Section: About this Class */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ color: 'var(--color-primary)', display: 'flex', padding: '10px', backgroundColor: 'var(--color-primary-light)', borderRadius: '14px' }}><Video size={28} /></div>
                        <h2 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.03em' }}>About this Class</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{course.title}</h1>
                        <p style={{ margin: 0, color: '#64748b', lineHeight: '1.7', fontSize: '1rem' }}>{course.description || "Unlock full access to this month's recorded lessons, live sessions and comprehensive PDF tutes."}</p>
                    </div>

                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '1px solid #eee' }}>
                        {(() => {
                            const videoUrl = course.promo_video_url;
                            if (!videoUrl) return (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b' }}>
                                    <PlayCircle size={80} color="white" opacity={0.1} />
                                </div>
                            );

                            const ytId = extractYouTubeId(videoUrl);
                            if (ytId) {
                                return (
                                    <iframe 
                                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0&modestbranding=1&loop=1&playlist=${ytId}`}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        title="Promo Video"
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                    />
                                );
                            }
                            return <video src={videoUrl} autoPlay muted loop playsInline controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                        })()}
                    </div>

                    {course.free_lesson_url && (
                        <div style={{ padding: '2rem', borderRadius: '28px', border: '2px solid #22c55e', backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ background: '#22c55e', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Limited Time Access</div>
                            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.6rem', color: '#14532d' }}>Watch a Free Demo Lesson</h3>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#166534', fontWeight: 600, opacity: 0.9 }}>Check our teaching style and content quality before you enroll.</p>
                            <button 
                                onClick={() => { 
                                    const ytId = extractYouTubeId(course.free_lesson_url);
                                    if(ytId) window.open(`https://www.youtube.com/watch?v=${ytId}`, '_blank');
                                    else window.open(course.free_lesson_url, '_blank');
                                }}
                                className="btn btn-primary" 
                                style={{ background: '#22c55e', width: '100%', height: '60px', fontSize: '1.15rem', gap: '0.85rem', marginTop: '0.5rem', color: 'white', borderRadius: '20px' }}
                            >
                                <PlayCircle size={24} fill="white" /> Watch Free Lesson
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Section: Payment & Enrollment */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ color: '#0ea5e9', display: 'flex', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '14px' }}><CreditCard size={28} /></div>
                        <h2 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.03em' }}>Secure Payment</h2>
                    </div>

                    {accessStatus === 'approved' ? (
                        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '32px' }}>
                             <div style={{ backgroundColor: '#22c55e', color: 'white', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                 <CheckCircle size={48} />
                             </div>
                             <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#14532d', marginBottom: '1rem' }}>Access Granted!</h2>
                             <p style={{ color: '#166534', fontWeight: 600, marginBottom: '2rem', fontSize: '1.1rem' }}>You are fully enrolled in this course. Go to your student dashboard to start learning.</p>
                             <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: '100%', height: '60px', fontSize: '1.2rem', background: '#22c55e', borderRadius: '20px' }}>Go to My Dashboard</button>
                        </div>
                    ) : accessStatus === 'pending' ? (
                        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: '#fff7ed', border: '2px solid #f97316', borderRadius: '32px' }}>
                             <div className="shimmer-fast" style={{ backgroundColor: '#f97316', color: 'white', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                 <Clock size={48} />
                             </div>
                             <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#9a3412', marginBottom: '1rem' }}>Verification Pending</h2>
                             <p style={{ color: '#c2410c', fontWeight: 700, marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                                Your payment slip is being reviewed. <br/>අපි ඔබේ ගෙවීම් පරීක්ෂා කර පන්තියට ඇතුලත් කරගන්නා තෙක් කරුණාකර රැඳී සිටින්න.
                             </p>
                             <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ width: '100%', height: '60px', fontSize: '1.1rem', borderColor: '#f97316', color: '#f97316', borderRadius: '20px' }}>Back to Dashboard</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {course.is_free_trial && (
                                <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '2px solid #3b82f6', borderRadius: '28px', padding: '2rem', textAlign: 'center', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.15)' }}>
                                    <h3 style={{ margin: '0 0 0.5rem', fontWeight: 900, fontSize: '1.4rem', color: '#1e3a8a' }}>New Student Trial</h3>
                                    <p style={{ margin: '0 0 1.5rem', fontSize: '1rem', color: '#1e40af', fontWeight: 600 }}>Get full access for <span style={{ color: '#2563eb', fontWeight: 900 }}>{course.trial_duration} days</span> for FREE!</p>
                                    <button 
                                        onClick={handleFreeTrial}
                                        disabled={isUploading}
                                        className="btn btn-primary" 
                                        style={{ width: '100%', height: '54px', background: '#3b82f6', color: 'white', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 800, border: 'none' }}
                                    >
                                        <Sparkles size={20} /> {isUploading ? 'Starting Trial...' : 'Start Free Trial Now'}
                                    </button>
                                </div>
                            )}

                            {/* Sinhala Instruction Notice */}
                            <div style={{ background: '#f0f9ff', padding: '2.25rem', borderRadius: '28px', borderLeft: '10px solid #0ea5e9', boxShadow: '0 15px 35px rgba(14, 165, 233, 0.08)' }}>
                                <p style={{ margin: 0, fontWeight: 800, color: '#0369a1', lineHeight: '1.9', fontSize: '1.05rem' }}>
                                    ⚠️ බැංකු රිසිට් පතේ (Slip) පෑනෙන් පැහැදිලිව පහත විස්තර ලියන්න:<br/>
                                    1. ඔබේ සම්පූර්ණ නම (සම්පූර්ණ නම)<br/>
                                    2. පන්තියේ නම ({course.title})<br/>
                                    3. ඔබ ලියාපදිංචි දුරකථන අංකය
                                </p>
                            </div>

                            {/* Dynamic Bank Details Card */}
                            {(() => {
                                const instructor = course.instructors;
                                if (!instructor) return null;

                                const instructorBanks = instructor.bank_accounts || [];
                                const hasMultiBanks = instructorBanks.length > 0;
                                
                                const activeBank = hasMultiBanks 
                                    ? instructorBanks[activeBankIdx] || instructorBanks[0]
                                    : { 
                                        bank_name: instructor.bank_name, 
                                        account_no: instructor.bank_account_no, 
                                        account_name: instructor.bank_account_name, 
                                        branch: instructor.bank_branch 
                                      };

                                if (!activeBank.account_no && !hasMultiBanks) return null;

                                return (
                                    <div style={{ border: '2.5px solid #22c55e', borderRadius: '32px', padding: '2rem', background: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)', boxShadow: '0 15px 40px rgba(34, 197, 94, 0.1)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
                                            <div style={{ width: '56px', height: '56px', backgroundColor: '#16a34a', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: 'white' }}>🏦</div>
                                            <div>
                                                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#14532d' }}>ගෙවීමේ බැංකු විස්තර</h3>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>Select an account and transfer Rs. {course.price}</p>
                                            </div>
                                        </div>

                                        {hasMultiBanks && instructorBanks.length > 1 && (
                                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                                {instructorBanks.map((bank, idx) => (
                                                    <button 
                                                        key={bank.id || idx}
                                                        type="button"
                                                        onClick={() => setActiveBankIdx(idx)}
                                                        style={{ 
                                                            padding: '0.7rem 1.4rem', 
                                                            borderRadius: '50px', 
                                                            border: '2px solid',
                                                            borderColor: activeBankIdx === idx ? '#16a34a' : '#e2e8f0',
                                                            background: activeBankIdx === idx ? '#16a34a' : 'white',
                                                            color: activeBankIdx === idx ? 'white' : '#64748b',
                                                            fontSize: '0.9rem',
                                                            fontWeight: 800,
                                                            whiteSpace: 'nowrap',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s',
                                                            boxShadow: activeBankIdx === idx ? '0 8px 16px rgba(22, 163, 74, 0.25)' : 'none'
                                                        }}
                                                    >
                                                        {bank.bank_name || `Account ${idx + 1}`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { label: 'BANK NAME / බැංකුව', value: activeBank.bank_name },
                                                { label: 'ACCOUNT NUMBER / ගිණුම', value: activeBank.account_no || activeBank.bank_account_no },
                                                { label: 'ACCOUNT NAME / නම', value: activeBank.account_name || activeBank.bank_account_name },
                                                { label: 'BRANCH / ශාඛාව', value: activeBank.branch || activeBank.bank_branch },
                                            ].filter(item => item.value).map((item, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1.15rem 1.75rem', borderRadius: '20px', border: '1.5px solid #bbf7d0', boxShadow: '0 3px 6px rgba(0,0,0,0.02)' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                                                    <span style={{ fontWeight: 900, color: '#14532d', fontSize: '1.25rem', letterSpacing: '0.02em' }}>{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Manual Submission Form */}
                            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1.2fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.02em' }}>Verify NIC Number</label>
                                        <input 
                                            placeholder="Your NIC..." 
                                            value={nicNumber} 
                                            onChange={e => setNicNumber(e.target.value)} 
                                            style={{ width: '100%', padding: '1.25rem', background: '#f8fafc', border: '2.5px solid #e2e8f0', borderRadius: '20px', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.02em' }}>Payment Slip</label>
                                        <div onClick={() => fileInputRef.current.click()} style={{ border: '3px dashed #0ea5e9', background: '#f0f9ff', padding: '1rem 1.25rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', height: '62px' }}>
                                            <UploadCloud size={24} color="#0ea5e9" />
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 800, color: '#0ea5e9', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile ? selectedFile.name : 'Choose File'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} />
                                
                                <button type="submit" disabled={isUploading} style={{ background: 'var(--color-primary-gradient)', color: 'white', padding: '1.5rem', borderRadius: '24px', border: 'none', fontWeight: 900, fontSize: '1.3rem', cursor: 'pointer', boxShadow: '0 15px 35px rgba(225, 29, 72, 0.4)', transition: 'all 0.3s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                                    {isUploading ? 'Registering Your Payment...' : 'Register & Access Now'}
                                </button>
                                
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', opacity: 0.6 }}>
                                    <ShieldCheck size={18} color="#22c55e" />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Secure Bank Transfer • 24h Review Guarantee</span>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Notice */}
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', marginTop: '3rem', fontWeight: 600 }}>
                Questions? <Link to="/contact" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Contact Support</Link> or WhatsApp: 072 180 3785
            </p>
        </div>

        <style>{`
            .shadow-premium {
                box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0,0,0,0.05);
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }
            .shimmer-fast {
                animation: pulse 1.5s infinite ease-in-out;
            }
            @media (max-width: 768px) {
                h1 { font-size: 2rem !important; }
            }
        `}</style>
    </div>
  );
}
