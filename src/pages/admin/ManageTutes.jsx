import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Lock, Globe, DollarSign, UserCheck, Search, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function ManageTutes() {
  const [tutes, setTutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [newTute, setNewTute] = useState({ title: '', description: '', is_free: true, price: 0, grade: '2025 AL', subject: 'Physics' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Gifting States
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [giftSearch, setGiftSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGiftTute, setSelectedGiftTute] = useState(null);
  const { showToast } = useToast();

  const [availGrades, setAvailGrades] = useState([]);
  const [availSubjects, setAvailSubjects] = useState([]);

  useEffect(() => {
    fetchTutes();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const { data: courses } = await supabase.from('courses').select('year, subject');
    if (courses && courses.length > 0) {
        const uniqueGrades = [...new Set(courses.map(c => c.year ? (String(c.year).includes('Grade') ? c.year : `Grade ${c.year}`) : null).filter(Boolean))].sort();
        const uniqueSubjects = [...new Set(courses.map(c => c.subject).filter(Boolean))].sort();
        setAvailGrades(uniqueGrades);
        setAvailSubjects(uniqueSubjects);
        
        // Auto-set the first ones if empty
        if (!newTute.grade && uniqueGrades.length > 0) setNewTute(prev => ({...prev, grade: uniqueGrades[0]}));
        if (!newTute.subject && uniqueSubjects.length > 0) setNewTute(prev => ({...prev, subject: uniqueSubjects[0]}));
    } else {
        setAvailGrades(['2025 AL', '2026 AL', 'Grade 11', 'Grade 10']);
        setAvailSubjects(['Physics', 'ICT', 'Economics', 'Maths']);
    }
  };

  const fetchTutes = async () => {
    setLoading(true);
    const { data } = await supabase.from('tutes').select('*').order('created_at', { ascending: false });
    if (data) setTutes(data);
    
    // Fetch students for gifting
    const { data: stds } = await supabase.from('profiles').select('id, full_name, phone').eq('role', 'student');
    if(stds) setStudents(stds);

    setLoading(false);
  };

  const handleAddTute = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
        let fileUrl = newTute.file_url;
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `tute-${Date.now()}.${fileExt}`;
            await supabase.storage.from('tutes').upload(fileName, selectedFile);
            const { data } = supabase.storage.from('tutes').getPublicUrl(fileName);
            fileUrl = data.publicUrl;
        }

        if (isEditing) {
            await supabase.from('tutes').update({ ...newTute, file_url: fileUrl }).eq('id', editingId);
            showToast('Tute updated successfully!');
        } else {
            await supabase.from('tutes').insert({ ...newTute, file_url: fileUrl });
            showToast('New Tute published successfully!');
        }

        setShowModal(false);
        setIsEditing(false);
        setNewTute({ title: '', description: '', is_free: true, price: 0, grade: '2025 AL', subject: 'Physics' });
        setSelectedFile(null);
        fetchTutes();
    } catch (err) { showToast(err.message, 'error'); } finally { setIsUploading(false); }
  };

  const openEdit = (tute) => {
      setNewTute({ ...tute });
      setEditingId(tute.id);
      setIsEditing(true);
      setShowModal(true);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this Tute?")) return;
    await supabase.from('tutes').delete().eq('id', id);
    showToast('Tute deleted successfully.', 'warning');
    fetchTutes();
  };

  const handleGiftAccess = async () => {
      if(!selectedStudent || !selectedGiftTute) return;
      try {
          const { error } = await supabase.from('tute_enrollments').insert([{
              student_id: selectedStudent.id,
              tute_id: selectedGiftTute.id,
              status: 'approved',
              payment_method: 'gifted'
          }]);
          if(error) throw error;
          showToast(`Access to "${selectedGiftTute.title}" gifted to ${selectedStudent.full_name}!`, 'success');
          setShowGiftModal(false);
          setSelectedStudent(null);
      } catch (err) {
          showToast("Gifting failed: " + err.message, 'error');
      }
  };

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
           <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Manage Class Tutes (PDF)</h1>
           <p style={{ margin: 0, opacity: 0.6 }}>Upload free or premium study materials.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} /> Add New Tute
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '5rem' }}>Loading Tutes...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {tutes.map(tute => (
                <div key={tute.id} className="card" style={{ borderLeft: tute.is_free ? '6px solid var(--color-success)' : '6px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{tute.grade}</span>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{tute.subject}</span>
                            <span className={`badge ${tute.is_free ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.65rem' }}>{tute.is_free ? 'FREE' : `Rs. ${tute.price}`}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => openEdit(tute)} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={18} /></button>
                            <button onClick={() => handleDelete(tute.id)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                        </div>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem' }}>{tute.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', overflow: 'hidden' }}>{tute.description}</p>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '1rem' }}>Added: {new Date(tute.created_at).toLocaleDateString()}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: 'var(--color-bg)', padding: '0.75rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.7 }}>
                            <FileText size={14} /> PDF Material
                        </div>
                        {!tute.is_free && (
                            <button 
                                onClick={() => { setSelectedGiftTute(tute); setShowGiftModal(true); }}
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                                title="Gift Access to Student"
                            >
                                <Gift size={18} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* GIFTING MODAL */}
      {showGiftModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)' }}>
              <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--color-primary)' }}>
                            <Gift size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Gift Access to Student</h2>
                        <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Unlocking: {selectedGiftTute?.title}</p>
                    </div>

                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.3 }} />
                        <input 
                            placeholder="Search Student Name or Phone..." 
                            value={giftSearch} 
                            onChange={e => setGiftSearch(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-surface-border)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                        {students.filter(s => s.full_name.toLowerCase().includes(giftSearch.toLowerCase()) || s.phone.includes(giftSearch)).map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => setSelectedStudent(s)}
                                style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-surface-border)', cursor: 'pointer', backgroundColor: selectedStudent?.id === s.id ? 'var(--color-primary-light)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{s.full_name} <span style={{ opacity: 0.5, fontWeight: 500 }}>({s.phone})</span></div>
                                {selectedStudent?.id === s.id && <UserCheck size={18} color="var(--color-primary)" />}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => { setShowGiftModal(false); setSelectedStudent(null); }} className="btn btn-outline" style={{ flex: 1 }}>Close</button>
                        <button onClick={handleGiftAccess} disabled={!selectedStudent} className="btn btn-primary" style={{ flex: 2 }}>Confirm Gift Access</button>
                    </div>
              </div>
          </div>
      )}

      {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', padding: '1rem' }}>
              <form 
                onSubmit={handleAddTute} 
                className="card" 
                style={{ 
                    width: '100%', 
                    maxWidth: '550px', 
                    padding: '2.5rem', 
                    maxHeight: '90vh', 
                    overflowY: 'auto',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
              >
                  <div style={{ position: 'sticky', top: '-2.5rem', background: 'white', zIndex: 10, margin: '-2.5rem -2.5rem 2rem', padding: '2rem 2.5rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{isEditing ? 'Edit Tute' : 'New Tute Setup'}</h2>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '5px', display: 'block' }}>TARGET GRADE</label>
                              <select 
                                required 
                                value={newTute.grade} 
                                onChange={e => setNewTute({...newTute, grade: e.target.value})} 
                                className="input-field"
                              >
                                  {availGrades.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                          </div>
                          <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '5px', display: 'block' }}>SUBJECT</label>
                              <select 
                                required 
                                value={newTute.subject} 
                                onChange={e => setNewTute({...newTute, subject: e.target.value})} 
                                className="input-field"
                              >
                                  {availSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>

                      <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '5px', display: 'block' }}>TUTE TITLE</label>
                          <input placeholder="e.g. Mechanics - Part 1" required value={newTute.title} onChange={e => setNewTute({...newTute, title: e.target.value})} className="input-field" />
                      </div>

                      <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '5px', display: 'block' }}>DESCRIPTION</label>
                          <textarea placeholder="Tell students what this tute covers..." value={newTute.description} onChange={e => setNewTute({...newTute, description: e.target.value})} className="input-field" style={{ height: '100px' }} />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1rem' }}>
                          <button type="button" onClick={() => setNewTute({...newTute, is_free: true})} className={`btn ${newTute.is_free ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Free Material</button>
                          <button type="button" onClick={() => setNewTute({...newTute, is_free: false})} className={`btn ${!newTute.is_free ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Paid Material</button>
                      </div>

                      {!newTute.is_free && (
                          <div style={{ position: 'relative' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '5px', display: 'block' }}>PRICE (LKR)</label>
                              <div style={{ position: 'relative' }}>
                                  <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.5 }} />
                                  <input type="number" placeholder="Price (LKR)" required value={newTute.price} onChange={e => setNewTute({...newTute, price: e.target.value})} className="input-field" style={{ paddingLeft: '2.5rem' }} />
                              </div>
                          </div>
                      )}

                      <div style={{ border: '2px dashed var(--color-surface-border)', padding: '2rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc' }} onClick={() => document.getElementById('pdfFile').click()}>
                          <FileText size={40} style={{ marginBottom: '1rem', opacity: 0.2, color: 'var(--color-primary)' }} />
                          <p style={{ margin: 0, fontWeight: 900, color: 'var(--color-primary)' }}>{selectedFile ? selectedFile.name : (isEditing ? 'Change PDF (Keep empty to stay)' : 'Choose Tute PDF')}</p>
                          <p style={{ margin: '5px 0 0', fontSize: '0.7rem', opacity: 0.5 }}>Only PDF files are supported</p>
                          <input id="pdfFile" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', position: 'sticky', bottom: '-2.5rem', background: 'white', margin: '0 -2.5rem -2.5rem', padding: '1.5rem 2.5rem 2.5rem', borderTop: '1px solid #f1f5f9' }}>
                          <button type="button" onClick={() => { setShowModal(false); setIsEditing(false); }} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                          <button type="submit" disabled={isUploading} className="btn btn-primary" style={{ flex: 2, height: '54px', fontSize: '1rem', fontWeight: 900 }}>{isUploading ? 'Uploading Please wait...' : (isEditing ? 'Update Tute Content' : 'Publish Tute PDF')}</button>
                      </div>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
}
