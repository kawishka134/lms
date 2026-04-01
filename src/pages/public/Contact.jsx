import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Phone, Mail, MapPin, Youtube, Facebook, Smartphone, MessageSquare } from 'lucide-react';

export default function Contact() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  return (
    <div className="container" style={{ marginTop: '4rem', marginBottom: '8rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '1rem' }}>Contact Us</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Get in touch with Manjula Prabhath Sir or our support team.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* PHYSICAL ADDRESS (STATIC PLACEHOLDER) */}
        <div className="card glass shimmer" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid var(--color-surface-border)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <MapPin size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Our Location</h2>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', fontSize: '1rem' }}>Colombo, Sri Lanka <br />(Lectures take place online globally).</p>
        </div>

        {/* PHONE & EMAIL (DYNAMIC) */}
        <div className="card glass shimmer" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid var(--color-surface-border)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Smartphone size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Direct Helpline</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
            <p style={{ margin: 0, fontWeight: 700 }}><Phone size={14} /> {settings?.contact_phone1 || '0777123456'}</p>
            {settings?.contact_phone2 && <p style={{ margin: 0, fontWeight: 700 }}><Phone size={14} /> {settings.contact_phone2}</p>}
            <p style={{ margin: 0, fontWeight: 500 }}><Mail size={14} /> {settings?.contact_email || 'nexusonline@gmail.com'}</p>
          </div>
        </div>

        {/* SOCIAL & COMMUNITY (DYNAMIC) */}
        <div className="card glass shimmer" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid var(--color-surface-border)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <MessageSquare size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Social Networks</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {settings?.facebook_url && <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.5rem' }}><Facebook size={24} /></a>}
            {settings?.youtube_url && <a href={settings.youtube_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.5rem' }}><Youtube size={24} /></a>}
            {settings?.whatsapp_group_url && <a href={settings.whatsapp_group_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', color: 'white' }}>WhatsApp Us</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
