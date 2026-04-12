import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CheckSquare, LogOut, BookOpen, 
  CreditCard, PlayCircle, Video, Clock, Calendar, 
  Megaphone, FileText, Save, Users, PieChart
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminLayout() {
  const location = useLocation();
  const [profileName, setProfileName] = useState('Nexus Admin');
  const [notifications, setNotifications] = useState({ approvals: 0, payments: 0, recordings: 0, tutes: 0, commissions: 0 });

  const adminRole = localStorage.getItem('admin_role');
  const instructorId = localStorage.getItem('instructor_id');
  const isSuperAdmin = adminRole === 'super_admin';

  useEffect(() => {
    const fetchProfile = async () => {
      if (isSuperAdmin) {
        setProfileName('Nexus Master');
      } else if (adminRole === 'instructor' && instructorId) {
        const { data } = await supabase.from('instructors').select('name').eq('id', instructorId).single();
        if (data) setProfileName(`Nexus Sir ${data.name.split(' ')[0]}`);
      }
    };

    const fetchCounts = async () => {
        try {
            // 1. Enrollments
            let enrollQuery = supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            // 2. Recording Requests
            let recQuery = supabase.from('recording_access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            let tuteQuery = supabase
                .from('tute_enrollments')
                .select('id, tutes!inner(instructor_id)', { count: 'exact', head: true })
                .eq('status', 'pending');
            // 4. Instructor Commission Payments
            let commQuery = supabase.from('instructor_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            if (adminRole === 'instructor' && instructorId) {
                const { data: myCourses } = await supabase.from('courses').select('id').eq('instructor_id', instructorId);
                const courseIds = myCourses?.map(c => c.id) || [];
                enrollQuery = enrollQuery.in('course_id', courseIds);

                const { data: myRecs } = await supabase.from('recordings').select('id').eq('instructor_id', instructorId);
                const recIds = myRecs?.map(r => r.id) || [];
                recQuery = recQuery.in('recording_id', recIds);
                
                // New: Filter tutes by instructor_id
                tuteQuery = tuteQuery.eq('tutes.instructor_id', instructorId);
            }
            
            const { count: enrollCount } = await enrollQuery;
            const { count: recCount } = await recQuery;
            const { count: tuteCount } = await tuteQuery;
            const { count: commCount } = isSuperAdmin ? await commQuery : { count: 0 };

            setNotifications({
                approvals: (enrollCount || 0) + (recCount || 0) + (tuteCount || 0) + (commCount || 0),
                payments: enrollCount || 0,
                recordings: recCount || 0,
                tutes: tuteCount || 0,
                commissions: commCount || 0
            });
        } catch (e) { console.error(e) }
    };

    fetchProfile();
    fetchCounts();

    const channel = supabase.channel('sidebar_notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => fetchCounts())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recording_access_requests' }, () => fetchCounts())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tute_enrollments' }, () => fetchCounts())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'instructor_payments' }, () => fetchCounts())
        .subscribe();

    return () => supabase.removeChannel(channel);
  }, [adminRole, instructorId, isSuperAdmin]);

  const handleLogout = async () => {
       localStorage.removeItem('admin_role');
       localStorage.removeItem('instructor_id');
       await supabase.auth.signOut();
       window.location.href = '/login';
  };

  let sidebarLinks = [
    { name: 'Overview', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Finance & Analytics', path: '/admin/analytics', icon: <PieChart size={18} /> },
    { name: 'Approvals', path: '/admin/approvals', icon: <CheckSquare size={18} />, badge: notifications.approvals },
    { name: 'Monthly Payments', path: '/admin/payments', icon: <CreditCard size={18} />, badge: notifications.payments },
    { name: 'Manage Free Class', path: '/admin/free-class', icon: <PlayCircle size={18} /> },
    { name: 'Manage Recordings', path: '/admin/recordings', icon: <Video size={18} />, badge: notifications.recordings },
    { name: 'Manage Live Today', path: '/admin/manage-live', icon: <Clock size={18} /> },
    { name: 'Class Schedule', path: '/admin/schedule', icon: <Calendar size={18} /> },
    { name: 'Class Tute PDF', path: '/admin/tutes', icon: <FileText size={18} />, badge: notifications.tutes },
    { name: 'Special Announce', path: '/admin/announcements', icon: <Megaphone size={18} /> },
    { name: 'Public Catalog', path: '/admin/catalog', icon: <BookOpen size={18} /> }
  ];

  if (isSuperAdmin) {
      sidebarLinks.push({ name: 'Manage Experts', path: '/admin/instructors', icon: <Users size={18} /> });
      sidebarLinks.push({ name: 'Web Settings', path: '/admin/settings', icon: <Save size={18} /> });
  }

  return (
    <div className="admin-layout" style={{ height: '100vh', overflow: 'hidden', display: 'flex' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ width: '280px', flexShrink: 0, height: '100vh', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-surface-border)' }}>
        <div className="admin-sidebar-header">
          <Link to="/" className="nav-brand" style={{textDecoration: 'none'}}>
            <BookOpen size={24} style={{color: 'var(--color-primary)'}} />
            <span style={{fontWeight: 900, fontSize: '1.25rem', color: 'var(--color-primary)', textTransform: 'uppercase'}}>{profileName}</span>
          </Link>
        </div>
        
        <nav className="admin-sidebar-nav" style={{ overflowY: 'auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', paddingLeft: '1rem', letterSpacing: '1px' }}>
              Management
          </div>
          {sidebarLinks.map(link => (
            <Link 
              key={link.name} 
              to={link.path}
              className={`admin-sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
              style={{ 
                padding: '0.875rem 1rem', 
                fontSize: '0.9rem', 
                color: location.pathname === link.path ? 'var(--color-primary)' : 'inherit', 
                backgroundColor: location.pathname === link.path ? 'var(--color-primary-light)' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {link.icon}
                  {link.name}
              </div>
              {link.badge > 0 && (
                  <span style={{ 
                      backgroundColor: 'var(--color-danger)', 
                      color: 'white', 
                      fontSize: '0.7rem', 
                      fontWeight: 900, 
                      padding: '2px 8px', 
                      borderRadius: '20px',
                      minWidth: '20px',
                      textAlign: 'center'
                  }}>
                      {link.badge}
                  </span>
              )}
            </Link>
          ))}
        </nav>
        
        <div style={{padding: '1.5rem', borderTop: '1px solid var(--color-surface-border)'}}>
          <button onClick={handleLogout} className="admin-sidebar-link" style={{color: 'var(--color-danger)', border: 'none', background: 'transparent', width: '100%', display: 'flex', cursor: 'pointer' }}>
            <LogOut size={20} />
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="admin-main" style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
        <header className="admin-mobile-header" style={{ flexShrink: 0 }}>
            <Link to="/admin/dashboard" style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 900, textTransform: 'uppercase'}}>
                <BookOpen size={20} /> {profileName}
            </Link>
            <button onClick={handleLogout} style={{color: 'var(--color-danger)', fontSize: '0.875rem', fontWeight: 700, background: 'transparent', border: 'none'}}>   
               Logout
            </button>
        </header>
        
        <div className="admin-content" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <Outlet />
          <div style={{ height: '5rem' }}></div> {/* Spacer for bottom on mobile if needed */}
        </div>
      </main>
    </div>
  );
}
