import { useState, useEffect } from 'react';
import { Video, Save, Trash2, CheckCircle, PlusCircle, Users, Youtube } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function ManageRecordings() {
  const [activeTab, setActiveTab] = useState('add');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);

  const [formData, setFormData] = useState({
      title: '',
      description: '',
      youtubeLink: '',
      audienceType: 'All Students'
  });

  const [selectedGrades, setSelectedGrades] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const availableGrades = ['Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  const availableSubjects = ['O/L Commerce', 'A/L Economics', 'A/L Business Studies'];

  const fetchRecordings = async () => {
       const { data } = await supabase.from('recordings').select('*').order('created_at', { ascending: false });
       if(data) setRecordings(data);
  };

   const fetchRequests = async () => {
       try {
           const { data, error } = await supabase
               .from('recording_access_requests')
               .select('*, profiles(full_name, phone), recordings(title)')
               .eq('status', 'pending')
               .order('requested_at', { ascending: false });
               
           if (error) {
               console.error("Access requests fetch error:", error);
               return;
           }
           if(data) setRequests(data);
       } catch (err) {
           console.error("Request fetch failed catch:", err);
       }
   };

  useEffect(() => { fetchRecordings(); fetchRequests(); }, []);

  const toggleGrade = (grade) => {
      setSelectedGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
  };

  const toggleSubject = (subject) => {
      setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsPublishing(true);
      
      let finalAudience = 'All Students';
      if (formData.audienceType === 'Specific') {
          if (selectedGrades.length === 0) {
              alert("Please select at least one Grade!");
              setIsPublishing(false);
              return;
          }
          const combinations = [];
          selectedGrades.forEach(g => {
              if (selectedSubjects.length === 0) combinations.push(g);
              else selectedSubjects.forEach(s => combinations.push(`${g} ${s}`));
          });
          finalAudience = combinations.join(', ');
      }

      const instructorId = localStorage.getItem('instructor_id');
      const dataToSave = {
          title: formData.title,
          description: formData.description,
          youtube_link: formData.youtubeLink,
          target_audience: finalAudience,
          instructor_id: instructorId
      };

      if (isEditing) {
          const { error } = await supabase.from('recordings').update(dataToSave).eq('id', editingId);
          if (!error) {
              showToast('Recording updated successfully!');
              setIsEditing(false);
              setEditingId(null);
          } else { showToast("Error updating: " + error.message, 'error'); }
      } else {
          const { error } = await supabase.from('recordings').insert(dataToSave);
          if (!error) showToast('Recording successfully pushed!');
          else { showToast("Error publishing: " + error.message, 'error'); }
      }

      fetchRecordings();
      setFormData({title: '', description: '', youtubeLink: '', audienceType: 'All Students'}); 
      setSelectedGrades([]);
      setSelectedSubjects([]);
      setTimeout(() => { setActiveTab('history'); }, 1000);
      setIsPublishing(false);
  };

  const openEdit = (rec) => {
      setFormData({
          title: rec.title,
          description: rec.description,
          youtubeLink: rec.youtube_link,
          audienceType: rec.target_audience === 'All Students' ? 'All Students' : 'Specific'
      });
      if(rec.target_audience !== 'All Students') {
          // Attempt to parse audience back to buttons if needed, but for now just show custom audience
      }
      setEditingId(rec.id);
      setIsEditing(true);
      setActiveTab('add');
  };


  const handleDelete = async (id) => {
      if(window.confirm('Delete this Recording?')) {
          await supabase.from('recordings').delete().eq('id', id);
          fetchRecordings();
      }
  };
  const parseYouTubeSmartPaste = async (text) => {
      if (!text) return;
      const words = text.split(/\s+/);
      const url = words.find(w => w.includes('youtube.com') || w.includes('youtu.be'));
      
      if (url) {
          setFormData(prev => ({ ...prev, youtubeLink: url }));
          
          try {
              const response = await fetch(`https://www.youtube.com/oembed?url=${url}&format=json`);
              if (response.ok) {
                  const data = await response.json();
                  if (data.title) setFormData(prev => ({ ...prev, title: data.title }));
              }
          } catch (err) {
              console.error("Fetch title failed:", err);
          }
      }
  };



  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
             <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Manage Class Recordings</h1>
             <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Upload past class videos exclusively via YouTube platform integration.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button onClick={() => setActiveTab('add')} className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}>
                <PlusCircle size={18} /> Add Recording
             </button>
             <button onClick={() => setActiveTab('history')} className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}>
                <Video size={18} /> Manage Videos
             </button>
             <button onClick={() => setActiveTab('requests')} className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline'}`} style={{ position: 'relative' }}>
                <Users size={18} /> Re-view Requests
                {requests.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--color-danger)', color: 'white', fontSize: '0.6rem', padding: '0.2rem 0.4rem', borderRadius: '50%', fontWeight: 900 }}>{requests.length}</span>}
             </button>
          </div>
      </div>

      {activeTab === 'add' ? (
        <div className="card" style={{ maxWidth: '900px', margin: '0', padding: '2.5rem' }}>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '1rem' }}>
              <Video size={24} color="var(--color-primary)" /> {isEditing ? 'Edit Recording Metadata' : 'Publish Past Class Video'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: 'rgba(255, 0, 0, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px dashed #ff0000' }}>
                  <label className="input-label" style={{ color: '#ff0000', fontWeight: 800 }}>Smart YouTube Link Paste</label>
                  <input 
                    type="url"
                    className="input-field" 
                    placeholder="Paste just the YouTube link here to auto-fill Title..." 
                    onChange={e => parseYouTubeSmartPaste(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#ff0000', marginTop: '0.4rem', fontWeight: 600 }}>Just paste the link - we will fetch the video title for you!</p>
              </div>
              <div>
                  <label className="input-label">Video Title</label>
                  <input type="text" className="input-field" placeholder="E.g. Accounting Month 01 - Session 04" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ marginBottom: 0 }} />
              </div>

              <div>
                  <label className="input-label">Description (Optional)</label>
                  <textarea className="input-field" placeholder="Brief context about this recording..." rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ marginBottom: 0, resize: 'vertical' }} />
              </div>

              <div>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Youtube size={16} color="red" /> YouTube URL Hub</label>
                  <input type="url" className="input-field" placeholder="https://youtube.com/watch?v=..." value={formData.youtubeLink} onChange={e => setFormData({...formData, youtubeLink: e.target.value})} required style={{ marginBottom: 0 }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Paste the full YouTube link. It will automatically convert to a smart thumbnail player in the Student's LMS.</p>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Users size={18} color="var(--color-info)" /> Security Access Level
                  </label>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="radio" name="rec_audience" checked={formData.audienceType === 'All Students'} onChange={() => setFormData({...formData, audienceType: 'All Students'})} />
                          All Students (Unrestricted)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="radio" name="rec_audience" checked={formData.audienceType === 'Specific'} onChange={() => setFormData({...formData, audienceType: 'Specific'})} />
                          Specific Selection
                      </label>
                  </div>

                  {formData.audienceType === 'Specific' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', marginTop: '1rem', borderTop: '1px solid var(--color-surface-border)', paddingTop: '1.5rem' }}>
                          <div>
                              <label className="input-label" style={{ marginBottom: '1rem' }}>Select Grades</label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {availableGrades.map(g => (
                                      <button key={g} type="button" onClick={() => toggleGrade(g)} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid var(--color-surface-border)', backgroundColor: selectedGrades.includes(g) ? 'var(--color-primary)' : 'white', color: selectedGrades.includes(g) ? 'white' : 'var(--color-text)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                          {g}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div>
                              <label className="input-label" style={{ marginBottom: '1rem' }}>Select Subjects (Optional)</label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {availableSubjects.map(s => (
                                      <button key={s} type="button" onClick={() => toggleSubject(s)} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid var(--color-surface-border)', backgroundColor: selectedSubjects.includes(s) ? 'var(--color-info)' : 'white', color: selectedSubjects.includes(s) ? 'white' : 'var(--color-text)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                          {s}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={isPublishing} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontWeight: 700 }}>
                      <Save size={18} /> {isPublishing ? 'Saving Changes...' : (isEditing ? 'Update Recording' : 'Publish Video')}
                  </button>
                  {isEditing && <button type="button" onClick={() => { setIsEditing(false); setEditingId(null); setActiveTab('history'); }} className="btn btn-outline" style={{ border: 'none' }}>Cancel Edit</button>}
              </div>
          </form>
        </div>
      ) : activeTab === 'requests' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Student Access Requests</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Students wanting to watch expired recordings (12h+ limit).</p>
            </div>

            {requests.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No pending access requests.</div>
            ) : (
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {requests.map(req => (
                        <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eee' }}>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{req.profiles?.full_name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1.5rem' }}>
                                    <span>📞 {req.profiles?.phone}</span>
                                    <span>🎬 Video: <b>{req.recordings?.title}</b></span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button 
                                        onClick={async () => {
                                            const now = new Date();
                                            const expiry = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // 5 Hours limit
                                            await supabase.from('recording_access_requests').update({ 
                                                status: 'approved', 
                                                approved_at: now.toISOString(),
                                                expires_at: expiry.toISOString()
                                            }).eq('id', req.id);
                                            showToast(`Access granted for ${req.profiles?.full_name}`);
                                            fetchRequests();
                                        }} 
                                        className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}
                                    >
                                        Approve (5H)
                                    </button>
                                <button 
                                    onClick={async () => {
                                        await supabase.from('recording_access_requests').update({ status: 'rejected' }).eq('id', req.id);
                                        showToast('Request rejected.', 'warning');
                                        fetchRequests();
                                    }} 
                                    className="btn btn-outline" style={{ color: 'var(--color-danger)' }}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
           <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-hover)' }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Library of Recordings</h2>
           </div>

           {recordings.length === 0 ? (
               <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                   <Video size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                   <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No recordings exist in the vault.</p>
               </div>
           ) : (
               <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {recordings.map(block => (
                        <div key={block.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>{block.title}</span>
                                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{block.target_audience}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', gap: '1rem' }}>
                                     <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ff0000'}}><Youtube size={14}/> YouTube Attached</span>
                                     <span style={{ opacity: 0.6 }}>Added: {new Date(block.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => openEdit(block)} className="btn btn-outline" style={{ color: 'var(--color-primary)' }}>
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(block.id)} className="btn btn-outline" style={{ color: 'var(--color-danger)' }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
               </div>
           )}
        </div>
      )}

    </div>
  );
}
