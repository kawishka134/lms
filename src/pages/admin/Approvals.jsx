import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, FileText, RotateCcw, ShoppingBag, Users, GraduationCap, History, DollarSign, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function Approvals() {
  const [pendingSlips, setPendingSlips] = useState([]);
  const [approvedSlips, setApprovedSlips] = useState([]);
  const [tuteSlips, setTuteSlips] = useState([]);
  const [instructorSlips, setInstructorSlips] = useState([]);
  const [instructorHistory, setInstructorHistory] = useState([]);
  const [videoRequests, setVideoRequests] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('students'); // students, videos, tutes, instructors, history
  const { showToast } = useToast();

  const fetchSlips = async () => {
    setLoading(true);
    const adminRole = localStorage.getItem('admin_role');
    const instructorId = localStorage.getItem('instructor_id');

    // Fetch Recording Access Requests
    const { data: vReqs, error: errorVReqs } = await supabase
        .from('recording_access_requests')
        .select(`id, created_at, status, student_id, recording_id, profiles(full_name, phone), recordings(title, instructor_id)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    // Fetch Pending Monthly
    const { data: pending, error: errorPending } = await supabase
        .from('enrollments')
        .select(`id, created_at, slip_url, status, profiles(full_name, phone, grade, subject, year, email), courses(title, instructor_id, instructors(name))`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    // Fetch Approved Monthly
    const { data: approved, error: errorApproved } = await supabase
        .from('enrollments')
        .select(`id, created_at, slip_url, status, profiles(full_name, phone, grade, subject, year), courses(title, instructor_id, instructors(name))`)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

    // Fetch Tute Slips
    const { data: tutes, error: errorTutes } = await supabase
        .from('tute_enrollments')
        .select(`id, created_at, slip_url, status, profiles(full_name, phone, grade, subject, year, email), tutes(title, price)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    // Fetch Instructor Commission Slips
    const { data: instSlips, error: errorInstSlips } = await supabase
        .from('instructor_payments')
        .select(`id, created_at, slip_url, status, instructor_id, instructors(name, email)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    // Fetch Instructor History
    const { data: instHistory } = await supabase
        .from('instructor_payments')
        .select(`id, created_at, slip_url, status, instructor_id, instructors(name, email)`)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

    let finalPending = pending || [];
    let finalApproved = approved || [];
    let finalVReqs = vReqs || [];
    
    if (adminRole === 'instructor' && instructorId) {
        finalPending = finalPending.filter(p => p.courses?.instructor_id === instructorId);
        finalApproved = finalApproved.filter(p => p.courses?.instructor_id === instructorId);
        finalVReqs = finalVReqs.filter(v => v.recordings?.instructor_id === instructorId);
    }

    setPendingSlips(finalPending);
    setApprovedSlips(finalApproved);
    setVideoRequests(finalVReqs);
    setTuteSlips(adminRole === 'instructor' ? [] : (tutes || []));
    setInstructorSlips(instSlips || []);
    setInstructorHistory(instHistory || []);
    if (errorPending) console.error("Pending Enrollments Error:", errorPending);
    if (errorApproved) console.error("Approved Enrollments Error:", errorApproved);
    if (errorVReqs) console.error("Video Requests Error:", errorVReqs);
    if (errorTutes) console.error("Tute Enrollments Error:", errorTutes);
    if (errorInstSlips) console.error("Instructor Slips Error:", errorInstSlips);
    setLoading(false);
  };

  useEffect(() => {
    fetchSlips();
    const ch = supabase.channel('approvals_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => fetchSlips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tute_enrollments' }, () => fetchSlips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recording_access_requests' }, () => fetchSlips())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const sendSMS = async (record) => {
    const phone = record.profiles?.phone;
    if (!phone) return;

    // Normalize phone number (Ensure it starts with 94)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '94' + cleanPhone.substring(1);
    if (!cleanPhone.startsWith('94')) cleanPhone = '94' + cleanPhone;

    const item = record.courses || record.tutes;
    const message = `Nexus LMS: Hi ${record.profiles.full_name}, Your payment for (${item.title}) is APPROVED. You can log in now!`;

    try {
        // This is the common Notify.lk API structure
        // User needs to replace API_KEY and USER_ID with their actual credentials
        const url = `https://app.notify.lk/api/v1/send?api_key=REPLACE_WITH_YOUR_KEY&user_id=REPLACE_WITH_YOUR_USER_ID&sender_id=NotifyLK&to=${cleanPhone}&message=${encodeURIComponent(message)}`;
        
        const resp = await fetch(url);
        console.log("SMS Send Attempted:", await resp.json());
    } catch (e) {
        console.error("SMS failed:", e);
    }
  };

  const handleAction = async (table, id, newStatus) => {
    try {
        let updateData = { status: newStatus };
        
        if (table === 'recording_access_requests' && newStatus === 'approved') {
            const now = new Date();
            const expiry = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // 5-hour window for Admin Unlock
            updateData.approved_at = now.toISOString();
            updateData.expires_at = expiry.toISOString();
        }

        const { error } = await supabase.from(table).update(updateData).eq('id', id);
        if (error) throw error;

/* 
        // Auto Send SMS to Student
        if (newStatus === 'approved' && (table === 'enrollments' || table === 'tute_enrollments')) {
            const source = table === 'enrollments' ? pendingSlips : tuteSlips;
            const target = source.find(s => s.id === id);
            if (target) sendSMS(target);
        }
        */

        if (table === 'instructor_payments' && newStatus === 'approved') {
            const { data: payRecord } = await supabase.from('instructor_payments').select('instructor_id').eq('id', id).single();
            if (payRecord?.instructor_id) {
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 31);
                await supabase.from('instructors').update({ 
                    access_expiry_date: newExpiry.toISOString(),
                    commission_status: 'Paid'
                }).eq('id', payRecord.instructor_id);
            }
        }

        showToast(`${table === 'recording_access_requests' ? 'Video Access' : 'Payment'} ${newStatus === 'approved' ? 'Approved' : 'Rejected'} successfully!`, 'success');
        fetchSlips();
    } catch (err) {
        showToast("Action failed: " + err.message, 'error');
    }
  };

  const filterData = (arr, type = 'student') => {
      if (!arr) return [];
      const query = searchQuery?.toLowerCase() || '';
      
      if (type === 'instructor') {
          return arr.filter(s => 
              (s.instructors?.name?.toLowerCase() || '').includes(query) || 
              (s.instructors?.email?.toLowerCase() || '').includes(query)
          );
      }
      
      return arr.filter(s => 
          (s.profiles?.full_name?.toLowerCase() || '').includes(query) || 
          (s.profiles?.phone || '').includes(query) || 
          (s.recordings?.title?.toLowerCase() || '').includes(query) ||
          (s.courses?.title?.toLowerCase() || '').includes(query)
      );
  };

  const TabButton = ({ id, label, icon: Icon, color, count }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`tab-btn ${activeTab === id ? 'active' : ''}`}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === id ? color : 'transparent',
            color: activeTab === id ? 'white' : 'var(--color-text-muted)',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === id ? `0 4px 12px ${color}44` : 'none',
            fontSize: '0.875rem'
        }}
      >
          <Icon size={18} />
          {label}
          {count > 0 && <span style={{ backgroundColor: activeTab === id ? 'rgba(255,255,255,0.2)' : '#eee', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem' }}>{count}</span>}
      </button>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '2rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '-0.025em', margin: 0 }}>Sales Hub</h1>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '6px', borderRadius: '14px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <TabButton id="students" label="Monthly" icon={GraduationCap} color="#f43f5e" count={pendingSlips.length} />
              <TabButton id="videos" label="Video Access" icon={Video} color="#0284c7" count={videoRequests.length} />
              {localStorage.getItem('admin_role') !== 'instructor' && (
                  <>
                    <TabButton id="instructors" label="Commissions" icon={DollarSign} color="#10b981" count={instructorSlips.length} />
                    <TabButton id="tutes" label="Tutes" icon={ShoppingBag} color="#8b5cf6" count={tuteSlips.length} />
                  </>
              )}
              <TabButton id="history" label="History" icon={History} color="#64748b" />
          </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
        <input className="input-field" placeholder="Search records..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '3.5rem', height: '56px', fontSize: '1rem', background: 'white', borderRadius: '16px' }} />
      </div>

      {activeTab === 'students' && (
          <div className="card" style={{ padding: 0, overflowX: 'auto', border: 'none', boxShadow: 'var(--shadow-md)' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                      <tr>
                          <th style={{ padding: '1.25rem' }}>Student Info</th>
                          <th style={{ padding: '1.25rem' }}>Course Info</th>
                          <th style={{ padding: '1.25rem' }}>Receipt</th>
                          <th style={{ padding: '1.25rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filterData(pendingSlips).length === 0 ? <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No pending monthly enrollments.</td></tr> : filterData(pendingSlips).map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{s.profiles?.full_name}</div>
                                  <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{s.profiles?.phone}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 700 }}>{s.courses?.title}</div>
                                  {s.courses?.instructors?.name && <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>{s.courses.instructors.name}</div>}
                              </td>
                              <td style={{ padding: '1.25rem' }}><button onClick={() => setSelectedImage(s.slip_url)} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>View Evidence</button></td>
                              <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleAction('enrollments', s.id, 'approved')} className="btn btn-primary" style={{ backgroundColor: '#10b981' }}>Approve</button>
                                        <button onClick={() => handleAction('enrollments', s.id, 'rejected')} className="btn btn-outline" style={{ color: 'var(--color-danger)' }}><XCircle size={20} /></button>
                                    </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'videos' && (
          <div className="card" style={{ padding: 0, overflowX: 'auto', border: 'none', boxShadow: 'var(--shadow-md)' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f0f9ff' }}>
                      <tr>
                          <th style={{ padding: '1.25rem', color: '#0369a1' }}>Student Details</th>
                          <th style={{ padding: '1.25rem', color: '#0369a1' }}>Video Title</th>
                          <th style={{ padding: '1.25rem', color: '#0369a1' }}>Requested At</th>
                          <th style={{ padding: '1.25rem', textAlign: 'right', color: '#0369a1' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filterData(videoRequests).length === 0 ? <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No pending video access requests.</td></tr> : filterData(videoRequests).map(v => (
                          <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 800 }}>{v.profiles?.full_name}</div>
                                  <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{v.profiles?.phone}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{v.recordings?.title}</div>
                                  <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Recording ID: {v.recording_id.slice(0,8)}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{new Date(v.created_at).toLocaleString()}</div>
                              </td>
                              <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleAction('recording_access_requests', v.id, 'approved')} className="btn btn-primary" style={{ backgroundColor: '#0ea5e9', border: 'none' }}>Allow (5h)</button>
                                        <button onClick={() => handleAction('recording_access_requests', v.id, 'rejected')} className="btn btn-outline" style={{ color: 'var(--color-danger)' }}>Reject</button>
                                    </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'instructors' && (
          <div className="card" style={{ padding: 0, overflowX: 'auto', border: 'none' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f0fdf4' }}>
                      <tr>
                          <th style={{ padding: '1.25rem', color: '#166534' }}>Instructor Details</th>
                          <th style={{ padding: '1.25rem', color: '#166534' }}>Submission Date</th>
                          <th style={{ padding: '1.25rem', color: '#166534' }}>Evidence</th>
                          <th style={{ padding: '1.25rem', textAlign: 'right', color: '#166534' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filterData(instructorSlips, 'instructor').length === 0 ? <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>All instructor payments are cleared.</td></tr> : filterData(instructorSlips, 'instructor').map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{s.instructors?.name}</div>
                                  <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{s.instructors?.email}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 700 }}>Commission Receipt</div>
                                  <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>{new Date(s.created_at).toLocaleDateString()}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}><button onClick={() => setSelectedImage(s.slip_url)} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>View Slip</button></td>
                              <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleAction('instructor_payments', s.id, 'approved')} className="btn btn-primary" style={{ backgroundColor: '#10b981' }}>Approve & Unlock</button>
                                        <button onClick={() => handleAction('instructor_payments', s.id, 'rejected')} className="btn btn-outline" style={{ color: 'var(--color-danger)' }}><XCircle size={20} /></button>
                                    </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'tutes' && (
          <div className="card" style={{ padding: 0, overflowX: 'auto', border: 'none' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f5f3ff' }}>
                      <tr>
                          <th style={{ padding: '1.25rem', color: '#5b21b6' }}>Student Details</th>
                          <th style={{ padding: '1.25rem', color: '#5b21b6' }}>Tute Title</th>
                          <th style={{ padding: '1.25rem', color: '#5b21b6' }}>Receipt</th>
                          <th style={{ padding: '1.25rem', textAlign: 'right', color: '#5b21b6' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filterData(tuteSlips).length === 0 ? <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No pending tute requests.</td></tr> : filterData(tuteSlips).map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 800 }}>{s.profiles?.full_name}</div>
                                  <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{s.profiles?.phone}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 700 }}>{s.tutes?.title}</div>
                                  <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 800 }}>Rs. {s.tutes?.price}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}><button onClick={() => setSelectedImage(s.slip_url)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem' }}>View</button></td>
                              <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleAction('tute_enrollments', s.id, 'approved')} className="btn btn-primary" style={{ backgroundColor: '#8b5cf6' }}>Approve</button>
                                        <button onClick={() => handleAction('tute_enrollments', s.id, 'rejected')} className="btn btn-outline" style={{ color: 'var(--color-danger)' }}><XCircle size={18} /></button>
                                    </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'history' && (
          <div className="card" style={{ padding: 0, overflowX: 'auto', border: 'none' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                      <tr>
                          <th style={{ padding: '1.25rem' }}>Entity Name</th>
                          <th style={{ padding: '1.25rem' }}>Course / Slip</th>
                          <th style={{ padding: '1.25rem' }}>Status</th>
                          <th style={{ padding: '1.25rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filterData(approvedSlips).map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '1rem 1.25rem' }}>
                                  <div style={{ fontWeight: 700 }}>{s.profiles?.full_name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Monthly Student</div>
                              </td>
                              <td style={{ padding: '1rem 1.25rem' }}>{s.courses?.title}</td>
                              <td style={{ padding: '1rem 1.25rem' }}><span className="badge badge-success">APPROVED</span></td>
                              <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                  <button onClick={() => handleAction('enrollments', s.id, 'rejected')} className="btn btn-outline" style={{ color: 'var(--color-danger)', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                                      <RotateCcw size={14} style={{ marginRight: '6px' }} /> Revoke
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {filterData(instructorHistory, 'instructor').map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '1rem 1.25rem' }}>
                                  <div style={{ fontWeight: 700 }}>{s.instructors?.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#059669' }}>Instructor Commission</div>
                              </td>
                              <td style={{ padding: '1rem 1.25rem' }}>
                                  <div style={{ fontSize: '0.85rem' }}>Receipt Date: {new Date(s.created_at).toLocaleDateString()}</div>
                                  <button onClick={() => setSelectedImage(s.slip_url)} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>View Slip</button>
                              </td>
                              <td style={{ padding: '1rem 1.25rem' }}><span className="badge" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>PAID / UNLOCKED</span></td>
                              <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                  <button onClick={() => handleAction('instructor_payments', s.id, 'pending')} className="btn btn-outline" style={{ color: '#666', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                                      <RotateCcw size={14} style={{ marginRight: '6px' }} /> Reset Status
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {(approvedSlips.length === 0 && instructorHistory.length === 0) && <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>History Log Empty.</td></tr>}
                  </tbody>
              </table>
          </div>
      )}

      {selectedImage && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }} onClick={() => setSelectedImage(null)}>
              <div style={{ position: 'relative', maxWidth: '80%', maxHeight: '90vh' }}>
                  <img src={selectedImage} alt="Slip" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', border: '4px solid white' }} />
                  <p style={{ color: 'white', textAlign: 'center', marginTop: '1rem', fontWeight: 800 }}>CLICK OUTSIDE TO CLOSE</p>
              </div>
          </div>
      )}
    </div>
  );
}
