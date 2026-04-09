import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, FileText, RotateCcw, ShoppingBag, Users, GraduationCap, History, DollarSign, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function Approvals() {
  const [pendingSlips, setPendingSlips] = useState([]);
  const [approvedSlips, setApprovedSlips] = useState([]);
  const [tuteSlips, setTuteSlips] = useState([]);
  const [approvedTutes, setApprovedTutes] = useState([]);
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
        .select(`id, created_at, slip_url, status, profiles(full_name, phone, grade, subject, year, email), tutes(title, price, instructor_id)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    // Fetch Approved Tutes
    const { data: appTutes } = await supabase
        .from('tute_enrollments')
        .select(`id, created_at, approved_at, expires_at, slip_url, status, profiles(full_name, phone, grade, subject, year, email), tutes(title, price, instructor_id)`)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

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
    let finalTutes = tutes || [];
    let finalAppTutes = appTutes || [];

    if (adminRole === 'instructor' && instructorId) {
        finalPending = finalPending.filter(p => p.courses?.instructor_id === instructorId);
        finalApproved = finalApproved.filter(p => p.courses?.instructor_id === instructorId);
        finalVReqs = finalVReqs.filter(v => v.recordings?.instructor_id === instructorId);
        finalTutes = finalTutes.filter(t => t.tutes?.instructor_id === instructorId);
        finalAppTutes = finalAppTutes.filter(t => t.tutes?.instructor_id === instructorId);
    }

    setPendingSlips(finalPending);
    setApprovedSlips(finalApproved);
    setVideoRequests(finalVReqs);
    setTuteSlips(finalTutes);
    setApprovedTutes(finalAppTutes);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructor_payments' }, () => fetchSlips())
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
            const expiry = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // 5-hour window
            updateData.approved_at = now.toISOString();
            updateData.expires_at = expiry.toISOString();
        }

        if (table === 'tute_enrollments' && newStatus === 'approved') {
            const now = new Date();
            const expiry = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // 7-hour window for Download
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

        if (table === 'instructor_payments') {
            const { data: payRecord } = await supabase.from('instructor_payments').select('instructor_id').eq('id', id).single();
            if (payRecord?.instructor_id) {
                if (newStatus === 'approved') {
                    const newExpiry = new Date();
                    newExpiry.setDate(newExpiry.getDate() + 31);
                    await supabase.from('instructors').update({ 
                        access_expiry_date: newExpiry.toISOString(),
                        commission_status: 'Paid'
                    }).eq('id', payRecord.instructor_id);
                } else {
                    // Revoke access if status changed to pending or rejected
                    await supabase.from('instructors').update({ 
                        access_expiry_date: new Date(0).toISOString(), // Expire immediately
                        commission_status: 'Pending'
                    }).eq('id', payRecord.instructor_id);
                }
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
          (s.courses?.title?.toLowerCase() || '').includes(query) ||
          (s.tutes?.title?.toLowerCase() || '').includes(query)
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
  const handleCleanup = async () => {
    if (!window.confirm("දවස් 7ක් පැරණි, දැනටමත් Approve හෝ Reject කළ රිසිට්පත් ඔක්කොම ස්ටෝරේජ් එකෙන් මකා දමන්නද? (මෙය නැවත සකස් කළ නොහැක)")) return;
    
    setLoading(true);
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Get records to clean (Monthly)
        const { data: toClean } = await supabase
            .from('enrollments')
            .select('id, slip_url')
            .not('slip_url', 'is', null)
            .neq('status', 'pending')
            .lte('created_at', sevenDaysAgo.toISOString());

        // 2. Get records to clean (Tutes)
        const { data: tuteToClean } = await supabase
            .from('tute_enrollments')
            .select('id, slip_url')
            .not('slip_url', 'is', null)
            .neq('status', 'pending')
            .lte('created_at', sevenDaysAgo.toISOString());

        // 3. Get records to clean (Instructors)
        const { data: instToClean } = await supabase
            .from('instructor_payments')
            .select('id, slip_url')
            .not('slip_url', 'is', null)
            .neq('status', 'pending')
            .lte('created_at', sevenDaysAgo.toISOString());

        const allToClean = [
            ...(toClean || []).map(x => ({ ...x, table: 'enrollments' })),
            ...(tuteToClean || []).map(x => ({ ...x, table: 'tute_enrollments' })),
            ...(instToClean || []).map(x => ({ ...x, table: 'instructor_payments' }))
        ];

        if (allToClean.length === 0) {
            showToast("මකා දැමීමට තරම් පැරණි රිසිට්පත් කිසිවක් හමු නොවීය.", 'info');
            setLoading(false);
            return;
        }

        console.log("Records found for cleanup:", allToClean);

        let deletedCount = 0;
        let errors = [];
        
        for (const record of allToClean) {
            try {
                if (!record.slip_url) continue;
                
                // Extract path and bucket from URL
                const parts = record.slip_url.split('/');
                let bucket = 'payment_slips';
                let filePath = '';

                if (record.slip_url.includes('tute_slips')) {
                    bucket = 'tute_slips';
                    filePath = parts[parts.length - 1]; // Simple files
                } else if (record.slip_url.includes('site-media')) {
                    bucket = 'site-media';
                    // Extract EVERYTHING after 'site-media'
                    const bIdx = parts.indexOf('site-media');
                    filePath = parts.slice(bIdx + 1).join('/');
                } else {
                    bucket = 'payment_slips';
                    filePath = parts[parts.length - 1];
                }

                // 1. Delete from storage
                const { error: storeErr } = await supabase.storage.from(bucket).remove([filePath]);
                if (storeErr) console.warn("Storage removal warning:", storeErr);
                
                // 2. Update DB (Hide the URL)
                const { error: dbErr } = await supabase.from(record.table)
                    .update({ slip_url: null })
                    .eq('id', record.id);
                
                if (dbErr) {
                    console.error(`DB Update Error for ${record.table} ID ${record.id}:`, dbErr);
                    errors.push(dbErr.message);
                } else {
                    deletedCount++;
                }
            } catch (innerErr) {
                console.error("Loop error:", innerErr);
                errors.push(innerErr.message);
            }
        }

        if (errors.length > 0) {
            showToast(`අසාර්ථකයි: ${errors[0]}`, 'error');
        } else {
            showToast(`සාර්ථකයි! රිසිට්පත් ${deletedCount}ක් ස්ථිරවම මකා දැමුවා.`, 'success');
        }
        
        // Final refresh and reload to be 100% sure
        await fetchSlips();
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        showToast("Cleanup failed: " + err.message, 'error');
    }
    setLoading(false);
  };

  const handleDeleteRequest = async (table, id, slipUrl) => {
    if (!window.confirm("මෙම ඉල්ලීම සහ මෙයට අදාළ රිසිට්පත ස්ථිරවම මකා දමන්නද?")) return;
    try {
        setLoading(true);
        if (slipUrl) {
            const parts = slipUrl.split('/');
            const fileName = parts[parts.length - 1];
            const isTute = slipUrl.includes('tute_slips');
            const bucket = isTute ? 'tute_slips' : 'payment_slips';
            await supabase.storage.from(bucket).remove([fileName]);
        }
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        showToast("Record and Receipt deleted permanently.", 'success');
        fetchSlips();
    } catch (err) {
        showToast("Delete failed: " + err.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  const [storageStats, setStorageStats] = useState({ used: 0, total: 1024, count: 0 }); // In MB

  const fetchStorageStats = async () => {
    if (localStorage.getItem('admin_role') !== 'super_admin') return;
    
    try {
        const { data, error } = await supabase.from('storage_usage_view').select('*');
        if (error) throw error;

        let totalBytes = 0;
        let totalCount = 0;
        
        if (data) {
            data.forEach(item => {
                totalBytes += parseInt(item.total_size || 0);
                totalCount += parseInt(item.file_count || 0);
            });
        }

        const usedMB = (totalBytes / (1024 * 1024)).toFixed(2);
        setStorageStats({ used: usedMB, total: 1024, count: totalCount });
    } catch (err) {
        console.error("Storage Stats Error:", err);
    }
  };

  useEffect(() => {
    fetchStorageStats();
    const timer = setInterval(fetchStorageStats, 3000); // Live tracking every 3 seconds
    return () => clearInterval(timer);
  }, []);

  const downloadReceipt = async (url) => {
    try {
        showToast("Downloading...", 'info');
        
        // Detect if mobile webview
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isMobile) {
            // For mobile apps/webviews, opening the direct HTTPS link in a new tab 
            // is the most reliable way to trigger the native browser download manager
            window.open(url, '_blank');
            showToast("Opening in Browser...", 'success');
        } else {
            // High quality blob download for PC
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `nexus_receipt_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            showToast("Download Complete!", 'success');
        }
    } catch (err) {
        window.open(url, '_blank');
        showToast("Opened in Browser.", 'info');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '-0.025em', margin: 0 }}>Sales Hub</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Manage student payments & access</p>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '6px', borderRadius: '14px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <TabButton id="students" label="Monthly" icon={GraduationCap} color="#f43f5e" count={pendingSlips.length} />
              <TabButton id="videos" label="Video Access" icon={Video} color="#0284c7" count={videoRequests.length} />
                    <TabButton id="instructors" label="Commissions" icon={DollarSign} color="#10b981" count={instructorSlips.length} />
                    <TabButton id="tutes" label="Tutes" icon={ShoppingBag} color="#8b5cf6" count={tuteSlips.length} />
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
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 700 }}>{s.profiles?.year} - {s.profiles?.subject}</div>
                              </td>
                              <td style={{ padding: '1.25rem' }}>
                                  <div style={{ fontWeight: 700 }}>{s.courses?.title}</div>
                                  {s.courses?.instructors?.name && <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>{s.courses.instructors.name}</div>}
                              </td>
                              <td style={{ padding: '1.25rem' }}><button onClick={() => setSelectedImage(s.slip_url)} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={16} /> Evidence</button></td>
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
                                        <button onClick={() => handleAction('tute_enrollments', s.id, 'rejected')} className="btn btn-outline" style={{ color: 'var(--color-danger)' }} title="Reject"><XCircle size={18} /></button>
                                        <button onClick={() => handleDeleteRequest('tute_enrollments', s.id, s.slip_url)} className="btn btn-outline" style={{ color: '#94a3b8', borderColor: '#f1f5f9' }} title="Delete Permanently"><ShoppingBag size={18} /></button>
                                    </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {localStorage.getItem('admin_role') === 'super_admin' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                      <div className="card" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                              <h3 style={{ margin: 0, fontWeight: 800, color: '#991b1b' }}>Optimize Storage</h3>
                              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#991b1b', opacity: 0.8 }}>දින 7ක් පැරණි රිසිට්පත් මකන්න.</p>
                              <button onClick={handleCleanup} className="btn btn-primary" style={{ backgroundColor: '#dc2626', marginTop: '1rem' }}>Clean Old Records</button>
                          </div>
                      </div>

                      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                           <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                                <svg width="80" height="80" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-primary)" strokeWidth="10" strokeDasharray={`${(storageStats.used / storageStats.total) * 283} 283`} strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1s ease' }} />
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>
                                    {Math.round((storageStats.used / storageStats.total) * 100)}%
                                </div>
                           </div>
                           <div style={{ flex: 1 }}>
                               <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>Storage Monitor</h3>
                               <p style={{ margin: '2px 0', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                   {storageStats.used}MB / {storageStats.total}MB Used
                               </p>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                   <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                                   <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>Live Tracking ({storageStats.count} Slips)</span>
                               </div>
                           </div>
                      </div>
                  </div>
              )}
              
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
                                  <td style={{ padding: '1rem 1.25rem' }}>
                                      <div>{s.courses?.title}</div>
                                      {s.slip_url ? (
                                          <button onClick={() => setSelectedImage(s.slip_url)} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>View Receipt</button>
                                      ) : (
                                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Receipt Purged</span>
                                      )}
                                  </td>
                                  <td style={{ padding: '1rem 1.25rem' }}><span className="badge badge-success">APPROVED</span></td>
                                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                      <button onClick={() => handleAction('enrollments', s.id, 'rejected')} className="btn btn-outline" style={{ color: 'var(--color-danger)', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                                          <RotateCcw size={14} style={{ marginRight: '6px' }} /> Revoke
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {filterData(approvedTutes).map(s => {
                               const expired = s.expires_at && new Date(s.expires_at) < new Date();
                               return (
                               <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                   <td style={{ padding: '1rem 1.25rem' }}>
                                       <div style={{ fontWeight: 700 }}>{s.profiles?.full_name}</div>
                                       <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>Tute Access</div>
                                   </td>
                                   <td style={{ padding: '1rem 1.25rem' }}>
                                       <div>{s.tutes?.title}</div>
                                       {s.slip_url ? (
                                           <button onClick={() => setSelectedImage(s.slip_url)} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>View Receipt</button>
                                       ) : (
                                           <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Receipt Deleted</span>
                                       )}
                                   </td>
                                   <td style={{ padding: '1rem 1.25rem' }}>
                                       <span className={`badge ${expired ? 'badge-danger' : 'badge-success'}`}>
                                           {expired ? 'EXPIRED (7h)' : 'ACTIVE ACCESS'}
                                       </span>
                                       {s.expires_at && !expired && <div style={{ fontSize: '0.65rem', marginTop: '4px', opacity: 0.5 }}>Expires: {new Date(s.expires_at).toLocaleTimeString()}</div>}
                                   </td>
                                   <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleAction('tute_enrollments', s.id, 'pending')} className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                                                <RotateCcw size={14} /> Reset
                                            </button>
                                            <button onClick={() => handleDeleteRequest('tute_enrollments', s.id, s.slip_url)} className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#fee2e2', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                                                Delete
                                            </button>
                                        </div>
                                   </td>
                               </tr>
                           )})}
                          {filterData(instructorHistory, 'instructor').map(s => (
                              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '1rem 1.25rem' }}>
                                      <div style={{ fontWeight: 700 }}>{s.instructors?.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: '#059669' }}>Instructor Commission</div>
                                  </td>
                                  <td style={{ padding: '1rem 1.25rem' }}>
                                      <div style={{ fontSize: '0.85rem' }}>Receipt Date: {new Date(s.created_at).toLocaleDateString()}</div>
                                      {s.slip_url ? (
                                          <button onClick={() => setSelectedImage(s.slip_url)} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>View Slip</button>
                                      ) : (
                                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Slip Purged</span>
                                      )}
                                  </td>
                                  <td style={{ padding: '1rem 1.25rem' }}><span className="badge" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>PAID / UNLOCKED</span></td>
                                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                          <button onClick={() => handleAction('instructor_payments', s.id, 'pending')} className="btn btn-outline" style={{ color: '#64748b', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                                              <RotateCcw size={14} /> Reset
                                          </button>
                                          <button onClick={() => handleAction('instructor_payments', s.id, 'rejected')} className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#fee2e2', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                                              <XCircle size={14} /> Revoke & Lock
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {(filterData(approvedSlips).length === 0 && filterData(approvedTutes).length === 0 && filterData(instructorHistory, 'instructor').length === 0) && <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>History Log Empty.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {selectedImage && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)' }} onClick={() => setSelectedImage(null)}>
              <div style={{ position: 'relative', maxWidth: '80%', maxHeight: '90vh', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <img src={selectedImage} alt="Slip" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '20px', border: '4px solid rgba(255,255,255,0.2)', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} />
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button onClick={() => downloadReceipt(selectedImage)} className="btn btn-primary" style={{ backgroundColor: '#10b981', padding: '0.75rem 2rem', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={18} /> Download High Quality
                      </button>
                      <button onClick={() => setSelectedImage(null)} className="btn btn-outline" style={{ color: 'white', borderColor: 'white' }}>Close Window</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
