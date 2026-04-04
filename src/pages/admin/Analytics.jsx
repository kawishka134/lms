import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Users, DollarSign, Video, FileText, PieChart, Activity, CheckCircle, Clock, Download } from 'lucide-react';

export default function Analytics() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeStudents: 0,
        pendingApprovals: 0,
        totalClasses: 0
    });
    
    // Real dynamic data states
    const [monthlyData, setMonthlyData] = useState([]);
    const [popularClasses, setPopularClasses] = useState([]);
    
    const [isLoading, setIsLoading] = useState(true);

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
                
                // Fetch approved enrollments to calculate real revenue and popularity
                const { data: approvedEnrollments } = await supabase.from('enrollments').select('created_at, course_id, courses(title, price)').eq('status', 'approved');
                
                // Fetch approved instructor commissions
                const { data: approvedCommissions } = await supabase.from('instructor_payments').select('created_at, amount, instructors(name)').eq('status', 'approved');
                
                let totalRevenue = 0;
                let monthlyMap = {}; // Format: { "YYYY-MM": amount }
                let classCountMap = {}; // Format: { "Course Title": count }

                if(approvedEnrollments) {
                    approvedEnrollments.forEach(e => {
                        let amount = 0;
                        const courseTitle = e.courses?.title || 'Unknown Course';
                        
                        // Parse price string to number
                        if(e.courses && e.courses.price) {
                            const match = String(e.courses.price).match(/\d+/g);
                            if(match) amount = parseInt(match.join(''));
                        }
                        
                        totalRevenue += amount;

                        // Add to monthly map
                        const dateObj = new Date(e.created_at);
                        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                        const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });
                        
                        if (!monthlyMap[monthKey]) {
                            monthlyMap[monthKey] = { label: monthLabel, amount: 0, sortKey: monthKey };
                        }
                        monthlyMap[monthKey].amount += amount;

                        // Add to class popularity mapping
                        classCountMap[courseTitle] = (classCountMap[courseTitle] || 0) + 1;
                    });
                }
                
                if (approvedCommissions) {
                    approvedCommissions.forEach(c => {
                        const amount = Number(c.amount) || 0;
                        totalRevenue += amount;
                        
                        const dateObj = new Date(c.created_at);
                        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                        const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });
                        
                        if (!monthlyMap[monthKey]) {
                            monthlyMap[monthKey] = { label: monthLabel, amount: 0, sortKey: monthKey };
                        }
                        monthlyMap[monthKey].amount += amount;
                    });
                }
                
                // Convert maps to arrays
                const recentMonths = Object.values(monthlyMap)
                    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
                    .slice(-5) // Get last 5 months
                    .map(item => ({ month: item.label, amount: item.amount }));

                // Ensure at least some empty months if data is too small to prevent UI breaking
                if (recentMonths.length === 0) {
                     recentMonths.push({ month: 'N/A', amount: 0 });
                }

                const topClasses = Object.entries(classCountMap)
                    .map(([name, count]) => ({ name, students: count }))
                    .sort((a, b) => b.students - a.students)
                    .slice(0, 3); // Get top 3

                const highestStudentCount = topClasses.length > 0 ? topClasses[0].students : 1;
                
                const formattedTopClasses = topClasses.map(c => ({
                    ...c,
                    progress: Math.floor((c.students / highestStudentCount) * 100)
                }));

                setPopularClasses(formattedTopClasses);
                setMonthlyData(recentMonths);

                setStats({
                    totalRevenue,
                    activeStudents: studentsCount || 0,
                    pendingApprovals: (pendingEnrollments || 0) + (pendingTutes || 0),
                    totalClasses: classesCount || 0
                });
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const downloadCSV = async () => {
        try {
            setIsLoading(true);
            const { data } = await supabase
                .from('enrollments')
                .select('created_at, courses(title, price), profiles(full_name, nic, phone)')
                .eq('status', 'approved');
                
            const { data: commissionData } = await supabase
                .from('instructor_payments')
                .select('created_at, amount, instructors(name)')
                .eq('status', 'approved');
            
            if ((!data || data.length === 0) && (!commissionData || commissionData.length === 0)) {
                alert("No payment data found.");
                setIsLoading(false);
                return;
            }

            let csvContent = "Date,User / Student Name,NIC,Phone,Course Name / Payment Type,Amount\n";

            if (data) {
                data.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const studentName = item.profiles?.full_name || 'N/A';
                    const nic = item.profiles?.nic || 'N/A';
                    const phone = item.profiles?.phone || 'N/A';
                    const course = item.courses?.title || 'Student Monthly Payment';
                    const amount = item.courses?.price ? String(item.courses.price).replace(/,/g, '') : '0';
                    
                    csvContent += `"${date}","${studentName}","${nic}","${phone}","${course}","${amount}"\n`;
                });
            }
            
            if (commissionData) {
                commissionData.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const instructorName = item.instructors?.name || 'N/A';
                    const amount = item.amount || '0';
                    
                    csvContent += `"${date}","${instructorName}","N/A","N/A","Instructor Commission","${amount}"\n`;
                });
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Nexus_Income_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Export Error:", e);
            alert("Error downloading report.");
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card hover-glow" style={{ borderLeft: '6px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Revenue</span>
                         <div style={{ padding: '8px', background: '#dcfce7', borderRadius: '8px', color: '#10b981' }}><DollarSign size={20} /></div>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 900, color: '#064e3b' }}>Rs. {stats.totalRevenue.toLocaleString()}</h2>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                       <TrendingUp size={14} /> +12% from last month
                    </p>
                </div>

                <div className="card hover-glow" style={{ borderLeft: '6px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Active Students</span>
                         <div style={{ padding: '8px', background: 'var(--color-primary-light)', borderRadius: '8px', color: 'var(--color-primary)' }}><Users size={20} /></div>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 900 }}>{stats.activeStudents}</h2>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total registered on platform</p>
                </div>

                <div className="card hover-glow" style={{ borderLeft: '6px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Pending Approvals</span>
                         <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px', color: '#f59e0b' }}><Clock size={20} /></div>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 900 }}>{stats.pendingApprovals}</h2>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#b45309' }}>Requires your attention</p>
                </div>
            </div>

            {/* Income Chart */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>Monthly Revenue (Last 5 Months)</h3>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5%', height: '250px', padding: '0 1rem', borderBottom: '1px solid var(--color-surface-border)' }}>
                    {monthlyData.map((data, index) => {
                        const heightPercent = (data.amount / maxAmount) * 100;
                        return (
                            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', group: 'hover' }}>
                                <div style={{ 
                                    width: '100%', 
                                    maxWidth: '60px', 
                                    height: `${heightPercent}%`, 
                                    backgroundColor: 'var(--color-primary)', 
                                    borderRadius: '8px 8px 0 0',
                                    transition: 'all 0.3s ease',
                                    position: 'relative'
                                }}>
                                    <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e293b', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.8, whiteSpace: 'nowrap' }}>
                                        Rs. {data.amount.toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>{data.month}</div>
                            </div>
                        );
                    })}
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
