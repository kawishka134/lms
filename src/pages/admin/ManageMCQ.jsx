import { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Trash2, Edit2, Save, Clock, HelpCircle, Eye, EyeOff, FileUp, Zap, CheckCircle, ChevronRight, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import Tesseract from 'tesseract.js';

// Set worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function ManageMCQ() {
    const { showToast } = useToast();
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const [activeTab, setActiveTab] = useState('list');
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [activeFormTab, setActiveFormTab] = useState('config'); // config | questions | answers
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '', description: '', course_id: '', pdf_url: '',
        time_limit_minutes: 60, num_questions: 0, options_per_question: 4, is_published: false
    });

    // Questions list [{question_text, option_1..4, correct_option}]
    const [questions, setQuestions] = useState([]);
    const [parsedPreview, setParsedPreview] = useState([]);
    const [bulkText, setBulkText] = useState('');
    const [showParser, setShowParser] = useState(false);
    const [answers, setAnswers] = useState({}); // answer key {qNum: correctOption}

    const adminRole = localStorage.getItem('admin_role');
    const isSuperAdmin = adminRole === 'super_admin';
    const currentInstructorId = localStorage.getItem('instructor_id');

    const [retakeRequests, setRetakeRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    useEffect(() => { fetchExams(); fetchCourses(); fetchRetakeRequests(); }, []);

    const fetchRetakeRequests = async () => {
        setLoadingRequests(true);
        try {
            const { data: rawReqs, error } = await supabase
                .from('mcq_retake_requests')
                .select('*')
                .eq('status', 'pending');
            
            if (error) throw error;
            if (!rawReqs) return;

            // Fetch details individually to guarantee visibility
            const enriched = await Promise.all(rawReqs.map(async (req) => {
                const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', req.student_id).single();
                const { data: exam } = await supabase.from('mcq_exams').select('title, instructor_id').eq('id', req.exam_id).single();
                return { ...req, profiles: profile, mcq_exams: exam };
            }));

            // Filter for instructor locally
            let final = enriched;
            if (!isSuperAdmin && currentInstructorId) {
                final = enriched.filter(r => r.mcq_exams?.instructor_id === currentInstructorId);
            }
            setRetakeRequests(final);
        } catch (err) { console.error("Enrichment Error:", err); }
        setLoadingRequests(false);
    };

    const handleRequestAction = async (id, status) => {
        try {
            const target = retakeRequests.find(r => r.id === id);
            if (!target) return;

            if (status === 'approved') {
                // Delete previous attempts so hasAttempt becomes false
                await supabase.from('mcq_attempts').delete().eq('student_id', target.student_id).eq('exam_id', target.exam_id);
                // Also update status to approved
                await supabase.from('mcq_retake_requests').update({ status }).eq('id', id);
                showToast("Retake access granted!", 'success');
            } else {
                // If rejected, set status to rejected. Dashboard will show request button again.
                await supabase.from('mcq_retake_requests').update({ status: 'rejected' }).eq('id', id);
                showToast("Request rejected. Student can now request again.", 'info');
            }
            fetchRetakeRequests();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const fetchExams = async () => {
        let query = supabase.from('mcq_exams').select('*, courses(id, title)').order('created_at', { ascending: false });
        if (!isSuperAdmin && currentInstructorId) query = query.eq('instructor_id', currentInstructorId);
        const { data } = await query;
        if (data) setExams(data);
    };

    const fetchCourses = async () => {
        let query = supabase.from('courses').select('id, title');
        if (!isSuperAdmin && currentInstructorId) query = query.eq('instructor_id', currentInstructorId);
        const { data } = await query;
        if (data) setCourses(data);
    };

    const handleAutoExtract = async () => {
        if (!formData.pdf_url) return showToast('Please upload a PDF first.', 'warning');
        setIsExtracting(true);
        setOcrProgress(0);
        try {
            showToast('🤖 AI Scanning PDF... Please wait.', 'info');
            const response = await fetch(formData.pdf_url);
            const arrayBuffer = await response.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                // Update progress for each page
                const baseProgress = Math.round(((i - 1) / pdf.numPages) * 100);
                setOcrProgress(baseProgress);

                const page = await pdf.getPage(i);
                const scale = 2.0; // Higher scale = better OCR
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context, viewport }).promise;
                
                // Perform OCR using Tesseract (Sinhala + English)
                const { data: { text } } = await Tesseract.recognize(
                    canvas, 
                    'sin+eng', 
                    { logger: m => {
                        if (m.status === 'recognizing text') {
                            setOcrProgress(baseProgress + Math.round((m.progress / pdf.numPages) * 100));
                        }
                    } }
                );
                fullText += text + '\n\n';
            }
            
            setBulkText(fullText);
            setShowParser(true);
            
            const parsed = parseBulkTextFromContent(fullText);
            if (parsed.length > 0) {
                setQuestions(parsed);
                setFormData(prev => ({ ...prev, num_questions: parsed.length }));
                showToast(`✨ Magic OCR! ${parsed.length} questions extracted correctly.`, 'success');
                setActiveFormTab('questions');
            } else {
                showToast('OCR done but format not recognized. Manual review needed.', 'warning');
            }
        } catch (err) {
            console.error('PDF AI-OCR Error:', err);
            showToast('AI Scan failed. Please copy-paste manually.', 'error');
        }
        setIsExtracting(false);
        setOcrProgress(0);
    };

    const parseBulkTextFromContent = (text) => {
        // Normalize: replace line breaks with space, then collapse multiple spaces
        const normalized = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Marker regex: catches 1. or I. or i) or a)
        // Group 1: The marker itself
        const markerRegex = /(\d{1,2}[\.\)]|[ivx]{1,5}[\.\)\/\|]|[a-e][\.\)\/\|])/gi;

        const parts = [];
        let lastIdx = 0;
        let match;
        
        while ((match = markerRegex.exec(normalized)) !== null) {
            // Text before the marker
            const textBefore = normalized.substring(lastIdx, match.index).trim();
            if (textBefore) parts.push(textBefore);
            
            // The marker itself
            parts.push(match[1].trim());
            lastIdx = markerRegex.lastIndex;
        }
        // Final trailing text
        const finalBit = normalized.substring(lastIdx).trim();
        if (finalBit) parts.push(finalBit);

        const parsed = [];
        let current = null;

        const isQuestionMarker = (m) => /^\d{1,2}[\.\)]$/.test(m);
        const isOptionMarker = (m) => /^[ivx]{1,5}[\.\)\/\|]$|^[a-e][\.\)\/\|]$/i.test(m);

        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            
            if (isQuestionMarker(p)) {
                if (current) parsed.push(current);
                current = {
                    question_number: parsed.length + 1,
                    question_text: parts[i + 1] || '',
                    option_1: '', option_2: '', option_3: '', option_4: '', option_5: '',
                    correct_option: 0
                };
                i++;
            } else if (current && isOptionMarker(p)) {
                // If the next part is also a marker, the option has no text (skip)
                const nextPart = parts[i + 1] || '';
                if (!isQuestionMarker(nextPart) && !isOptionMarker(nextPart)) {
                    if (!current.option_1) current.option_1 = nextPart;
                    else if (!current.option_2) current.option_2 = nextPart;
                    else if (!current.option_3) current.option_3 = nextPart;
                    else if (!current.option_4) current.option_4 = nextPart;
                    else if (!current.option_5) current.option_5 = nextPart;
                    i++;
                }
            }
        }
        
        if (current) parsed.push(current);
        return parsed;
    };
    const applyParsed = () => {
        const parsed = parseBulkTextFromContent(bulkText);
        if (parsed.length === 0) { showToast('Could not parse any questions. Check format.', 'warning'); return; }
        setQuestions(parsed);
        setFormData(prev => ({ ...prev, num_questions: parsed.length }));
        setShowParser(false);
        setBulkText('');
        showToast(`✅ ${parsed.length} questions loaded!`, 'success');
        setActiveFormTab('questions');
    };

    const updateQuestion = (idx, field, value) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    };

    const addQuestion = () => {
        setQuestions(prev => [...prev, {
            question_number: prev.length + 1,
            question_text: '', option_1: '', option_2: '', option_3: '', option_4: '', option_5: '', correct_option: 0
        }]);
        setFormData(prev => ({ ...prev, num_questions: questions.length + 1 }));
    };

    const removeQuestion = (idx) => {
        setQuestions(prev => {
            const updated = prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, question_number: i + 1 }));
            setFormData(p => ({ ...p, num_questions: updated.length }));
            return updated;
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('mcq_papers').upload(fileName, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('mcq_papers').getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, pdf_url: data.publicUrl }));
            showToast('✅ PDF uploaded!', 'success');
        } catch (err) { showToast('Upload failed: ' + err.message, 'error'); }
        setUploading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (questions.length === 0) return showToast('Please add at least one question.', 'warning');
        const incomplete = questions.find(q => !q.question_text || !q.option_1 || !q.option_2 || !q.correct_option);
        if (incomplete) return showToast('Some questions are incomplete. Fill all fields and mark the correct answer.', 'warning');

        setIsSaving(true);
        try {
            const examData = { ...formData, instructor_id: currentInstructorId, num_questions: questions.length, time_limit_minutes: parseInt(formData.time_limit_minutes) };
            let examId = editingId;

            if (editingId) {
                const { error } = await supabase.from('mcq_exams').update(examData).eq('id', editingId);
                if (error) throw error;
                await supabase.from('mcq_questions').delete().eq('exam_id', editingId);
                await supabase.from('mcq_answers').delete().eq('exam_id', editingId);
            } else {
                const { data, error } = await supabase.from('mcq_exams').insert(examData).select().single();
                if (error) throw error;
                examId = data.id;
            }

            // Insert questions
            const questionRows = questions.map((q, idx) => ({
                exam_id: examId,
                question_number: idx + 1,
                question_text: q.question_text,
                option_1: q.option_1,
                option_2: q.option_2,
                option_3: q.option_3 || null,
                option_4: q.option_4 || null,
                option_5: q.option_5 || null,
                correct_option: parseInt(q.correct_option)
            }));
            const { error: qErr } = await supabase.from('mcq_questions').insert(questionRows);
            if (qErr) throw qErr;

            // Also save to mcq_answers for backwards compat
            const answerRows = questions.map((q, idx) => ({ exam_id: examId, question_number: idx + 1, correct_option: parseInt(q.correct_option) }));
            await supabase.from('mcq_answers').insert(answerRows);

            showToast(editingId ? 'Exam updated!' : '🎉 Exam published!', 'success');
            resetForm(); setActiveTab('list'); fetchExams();
        } catch (err) { showToast(err.message, 'error'); }
        setIsSaving(false);
    };

    const resetForm = () => {
        setFormData({ title: '', description: '', course_id: '', pdf_url: '', time_limit_minutes: 60, num_questions: 0, options_per_question: 4, is_published: false });
        setQuestions([]); setAnswers({}); setBulkText(''); setEditingId(null); setActiveFormTab('config');
    };

    const handleEdit = async (exam) => {
        setFormData({ title: exam.title, description: exam.description || '', course_id: exam.course_id, pdf_url: exam.pdf_url || '', time_limit_minutes: exam.time_limit_minutes, num_questions: exam.num_questions, options_per_question: exam.options_per_question, is_published: exam.is_published });
        const { data: qData } = await supabase.from('mcq_questions').select('*').eq('exam_id', exam.id).order('question_number');
        if (qData) setQuestions(qData);
        setEditingId(exam.id); setActiveTab('add'); setActiveFormTab('config');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this MCQ Exam?')) {
            await supabase.from('mcq_exams').delete().eq('id', id);
            fetchExams(); showToast('Exam deleted.', 'info');
        }
    };

    const togglePublish = async (exam) => {
        await supabase.from('mcq_exams').update({ is_published: !exam.is_published }).eq('id', exam.id);
        showToast(exam.is_published ? 'Exam hidden' : 'Exam is now LIVE!', 'success'); fetchExams();
    };

    const optionLabels = ['i', 'ii', 'iii', 'iv', 'v'];

    return (
        <div style={{ padding: '0.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-primary)' }}>MCQ Exams</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Create interactive question-by-question MCQ exams for students.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => { setActiveTab('list'); resetForm(); }} className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-outline'}`}><FileText size={18} /> All Exams</button>
                    <button onClick={() => setActiveTab('add')} className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}><Plus size={18} /> New Exam</button>
                </div>
            </div>
            {/* Pending Requests Section */}
            {retakeRequests.length > 0 && (
                <div style={{ backgroundColor: '#fff7ed', border: '2px solid #fdba74', borderRadius: '20px', padding: '1.5rem', marginBottom: '2.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                        <RotateCcw size={22} style={{ color: '#ea580c' }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#9a3412', margin: 0 }}>Pending Retake Requests</h2>
                        <span style={{ backgroundColor: '#ea580c', color: 'white', fontSize: '0.75rem', fontWeight: 800, padding: '2px 10px', borderRadius: '20px' }}>{retakeRequests.length}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        {retakeRequests.map(req => (
                            <div key={req.id} style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{req.profiles?.full_name || `Student: ${req.student_id?.slice(0,8)}...`}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 800 }}>{req.mcq_exams?.title || `Exam: ${req.exam_id?.slice(0,8)}...`}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>📞 {req.profiles?.phone || 'No Contact'}</span>
                                        <span style={{ opacity: 0.5 }}>|</span>
                                        <span>📅 {new Date(req.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleRequestAction(req.id, 'rejected')} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#ef4444' }}>Reject</button>
                                    <button onClick={() => handleRequestAction(req.id, 'approved')} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', backgroundColor: '#ea580c', border: 'none' }}>Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'list' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {exams.map(exam => (
                        <div key={exam.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.75rem', borderRadius: '12px' }}><HelpCircle size={24} /></div>
                                <button onClick={() => togglePublish(exam)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: exam.is_published ? '#16a34a' : '#94a3b8' }} title={exam.is_published ? 'Hide' : 'Publish'}>
                                    {exam.is_published ? <Eye size={22} /> : <EyeOff size={22} />}
                                </button>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{exam.courses?.title || 'No Course'}</span>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0.25rem 0' }}>{exam.title}</h3>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                    <span><Clock size={13} style={{ display: 'inline', marginRight: 3 }} />{exam.time_limit_minutes}m</span>
                                    <span><HelpCircle size={13} style={{ display: 'inline', marginRight: 3 }} />{exam.num_questions} Questions</span>
                                </div>
                                <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: '20px', backgroundColor: exam.is_published ? '#dcfce7' : '#f1f5f9', color: exam.is_published ? '#16a34a' : '#64748b' }}>
                                    {exam.is_published ? '● LIVE' : '○ DRAFT'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                <button onClick={() => handleEdit(exam)} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}><Edit2 size={16} /> Edit</button>
                                <button onClick={() => handleDelete(exam.id)} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem', color: '#ef4444', borderColor: '#fee2e2' }}><Trash2 size={16} /> Delete</button>
                            </div>
                        </div>
                    ))}
                    {exams.length === 0 && <div className="card" style={{ gridColumn: '1/-1', padding: '5rem', textAlign: 'center', opacity: 0.5 }}><HelpCircle size={48} style={{ margin: '0 auto 1rem' }} /><p style={{ fontWeight: 700 }}>No MCQ exams yet.</p></div>}
                </div>
            ) : (
                <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: 0, overflow: 'hidden' }}>
                    {/* Form Tabs */}
                    <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9' }}>
                        {[{ id: 'config', label: '⚙️ Exam Setup' }, { id: 'questions', label: `📝 Questions (${questions.length})` }].map(tab => (
                            <button key={tab.id} onClick={() => setActiveFormTab(tab.id)} style={{ padding: '1rem 2rem', fontWeight: 800, fontSize: '0.9rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeFormTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent', color: activeFormTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)', marginBottom: '-2px', transition: 'all 0.2s' }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '2.5rem' }}>
                        {activeFormTab === 'config' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label className="input-label">Exam Title</label>
                                    <input type="text" className="input-field" placeholder="e.g. Unit 05 - MCQ Test" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="input-label">Select Course</label>
                                    <select className="input-field" value={formData.course_id} onChange={e => setFormData({ ...formData, course_id: e.target.value })}>
                                        <option value="">-- Choose Course --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="input-label">Time Limit (Minutes)</label>
                                        <input type="number" className="input-field" value={formData.time_limit_minutes} onChange={e => setFormData({ ...formData, time_limit_minutes: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="input-label">Options per Question</label>
                                        <select className="input-field" value={formData.options_per_question} onChange={e => setFormData({ ...formData, options_per_question: parseInt(e.target.value) })}>
                                            <option value={4}>4 Options (i, ii, iii, iv)</option>
                                            <option value={5}>5 Options (i, ii, iii, iv, v)</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <label className="input-label">Question Paper PDF (Recommended)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-outline" disabled={uploading}>
                                            <FileUp size={16} /> {uploading ? 'Uploading...' : 'Upload PDF'}
                                        </button>
                                        <input type="file" ref={fileInputRef} accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
                                        
                                        {formData.pdf_url && (
                                            <button type="button" onClick={handleAutoExtract} disabled={isExtracting} className="btn btn-primary" style={{ backgroundColor: '#8b5cf6', borderColor: '#7c3aed', minWidth: '220px' }}>
                                                {isExtracting ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        AI Scanning ({ocrProgress}%)
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap size={16} /> 
                                                        Auto-Extract (AI Scan) ✨
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {formData.pdf_url ? <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 800 }}>✅ PDF Uploaded</span> : <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Upload PDF to auto-generate questions</span>}
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1rem' }}>💡 <b>New:</b> PDF එක upload කළොත් අපේ System එකට පුළුවන් auto ප්‍රශ්න ටික අරගන්න.</p>
                                </div>
                                <button type="button" onClick={() => setActiveFormTab('questions')} className="btn btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>
                                    Next: Add Questions <ChevronRight size={18} />
                                </button>
                            </div>
                        )}

                        {activeFormTab === 'questions' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Bulk Paste Parser */}
                                <div style={{ backgroundColor: '#fffbeb', border: '2px solid #fbbf24', borderRadius: '16px', padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={16} /> Paste & Auto-Parse Questions</span>
                                        <button onClick={() => setShowParser(!showParser)} style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', background: 'none', border: 'none', cursor: 'pointer' }}>{showParser ? 'Hide' : 'Open'}</button>
                                    </div>
                                    {showParser && (
                                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <p style={{ fontSize: '0.78rem', color: '#92400e', lineHeight: 1.7 }}>
                                                PDF eka open karala questions copy karanna. Format:<br />
                                                <b>1. Question text?<br />i. Option A &nbsp; ii. Option B &nbsp; iii. Option C &nbsp; iv. Option D</b>
                                            </p>
                                            <textarea className="input-field" rows={8} placeholder={"1. ව්‍යාපාරයක ප්‍රධාන අරමුණ කුමක්ද?\ni. ලාභය ඉපැයීම\nii. සේවකයින් සෙවීම\niii. නිෂ්පාදනය\niv. අලෙවිය\n\n2. Next question here..."} value={bulkText} onChange={e => setBulkText(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                                            {parsedPreview.length > 0 && (
                                                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem' }}>
                                                    ✅ Preview: {parsedPreview.length} questions found
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button type="button" onClick={() => { 
                                                    const preview = parseBulkTextFromContent(bulkText);
                                                    setParsedPreview(preview);
                                                }} className="btn btn-outline" style={{ flex: 1 }}>👁 Preview</button>
                                                <button type="button" onClick={applyParsed} className="btn btn-primary" style={{ flex: 2 }}>⚡ Apply & Load Questions</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Questions List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {questions.map((q, idx) => (
                                        <div key={idx} style={{ border: `2px solid ${q.correct_option ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '16px', padding: '1.25rem', backgroundColor: q.correct_option ? '#f0fdf4' : 'white' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                <span style={{ fontWeight: 900, color: 'var(--color-primary)', fontSize: '0.9rem' }}>Q{String(idx + 1).padStart(2, '0')}</span>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {q.correct_option ? <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '20px', fontWeight: 800 }}>✓ Answer Set</span> : <span style={{ fontSize: '0.7rem', backgroundColor: '#fff7ed', color: '#ea580c', padding: '2px 8px', borderRadius: '20px', fontWeight: 800 }}>⚠ No Answer</span>}
                                                    <button onClick={() => removeQuestion(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                                                </div>
                                            </div>
                                            <textarea className="input-field" rows={2} placeholder="Question text..." value={q.question_text} onChange={e => updateQuestion(idx, 'question_text', e.target.value)} style={{ marginBottom: '0.75rem', resize: 'none' }} />
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                {[1, 2, 3, 4].slice(0, formData.options_per_question).map(optNum => (
                                                    <input key={optNum} type="text" className="input-field" style={{ margin: 0, fontSize: '0.85rem' }} placeholder={`${optionLabels[optNum - 1]}. Option ${optNum}`} value={q[`option_${optNum}`] || ''} onChange={e => updateQuestion(idx, `option_${optNum}`, e.target.value)} />
                                                ))}
                                            </div>
                                            <div>
                                                <label className="input-label" style={{ fontSize: '0.75rem' }}>Correct Answer:</label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {[1, 2, 3, 4].slice(0, formData.options_per_question).map(optNum => (
                                                        <button key={optNum} type="button" onClick={() => updateQuestion(idx, 'correct_option', optNum)}
                                                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid', borderColor: q.correct_option === optNum ? '#16a34a' : '#e2e8f0', backgroundColor: q.correct_option === optNum ? '#16a34a' : 'white', color: q.correct_option === optNum ? 'white' : '#64748b', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}>
                                                            {optNum}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button type="button" onClick={addQuestion} className="btn btn-outline" style={{ width: '100%', padding: '0.875rem', borderStyle: 'dashed' }}>
                                    <Plus size={18} /> Add Question Manually
                                </button>

                                {questions.length > 0 && (
                                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                                        <Save size={20} /> {isSaving ? 'Saving...' : (editingId ? 'Update Exam' : `Publish Exam (${questions.length} Questions)`)}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
