import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SecurePlayer from '../../components/SecurePlayer';

export default function Catalog() {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  
  // Filter States
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedInstructorId, setSelectedInstructorId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [coursesRes, instructorsRes] = await Promise.all([
          supabase.from('courses').select('*').order('created_at', { ascending: false }),
          supabase.from('instructors').select('*').eq('is_active', true).order('name')
        ]);

        if (instructorsRes.data) setInstructors(instructorsRes.data);
        
        if (coursesRes.data && instructorsRes.data) {
          // Map instructor names to courses for display/filtering
          const mappedCourses = coursesRes.data.map(c => {
             const inst = instructorsRes.data.find(i => i.id === c.instructor_id);
             return { ...c, instructor_name: inst ? inst.name : 'Unknown' };
          });
          setCourses(mappedCourses);
        } else if (coursesRes.data) {
          setCourses(coursesRes.data);
        }
      } catch (err) {
        console.error("Catalog fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived Filter Options
  const years = [...new Set(courses.map(c => c.year))].filter(Boolean).sort();
  const subjects = [...new Set(courses.map(c => c.subject))].filter(Boolean).sort();

  // Filtered List
  const filteredCourses = courses.filter(c => {
    return (selectedYear === '' || c.year === selectedYear) &&
           (selectedSubject === '' || c.subject === selectedSubject) &&
           (selectedInstructorId === '' || c.instructor_id === selectedInstructorId);
  });

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/\/(?:live|embed|shorts)\/([^?&]+)/);
    return match ? match[1] : null;
  };

  // Handle Browser Back Button for Modal
  useEffect(() => {
    if (selectedVideoId) {
      window.history.pushState({ modalOpen: true }, '');
    }
    const handlePopState = (e) => { if (selectedVideoId) setSelectedVideoId(null); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVideoId]);

  return (
    <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Course Catalog</h1>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <select 
          className="input-field" 
          style={{ maxWidth: '200px', marginBottom: 0 }}
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select 
          className="input-field" 
          style={{ maxWidth: '200px', marginBottom: 0 }}
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select 
          className="input-field" 
          style={{ maxWidth: '200px', marginBottom: 0 }}
          value={selectedInstructorId}
          onChange={(e) => setSelectedInstructorId(e.target.value)}
        >
          <option value="">All Instructors</option>
          {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {loading ? (
           [1,2,3,4,5,6].map(i => <div key={i} className="card shimmer" style={{ height: '350px' }}></div>)
        ) : filteredCourses.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ height: '180px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', overflow: 'hidden', borderBottom: '1px solid var(--color-surface-border)' }}>
              {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              ) : (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '0.5rem' }}>
                      <BookOpen size={48} opacity={0.3} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Thumbnail Ready Soon</span>
                  </div>
              )}
            </div>
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="badge badge-primary" style={{ padding: '0.35rem 0.75rem' }}>{c.year} - {c.subject}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 900, fontSize: '1.1rem' }}>{c.price}</span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '1.5rem', lineHeight: '1.4', flex: 1 }}>{c.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {c.free_lesson_url && (
                      <button onClick={(e) => { e.preventDefault(); setSelectedVideoId(extractYouTubeId(c.free_lesson_url)); }} className="btn btn-outline" style={{ width: '100%', borderRadius: '100px', color: '#10b981', borderColor: '#10b981', fontWeight: 800 }}>Watch Free Demo</button>
                  )}
                  <Link to={`/course/${c.id}`} className="btn btn-primary" style={{ width: '100%', borderRadius: '12px', justifyContent: 'center', height: '48px', fontWeight: 800 }}>Explore Course</Link>
                </div>
            </div>
          </div>
        ))}
      </div>

      {selectedVideoId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedVideoId(null)}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1.5rem', display: 'flex', alignItems: 'center', zIndex: 1010 }}>
            <button onClick={(e) => { e.stopPropagation(); setSelectedVideoId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', backdropFilter: 'blur(8px)' }}>
              <ArrowLeft size={20} /> BACK TO CATALOG
            </button>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', boxShadow: '0 0 100px rgba(0,0,0,1)' }} onClick={e => e.stopPropagation()}>
            <SecurePlayer videoId={selectedVideoId} />
          </div>
        </div>
      )}
    </div>
  );
}
