import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Catalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (data) setCourses(data);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return (
    <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Course Catalog</h1>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <select className="input-field" style={{ maxWidth: '200px', marginBottom: 0 }}>
          <option value="">All Years</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="O/L">O/L</option>
        </select>
        <select className="input-field" style={{ maxWidth: '200px', marginBottom: 0 }}>
          <option value="">All Subjects</option>
          <option value="Econ">Economics</option>
          <option value="BS">Business Studies</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {loading ? (
           [1,2,3].map(i => <div key={i} className="card shimmer" style={{ height: '350px' }}></div>)
        ) : courses.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ height: '180px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', overflow: 'hidden', borderBottom: '1px solid var(--color-surface-border)' }}>
              {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                <Link to={`/course/${c.id}`} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', height: '48px', fontWeight: 800 }}>Explore Course</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
