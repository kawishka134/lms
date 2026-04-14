import { useState, useEffect } from 'react';
import { PlayCircle, Save, Trash2, CheckCircle, PlusCircle, Users, Video, Youtube } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function ManageFreeClass() {
  const [activeTab, setActiveTab] = useState('add');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [freeClasses, setFreeClasses] = useState([]);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
      title: '',
      description: '',
      zoomLink: '',
      youtubeLink: '',
      date: '',
      time: '',
      isLive: false,
      expiresAt: null,
      audienceType: 'All Students'
  });

  const [selectedGrades, setSelectedGrades] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const availableGrades = ['Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  const availableSubjects = ['O/L Commerce', 'A/L Economics', 'A/L Business Studies'];

  const fetchFreeClasses = async () => {
       const { data } = await supabase.from('free_classes').select('*').order('created_at', { ascending: false });
       if(data) setFreeClasses(data);
  };

  useEffect(() => { fetchFreeClasses(); }, []);

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

      const dataToSave = {
          title: formData.title,
          description: formData.description,
          zoom_link: formData.zoomLink,
          youtube_link: formData.youtubeLink,
          date: formData.date,
          time: formData.time,
          is_live: formData.isLive,
          expires_at: formData.expiresAt,
          target_audience: finalAudience
      };


      if (isEditing) {
          const { error } = await supabase.from('free_classes').update(dataToSave).eq('id', editingId);
          if (!error) {
              showToast('Free class updated successfully!');
              setIsEditing(false);
              setEditingId(null);
          } else { showToast("Error: " + error.message, 'error'); }
      } else {
          const { error } = await supabase.from('free_classes').insert(dataToSave);
          if (!error) showToast('Free class published!');
          else { showToast("Error: " + error.message, 'error'); }
      }

      fetchFreeClasses();
      setFormData({title: '', description: '', zoomLink: '', youtubeLink: '', date: '', time: '', isLive: false, expiresAt: null, audienceType: 'All Students'}); 
      setSelectedGrades([]);
      setSelectedSubjects([]);
      setTimeout(() => { setActiveTab('history'); }, 1000);
      setIsPublishing(false);
  };

  const openEdit = (cls) => {
      setFormData({
          title: cls.title,
          description: cls.description,
          zoomLink: cls.zoom_link || '',
          youtubeLink: cls.youtube_link || '',
          date: cls.date || '',
          time: cls.time || '',
          isLive: cls.is_live || false,
          expiresAt: cls.expires_at || null,
          audienceType: cls.target_audience === 'All Students' ? 'All Students' : 'Specific'
      });
      setEditingId(cls.id);
      setIsEditing(true);
      setActiveTab('add');
  };


  const handleDelete = async (id) => {
      if(window.confirm('Delete this Free Class permanently?')) {
          await supabase.from('free_classes').delete().eq('id', id);
          showToast('Free class removed.', 'warning');
          fetchFreeClasses();
      }
  };
  const parseFreeSmartPaste = async (text) => {
      if (!text) return;
      
      const words = text.split(/\s+/);
      const ytUrl = words.find(w => w.includes('youtube.com') || w.includes('youtu.be'));
      const zoomUrl = words.find(w => w.includes('zoom.us'));

      // 1. Handle YouTube (Fast - Title only)
      if (ytUrl) {
          setFormData(prev => ({ ...prev, youtubeLink: ytUrl }));
          try {
              const res = await fetch(`https://www.youtube.com/oembed?url=${ytUrl}&format=json`);
              if (res.ok) {
                  const data = await res.json();
                  if (data.title) setFormData(prev => ({ ...prev, title: data.title }));
              }
          } catch(e) {}
      }

      // 2. Handle Zoom (Full Invite Parser)
      if (zoomUrl) {
          setFormData(prev => ({ ...prev, zoomLink: zoomUrl }));
          
          // Extract Topic
          const topicMatch = text.match(/Topic:\s*(.*)/i);
          if (topicMatch?.[1]) setFormData(prev => ({ ...prev, title: topicMatch[1].trim() }));

          // Extract Date
          const dateMatch = text.match(/Time:\s*(.*),/i);
          if (dateMatch?.[1]) setFormData(prev => ({ ...prev, date: dateMatch[1].trim() }));

          // Extract Time
          const timePart = text.match(/Time:.*,\s*(.*)\s* Colombo/i);
          if (timePart?.[1]) setFormData(prev => ({ ...prev, time: timePart[1].trim() }));

          // NEW: Auto-calculate Expiry (2 hours from class start)
          const fullTimeMatch = text.match(/Time:\s*(.*)\s* Colombo/i);
          if (fullTimeMatch?.[1]) {
              const parsedDate = new Date(fullTimeMatch[1]);
              if (!isNaN(parsedDate.getTime())) {
                  const expiry = new Date(parsedDate.getTime() + (2 * 60 * 60 * 1000));
                  setFormData(prev => ({ ...prev, expiresAt: expiry.toISOString() }));
              }
          }
      }
  };



  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
             <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Manage Free Classes</h1>
             <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Add free revision classes, Zoom links, or YouTube videos.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             {freeClasses.filter(c => c.is_live && !c.youtube_link).length > 0 && (
                 <div className="badge badge-error" style={{ padding: '0.6rem 1rem', animation: 'pulse 2s infinite' }}>
                    Recording Required: {freeClasses.filter(c => c.is_live && !c.youtube_link).length}
                 </div>
             )}
             <button onClick={() => setActiveTab('add')} className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}>
                <PlusCircle size={18} /> New Free Class
             </button>
             <button onClick={() => setActiveTab('history')} className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}>
                <PlayCircle size={18} /> View Library & Recordings
             </button>
          </div>
      </div>

      {/* PENDING RECORDINGS ALERT SECTION */}
      {activeTab === 'add' && freeClasses.filter(c => c.is_live && !c.youtube_link).length > 0 && (
          <div className="card glass shimmer" style={{ marginBottom: '2rem', border: '1px solid #ff000033', padding: '1.5rem', backgroundColor: '#fff5f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Youtube color="#ff0000" size={24} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ff0000' }}>Missing Class Recordings</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>The following live sessions are finished or in progress. Please provide the YouTube recording link for students to view in the library. (Click Save Recording)</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {freeClasses.filter(c => c.is_live && !c.youtube_link).map(cls => (
                      <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                          <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontWeight: 800 }}>{cls.title}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{cls.date} @ {cls.time}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1.5 }}>
                              <input 
                                  type="text" 
                                  defaultValue=""
                                  className="input-field" 
                                  placeholder="Paste YouTube Recording Link..." 
                                  onKeyDown={async (e) => {
                                      if (e.key === 'Enter') {
                                          e.preventDefault();
                                          let val = e.currentTarget.value.trim();
                                          if (!val) { alert("⚠️ Please paste a link first!"); return; }
                                          if (!val.startsWith('http')) val = 'https://' + val;
                                          
                                          const descEl = document.getElementById(`yt-desc-${cls.id}`);
                                          const descVal = descEl ? descEl.value.trim() : '';

                                          let newTitle = cls.title;
                                          try {
                                              const res = await fetch(`https://www.youtube.com/oembed?url=${val}&format=json`);
                                              if (res.ok) {
                                                  const ytData = await res.json();
                                                  if (ytData.title) newTitle = ytData.title;
                                              }
                                          } catch(err) {}

                                          const { error } = await supabase.from('free_classes').update({ youtube_link: val, title: newTitle, description: descVal, is_live: false }).eq('id', cls.id);
                                          if (!error) { fetchFreeClasses(); showToast(`Recording "${newTitle}" Saved!`); }
                                          else showToast("Error saving recording: " + error.message, 'error');
                                      }
                                  }}
                                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', marginBottom: 0 }} 
                              />
                              <textarea 
                                  id={`yt-desc-${cls.id}`}
                                  className="input-field"
                                  placeholder="Short Description (Optional)..."
                                  rows="2"
                                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', marginBottom: 0, resize: 'vertical' }}
                              />
                              <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={async (e) => {
                                      const inputEl = e.currentTarget.previousElementSibling.previousElementSibling;
                                      let inputVal = inputEl.value.trim();
                                      if (!inputVal) { alert("⚠️ Please paste a link first!"); return; }
                                      if (!inputVal.startsWith('http')) inputVal = 'https://' + inputVal;
                                      
                                      const descEl = document.getElementById(`yt-desc-${cls.id}`);
                                      const descVal = descEl ? descEl.value.trim() : '';
                                      
                                      let newTitle = cls.title;
                                      try {
                                          const res = await fetch(`https://www.youtube.com/oembed?url=${inputVal}&format=json`);
                                          if (res.ok) {
                                              const ytData = await res.json();
                                              if (ytData.title) newTitle = ytData.title;
                                          }
                                      } catch(err) {}

                                      const { error, data } = await supabase.from('free_classes').update({ youtube_link: inputVal, title: newTitle, description: descVal, is_live: false }).eq('id', cls.id).select();
                                      
                                      if (!error) {
                                          inputEl.value = '';
                                          if (descEl) descEl.value = '';
                                          fetchFreeClasses();
                                          if (data && data.length === 0) {
                                              showToast("Database Error: No matching class found!", 'error');
                                          } else {
                                              showToast(`Recording "${newTitle}" successfully saved!`);
                                          }
                                      } else {
                                          showToast("Database Error: " + error.message, 'error');
                                      }
                                  }}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800, alignSelf: 'flex-end' }}
                              >
                                  Save Recording
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'add' ? (
        <div className="card" style={{ maxWidth: '900px', margin: '0', padding: '2.5rem' }}>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '1rem' }}>
              <PlayCircle size={24} color="var(--color-primary)" /> {isEditing ? 'Edit Existing Content' : 'Upload Free Content'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: 'rgba(225, 29, 72, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-primary)' }}>
                  <label className="input-label" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Elite Smart Fill (Link or Zoom Invite)</label>
                  <textarea 
                    className="input-field" 
                    placeholder="Paste YouTube Link or Full Zoom Invite here..." 
                    rows="2" 
                    onChange={e => parseFreeSmartPaste(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '0.4rem', fontWeight: 600 }}>Auto-detects: YouTube Title, Zoom Link, Topic, Date & Time.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                  <div>
                      <label className="input-label">Date (Optional)</label>
                      <input type="text" className="input-field" placeholder="E.g. March 15 or 2024-03-15" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ marginBottom: 0 }} />
                  </div>
                  <div>
                      <label className="input-label">Start Time (Optional)</label>
                      <input type="text" className="input-field" placeholder="E.g. 8:30 PM" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} style={{ marginBottom: 0 }} />
                  </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--color-primary-light)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)' }}>
                  <input 
                      type="checkbox" 
                      id="isLive" 
                      checked={formData.isLive} 
                      onChange={e => setFormData({...formData, isLive: e.target.checked})} 
                      style={{ width: '20px', height: '20px' }}
                  />
                  <label htmlFor="isLive" style={{ fontWeight: 800, color: 'var(--color-primary)', cursor: 'pointer' }}>Mark as "LIVE EVENT" (Featured Banner for students)</label>
              </div>

              <div>
                  <label className="input-label">Title / Topic</label>
                  <input type="text" className="input-field" placeholder="E.g. Free Economics Revision - March 15th" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ marginBottom: 0 }} />
              </div>

              <div>
                  <label className="input-label">Description (Optional)</label>
                  <textarea className="input-field" placeholder="Write a short note regarding this class..." rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ marginBottom: 0, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Video size={16} color="var(--color-primary)" /> Zoom Link</label>
                      <input type="url" className="input-field" placeholder="https://zoom.us/j/..." value={formData.zoomLink} onChange={e => setFormData({...formData, zoomLink: e.target.value})} style={{ marginBottom: 0 }} />
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>If it's an upcoming live session, place the Zoom URL.</p>
                  </div>
                  <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Youtube size={16} color="red" /> YouTube Link</label>
                      <input type="url" className="input-field" placeholder="https://youtube.com/watch?v=..." value={formData.youtubeLink} onChange={e => setFormData({...formData, youtubeLink: e.target.value})} style={{ marginBottom: 0 }} />
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Students will see the video player inside their portal!</p>
                  </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Users size={18} color="var(--color-info)" /> Target Audience 
                  </label>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="radio" name="fc_audience" checked={formData.audienceType === 'All Students'} onChange={() => setFormData({...formData, audienceType: 'All Students'})} />
                          All Students
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="radio" name="fc_audience" checked={formData.audienceType === 'Specific'} onChange={() => setFormData({...formData, audienceType: 'Specific'})} />
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
                      <Save size={18} /> {isPublishing ? 'Saving Changes...' : (isEditing ? 'Update Content' : 'Publish Content')}
                  </button>
                  {isEditing && <button type="button" onClick={() => { setIsEditing(false); setEditingId(null); setActiveTab('history'); }} className="btn btn-outline" style={{ border: 'none' }}>Cancel Edit</button>}
              </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
           <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-hover)' }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Published Free Classes</h2>
           </div>

           {freeClasses.length === 0 ? (
               <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                   <PlayCircle size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                   <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No free classes available.</p>
               </div>
           ) : (
               <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {freeClasses.map(block => (
                        <div key={block.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>{block.title}</span>
                                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{block.target_audience}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                     {block.zoom_link && <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-info)'}}><Video size={14}/> Zoom Link</span>}
                                     {block.youtube_link && <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ff0000'}}><Youtube size={14}/> Broadcast Link</span>}
                                     <span style={{ opacity: 0.6 }}>Updated: {new Date(block.created_at).toLocaleDateString()}</span>
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
