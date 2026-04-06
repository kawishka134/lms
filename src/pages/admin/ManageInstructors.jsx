import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, X, Users, Upload, Clock, AlertTriangle, CheckCircle, Lock, Eye, EyeOff, Key, UserCheck } from 'lucide-react';
import { useToast } from '../../components/Toast';

const adminAuthClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default function ManageInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [showPasswordMap, setShowPasswordMap] = useState({}); // Card visibility
  const [showModalPassword, setShowModalPassword] = useState(false); // Modal visibility
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    new_password: '', // Virtual field
    designation: 'Expert Instructor',
    subject: '',
    description: '',
    photo_url: '',
    display_order: 0,
    is_active: true,
    access_expiry_date: '',
    commission_status: 'Paid',
    phone: '',
    class_type: 'Theory',
    bank_name: '',
    bank_account_no: '',
    bank_account_name: '',
    bank_branch: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .order('display_order', { ascending: true });
      
    if (!error && data) setInstructors(data);
    setLoading(false);
  };

  const handleOpenModal = (instructor = null) => {
    if (instructor) {
      setEditingInstructor(instructor);
      setFormData({
        ...instructor,
        new_password: '',
        access_expiry_date: instructor.access_expiry_date ? instructor.access_expiry_date.split('T')[0] : ''
      });
    } else {
      setEditingInstructor(null);
      // Default expiry to 30 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);
      
      setFormData({
        name: '',
        email: '',
        new_password: '',
        designation: 'Expert Instructor',
        subject: '',
        description: '',
        photo_url: '',
        display_order: instructors.length,
        is_active: true,
        access_expiry_date: defaultExpiry.toISOString().split('T')[0],
        commission_status: 'Paid',
        phone: '',
        class_type: 'Theory',
        bank_name: '',
        bank_account_no: '',
        bank_account_name: '',
        bank_branch: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInstructor(null);
    setShowModalPassword(false);
  };

  const handleUploadImage = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `instructors/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-media')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('site-media')
        .getPublicUrl(filePath);

      setFormData({ ...formData, photo_url: data.publicUrl });
      showToast('Image uploaded successfully!');
    } catch (error) {
      showToast('Error uploading image!', 'error');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editingInstructor && !formData.new_password) {
          showToast("Please provide a password for new instructors.", 'error');
          return;
      }

      if (formData.new_password) {
        const { error: signUpError } = await adminAuthClient.auth.signUp({
          email: formData.email,
          password: formData.new_password,
        });
        if (signUpError && !signUpError.message.toLowerCase().includes('already registered')) {
            throw signUpError;
        }
      }

      const saveData = { 
          ...formData,
          // If we are setting a new password, also store it in raw_password for the admin to view
          ...(formData.new_password ? { 
              raw_password: formData.new_password,
              password_status: 'approved' // Manually set by admin, so it's approved
          } : {})
      };
      delete saveData.new_password;
      
      if (saveData.access_expiry_date) {
         saveData.access_expiry_date = new Date(saveData.access_expiry_date).toISOString();
      } else {
         saveData.access_expiry_date = null;
      }

      if (editingInstructor) {
        const { error } = await supabase
          .from('instructors')
          .update(saveData)
          .eq('id', editingInstructor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instructors')
          .insert([saveData]);
        if (error) throw error;
        showToast('New Instructor profile created!');
      }
      handleCloseModal();
      fetchInstructors();
    } catch (error) {
      showToast('Error saving instructor: ' + error.message, 'error');
      console.error(error);
    }
  };

  const handleToggleBlock = async (instructor) => {
    const action = instructor.is_blocked ? 'unblock' : 'block';
    if (window.confirm(`Are you sure you want to ${action} instructor "${instructor.name}"?`)) {
        try {
            const { error } = await supabase
                .from('instructors')
                .update({ is_blocked: !instructor.is_blocked })
                .eq('id', instructor.id);
            
            if (error) throw error;
            showToast(`Instructor "${instructor.name}" has been ${action}ed.`, 'warning');
            fetchInstructors();
        } catch (err) {
            showToast("Action failed: " + err.message, 'error');
        }
    }
  };

  const handleDelete = async (instructor) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: Are you sure you want to delete "${instructor.name}"? This will wipe them from all tables and auth so they can register as a student again if they wish.`)) return;
    try {
      // 1. Call RPC to delete from auth.users (This allows re-using their email later)
      const { error: rpcError } = await supabase.rpc('delete_user_by_admin', { target_id: instructor.id });
      
      // 2. Delete from instructors table (Cascade might handle it but let's be sure)
      const { error: dbError } = await supabase.from('instructors').delete().eq('id', instructor.id);
      
      if (dbError && rpcError) throw dbError;
      
      showToast(`Account for "${instructor.name}" has been permanently removed.`, 'warning');
      fetchInstructors();
    } catch (error) {
      showToast("Delete failed: " + error.message, 'error');
      console.error(error);
    }
  };

  const isExpired = (dateString) => {
      if (!dateString) return false;
      return new Date(dateString) < new Date();
  };

  const handleApprovePassword = async (instructor) => {
      try {
          if (!window.confirm(`Approve new password for ${instructor.name}? This will update their actual login password.`)) return;

          // We no longer call auth.admin.updateUserById on frontend
          // Because we added a SQL TRIGGER to sync raw_password to auth.users automatically!

          // Update the instructor table
          const { error } = await supabase
              .from('instructors')
              .update({
                  raw_password: instructor.new_password_requested,
                  new_password_requested: null,
                  password_status: 'approved'
              })
              .eq('id', instructor.id);

          if (error) throw error;
          showToast("New password approved correctly!");
          fetchInstructors();
      } catch (err) {
          showToast("Approval failed: " + err.message, 'error');
          console.error(err);
      }
  };

  const togglePasswordVisibility = (id) => {
      setShowPasswordMap(prev => ({
          ...prev,
          [id]: !prev[id]
      }));
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
            <Users size={28} /> Manage Experts & Commissions
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>Add, edit or remove members of your expert panel.<br/>You can strictly control their login access and monitor their commission payments (Auto-Locks if expired).</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary" style={{ shrink: 0 }}>
          <Plus size={18} /> Add Instructor
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Instructor Database...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {instructors.map(instructor => {
              const expired = isExpired(instructor.access_expiry_date);
              
              return (
              <div key={instructor.id} className="card" style={{ position: 'relative', overflow: 'hidden', border: expired ? '2px solid var(--color-danger)' : '1px solid var(--color-surface-border)' }}>
                 {expired && (
                     <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--color-danger)', color: 'white', padding: '0.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', zIndex: 10 }}>
                         <Lock size={12} /> ACCOUNT LOCKED (EXPIRED)
                     </div>
                 )}
              
                 <div style={{ width: '100%', height: '220px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', backgroundColor: '#f1f5f9', opacity: expired ? 0.6 : 1, marginTop: expired ? '1rem' : 0 }}>
                     {instructor.photo_url ? (
                       <img src={instructor.photo_url} alt={instructor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     ) : (
                       <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Image</div>
                     )}
                 </div>
                 
                 <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {instructor.name}
                 </h3>
                 <p style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{instructor.designation} {instructor.subject && `— ${instructor.subject}`}</p>
                 <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: 600 }}>Login: {instructor.email || 'No email assigned'}</p>
                 
                 <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Key size={12}/> Password</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                                {showPasswordMap[instructor.id] ? (instructor.raw_password || 'Not Set') : '••••••••'}
                            </span>
                            <button onClick={() => togglePasswordVisibility(instructor.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}>
                                {showPasswordMap[instructor.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                         </div>
                      </div>

                      {instructor.password_status === 'pending' && (
                          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.4rem', marginBottom: '0.6rem' }}>
                              <p style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700, margin: 0 }}>⚠️ RESET REQUESTED:</p>
                              <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: '2px 0' }}>{instructor.new_password_requested}</p>
                              <button onClick={() => handleApprovePassword(instructor)} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', marginTop: '4px', width: '100%' }}>APPROVE NEW PASSWORD</button>
                          </div>
                      )}

                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Commission Status</span>
                        {instructor.commission_status === 'Paid' ? (
                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12}/> Paid</span>
                        ) : (
                            <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12}/> Pending</span>
                        )}
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Access Expires</span>
                        <span style={{ fontSize: '0.8rem', color: expired ? '#ef4444' : '#334155', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12}/> {instructor.access_expiry_date ? new Date(instructor.access_expiry_date).toLocaleDateString() : 'Never'}
                        </span>
                     </div>
                 </div>
                 
                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleOpenModal(instructor)} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}>
                        <Edit2 size={14} /> Edit
                    </button>
                    <button 
                        onClick={() => handleToggleBlock(instructor)} 
                        className="btn btn-outline" 
                        style={{ padding: '0.4rem', color: instructor.is_blocked ? '#10b981' : '#f59e0b', borderColor: instructor.is_blocked ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}
                        title={instructor.is_blocked ? "Unblock" : "Block"}
                    >
                        {instructor.is_blocked ? <UserCheck size={16} /> : <AlertTriangle size={16} />}
                    </button>
                    <button onClick={() => handleDelete(instructor)} className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                        <Trash2 size={16} />
                    </button>
                 </div>
              </div>
            )})}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={22} color="var(--color-primary)"/> {editingInstructor ? 'Edit Profile & Access' : 'Create Sir Profile'}</h2>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1fr', gap: '2rem' }}>
                    
                    {/* Left Column - Main Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label className="input-label" style={{ fontWeight: 800 }}>Full Name</label>
                            <input className="input-field" type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ marginBottom: 0 }} />
                        </div>
                        
                        <div>
                            <label className="input-label" style={{ fontWeight: 800 }}>Designation</label>
                            <input className="input-field" type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} style={{ marginBottom: 0 }} placeholder="e.g. Senior Lecturer" />
                        </div>

                        <div>
                            <label className="input-label" style={{ fontWeight: 800 }}>Subject Area</label>
                            <input className="input-field" type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} style={{ marginBottom: 0 }} placeholder="e.g. Physics, Commerce" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="input-label" style={{ fontWeight: 800 }}>Phone Number</label>
                                <input className="input-field" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ marginBottom: 0 }} placeholder="071 XXX XXXX" />
                            </div>
                            <div>
                                <label className="input-label" style={{ fontWeight: 800 }}>Class Type</label>
                                <select className="input-field" value={formData.class_type} onChange={e => setFormData({...formData, class_type: e.target.value})} style={{ marginBottom: 0 }}>
                                    <option value="Theory">Theory Class</option>
                                    <option value="Revision">Revision Class</option>
                                    <option value="Paper">Paper Class</option>
                                    <option value="Practical">Practical Session</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="input-label" style={{ fontWeight: 800 }}>Public Bio</label>
                            <textarea className="input-field" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ marginBottom: 0, resize: 'vertical' }} />
                        </div>
                        
                        <div>
                            <label className="input-label" style={{ fontWeight: 800 }}>Portrait Photo (Required for Homepage)</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                 {formData.photo_url && (
                                     <img src={formData.photo_url} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                 )}
                                 <label className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', flex: 1, textAlign: 'center' }}>
                                     <Upload size={16} /> {uploading ? 'Uploading...' : 'Choose Image'}
                                     <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: 'none' }} disabled={uploading} />
                                 </label>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column - System Access & Login */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>Login Credentials</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>They will use this to sign in to their portal.</p>
                        </div>
                        
                        <div>
                            <label className="input-label">Login Email</label>
                            <input className="input-field" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ marginBottom: 0 }} placeholder="teacher@gmail.com" />
                        </div>

                        <div>
                            <label className="input-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    className="input-field" 
                                    type={showModalPassword ? "text" : "password"} 
                                    value={formData.new_password || (editingInstructor ? formData.raw_password : '')} 
                                    onChange={e => setFormData({...formData, new_password: e.target.value})} 
                                    style={{ marginBottom: 0, paddingRight: '2.5rem' }} 
                                    placeholder={editingInstructor ? "Type to change current" : "Set a secure password"} 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowModalPassword(!showModalPassword)} 
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                >
                                    {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        
                        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.5rem', marginTop: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#10b981' }}>Commission & Access</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Auto-locks when time expires if commission is pending.</p>
                        </div>
                        
                        <div>
                            <label className="input-label">Access Expiry Date</label>
                            <input className="input-field" type="date" value={formData.access_expiry_date} onChange={e => setFormData({...formData, access_expiry_date: e.target.value})} style={{ marginBottom: 0 }} />
                        </div>
                        
                        <div>
                            <label className="input-label">Commission Payment Status</label>
                            <select className="input-field" value={formData.commission_status} onChange={e => setFormData({...formData, commission_status: e.target.value})} style={{ marginBottom: 0, cursor: 'pointer' }}>
                                <option value="Paid">✅ Paid & Clear</option>
                                <option value="Pending">⚠️ Payment Pending</option>
                            </select>
                        </div>

                        {/* Bank Payment Details */}
                        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🏦 Bank Details</h3>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Auto-filled when this instructor creates a course card.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="input-label">Bank Name</label>
                                        <input className="input-field" type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} style={{ marginBottom: 0 }} placeholder="e.g. Commercial Bank" />
                                    </div>
                                    <div>
                                        <label className="input-label">Account Number</label>
                                        <input className="input-field" type="text" value={formData.bank_account_no} onChange={e => setFormData({...formData, bank_account_no: e.target.value})} style={{ marginBottom: 0 }} placeholder="e.g. 1234567890" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="input-label">Account Holder Name</label>
                                        <input className="input-field" type="text" value={formData.bank_account_name} onChange={e => setFormData({...formData, bank_account_name: e.target.value})} style={{ marginBottom: 0 }} placeholder="e.g. K.M. Prabhath" />
                                    </div>
                                    <div>
                                        <label className="input-label">Branch</label>
                                        <input className="input-field" type="text" value={formData.bank_branch} onChange={e => setFormData({...formData, bank_branch: e.target.value})} style={{ marginBottom: 0 }} placeholder="e.g. Colombo 03" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" onClick={handleCloseModal} className="btn btn-outline" style={{ width: '120px' }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={uploading} style={{ width: '200px' }}>
                        {editingInstructor ? 'Update Profile' : 'Create Sir Profile'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
