import { useState, useEffect } from 'react';
import { Megaphone, Save, Trash2, Search, CheckCircle, PlusCircle, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function Announcements() {
  const [activeTab, setActiveTab] = useState('add');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
      title: '',
      message: '',
      audienceType: 'All Students'
  });

  const [selectedGrades, setSelectedGrades] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [availGrades, setAvailGrades] = useState([]);
  const [availSubjects, setAvailSubjects] = useState([]);

  const fetchAnnouncements = async () => {
       const adminRole = localStorage.getItem('admin_role');
       const instructorId = localStorage.getItem('instructor_id');

       // 1. Fetch Notice History
       let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
       if (adminRole === 'instructor') {
           query = query.eq('instructor_id', instructorId);
       }
       const { data } = await query;
       if(data) setAnnouncements(data);

        // 2. Fetch Dynamic Options (Grades & Subjects) for this user
        let courseQuery = supabase.from('courses').select('year, subject');
        if (adminRole === 'instructor') {
            courseQuery = courseQuery.eq('instructor_id', instructorId);
        }
        
        const { data: courses } = await courseQuery;
        if (courses && courses.length > 0) {
            const uniqueGrades = [...new Set(courses.map(c => c.year ? `Grade ${c.year}` : null).filter(Boolean))].sort();
            const uniqueSubjects = [...new Set(courses.map(c => c.subject).filter(Boolean))].sort();
            setAvailGrades(uniqueGrades);
            setAvailSubjects(uniqueSubjects);
        } else {
            // Fallback defaults if no courses exist yet
            setAvailGrades(['Grade 10', 'Grade 11', 'Grade 12', 'Grade 13']);
            setAvailSubjects(['O/L Commerce', 'A/L Economics', 'A/L Business Studies']);
        }
   };

  useEffect(() => { 
      fetchAnnouncements(); 

      // Real-time Subscription
      const subscription = supabase
          .channel('announcements-changes')
          .on('postgres_changes', { event: '*', table: 'announcements' }, () => {
              fetchAnnouncements();
          })
          .subscribe();

      return () => {
          supabase.removeChannel(subscription);
      };
  }, []);

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
              if (selectedSubjects.length === 0) combinations.push(g);
              else selectedSubjects.forEach(s => combinations.push(`${g} ${s}`));
          });
          finalAudience = combinations.join(', ');
      }

      const instructorId = localStorage.getItem('instructor_id');
      const adminRole = localStorage.getItem('admin_role');

      const dataToSave = {
          title: formData.title,
          message: formData.message,
          target_audience: finalAudience,
          instructor_id: adminRole === 'super_admin' ? null : instructorId
      };

      if (isEditing) {
          const { error } = await supabase.from('announcements').update(dataToSave).eq('id', editingId);
          if (!error) {
              showToast('Announcement updated successfully!');
              setIsEditing(false);
              setEditingId(null);
          } else { showToast("Error updating: " + error.message, 'error'); }
      } else {
          const { error } = await supabase.from('announcements').insert(dataToSave);
          if (!error) showToast('Broadcasted cleanly to selected desks!');
          else { showToast("Error publishing: " + error.message, 'error'); }
      }

      fetchAnnouncements();
      setFormData({title: '', message: '', audienceType: 'All Students'}); 
      setSelectedGrades([]);
      setSelectedSubjects([]);
      setTimeout(() => { setActiveTab('history'); }, 1000);
      setIsPublishing(false);
  };

  const openEdit = (notice) => {
      setFormData({
          title: notice.title,
          message: notice.message,
          audienceType: notice.target_audience === 'All Students' ? 'All Students' : 'Specific'
      });
      setEditingId(notice.id);
      setIsEditing(true);
      setActiveTab('add');
  };

  const handleDelete = async (id) => {
      if(window.confirm('Delete this announcement? It will disappear from their dashboards instantly.')) {
          await supabase.from('announcements').delete().eq('id', id);
          fetchAnnouncements();
      }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
             <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Manage Announcements</h1>
             <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Push critical notices directly to specific Grades/Classes.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button onClick={() => setActiveTab('add')} className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}>
                <PlusCircle size={18} /> New Notice
             </button>
             <button onClick={() => setActiveTab('history')} className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}>
                <Megaphone size={18} /> View Active
             </button>
          </div>
      </div>

      {activeTab === 'add' ? (
        <div className="card" style={{ maxWidth: '900px', margin: '0', padding: '2.5rem' }}>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '1rem' }}>
              <Megaphone size={24} color="var(--color-primary)" /> {isEditing ? 'Edit Existing Notice' : 'Broadcast New Notice'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                  <label className="input-label">Announcement Title</label>
                  <input type="text" className="input-field" placeholder="E.g. Holiday on March 25th" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ marginBottom: 0 }} />
              </div>

              <div>
                  <label className="input-label">Detailed Message</label>
                  <textarea className="input-field" placeholder="Type the full announcement message here..." rows="4" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} required style={{ marginBottom: 0, resize: 'vertical' }} />
              </div>

              <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-surface-border)' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Users size={18} color="var(--color-info)" /> Target Audience 
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
                                  {availGrades.map(g => (
                                      <button key={g} type="button" onClick={() => toggleGrade(g)} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid var(--color-surface-border)', backgroundColor: selectedGrades.includes(g) ? 'var(--color-primary)' : 'white', color: selectedGrades.includes(g) ? 'white' : 'var(--color-text)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                          {g}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div>
                              <label className="input-label" style={{ marginBottom: '1rem' }}>Select Subjects (Optional)</label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {availSubjects.map(s => (
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
                  <button type="button" className="btn btn-outline" onClick={() => setActiveTab('history')}>Cancel</button>
                  <button type="submit" disabled={isPublishing} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontWeight: 700 }}>
                      <Save size={18} /> {isPublishing ? 'Broadcasting...' : (isEditing ? 'Update Broadcast' : 'Publish Announcement')}
                  </button>
                  {isEditing && <button type="button" onClick={() => { setIsEditing(false); setEditingId(null); setActiveTab('history'); }} className="btn btn-outline" style={{ border: 'none' }}>Cancel Edit</button>}
              </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
           <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-hover)' }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Active Notices in Database</h2>
           </div>

           {announcements.length === 0 ? (
               <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                   <Megaphone size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                   <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No announcements pushed yet.</p>
               </div>
           ) : (
               <div style={{ padding: '1rem' }}>
                   {announcements.map(notice => (
                       <div key={notice.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--color-surface-border)' }}>
                           <div style={{ flex: 1, paddingRight: '2rem' }}>
                               <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                   <span style={{ fontWeight: 900, fontSize: '1.125rem' }}>{notice.title}</span>
                                   <span className="badge badge-success" style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                                       {notice.target_audience}
                                   </span>
                               </div>
                               <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', whiteSpace: 'pre-line' }}>
                                    {notice.message}
                               </p>
                               <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '0.75rem', opacity: 0.7 }}>
                                    Pushed on: {new Date(notice.created_at).toLocaleString()}
                               </div>
                           </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => openEdit(notice)} className="btn btn-outline" style={{ color: 'var(--color-primary)' }}>
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(notice.id)} className="btn btn-outline" style={{ color: 'var(--color-danger)' }}>
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
