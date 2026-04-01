import { useState, useEffect } from 'react';
import { CheckCircle, Search, CreditCard, UserCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaidStudents = async () => {
        setLoading(true);
        const adminRole = localStorage.getItem('admin_role');
        const instructorId = localStorage.getItem('instructor_id');

        const { data, error } = await supabase
            .from('enrollments')
            .select(`
                id,
                created_at,
                status,
                profiles (
                   full_name,
                   phone,
                   nic
                ),
                courses (
                   title,
                   instructor_id,
                   instructors(name)
                )
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (data && !error) {
            let filtered = data;
            if (adminRole === 'instructor' && instructorId) {
                filtered = filtered.filter(p => p.courses?.instructor_id === instructorId);
            }
            setPayments(filtered);
        } else if (error) {
            console.error(error);
        }
        setLoading(false);
    };
    
    fetchPaidStudents();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
             <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Monthly Payments Hub</h1>
             <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>View all students who have successfully paid and been approved.</p>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', fontWeight: 800, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
             <CheckCircle size={20} /> Total Paid Students: {payments.length}
          </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
         <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', width: '20px', height: '20px' }} />
            <input type="text" className="input-field" placeholder="Search by Student Name or NIC..." style={{ paddingLeft: '2.5rem', marginBottom: 0 }} />
         </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', borderRadius: 'var(--radius-xl)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-surface-border)' }}>
                      <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Student Name</th>
                      <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>NIC Number</th>
                      <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Course / Instructor</th>
                      <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Payment Date</th>
                  </tr>
              </thead>
              <tbody>
                  {loading ? (
                     <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading records from Supabase...</td></tr>
                  ) : payments.length === 0 ? (
                      <tr>
                          <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '1.125rem', fontWeight: 500 }}>
                              <CreditCard size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem', opacity: 0.5 }} />
                              <br/>
                              No approved payments found.
                          </td>
                      </tr>
                  ) : payments.map(payment => (
                      <tr key={payment.id} style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                          <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <UserCircle size={28} style={{ color: 'var(--color-primary-light)' }} />
                                  <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>{payment.profiles?.full_name || 'N/A'}</div>
                              </div>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                              {payment.profiles?.nic || 'Not Provided'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>{payment.courses?.title || 'Unknown Course'}</div>
                              {payment.courses?.instructors?.name && <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 800, marginTop: '0.2rem' }}>Prof. {payment.courses.instructors.name}</div>}
                          </td>
                          <td style={{ padding: '1rem' }}>
                              <span className="badge badge-success">PAID & APPROVED</span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                              {new Date(payment.created_at).toLocaleDateString()}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
}
