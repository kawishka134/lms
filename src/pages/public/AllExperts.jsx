import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserCheck } from 'lucide-react';

export default function AllExperts() {
  const [settings, setSettings] = useState(null);
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
      if (data) setSettings(data);
      
      const { data: instData } = await supabase.from('instructors').select('*').eq('is_active', true).order('display_order');
      if (instData) setInstructors(instData);
    };
    fetchSettings();
  }, []);

  const allEducators = [
      {
          id: 'owner',
          name: settings?.teacher_name || 'Manjula Prabhath',
          designation: 'Institute Founder & Director',
          subject: '',
          description: settings?.about_text || 'Founder of the institute.',
          photo_url: settings?.teacher_photo_url || ''
      },
      ...instructors
  ];

  return (
    <div className="container" style={{ marginTop: '4rem', marginBottom: '6rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '1rem' }}>Our Expert Educators</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>Meet the brilliant minds behind our success.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
          {allEducators.map(inst => (
              <div key={inst.id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'var(--color-surface)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--color-surface-border)' }}>
                  <div style={{ width: '120px', height: '120px', backgroundColor: 'var(--color-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', border: '4px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '1rem' }}>
                      {inst.photo_url ? (
                          <img src={inst.photo_url} alt={inst.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <UserCheck size={40} />}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>{inst.name}</h3>
                  <p style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>{inst.designation} {inst.subject && <span style={{ color: 'var(--color-text-muted)' }}>| {inst.subject}</span>}</p>
                  {(inst.class_type || inst.phone) && (
                      <div className="badge badge-primary" style={{ marginBottom: '1rem' }}>{inst.class_type || 'General'} | {inst.phone || 'N/A'}</div>
                  )}
                  <p style={{ color: 'var(--color-text)', fontSize: '0.95rem', lineHeight: 1.6 }}>{inst.description}</p>
              </div>
          ))}
      </div>
    </div>
  );
}
