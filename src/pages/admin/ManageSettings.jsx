import { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle, Smartphone, Mail, Globe, Facebook, Youtube, UserCheck, Link as LinkIcon, Info, Image as ImageIcon, Upload, Video, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Upload helper ─────────────────────────────────────────────────────────────
async function uploadToStorage(file, folder) {
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
        .from('site-media')
        .upload(fileName, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('site-media').getPublicUrl(data.path);
    return publicUrl;
}

// ── Upload Card ───────────────────────────────────────────────────────────────
function UploadCard({ label, hint, accept, folder, currentUrl, onUploaded, preview = 'image' }) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState('');
    const inputRef = useRef();

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setProgress('Uploading...');
        try {
            const url = await uploadToStorage(file, folder);
            onUploaded(url);
            setProgress('✅ Uploaded!');
            setTimeout(() => setProgress(''), 3000);
        } catch (err) {
            setProgress('❌ Upload failed: ' + err.message);
        }
        setUploading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="input-label">{label}</label>

            {/* Current preview */}
            {currentUrl && preview === 'image' && (
                <div style={{ position: 'relative', width: '100%', maxWidth: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={currentUrl} alt="Current" style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    <div style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', display: 'flex', gap: '0.3rem' }}>
                        <a href={currentUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', textDecoration: 'none' }}>
                            <Eye size={12} />
                        </a>
                    </div>
                </div>
            )}
            {currentUrl && preview === 'video' && (
                <div style={{ width: '100%', maxWidth: '360px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
                    {(() => {
                        const ytMatch = currentUrl.match(/[?&]v=([^&]+)/) || currentUrl.match(/youtu\.be\/([^?]+)/) || currentUrl.match(/\/(?:live|embed|shorts)\/([^?&]+)/);
                        if (ytMatch && ytMatch[1]) {
                            return <iframe style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' }} src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&controls=1`} allowFullScreen></iframe>;
                        }
                        return <video src={currentUrl} controls style={{ width: '100%', display: 'block', maxHeight: '200px' }} />;
                    })()}
                </div>
            )}

            {/* Upload zone */}
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                style={{
                    border: '2px dashed #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: uploading ? 'wait' : 'pointer',
                    background: uploading ? '#f0fdf4' : '#f8fafc',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = '#e11d48'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
                <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} />
                {uploading ? (
                    <div style={{ color: '#10b981', fontWeight: 700 }}>⏳ {progress}</div>
                ) : (
                    <>
                        <Upload size={24} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                            Click to upload {preview === 'video' ? 'Video (MP4)' : 'Image'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>{hint}</div>
                    </>
                )}
            </div>

            {/* Or paste URL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>OR PASTE URL</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>
            <input
                type="text"
                className="input-field"
                value={currentUrl || ''}
                onChange={e => onUploaded(e.target.value)}
                placeholder={preview === 'video' ? 'https://... or /videos/intro.mp4' : 'https://...'}
                style={{ marginBottom: 0 }}
            />
            {progress && !uploading && (
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: progress.startsWith('✅') ? '#10b981' : '#ef4444' }}>{progress}</div>
            )}
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
export default function ManageSettings() {
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [formData, setFormData] = useState({
        about_text: '',
        contact_phone1: '',
        contact_phone2: '',
        contact_email: '',
        facebook_url: '',
        youtube_url: '',
        instagram_url: '',
        whatsapp_group_url: '',
        teacher_name: 'Manjula Prabhath',
        hero_image_url: '',
        teacher_photo_url: '',
        intro_video_url: '',
        motto: 'Nothing is impossible'
    });

    const fetchSettings = async () => {
        const { data } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
        if (data) {
            setFormData({
                about_text: data.about_text || '',
                contact_phone1: data.contact_phone1 || '',
                contact_phone2: data.contact_phone2 || '',
                contact_email: data.contact_email || '',
                facebook_url: data.facebook_url || '',
                youtube_url: data.youtube_url || '',
                instagram_url: data.instagram_url || '',
                whatsapp_group_url: data.whatsapp_group_url || '',
                teacher_name: data.teacher_name || 'Manjula Prabhath',
                hero_image_url: data.hero_image_url || '',
                teacher_photo_url: data.teacher_photo_url || '',
                intro_video_url: data.intro_video_url || '',
                motto: data.motto || 'Nothing is impossible'
            });
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

    const ensureHttps = (url) => {
        if (!url || url.trim() === '') return '';
        const trimmed = url.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) return trimmed;
        return 'https://' + trimmed;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const cleanData = {
            ...formData,
            facebook_url: ensureHttps(formData.facebook_url),
            youtube_url: ensureHttps(formData.youtube_url),
            instagram_url: ensureHttps(formData.instagram_url),
            whatsapp_group_url: ensureHttps(formData.whatsapp_group_url),
            hero_image_url: formData.hero_image_url.trim(),
            teacher_photo_url: formData.teacher_photo_url.trim(),
            intro_video_url: formData.intro_video_url.trim(),
        };
        const { error } = await supabase.from('site_settings').upsert({ id: 'global', ...cleanData, updated_at: new Date().toISOString() });

        if (!error) {
            setFormData(cleanData);
            setSuccessMsg('✅ Website information updated successfully! Changes are now live.');
            setTimeout(() => setSuccessMsg(''), 5000);
        } else {
            alert('Error saving: ' + error.message);
        }
        setIsSaving(false);
    };

    const SectionHeader = ({ icon: Icon, title, desc }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f1f5f9' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(225,29,72,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color="var(--color-primary)" />
            </div>
            <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0 }}>{title}</h2>
                {desc && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>{desc}</p>}
            </div>
        </div>
    );

    return (
        <div style={{ padding: '0.5rem', maxWidth: '960px' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Website Settings</h1>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Manage social links, contact info, media uploads, and branding.</p>
            </div>

            {successMsg && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}>
                    <CheckCircle size={20} /> {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* ── TEACHER INFO ──────────────────────────────────────── */}
                <div className="card" style={{ padding: '1.75rem' }}>
                    <SectionHeader icon={UserCheck} title="Teacher / Institute Info" desc="Public bio shown on the homepage" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="input-label">Teacher Display Name</label>
                            <input type="text" className="input-field" value={formData.teacher_name} onChange={e => set('teacher_name', e.target.value)} placeholder="Manjula Prabhath" />
                        </div>
                        <div>
                            <label className="input-label">Site Motto / Inspirational Quote</label>
                            <input type="text" className="input-field" value={formData.motto} onChange={e => set('motto', e.target.value)} placeholder="Nothing is impossible" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="input-label">About the Teacher / Institute</label>
                            <textarea className="input-field" rows="4" value={formData.about_text} onChange={e => set('about_text', e.target.value)} placeholder="Write a short description..." />
                        </div>
                    </div>
                </div>

                {/* ── SOCIAL LINKS ──────────────────────────────────────── */}
                <div className="card" style={{ padding: '1.75rem' }}>
                    <SectionHeader icon={Globe} title="Social Media Links" desc="These open when visitors click the buttons on the homepage" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {[
                            { key: 'facebook_url', icon: '📘', label: 'Facebook Page URL', placeholder: 'https://facebook.com/yourpage' },
                            { key: 'youtube_url', icon: '▶️', label: 'YouTube Channel URL', placeholder: 'https://youtube.com/@channel' },
                            { key: 'whatsapp_group_url', icon: '💬', label: 'WhatsApp Group Link', placeholder: 'https://chat.whatsapp.com/...' },
                            { key: 'instagram_url', icon: '📸', label: 'Instagram URL (optional)', placeholder: 'https://instagram.com/...' },
                        ].map(({ key, icon, label, placeholder }) => (
                            <div key={key}>
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>{icon} {label}</span>
                                    {formData[key] && (
                                        <a href={ensureHttps(formData[key])} target="_blank" rel="noreferrer"
                                            style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 800, background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '100px', textDecoration: 'none' }}>
                                            🔗 Test
                                        </a>
                                    )}
                                </label>
                                <input type="text" className="input-field" value={formData[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} />
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Info size={12} /> https:// will be added automatically if missing. Click "🔗 Test" to check each link.
                    </p>
                </div>

                {/* ── CONTACT INFO ──────────────────────────────────────── */}
                <div className="card" style={{ padding: '1.75rem' }}>
                    <SectionHeader icon={Smartphone} title="Contact Information" desc="Shown on the Contact page" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="input-label">📱 Phone Line 1</label>
                            <input type="text" className="input-field" value={formData.contact_phone1} onChange={e => set('contact_phone1', e.target.value)} placeholder="077 xxx xxxx" />
                        </div>
                        <div>
                            <label className="input-label">📱 Phone Line 2</label>
                            <input type="text" className="input-field" value={formData.contact_phone2} onChange={e => set('contact_phone2', e.target.value)} placeholder="071 xxx xxxx" />
                        </div>
                        <div>
                            <label className="input-label">✉️ Official Email</label>
                            <input type="email" className="input-field" value={formData.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="info@example.com" />
                        </div>
                    </div>
                </div>

                {/* ── MEDIA UPLOADS ────────────────────────────────────── */}
                <div className="card" style={{ padding: '1.75rem' }}>
                    <SectionHeader icon={ImageIcon} title="Media Uploads" desc="Upload photos and videos directly — no external URL needed!" />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>

                        {/* Hero Background */}
                        <UploadCard
                            label="🌄 Hero Background Image"
                            hint="Recommended: Landscape / classroom photo. Max 500MB."
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            folder="hero"
                            preview="image"
                            currentUrl={formData.hero_image_url}
                            onUploaded={url => set('hero_image_url', url)}
                        />

                        {/* Teacher Photo */}
                        <UploadCard
                            label="👨‍🎓 Teacher Portrait Photo"
                            hint="Recommended: Professional portrait. Max 500MB."
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            folder="teacher"
                            preview="image"
                            currentUrl={formData.teacher_photo_url}
                            onUploaded={url => set('teacher_photo_url', url)}
                        />
                    </div>
                </div>

                {/* ── VIDEO UPLOAD ──────────────────────────────────────── */}
                <div className="card" style={{ padding: '1.75rem', border: '2px solid rgba(225,29,72,0.1)', background: 'linear-gradient(135deg, #fff 0%, #fff5f7 100%)' }}>
                    <SectionHeader icon={Video} title="Intro Video" desc="Upload a video directly OR paste a YouTube embed URL — video will show on the homepage" />

                    <UploadCard
                        label="🎬 Intro / Promo Video (MP4)"
                        hint="Upload an MP4 video directly. Max 500MB. Visitors will watch this on the homepage."
                        accept="video/mp4,video/webm"
                        folder="videos"
                        preview="video"
                        currentUrl={formData.intro_video_url}
                        onUploaded={url => set('intro_video_url', url)}
                    />

                    <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd', fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>
                        💡 <strong>Tip:</strong> Upload MP4 ekakata awlak naa — direct play karanawa. YouTube embed URL ekak paste karuwa ganan iframe ekakata convert karanawa.
                    </div>
                </div>

                {/* ── SAVE ─────────────────────────────────────────────── */}
                <div style={{ position: 'sticky', bottom: '1.5rem', zIndex: 10 }}>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn btn-primary"
                        style={{ width: '100%', height: '56px', fontSize: '1.1rem', fontWeight: 800, boxShadow: '0 8px 30px rgba(225,29,72,0.3)', borderRadius: '16px' }}
                    >
                        <Save size={22} /> {isSaving ? '⏳ Saving Changes...' : 'Save All Settings'}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <Info size={12} /> Changes reflect instantly for all public users after saving.
                    </p>
                </div>
            </form>
        </div>
    );
}
