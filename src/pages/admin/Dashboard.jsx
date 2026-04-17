import { useState, useEffect } from 'react';
import { Users, Video, BookOpen, AlertCircle, Search, MapPin, Phone, UserCheck, CreditCard, ChevronRight, Trash2, LayoutGrid, DollarSign, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { sendSMS } from '../../utils/smsGateway';

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidStudentsCount: 0,
    pendingSlips: 0,
    paidEnrollments: [] // New: Grouped by Course (Approved only)
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [commissionUploading, setCommissionUploading] = useState(false);
  const [myCommissionReceipts, setMyCommissionReceipts] = useState([]);
  const [profileName, setProfileName] = useState('Admin');
  const [expiryInfo, setExpiryInfo] = useState(null);

  const adminRole = localStorage.getItem('admin_role');
  const instructorId = localStorage.getItem('instructor_id');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (adminRole === 'super_admin') {
            setProfileName('Super Admin');
        } else if (adminRole === 'instructor' && instructorId) {
            const { data: inst } = await supabase.from('instructors').select('name, access_expiry_date').eq('id', instructorId).single();
            if (inst) {
                setProfileName(inst.name);
                setExpiryInfo(inst.access_expiry_date);
            }
        }

        let studentCount = 0;
        let paidStudentsCount = 0;
        let pendingCountValue = 0;
        let courseData = [];

        if (adminRole === 'instructor' && instructorId) {
            // Instructor specific counts
            const { data: instCourses } = await supabase.from('courses').select('id').eq('instructor_id', instructorId);
            const courseIds = instCourses?.map(c => c.id) || [];
            
            const { count: sc } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).in('course_id', courseIds).eq('status', 'approved');
            const { count: pc } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).in('course_id', courseIds).eq('status', 'pending');
            const { data: cd } = await supabase.from('courses').select('title, enrollments!inner (count)').eq('instructor_id', instructorId).eq('enrollments.status', 'approved');
            
            const { data: ps } = await supabase.from('enrollments').select('student_id').in('course_id', courseIds).eq('status', 'approved');
            paidStudentsCount = new Set(ps?.map(e => e.student_id)).size;

            studentCount = sc || 0;
            pendingCountValue = pc || 0;
            courseData = cd || [];
        } else {
            // Super Admin global counts
            const { count: sc } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
            const { count: pc } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: tc } = await supabase.from('tute_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: vc } = await supabase.from('recording_access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: cc } = await supabase.from('instructor_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            
            const { data: cd } = await supabase.from('courses').select('title, enrollments!inner (count)').eq('enrollments.status', 'approved');

            const { data: ps } = await supabase.from('enrollments').select('student_id').eq('status', 'approved');
            paidStudentsCount = new Set(ps?.map(e => e.student_id)).size;

            studentCount = sc || 0;
            pendingCountValue = (pc || 0) + (tc || 0) + (vc || 0) + (cc || 0);
            courseData = cd || [];
        }

        const counts = courseData?.map(c => ({
            title: c.title || 'Untitled Course',
            count: (Array.isArray(c.enrollments) ? c.enrollments[0]?.count : c.enrollments?.count) || 0
        })) || [];

        setStats({
          totalStudents: studentCount,
          paidStudentsCount: paidStudentsCount,
          pendingSlips: pendingCountValue,
          paidEnrollments: counts
        });

        if (adminRole === 'instructor' && instructorId) {
            const { data: receipts } = await supabase.from('instructor_payments').select('*').eq('instructor_id', instructorId).order('created_at', { ascending: false });
            setMyCommissionReceipts(receipts || []);
        }
      } catch (err) {
        console.error("Dashboard Stats Fetch Error:", err);
      }
    };
    fetchStats();
  }, [adminRole, instructorId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,district.ilike.%${searchQuery}%,province.ilike.%${searchQuery}%,town.ilike.%${searchQuery}%`)
          .eq('role', 'student')
          .limit(10);

        if (error) throw error;
        if (data) setSearchResults(data);
    } catch (err) {
        alert("Search failed: " + err.message);
    } finally {
        setIsSearching(false);
    }
  };

  const handleToggleBlock = async (studentId, studentName, currentStatus) => {
    const action = currentStatus ? 'unblock' : 'block';
    if (window.confirm(`Are you sure you want to ${action} student "${studentName}"?`)) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_blocked: !currentStatus })
                .eq('id', studentId);
            
            if (error) throw error;
            alert(`Student "${studentName}" has been ${action}ed.`);
            setSearchResults(prev => prev.map(s => s.id === studentId ? { ...s, is_blocked: !currentStatus } : s));
        } catch (err) {
            alert("Action failed: " + err.message);
        }
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`⚠️ PERMANENT DELETE: Are you sure? This will wipe "${studentName}" from the database and authentication, but they WILL be able to register again later.`)) {
        try {
            // 1. Delete enrollments
            await supabase.from('enrollments').delete().eq('student_id', studentId);
            
            // 2. Call the privileged RPC to delete from auth.users (This allows re-registration!)
            const { error: rpcError } = await supabase.rpc('delete_user_by_admin', { target_id: studentId });
            if (rpcError) console.warn("RPC Deletion failed, attempting manual profile delete:", rpcError);

            // 3. Delete the profile just in case cascade didn't catch it
            await supabase.from('profiles').delete().eq('id', studentId);
            
            alert(`Account for "${studentName}" deleted. They can register again if they wish.`);
            setSearchResults(prev => prev.filter(s => s.id !== studentId));
        } catch (err) {
            alert("Error deleting student: " + err.message);
        }
    }
  };

  const statCards = [
    { title: adminRole === 'instructor' ? 'My Paid Students' : 'Registered Students', value: stats.totalStudents, icon: <Users size={24} />, color: 'var(--color-primary)', trend: 'Active users' },
    { title: 'My Pending Slips', value: stats.pendingSlips, icon: <AlertCircle size={24} />, color: 'var(--color-warning)', trend: 'Awaiting review' },
    { title: 'Revenue (Approved)', value: stats.paidEnrollments.reduce((sum, item) => sum + item.count, 0), icon: <DollarSign size={24} />, color: 'var(--color-success)', trend: `${stats.paidEnrollments.reduce((sum, item) => sum + item.count, 0)} Payments from ${stats.paidStudentsCount} Students` },
  ];

  const handleUploadCommission = async (e) => {
    const file = e.target.files[0];
    if (!file || !instructorId) return;
    
    setCommissionUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${instructorId}_${Date.now()}.${fileExt}`;
        const filePath = `commissions/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('site-media').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('site-media').getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('instructor_payments').insert([{ instructor_id: instructorId, slip_url: publicUrl, status: 'pending' }]);
        if (dbError) throw dbError;

        try {
            const smsRes = await sendSMS('0721803785', `Nexus LMS: New Commission Slip! Professor ${profileName} has uploaded a monthly payment slip. Please check the Sales Hub to approve.`);
            console.log("Super Admin SMS Notification Result:", smsRes);
        } catch (smsErr) {
            console.error("SMS notification failed:", smsErr);
        }

        showToast("Receipt uploaded! Admin will verify it soon.", 'success');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (err) {
        showToast("Upload failed: " + err.message, 'error');
    } finally {
        setCommissionUploading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
           <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-primary)', margin: 0 }}>
             {adminRole === 'instructor' ? `${profileName}'s` : 'Master'} Intelligence
           </h1>
           <p style={{ color: 'var(--color-text-muted)', fontWeight: 700, marginTop: '4px' }}>Welcome back, {profileName}! Here's your performance snapshot.</p>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {statCards.map((stat, i) => (
          <div key={i} className="card" style={{ borderLeft: `6px solid ${stat.color}`, padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ backgroundColor: `${stat.color}15`, padding: '1.25rem', borderRadius: '1rem', color: stat.color }}>{stat.icon}</div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{stat.title}</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: '0.25rem 0' }}>{stat.value.toLocaleString()}</h3>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: stat.color }}>{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: (adminRole === 'instructor' ? '1.2fr 1.3fr' : '1.5fr 1fr'), gap: '2rem' }}>
         <div className="card" style={{ padding: '2.5rem' }}>
             {adminRole === 'instructor' ? (
                 <>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: 1.6 }}>Please upload your monthly commission payment receipt (slip) here. Once the Super Admin approves it, your account access will be extended.</p>
                    
                    {expiryInfo && (
                        <div style={{ padding: '1.25rem', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ backgroundColor: '#0ea5e9', color: 'white', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                                {Math.max(0, Math.ceil((new Date(expiryInfo) - new Date()) / (1000 * 60 * 60 * 24)))}
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 800, color: '#0369a1' }}>Account Access Remaining</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#0ea5e9', fontWeight: 700 }}>Next Payment Due: {new Date(expiryInfo).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ border: '2px dashed var(--color-primary-light)', borderRadius: '1.5rem', padding: '3rem', textAlign: 'center', background: 'var(--color-primary-light)10' }}>
                         <Upload size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem', opacity: 0.5 }} />
                         <p style={{ fontWeight: 800, marginBottom: '1.5rem' }}>Drop your receipt photo here</p>
                         <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                             {commissionUploading ? 'Uploading...' : 'Choose Receipt Image'}
                             <input type="file" accept="image/*" onChange={handleUploadCommission} style={{ display: 'none' }} disabled={commissionUploading} />
                         </label>
                    </div>

                    {myCommissionReceipts.length > 0 && (
                        <div style={{ marginTop: '3rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Recent History</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {myCommissionReceipts.map(r => (
                                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-surface-border)' }}>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <div style={{ fontWeight: 800 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                                            <div style={{ opacity: 0.6 }}>Receipt ID: {r.id.slice(0,8)}</div>
                                        </div>
                                        <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                            {r.status.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </>
             ) : (
                 <>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Search size={24} color="var(--color-primary)" /> Finder
                    </h2>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                            <input type="text" className="input-field" placeholder="Search students..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ marginBottom: 0, paddingLeft: '3.25rem' }} />
                        </div>
                        <button type="submit" disabled={isSearching} className="btn btn-primary">Search</button>
                    </form>

                    {searchResults.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {searchResults.map(student => (
                                <div key={student.id} style={{ backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--color-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                        <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{student.full_name?.[0]}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <h4 style={{ margin: 0, fontWeight: 800 }}>{student.full_name}</h4>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{student.phone} | {student.town}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{student.is_blocked ? 'BLOCKED' : `${student.year} - ${student.grade}`}</span>
                                        {adminRole !== 'instructor' && (
                                            <>
                                                <button 
                                                    onClick={() => handleToggleBlock(student.id, student.full_name, student.is_blocked)} 
                                                    className="btn btn-outline" 
                                                    style={{ padding: '0.4rem', color: student.is_blocked ? '#10b981' : '#f59e0b', borderColor: student.is_blocked ? '#10b981' : '#f59e0b' }}
                                                    title={student.is_blocked ? "Unblock User" : "Block User"}
                                                >
                                                    {student.is_blocked ? <UserCheck size={16} /> : <AlertCircle size={16} />}
                                                </button>
                                                <button onClick={() => handleDeleteStudent(student.id, student.full_name)} className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} title="Delete Permanently"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Use the finder to discover students.</div>
                    )}
                 </>
             )}
         </div>

         <div className="card" style={{ padding: '2rem' }}>
             <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem' }}>{adminRole === 'instructor' ? 'My Active Batches' : 'Paid Enrollments by Course'}</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 {stats.paidEnrollments.length > 0 ? stats.paidEnrollments.map((g, i) => (
                     <div key={i}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 800 }}>
                             <span>{g.title}</span>
                             <span style={{ color: 'var(--color-primary)' }}>{g.count} Paid</span>
                         </div>
                         <div style={{ height: '8px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '10px' }}>
                             <div style={{ height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '10px', width: `${Math.min((g.count / (stats.totalStudents || 1)) * 100, 100)}%` }}></div>
                         </div>
                     </div>
                 )) : (
                    <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--color-surface-border)', borderRadius: '1rem' }}>
                        <DollarSign size={32} style={{ opacity: 0.1, margin: '0 auto 1rem' }} />
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No approved payments yet. <br/> Approved slips will appear here.</p>
                    </div>
                 )}
             </div>
             <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-surface-border)', paddingTop: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Note: These numbers only represent students whose payments have been **Approved** by an administrator.</p>
             </div>
         </div>
      </div>
    </div>
  );
}
