import { useState, useEffect } from 'react';
import { Video, Clock, Save, Link as LinkIcon, Youtube, Search, CheckCircle, PlusCircle, Trash2, ArrowUpRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function ManageLive() {
  const [activeTab, setActiveTab] = useState('add'); 
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const { showToast } = useToast();
  const adminRole = localStorage.getItem('admin_role');
  const isSuperAdmin = adminRole === 'super_admin';
  const currentInstructorId = localStorage.getItem('instructor_id');

  // Transition Modal States
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetSession, setTargetSession] = useState(null);
  const [moveYtLink, setMoveYtLink] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  const [formData, setFormData] = useState({
      title: '',
      classType: 'Full Batch (All Students)',
      date: '',
      time: '',
      zoomLink: '',
      youtubeLink: '',
      status: 'LiveNow'
  });

  const fetchSessions = async () => {
       let query = supabase.from('live_sessions').select('*').order('created_at', { ascending: false });
       
       if (!isSuperAdmin && currentInstructorId) {
           query = query.eq('instructor_id', currentInstructorId);
       }
       
       const { data } = await query;
       if(data) setActiveSessions(data);
  };

  useEffect(() => { 
      fetchSessions(); 

      // Real-time Subscription
      const subscription = supabase
          .channel('live-changes')
          .on('postgres_changes', { event: '*', table: 'live_sessions' }, () => {
              fetchSessions();
          })
          .subscribe();

      return () => {
          supabase.removeChannel(subscription);
      };
  }, []);

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsPublishing(true);
      const dataToSave = {
          title: formData.title,
          class_type: formData.classType,
          status: formData.status,
          date: formData.date || new Date().toISOString().split('T')[0],
          time: formData.time || '00:00',
          zoom_link: formData.zoomLink,
          youtube_link: formData.youtubeLink,
          instructor_id: currentInstructorId
      };

      if (isEditing) {
          const { error } = await supabase.from('live_sessions').update(dataToSave).eq('id', editingId);
          if (!error) {
              showToast('Live session link broadcast updated!');
              setIsEditing(false);
              setEditingId(null);
          } else { showToast("Error updating: " + error.message, 'error'); }
      } else {
          const { error } = await supabase.from('live_sessions').insert(dataToSave);
          if (!error) showToast('Live session link broadcasted!');
          else { showToast("Error publishing: " + error.message, 'error'); }
      }

      fetchSessions();
      setFormData({...formData, title: '', zoomLink: '', youtubeLink: ''});
      setTimeout(() => { setActiveTab('history'); }, 1000);
      setIsPublishing(false);
  };

  const openEdit = (session) => {
      setFormData({
          title: session.title,
          classType: session.class_type,
          date: session.date,
          time: session.time,
          zoomLink: session.zoom_link,
          youtubeLink: session.youtube_link || '',
          status: session.status
      });
      setEditingId(session.id);
      setIsEditing(true);
      setActiveTab('add');
  };
  const handleMoveToRecording = async (e) => {
      e.preventDefault();
      if(!moveYtLink) return alert("Please provide the YouTube Recording Link!");
      setIsMoving(true);
      try {
          // 1. Insert into Recordings
          const { error: insError } = await supabase.from('recordings').insert({
              title: targetSession.title,
              youtube_link: moveYtLink,
              target_audience: targetSession.class_type === 'Free Class (All Grades)' ? 'All Students' : targetSession.class_type,
              description: `Recorded session from ${targetSession.date}`
          });
          if(insError) throw insError;

          // 2. If it was a FREE class, also optionally insert into free_classes table
          if(targetSession.class_type === 'Free Class (All Grades)') {
              await supabase.from('free_classes').insert({
                  title: targetSession.title,
                  youtube_link: moveYtLink,
                  target_audience: 'All Students'
              });
          }

          // 3. Delete from Live
          await supabase.from('live_sessions').delete().eq('id', targetSession.id);
          
          showToast("Session successfully moved to Recordings!");
          setShowMoveModal(false);
          setMoveYtLink('');
          fetchSessions();
      } catch(err) {
          showToast("Error moving: " + err.message, 'error');
      } finally { setIsMoving(false); }
  };

  const handleDelete = async (id) => {
      if(window.confirm('Delete this active live session?')) {
          await supabase.from('live_sessions').delete().eq('id', id);
          fetchSessions();
      }
  };

  const autoCleanUp = async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await supabase.from('live_sessions').delete().lt('created_at', yesterday.toISOString());
      fetchSessions();
      showToast("Cleaned up old links!", 'warning');
  };
  const parseZoomInvite = (text) => {
      if (!text) return;
      // Extract Zoom Link
      const zoomMatch = text.match(/https:\/\/[\w-]+\.zoom\.us\/j\/\d+\S*/);
      if (zoomMatch) setFormData(prev => ({ ...prev, zoomLink: zoomMatch[0].trim() }));

      // Extract Topic
      const topicMatch = text.match(/Topic:\s*(.*)/i);
      if (topicMatch) setFormData(prev => ({ ...prev, title: topicMatch[1].trim() }));
  };


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
             <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Manage Live Classes</h1>
             <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Broadcast Zoom links directly to students dashboard.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button onClick={() => setActiveTab('add')} className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}><PlusCircle size={18} /> New Session</button>
             <button onClick={() => setActiveTab('history')} className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}><Clock size={18} /> View Active</button>
          </div>
      </div>

      {activeTab === 'add' ? (
        <div className="card" style={{ maxWidth: '800px', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '1rem' }}>
              <Video size={24} color="var(--color-primary)" /> {isEditing ? 'Update Broadcast Stream' : 'Configure Stream Link'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Smart Paste (Paste Zoom Invite Text Here)</label>
                  <textarea 
                    className="input-field" 
                    placeholder="Topic: My Class... Time: ... Join Zoom Meeting: https://..." 
                    rows="2" 
                    onChange={e => parseZoomInvite(e.target.value)}
                    style={{ backgroundColor: 'rgba(225, 29, 72, 0.02)', border: '1px dashed var(--color-primary)' }}
                  />
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label className="input-label">Session Title</label><input type="text" className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required /></div>
              <div><label className="input-label">Target Audience</label><select className="input-field" value={formData.classType} onChange={e => setFormData({...formData, classType: e.target.value})}><option>Full Batch (All Students)</option><option>2025 A/L - Physics</option><option>2026 A/L - Physics</option><option>2027 A/L - Physics</option><option>Grade 10/11 - Science</option></select></div>
              <div><label className="input-label">Visibility Status</label><select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="LiveNow">LIVE NOW</option><option value="Scheduled">Scheduled Later</option></select></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="input-label">Zoom Meeting URL</label><input type="url" className="input-field" placeholder="https://zoom.us/..." value={formData.zoomLink} onChange={e => setFormData({...formData, zoomLink: e.target.value})} required /></div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="submit" disabled={isPublishing} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>{isPublishing ? 'Updating Stream...' : (isEditing ? 'Update Broadcast' : 'Broadcast LIVE NOW')}</button>
                  {isEditing && <button type="button" onClick={() => { setIsEditing(false); setEditingId(null); setActiveTab('history'); }} className="btn btn-outline" style={{ border: 'none' }}>Cancel Edit</button>}
              </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
           <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-hover)' }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Active DB Streams</h2>
               <button onClick={autoCleanUp} className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}><Trash2 size={16} /> Clean Old</button>
           </div>
           {activeSessions.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center' }}><Video size={48} style={{ opacity: 0.1, margin: '0 auto 1rem' }} /><p>No active streams.</p></div> : (
               <div style={{ padding: '1rem' }}>
                    {activeSessions.map(session => (
                        <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    {session.status === 'LiveNow' && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>LIVE</span>}
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{session.title}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
                                    <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'var(--color-surface-hover)' }}>{session.class_type}</span>
                                    <span style={{ opacity: 0.6 }}>Added: {new Date(session.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => openEdit(session)} className="btn btn-outline" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontSize: '0.85rem' }}>
                                    Edit
                                </button>
                                <button onClick={() => { setTargetSession(session); setShowMoveModal(true); }} className="btn btn-outline" style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)', fontSize: '0.85rem' }}>
                                    <ArrowUpRight size={16} /> Archive
                                </button>
                                <button onClick={() => handleDelete(session.id)} className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', fontSize: '0.85rem' }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
               </div>
           )}
        </div>
      )}

      {/* Move to Recordings Modal */}
      {showMoveModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
              <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontWeight: 900 }}>Archive to Recordings</h2>
                      <X size={24} onClick={() => setShowMoveModal(false)} style={{ cursor: 'pointer', opacity: 0.5 }} />
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>This will remove the session from <strong>Live Today</strong> and add it to the <strong>Recordings</strong> section for students.</p>
                  <form onSubmit={handleMoveToRecording} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div>
                          <label className="input-label">YouTube Recording URL</label>
                          <input type="url" className="input-field" placeholder="https://youtube.com/watch?v=..." value={moveYtLink} onChange={e => setMoveYtLink(e.target.value)} required />
                      </div>
                      <button type="submit" disabled={isMoving} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>{isMoving ? 'Moving...' : 'Move to Recordings Now'}</button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}
