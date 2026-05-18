import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Users, DollarSign, Video, FileText, PieChart, Activity, CheckCircle, Clock, Download } from 'lucide-react';

export default function Analytics() {
    const [stats, setStats] = useState({
        totalRevenue: 0, 
        totalCommissions: 0,
        netProfit: 0,
        activeStudents: 0,
        pendingApprovals: 0,
        totalClasses: 0
    });
    
    // Real dynamic data states
    const [monthlyData, setMonthlyData] = useState([]);
    const [popularClasses, setPopularClasses] = useState([]);
    const [timeRange, setTimeRange] = useState(6); // Default 6 months
    const [isLoading, setIsLoading] = useState(true);

    const adminRole = localStorage.getItem('admin_role');
    const currentInstructorId = localStorage.getItem('instructor_id');

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                // Get counts
                const { count: studentsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
                const { count: classesCount } = await supabase.from('courses').select('*', { count: 'exact', head: true });
                
                // Get pending approvals
                const { count: pendingEnrollments } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
                const { count: pendingTutes } = await supabase.from('tute_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
                const { count: pendingCommissions } = await supabase.from('instructor_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
                
                // Fetch approved enrollments and tutes to calculate real revenue
                const { data: approvedEnrollments } = await supabase.from('enrollments').select('created_at, course_id, courses(title, price, instructor_id)').eq('status', 'approved');
                const { data: approvedTutes } = await supabase.from('tute_enrollments').select('created_at, tute_id, tutes(title, price, instructor_id)').eq('status', 'approved');
                
                // Fetch approved instructor commissions
                const { data: approvedCommissions } = await supabase.from('instructor_payments').select('created_at, amount, instructor_id, instructors(name)').eq('status', 'approved');
                
                let totalRevenue = 0;
                let totalCommissions = 0;
                let monthlyMap = {}; // Format: { "YYYY-MM": amount }
                let classCountMap = {}; // Format: { "Course Title": count }

                if(approvedEnrollments) {
                    approvedEnrollments.forEach(e => {
                        if (adminRole === 'instructor' && e.courses?.instructor_id !== currentInstructorId) return;
                        let amount = 0;
                        const courseTitle = e.courses?.title || 'Unknown Course';
                        
                        if(e.courses && e.courses.price) {
                            const match = String(e.courses.price).match(/\d+/g);
                            if(match) amount = parseInt(match.join(''));
                        }
                        
                        totalRevenue += amount;

                        const dateObj = new Date(e.created_at);
                        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                        const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });
                        
                        if (!monthlyMap[monthKey]) {
                            monthlyMap[monthKey] = { label: monthLabel, income: 0, expense: 0, sortKey: monthKey };
                        }
                        monthlyMap[monthKey].income += amount;

                        classCountMap[courseTitle] = (classCountMap[courseTitle] || 0) + 1;
                    });
                }

                if (approvedTutes) {
                    approvedTutes.forEach(t => {
                        if (adminRole === 'instructor' && t.tutes?.instructor_id !== currentInstructorId) return;
                        let amount = 0;
                        if (t.tutes && t.tutes.price) amount = Number(t.tutes.price);
                        totalRevenue += amount;

                        const dateObj = new Date(t.created_at);
                        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                        const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });

                        if (!monthlyMap[monthKey]) {
                            monthlyMap[monthKey] = { label: monthLabel, income: 0, expense: 0, sortKey: monthKey };
                        }
                        monthlyMap[monthKey].income += amount;
                    });
                }
                
                if (approvedCommissions) {
                    approvedCommissions.forEach(c => {
                        if (adminRole === 'instructor' && c.instructor_id !== currentInstructorId) return;
                        const amount = Number(c.amount) || 0;
                        totalCommissions += amount;
                        
                        const dateObj = new Date(c.created_at);
                        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                        const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });
                        
                        if (!monthlyMap[monthKey]) {
                            monthlyMap[monthKey] = { label: monthLabel, income: 0, expense: 0, sortKey: monthKey };
                        }
                        monthlyMap[monthKey].expense += amount;
                    });
                }
                
                // --- PRO CHART DATA FILLING ---
                const recentMonths = [];
                const now = new Date();
                for (let i = timeRange - 1; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const monthLabel = d.toLocaleString('en-US', { month: 'short' });
                    
                    const existing = monthlyMap[monthKey];
                    recentMonths.push({
                        month: monthLabel,
                        income: existing ? existing.income : 0,
                        expense: existing ? existing.expense : 0,
                        net: existing ? (existing.income - existing.expense) : 0
                    });
                }

                const topClasses = Object.entries(classCountMap)
                    .map(([name, count]) => ({ name, students: count }))
                    .sort((a, b) => b.students - a.students)
                    .slice(0, 3); 

                const highestStudentCount = topClasses.length > 0 ? topClasses[0].students : 1;
                
                const formattedTopClasses = topClasses.map(c => ({
                    ...c,
                    progress: Math.floor((c.students / highestStudentCount) * 100)
                }));

                setPopularClasses(formattedTopClasses);
                setMonthlyData(recentMonths);

                setStats({
                    totalRevenue, // Student Collections (Volume)
                    totalCommissions, // Platform Earnings (Actual Profit)
                    netProfit: adminRole === 'instructor' ? (totalRevenue - totalCommissions) : totalCommissions, 
                    activeStudents: studentsCount || 0,
                    pendingApprovals: (pendingEnrollments || 0) + (pendingTutes || 0) + (pendingCommissions || 0),
                    totalClasses: classesCount || 0
                });
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [timeRange]);

    const downloadCSV = async () => {
        const adminRole = localStorage.getItem('admin_role');
        const currentInstructorId = localStorage.getItem('instructor_id');
        
        if (adminRole !== 'super_admin' && adminRole !== 'instructor') {
            alert("⚠️ You do not have permission to download reports.");
            return;
        }

        try {
            setIsLoading(true);
            
            // Build query for enrollments
            let enrollmentQuery = supabase
                .from('enrollments')
                .select('created_at, courses(title, price, instructor_id), profiles(full_name, nic, phone)')
                .eq('status', 'approved');
            
            // If instructor, filter ONLY their own courses
            if (adminRole === 'instructor' && currentInstructorId) {
                enrollmentQuery = enrollmentQuery.filter('courses.instructor_id', 'eq', currentInstructorId);
            }

            const { data } = await enrollmentQuery;
                
            // Fetch commission records (Only super admin sees these usually, or instructor sees only their own)
            let commQuery = supabase
                .from('instructor_payments')
                .select('created_at, amount, instructors(name, id)')
                .eq('status', 'approved');
            
            if (adminRole === 'instructor' && currentInstructorId) {
                commQuery = commQuery.eq('instructor_id', currentInstructorId);
            }

            const { data: commissionData } = await commQuery;

            // Fetch Tutes for CSV
            let tuteQuery = supabase
                .from('tute_enrollments')
                .select('created_at, tutes(title, price, instructor_id), profiles(full_name, nic)')
                .eq('status', 'approved');
            
            if (adminRole === 'instructor' && currentInstructorId) {
                tuteQuery = tuteQuery.filter('tutes.instructor_id', 'eq', currentInstructorId);
            }
            const { data: tuteData } = await tuteQuery;
            
            if ((!data || data.length === 0) && (!commissionData || commissionData.length === 0) && (!tuteData || tuteData.length === 0)) {
                alert("No payment data found for your account.");
                setIsLoading(false);
                return;
            }

            let csvContent = "Date,Type,Name/Entity,NIC/ID,Ref,Amount (Rs.),Status\n";

            if (data) {
                data.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const studentName = item.profiles?.full_name || 'N/A';
                    const nic = item.profiles?.nic || 'N/A';
                    const course = item.courses?.title || 'Course Payment';
                    let amount = 0;
                    if(item.courses && item.courses.price) {
                        const match = String(item.courses.price).match(/\d+/g);
                        if(match) amount = parseInt(match.join(''));
                    }
                    
                    csvContent += `"${date}","Student Collection","${studentName}","${nic}","${course}","${amount}","Approved"\n`;
                });
            }
            
            if (commissionData) {
                commissionData.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const instructorName = item.instructors?.name || 'N/A';
                    const amount = item.amount || '0';
                    
                    const typeLabel = adminRole === 'instructor' ? 'Platform Fee' : 'Platform Profit';
                    const refLabel = adminRole === 'instructor' ? 'Paid to Platform' : 'Instructor-to-Owner Comm.';
                    
                    csvContent += `"${date}","${typeLabel}","${instructorName}","N/A","${refLabel}","${amount}","Received"\n`;
                });
            }

            if (tuteData) {
                tuteData.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const studentName = item.profiles?.full_name || 'N/A';
                    const nic = item.profiles?.nic || 'N/A';
                    const tute = item.tutes?.title || 'Tute Purchase';
                    const amount = item.tutes?.price || '0';
                    csvContent += `"${date}","Tute Collection","${studentName}","${nic}","${tute}","${amount}","Approved"\n`;
                });
            }

            // Mobile Friendly Download logic
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            // Detect if running in mobile webview/app
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            
            if (isMobile) {
                // If on mobile, opening the blob URL in a new window is safer for some webviews
                window.open(url, '_blank');
            } else {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Nexus_Income_Report_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (e) {
            console.error("Export Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const maxAmount = Math.max(...monthlyData.map(d => d.amount));

    if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center' }}><Activity className="typing-spin" size={48} color="var(--color-primary)" /><h2 style={{marginTop: '1rem'}}>Loading Analytics...</h2></div>;

    return (
        <div style={{ padding: '1rem', animation: 'slideIn 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '12px', background: 'var(--color-primary-light)', borderRadius: '12px' }}>
                        <PieChart size={32} color="var(--color-primary)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontWeight: 900, fontSize: '2rem' }}>Finance & Analytics</h1>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Overview of your system performance</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px' }}>
                    {[
                        { label: '30 Days', val: 1 },
                        { label: '3 Months', val: 3 },
                        { label: '6 Months', val: 6 },
                        { label: '1 Year', val: 12 },
                    ].map(r => (
                        <button 
                            key={r.val}
                            onClick={() => setTimeRange(r.val)}
                            style={{ 
                                padding: '0.5rem 1rem', 
                                border: 'none', 
                                borderRadius: '8px', 
                                fontSize: '0.75rem', 
                                fontWeight: 800,
                                background: timeRange === r.val ? 'white' : 'transparent',
                                color: timeRange === r.val ? 'var(--color-primary)' : '#64748b',
                                boxShadow: timeRange === r.val ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={downloadCSV}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(14, 165, 233, 0.2)' }}
                >
                    <Download size={20} />
                    Download Excel Report
                </button>
            </div>

            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card hover-glow" style={{ borderLeft: '6px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Student Collections</span>
                         <div style={{ padding: '8px', background: '#dcfce7', borderRadius: '8px', color: '#10b981' }}><TrendingUp size={18} /></div>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: '#064e3b' }}>Rs. {stats.totalRevenue.toLocaleString()}</h2>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Directly to instructors</p>
                </div>

                <div className="card hover-glow" style={{ borderLeft: '6px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{adminRole === 'instructor' ? 'Platform Fee' : 'Platform Earnings'}</span>
                         <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '8px', color: '#ef4444' }}><DollarSign size={18} /></div>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: '#991b1b' }}>Rs. {stats.totalCommissions.toLocaleString()}</h2>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{adminRole === 'instructor' ? 'Paid to platform' : 'Commission from instructors'}</p>
                </div>

                <div className="card hover-glow" style={{ borderLeft: '6px solid #0ea5e9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Net Profit</span>
                         <div style={{ padding: '8px', background: '#e0f2fe', borderRadius: '8px', color: '#0ea5e9' }}><DollarSign size={18} /></div>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: '#0369a1' }}>Rs. {stats.netProfit.toLocaleString()}</h2>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#0369a1', fontWeight: 800 }}>{adminRole === 'instructor' ? 'Final Instructor Balance' : 'Final Platform Balance'}</p>
                </div>

                <div className="card hover-glow" style={{ borderLeft: '6px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Pending Items</span>
                         <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px', color: '#f59e0b' }}><Clock size={18} /></div>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900 }}>{stats.pendingApprovals}</h2>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#b45309' }}>Waitings approvals</p>
                </div>
            </div>

            {/* Income Chart */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>Income vs Expenses (Last 6 Months)</h3>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4%', height: '280px', padding: '0 1rem', borderBottom: '1px solid #f1f5f9', overflowX: 'auto', position: 'relative' }}>
                    {monthlyData.map((data, index) => {
                        const maxVal = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense, 1000))); // Min 1000 for better scale
                        const incomeH = (data.income / maxVal) * 100;
                        const expenseH = (data.expense / maxVal) * 100;
                        return (
                            <div key={index} style={{ flex: 1, minWidth: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', width: '100%', height: '100%', justifyContent: 'center' }}>
                                    {/* Income Bar */}
                                    <div style={{ width: '24px', height: `${incomeH}%`, background: 'linear-gradient(to top, #10b981, #34d399)', borderRadius: '6px 6px 0 0', position: 'relative', transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                        {data.income > 0 && <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', fontWeight: 900, color: '#064e3b', whiteSpace: 'nowrap' }}>{data.income > 1000 ? (data.income/1000).toFixed(1)+'k' : data.income}</div>}
                                    </div>
                                    {/* Expense Bar */}
                                    <div style={{ width: '24px', height: `${expenseH}%`, background: 'linear-gradient(to top, #ef4444, #f87171)', borderRadius: '6px 6px 0 0', position: 'relative', transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                        {data.expense > 0 && <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', fontWeight: 900, color: '#991b1b', whiteSpace: 'nowrap' }}>{data.expense > 1000 ? (data.expense/1000).toFixed(1)+'k' : data.expense}</div>}
                                    </div>
                                </div>
                                <div style={{ marginTop: '1.25rem', fontWeight: 800, fontSize: '0.75rem', color: '#64748b' }}>{data.month}</div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', padding: '0 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}><div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></div> Student Income</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}><div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }}></div> {adminRole === 'instructor' ? 'Platform Fees' : 'Instructor Commissions'}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Popular Classes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {popularClasses.length > 0 ? popularClasses.map((c, i) => (
                            <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-surface-hover)', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 700 }}>{c.name}</span>
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{c.students} Students</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${c.progress}%`, height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                        )) : (
                            <div style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No class data available yet.</div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f1f5f9', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ width: '80px', height: '80px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                            <TrendingUp size={40} color="#10b981" />
                        </div>
                        <h3 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.5rem' }}>System Healthy</h3>
                        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>Your LMS is performing excellently. Enrollment rates are up by 15% this week.</p>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
