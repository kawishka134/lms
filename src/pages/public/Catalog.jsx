import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, User, Calendar, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Catalog() {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selYear, setSelYear] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selInstructor, setSelInstructor] = useState('');

  // Dropdown options
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, instructors(name)')
        .order('created_at', { ascending: false });
      
      if (data) {
        setCourses(data);
        setFilteredCourses(data);

        // Generate dynamic filter lists
        const uniqueYears = [...new Set(data.flatMap(c => [c.year, c.batch].filter(Boolean)))].sort();
        // Add O/L and A/L to years if relevant grades exist
        const hasOL = data.some(c => ['10', '11'].includes(String(c.year)));
        const finalYears = [...uniqueYears];
        if (hasOL && !finalYears.includes('O/L')) finalYears.push('O/L');
        setYears(finalYears);

        const uniqueSubjects = [...new Set(data.map(c => c.subject).filter(Boolean))].sort();
        setSubjects(uniqueSubjects);

        const uniqueInst = [...new Set(data.map(c => c.instructors?.name).filter(Boolean))].sort();
        setInstructors(uniqueInst);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  // Apply Filtering Logic
  useEffect(() => {
    let result = [...courses];

    if (selYear) {
      if (selYear === 'O/L') {
        result = result.filter(c => ['10', '11'].includes(String(c.year)));
      } else {
        result = result.filter(c => String(c.year) === selYear || String(c.batch) === selYear);
      }
    }

    if (selSubject) {
      result = result.filter(c => c.subject === selSubject);
    }

    if (selInstructor) {
      result = result.filter(c => c.instructors?.name === selInstructor);
    }

    setFilteredCourses(result);
  }, [selYear, selSubject, selInstructor, courses]);

  return (
    <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Course Catalog</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Find the perfect class to accelerate your learning journey.</p>
      </div>
      
      {/* Search & Filters */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.25rem', 
        marginBottom: '3rem',
        padding: '2rem',
        backgroundColor: 'var(--color-surface-hover)',
        borderRadius: '20px',
        border: '1px solid var(--color-surface-border)'
      }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Level / Year</label>
          <select className="input-field" value={selYear} onChange={e => setSelYear(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="">All Levels</option>
            {years.map(y => <option key={y} value={y}>{y.includes('Grade') ? y : (isNaN(y) ? y : `${y} Intake`)}</option>)}
          </select>
        </div>
        
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose Subject</label>
          <select className="input-field" value={selSubject} onChange={e => setSelSubject(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter by Instructor</label>
          <select className="input-field" value={selInstructor} onChange={e => setSelInstructor(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="">All Instructors</option>
            {instructors.map(inst => <option key={inst} value={inst}>{inst}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="card shimmer" style={{ height: '400px', borderRadius: '24px' }}></div>)}
        </div>
      ) : (
        <>
          {filteredCourses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed var(--color-surface-border)' }}>
              <BookOpen size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.1 }} />
              <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>No matching courses found</h2>
              <p style={{ color: 'var(--color-text-muted)' }}>Try adjusting your filters or search criteria.</p>
              <button onClick={() => { setSelYear(''); setSelSubject(''); setSelInstructor(''); }} className="btn btn-outline" style={{ marginTop: '1.5rem' }}>Clear All Filters</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {filteredCourses.map(c => (
                <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid var(--color-surface-border)', borderRadius: '24px' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ position: 'relative', height: '200px', backgroundColor: '#f1f5f9' }}>
                    {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', gap: '0.5rem' }}>
                            <BookOpen size={48} />
                        </div>
                    )}
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                      <span className="badge badge-primary" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)', backgroundColor: 'rgba(var(--color-primary-rgb), 0.9)' }}>
                        {c.class_type || 'Theory'}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '8px', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <GraduationCap size={12} /> Grade {c.year}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '8px', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} /> {c.batch || 'Ongoing'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: '1.3', flex: 1 }}>{c.title}</h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                        <User size={16} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.instructors?.name || 'Academic Staff'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Monthly Fee</span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 900, fontSize: '1.4rem' }}>{c.price || 'Free'}</span>
                        </div>
                        <Link to={`/course/${c.id}`} className="btn btn-primary" style={{ height: '48px', padding: '0 1.5rem', borderRadius: '12px' }}>Enroll Now</Link>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
