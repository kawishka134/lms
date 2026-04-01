import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserCheck, Info } from 'lucide-react';

export default function About() {
  const [settings, setSettings] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
        if (data) setSettings(data);
        
        const { data: instData, error } = await supabase.from('instructors').select('*').eq('is_active', true).order('display_order');
        if (!error && instData) {
           setInstructors(instData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="container" style={{ marginTop: '4rem', marginBottom: '6rem', maxWidth: '800px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '1rem' }}>About Us</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>Meet our expert panel and learn about our mission.</p>
      </div>

      <div className="card glass" style={{ padding: '3rem', borderRadius: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ width: '150px', height: '150px', backgroundColor: 'var(--color-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', border: '4px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
                        {loading ? (
                            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <>
                                <img 
                                    src={settings?.teacher_photo_url} 
                                    alt="Teacher Content" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    onError={(e) => { 
                                        e.target.style.display = 'none'; 
                                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'block'; 
                                    }}
                                />
                                <UserCheck size={64} style={{ display: 'none' }} />
                            </>
                        )}
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                        {loading ? (
                            <div className="skeleton" style={{ width: '200px', height: '2.5rem', margin: '0 auto 0.5rem' }} />
                        ) : (
                            <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>{settings?.teacher_name || 'Manjula Prabhath'}</h2>
                        )}
                        <span className="badge badge-primary" style={{ fontSize: '1rem', padding: '0.4rem 1.25rem' }}>Institute Founder & Director</span>
                    </div>

                    <div style={{ lineHeight: '1.8', fontSize: '1.15rem', color: 'var(--color-text)', textAlign: 'center', whiteSpace: 'pre-line' }}>
                        {settings?.about_text || 'Welcome to Nexus Online. We are dedicated to providing the best higher education.'}
                    </div>

            {instructors.length > 0 && (
                 <div style={{ width: '100%', marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid var(--color-surface-border)' }}>
                     <h2 style={{ fontSize: '2rem', fontWeight: 900, textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>Our Expert Panel</h2>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%' }}>
                         {instructors.map(inst => (
                             <div key={inst.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'var(--color-surface)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--color-surface-border)' }}>
                                 <div style={{ width: '120px', height: '120px', backgroundColor: 'var(--color-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', border: '4px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '1rem' }}>
                                     {inst.photo_url ? (
                                         <img src={inst.photo_url} alt={inst.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                     ) : <UserCheck size={40} />}
                                 </div>
                                 <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>{inst.name}</h3>
                                 <p style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>{inst.designation} {inst.subject && <span style={{ color: 'var(--color-text-muted)' }}>| {inst.subject}</span>}</p>
                                 <p style={{ color: 'var(--color-text)', fontSize: '0.95rem', lineHeight: 1.6 }}>{inst.description}</p>
                             </div>
                         ))}
                     </div>
                 </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {settings?.facebook_url && <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="btn btn-outline">FB Profile</a>}
                {settings?.youtube_url && <a href={settings.youtube_url} target="_blank" rel="noreferrer" className="btn btn-primary">Our YouTube</a>}
            </div>
        </div>
      </div>
      
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
             <Info size={16} /> Content managed by Nexus Admin System.
          </p>
      </div>
    </div>
  );
}
