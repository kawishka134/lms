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

  useEffect(() => {
    fetchTutes();
  }, []);

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
          <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
              <form onSubmit={handleAddTute} className="card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '2rem' }}>{isEditing ? 'Edit Tute' : 'New Tute Setup'}</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                          <input placeholder="Grade (e.g. 2025 AL)" required value={newTute.grade} onChange={e => setNewTute({...newTute, grade: e.target.value})} className="input-field" style={{ flex: 1 }} />
                          <input placeholder="Subject (e.g. Physics)" required value={newTute.subject} onChange={e => setNewTute({...newTute, subject: e.target.value})} className="input-field" style={{ flex: 1 }} />
                      </div>

                      <input placeholder="Tute Title" required value={newTute.title} onChange={e => setNewTute({...newTute, title: e.target.value})} className="input-field" />
                      <textarea placeholder="Description" value={newTute.description} onChange={e => setNewTute({...newTute, description: e.target.value})} className="input-field" style={{ height: '80px' }} />
                      
                      <div style={{ display: 'flex', gap: '1rem' }}>
                          <button type="button" onClick={() => setNewTute({...newTute, is_free: true})} className={`btn ${newTute.is_free ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Free</button>
                          <button type="button" onClick={() => setNewTute({...newTute, is_free: false})} className={`btn ${!newTute.is_free ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Paid</button>
                      </div>

                      {!newTute.is_free && (
                          <div style={{ position: 'relative' }}>
                              <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.5 }} />
                              <input type="number" placeholder="Price (LKR)" required value={newTute.price} onChange={e => setNewTute({...newTute, price: e.target.value})} className="input-field" style={{ paddingLeft: '2.5rem' }} />
                          </div>
                      )}

                      <div style={{ border: '2px dashed var(--color-surface-border)', padding: '1rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer' }} onClick={() => document.getElementById('pdfFile').click()}>
                          <FileText size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.8rem' }}>{selectedFile ? selectedFile.name : (isEditing ? 'Change PDF (Optional)' : 'Choose Tute PDF')}</p>
                          <input id="pdfFile" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                          <button type="button" onClick={() => { setShowModal(false); setIsEditing(false); }} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                          <button type="submit" disabled={isUploading} className="btn btn-primary" style={{ flex: 2 }}>{isUploading ? 'Uploading...' : (isEditing ? 'Update Tute' : 'Save Tute')}</button>
                      </div>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
}
