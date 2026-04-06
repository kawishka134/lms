import { useState, useEffect } from 'react';
import { Calendar, Save, Trash2, CheckCircle, PlusCircle, Users, Clock, Video, Youtube } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function Schedule() {
  const [activeTab, setActiveTab] = useState('add');
  const [isPublishing, setIsPublishing] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
      topic: '',
      day: 'Monday',
      time: '',
      audienceType: 'All Students',
      zoomLink: '',
      youtubeLink: '',
      isFree: false
  });

  const [selectedGrades, setSelectedGrades] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const availableGrades = ['Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  const availableSubjects = ['O/L Commerce', 'A/L Economics', 'A/L Business Studies'];

  const fetchSchedules = async () => {
       const { data } = await supabase.from('schedules').select('*').order('created_at', { ascending: false });
       if(data) setSchedules(data);
  };

  useEffect(() => { fetchSchedules(); }, []);

  const toggleGrade = (grade) => {
      setSelectedGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
  };

  const toggleSubject = (sub) => {
      setSelectedSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);
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
              if (selectedSubjects.length === 0) {
                  combinations.push(g);
              } else {
                  selectedSubjects.forEach(s => {
                      combinations.push(`${g} ${s}`);
                  });
              }
          });
          finalAudience = combinations.join(', ');
      }

      const { error, data } = await supabase.from('schedules').insert({
          topic: formData.topic,
          day: formData.day,
          time: formData.time,
          target_audience: finalAudience,
          zoom_link: formData.zoomLink,
          is_free: formData.isFree
      }).select();

      if(!error) {
          // If admin provided a YT link right during scheduling!
          if (formData.youtubeLink && formData.youtubeLink.trim() !== '') {
              let ytVal = formData.youtubeLink.trim();
              if (!ytVal.startsWith('http')) ytVal = 'https://' + ytVal;
              let newTitle = formData.topic;
              try {
                  const res = await fetch(`https://www.youtube.com/oembed?url=${ytVal}&format=json`);
                  if (res.ok) {
                      const ytData = await res.json();
                      if (ytData.title) newTitle = ytData.title;
                  }
              } catch(err) {}

              if (formData.isFree) {
                  await supabase.from('free_classes').insert({
                      title: newTitle,
                      youtube_link: ytVal,
                      target_audience: finalAudience,
                      is_live: false
                  });
              } else {
                  await supabase.from('recordings').insert({
                      title: newTitle,
                      youtube_link: ytVal,
                      target_audience: finalAudience
                  });
              }
              // Mark as not needing prompt today
              if (data && data[0]) {
                  localStorage.setItem(`rec_saved_${data[0].id}_${new Date().toDateString()}`, 'true');
              }
          }

          showToast('Class schedule published successfully!');
          fetchSchedules();
          setFormData({topic: '', day: 'Monday', time: '', audienceType: 'All Students', zoomLink: '', youtubeLink: '', isFree: false}); 
          setSelectedGrades([]);
          setSelectedSubjects([]);
      } else {
          showToast("Error publishing: " + error.message, 'error');
      }
      setIsPublishing(false);
  };

  const handleDelete = async (id) => {
      if(window.confirm('Delete this class schedule?')) {
          await supabase.from('schedules').delete().eq('id', id);
          showToast('Schedule removed successfully.', 'warning');
          fetchSchedules();
      }
  };
  const parseZoomInvite = (text) => {
      if (!text) return;
      const zoomMatch = text.match(/https:\/\/[\w-]+\.zoom\.us\/j\/\d+\S*/);
      if (zoomMatch) setFormData(prev => ({ ...prev, zoomLink: zoomMatch[0].trim() }));
      const topicMatch = text.match(/Topic:\s*(.*)/i);
      if (topicMatch) setFormData(prev => ({ ...prev, topic: topicMatch[1].trim() }));
      const timeMatch = text.match(/Time:\s*(.*)/i);
      if (timeMatch) {
          const dateStr = timeMatch[1].trim();
          const d = new Date(dateStr.split(' ')[0] + ' ' + dateStr.split(' ')[1] + ' ' + dateStr.split(' ')[2]);
          if (!isNaN(d.getTime())) {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              setFormData(prev => ({ ...prev, day: days[d.getDay()], time: dateStr.split(' ').slice(3, 5).join(' ') }));
          }
      }
  };

  // CHECK MISSING TIMETABLE RECORDINGS FOR TODAY
  const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const todaySchedules = schedules.filter(s => s.day === todayDay);
  
  const pendingRecordings = todaySchedules.filter(s => {
      if (localStorage.getItem(`rec_saved_${s.id}_${new Date().toDateString()}`)) return false;
      const timeMatch = s.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          if (timeMatch[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
          const clsTime = new Date();
          clsTime.setHours(hours, parseInt(timeMatch[2]), 0);
          return new Date() > new Date(clsTime.getTime() + 2 * 60 * 60 * 1000);
      }
      return false; 
  });


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
             <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Class Weekly Schedule</h1>
             <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Update the permanent timetable for the various grades.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             {pendingRecordings.length > 0 && activeTab === 'add' && (
                 <div className="badge badge-error" style={{ padding: '0.6rem 1rem', animation: 'pulse 2s infinite' }}>
                    Recording Prompt: {pendingRecordings.length}
                 </div>
             )}
             <button onClick={() => setActiveTab('add')} className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}>
                <PlusCircle size={18} /> Add Block
             </button>
             <button onClick={() => setActiveTab('history')} className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}>
                <Calendar size={18} /> View Timetable
             </button>
          </div>
      </div>

      {pendingRecordings.length > 0 && activeTab === 'add' && (
          <div className="card glass shimmer" style={{ marginBottom: '2rem', border: '1px solid #ff000033', padding: '1.5rem', backgroundColor: '#fff5f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Youtube color="#ff0000" size={24} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ff0000' }}>Schedule Missing Recordings</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>The following scheduled classes finished ~2 hours ago today. Provide the YT Recording to add it perfectly to the library.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingRecordings.map(cls => (
                      <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                          <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontWeight: 800 }}>{cls.topic}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{cls.time} | {cls.is_free ? '⭐ FREE (Goes to Free Class)' : '💰 PAID (Goes to Recordings)'}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1.5 }}>
                              <input 
                                  type="text" 
                                  id={`yt-sched-${cls.id}`}
                                  className="input-field" 
                                  placeholder="Paste YouTube Recording Link..." 
                                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', marginBottom: 0 }} 
                              />
                              <textarea 
                                  id={`yt-sdesc-${cls.id}`}
                                  className="input-field"
                                  placeholder="Short Description (Optional)..."
                                  rows="1"
                                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', marginBottom: 0, resize: 'vertical' }}
                              />
                              <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={async (e) => {
                                      const inputEl = document.getElementById(`yt-sched-${cls.id}`);
                                      let val = inputEl.value.trim();
                                      if (!val) { alert("⚠️ Please paste a link first!"); return; }
                                      if (!val.startsWith('http')) val = 'https://' + val;

                                      const descEl = document.getElementById(`yt-sdesc-${cls.id}`);
                                      const descVal = descEl ? descEl.value.trim() : '';
                                      
                                      let newTitle = cls.topic;
                                      try {
                                          const res = await fetch(`https://www.youtube.com/oembed?url=${val}&format=json`);
                                          if (res.ok) {
                                              const ytData = await res.json();
                                              if (ytData.title) newTitle = ytData.title;
                                          }
                                      } catch(err) {}

                                      let error;
                                      if (cls.is_free) {
                                          const res = await supabase.from('free_classes').insert({ title: newTitle, youtube_link: val, description: descVal, is_live: false, target_audience: cls.target_audience });
                                          error = res.error;
                                      } else {
                                          const res = await supabase.from('recordings').insert({ title: newTitle, youtube_link: val, description: descVal, target_audience: cls.target_audience });
                                          error = res.error;
                                      }

                                      if (!error) {
                                          localStorage.setItem(`rec_saved_${cls.id}_${new Date().toDateString()}`, 'true');
                                          fetchSchedules(); // to re-render and remove the prompt UI
                                          showToast(`Recording "${newTitle}" saved dynamically into ${cls.is_free ? 'Free Classes' : 'Premium Recordings'}.`);
                                      } else {
                                          showToast("Database Error: " + error.message, 'error');
                                      }
                                  }}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800, alignSelf: 'flex-end' }}
                              >
                                  Save & Transfer Context
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
              <Calendar size={24} color="var(--color-primary)" /> Set New Timetable Block
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: 'rgba(225, 29, 72, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-primary)' }}>
                  <label className="input-label" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Smart Schedule Fill (Paste Zoom Invite Text)</label>
                  <textarea 
                    className="input-field" 
                    placeholder="Paste the whole invitation here to auto-fill Topic, Day, Time and Link..." 
                    rows="2" 
                    onChange={e => parseZoomInvite(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
              </div>
              <div>
                  <label className="input-label">Topic / Subject Title</label>
                  <input type="text" className="input-field" placeholder="E.g. AL Economics Theory Class" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} required style={{ marginBottom: 0 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                      <label className="input-label">Day of the Week</label>
                      <select className="input-field" value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} style={{ marginBottom: 0 }}>
                          {availableDays.map(d => <option key={d}>{d}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="input-label">Time Slot</label>
                      <input type="text" className="input-field" placeholder="E.g. 02:00 PM - 04:00 PM" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required style={{ marginBottom: 0 }} />
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                  <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Video size={16} /> Auto-Live Zoom Link (Optional)</label>
                      <input type="url" className="input-field" placeholder="https://zoom.us/j/..." value={formData.zoomLink} onChange={e => setFormData({...formData, zoomLink: e.target.value})} style={{ marginBottom: 0 }} />
                  </div>
                  <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Youtube color="red" size={16} /> Recorded YT Link (Optional)</label>
                      <input type="url" className="input-field" placeholder="https://youtube.com/watch?..." value={formData.youtubeLink} onChange={e => setFormData({...formData, youtubeLink: e.target.value})} style={{ marginBottom: 0 }} />
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>If provided, skips recording prompt today</p>
                  </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', color: formData.isFree ? 'var(--color-success)' : 'inherit' }}>
                      <input type="checkbox" checked={formData.isFree} onChange={e => setFormData({...formData, isFree: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                      Mark as Free Class 
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>(If ticked &gt; goes to Library, else &gt; Recordings)</span>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Users size={18} color="var(--color-info)" /> Schedule Availability
                  </label>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="radio" name="audience" checked={formData.audienceType === 'All Students'} onChange={() => setFormData({...formData, audienceType: 'All Students'})} />
                          All Students
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="radio" name="audience" checked={formData.audienceType === 'Specific'} onChange={() => setFormData({...formData, audienceType: 'Specific'})} />
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
                      <Save size={18} /> {isPublishing ? 'Saving...' : 'Add to Schedule'}
                  </button>
              </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
           <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-hover)' }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Registered Timetable Blocks</h2>
           </div>

           {schedules.length === 0 ? (
               <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                   <Calendar size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                   <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No classes scheduled yet.</p>
               </div>
           ) : (
               <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {schedules.map(block => (
                       <div key={block.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)' }}>
                           <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                               <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '1rem', borderRadius: 'var(--radius-md)', minWidth: '100px', textAlign: 'center' }}>
                                   <div style={{ fontWeight: 900, color: 'var(--color-primary)' }}>{block.day}</div>
                               </div>
                               <div>
                                   <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                       <span style={{ fontWeight: 900, fontSize: '1.125rem' }}>{block.topic}</span>
                                       <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>{block.target_audience}</span>
                                   </div>
                                   <div style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> Time Slot: {block.time}</div>
                                        {block.zoom_link && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}><Video size={16} /> Auto-Live: Enabled</div>}
                                        {block.is_free && <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 800 }}>⭐ OPEN FOR ALL (FREE)</div>}
                                   </div>
                               </div>
                           </div>
                           <button onClick={() => handleDelete(block.id)} className="btn btn-outline" style={{ color: 'var(--color-danger)' }}>
                               <Trash2 size={18} /> Remove
                           </button>
                       </div>
                   ))}
               </div>
           )}
        </div>
      )}

    </div>
  );
}
