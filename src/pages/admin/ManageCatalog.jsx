import { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Trash2, Edit2, CheckCircle, Save, Image as ImageIcon, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function ManageCatalog() {
    const { showToast } = useToast();
    const [courses, setCourses] = useState([]);
    const [activeTab, setActiveTab] = useState('list');
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        year: '',   // Stores Grade (6-13)
        batch: '',  // Stores Intake Year (2024, 2025 etc)
        subject: '',
        class_type: 'Theory', 
        thumbnail_url: '',
        instructor_id: ''
    });

    const adminRole = localStorage.getItem('admin_role'); 
    const isSuperAdmin = adminRole === 'super_admin';
    const currentInstructorId = localStorage.getItem('instructor_id');

    const [instructors, setInstructors] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [isOtherSubject, setIsOtherSubject] = useState(false);
    const fileInputRef = useRef(null);

    const commonSubjects = ['Accounting', 'Business Studies', 'Economics', 'O/L Commerce'];

    const fetchCoursesAndInstructors = async () => {
        const { data: cData } = await supabase.from('courses').select('*, instructors(name)').order('created_at', { ascending: false });
        if (cData) setCourses(cData);
        
        const { data: iData } = await supabase.from('instructors').select('id, name');
        if (iData) setInstructors(iData);
    };

    useEffect(() => { fetchCoursesAndInstructors(); }, []);

    const lastAutoTitle = useRef('');
    useEffect(() => {
        if (!editingId && formData.year && formData.subject && formData.class_type) {
            const batchStr = formData.batch ? `${formData.batch} ` : '';
            const suggested = `${batchStr}Grade ${formData.year} ${formData.subject} ${formData.class_type}`;
            // If title is empty or matches last auto-gen, update it
            if (!formData.title || formData.title === lastAutoTitle.current) {
                setFormData(prev => ({ ...prev, title: suggested }));
                lastAutoTitle.current = suggested;
            }
        }
    }, [formData.year, formData.batch, formData.subject, formData.class_type, editingId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const submissionData = { ...formData };
        
        // If normal instructor, force instructor_id to current user
        if (!isSuperAdmin) {
            submissionData.instructor_id = currentInstructorId;
        }

        if (editingId) {
            const { error } = await supabase.from('courses').update(submissionData).eq('id', editingId);
            if (!error) showToast('Class updated successfully!', 'success');
            else showToast(error.message, 'error');
        } else {
            const { error } = await supabase.from('courses').insert(submissionData);
            if (!error) showToast('New class added to catalog!', 'success');
            else showToast(error.message, 'error');
        }

        setTimeout(() => {
            setActiveTab('list');
            setEditingId(null);
            setFormData({ title: '', description: '', price: '', year: '', batch: '', subject: '', class_type: 'Theory', thumbnail_url: '', instructor_id: '' });
            fetchCoursesAndInstructors();
        }, 1500);
        setIsSaving(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `thumbnails/${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('site-media').upload(fileName, file, { upsert: true, contentType: file.type });
            if (error) throw error;
            const { data } = supabase.storage.from('site-media').getPublicUrl(fileName);
            setFormData({ ...formData, thumbnail_url: data.publicUrl });
        } catch (error) {
            showToast('Upload failed: ' + error.message, 'error');
        }
        setUploading(false);
    };

    const handleEdit = (course) => {
        setFormData({
            title: course.title,
            description: course.description || '',
            price: course.price || '',
            year: course.year || '',
            batch: course.batch || '',
            subject: course.subject || '',
            class_type: course.class_type || 'Theory',
            thumbnail_url: course.thumbnail_url || '',
            instructor_id: course.instructor_id || ''
        });
        setEditingId(course.id);
        setActiveTab('add');
    };

    const handleDelete = async (id) => {
        const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', id);

        const enrolledInfo = count > 0 
            ? `⚠️ WARNING: There are ${count} student(s) currently enrolled in this class.\n` 
            : `There are 0 students enrolled in this class.\n`;

        if (window.confirm(`Are you sure you want to delete this class from the catalog?\n\n${enrolledInfo}\nIf you delete this, the class and all related enrollments will be permanently removed.`)) {
            const { error } = await supabase.from('courses').delete().eq('id', id);
            if (error) {
                console.error("Delete course error:", error);
                showToast("Failed to delete course: " + error.message, 'error');
            } else {
                showToast('Course deleted successfully!', 'success');
            }
            fetchCoursesAndInstructors();
        }
    };

    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>Manage Course Catalog</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Update the courses visible to public visitors.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => { setActiveTab('list'); setEditingId(null); setFormData({title:'', description:'', price:'', year:'', batch:'', subject:'', thumbnail_url:''}); }} className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-outline'}`}>
                        <BookOpen size={18} /> View Catalog
                    </button>
                    <button onClick={() => setActiveTab('add')} className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}>
                        <Plus size={18} /> Add New Course
                    </button>
                </div>
            </div>

            {activeTab === 'list' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {courses.map(course => (
                        <div key={course.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', border: '1px solid #eee' }}>
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                {course.thumbnail_url ? <img src={course.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={32} /></div>}
                                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                                    <span className="badge badge-primary" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>{course.class_type}</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                        {course.batch ? `${course.batch} • ` : ''}Grade {course.year} • {course.subject}
                                    </span>
                                    <span style={{ fontWeight: 900, color: 'var(--color-primary)', fontSize: '1.1rem' }}>{course.price}</span>
                                </div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: '1.4' }}>{course.title}</h3>
                                {isSuperAdmin && course.instructors && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>By: {course.instructors.name}</p>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                <button onClick={() => handleEdit(course)} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}><Edit2 size={16} /> Edit</button>
                                <button onClick={() => handleDelete(course.id)} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem', color: '#ef4444', borderColor: '#fee2e2' }}><Trash2 size={16} /> Delete</button>
                            </div>
                        </div>
                    ))}
                    {courses.length === 0 && (
                        <div className="card" style={{ gridColumn: '1 / -1', padding: '5rem', textAlign: 'center', opacity: 0.5 }}>
                            <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p style={{ fontWeight: 700 }}>Catalog is empty. Add your first class offering!</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{editingId ? 'Update Class Details' : 'Add New Class to Catalog'}</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Fill in the details below to publish this class to students.</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                            <div>
                                <label className="input-label">Grade</label>
                                <select className="input-field" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} required>
                                    <option value="">-- Select --</option>
                                    {[6,7,8,9,10,11,12,13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Year / Batch</label>
                                <select className="input-field" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})}>
                                    <option value="">-- Optional --</option>
                                    {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y} Intake</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Class Category</label>
                                <select className="input-field" value={formData.class_type} onChange={e => setFormData({...formData, class_type: e.target.value})} required>
                                    <option value="Theory">Theory Class</option>
                                    <option value="Revision">Revision Class</option>
                                    <option value="Paper">Paper Class</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label className="input-label">Subject</label>
                                <select 
                                    className="input-field" 
                                    value={commonSubjects.includes(formData.subject) ? formData.subject : (formData.subject ? 'Other' : '')} 
                                    onChange={e => {
                                        if (e.target.value === 'Other') {
                                            setIsOtherSubject(true);
                                            setFormData({...formData, subject: ''});
                                        } else {
                                            setIsOtherSubject(false);
                                            setFormData({...formData, subject: e.target.value});
                                        }
                                    }}
                                    required
                                >
                                    <option value="">-- Select Subject --</option>
                                    {commonSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    <option value="Other">+ Add New Subject</option>
                                </select>
                                {isOtherSubject && (
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        style={{ marginTop: '0.5rem' }} 
                                        placeholder="Enter new subject name..." 
                                        value={formData.subject} 
                                        onChange={e => setFormData({...formData, subject: e.target.value})} 
                                        required 
                                    />
                                )}
                            </div>
                            <div>
                                <label className="input-label">Monthly Price</label>
                                <input type="text" className="input-field" placeholder="E.g. Rs. 2500 / Free" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Public Display Title</label>
                            <input type="text" className="input-field" placeholder="E.g. 2024 Theory - Economics Online" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        </div>

                        <div>
                            <label className="input-label">Short Description</label>
                            <textarea className="input-field" rows={3} placeholder="Tell students what is included in this class..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ resize: 'none' }}></textarea>
                        </div>

                        {isSuperAdmin && (
                            <div>
                                <label className="input-label">Assign Primary Instructor</label>
                                <select className="input-field" value={formData.instructor_id} onChange={e => setFormData({...formData, instructor_id: e.target.value})} required>
                                    <option value="">-- Choose Instructor --</option>
                                    {instructors.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="input-label">Thumbnail Cover Image</label>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: '#f8fafc', padding: '1.5rem', border: '2px dashed #e2e8f0', borderRadius: '16px' }}>
                                {formData.thumbnail_url && <img src={formData.thumbnail_url} style={{ width: '120px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '12px', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} alt="Preview" />}
                                <div style={{ flex: 1 }}>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-outline" style={{ width: '100%', marginBottom: '0.75rem' }} disabled={uploading}>
                                        <Upload size={18} /> {uploading ? 'Uploading Image...' : 'Upload Thumbnail'}
                                    </button>
                                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                                    <input type="url" className="input-field" style={{ backgroundColor: 'white' }} placeholder="... or paste Image URL here" value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" onClick={() => setActiveTab('list')} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem' }}>
                                <Save size={20} /> {isSaving ? 'Processing...' : (editingId ? 'Save Changes' : 'Publish Class Offering')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}
