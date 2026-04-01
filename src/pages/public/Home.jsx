import { ArrowRight, BookOpen, CheckCircle, Star, Users, Trophy, Zap, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

/* ─── count-up hook ───────────────────────────────────────────────────────── */
function useCountUp(target, duration = 2200, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0 = null;
    const step = ts => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

/* ─── scroll-reveal hook ──────────────────────────────────────────────────── */
function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.sr');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('sr-visible'); }
        else { e.target.classList.remove('sr-visible'); }
      }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, deps);
}

/* ─── stat card with count-up ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, suffix, label, color, animate, delay }) {
  const count = useCountUp(value, 2200, animate);
  return (
    <div className="sr stat-card" style={{ '--delay': delay }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px',
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
        <Icon size={26} color={color} />
      </div>
      <div style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
        {count}<span style={{ color }}>{suffix}</span>
      </div>
      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.6rem' }}>{label}</div>
    </div>
  );
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  const LOCAL_HERO = '/images/hero_bg.png';
  const [heroImg, setHeroImg] = useState(null);
  const [teacherImg, setTeacherImg] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  useReveal([loading, settings, courses]);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
        const { data: c } = await supabase.from('courses').select('*').order('created_at', { ascending: false }).limit(3);
        const { data: instData } = await supabase.from('instructors').select('*').eq('is_active', true).order('display_order');
        
        if (s) {
          setSettings(s);
          if (s.hero_image_url) setHeroImg(s.hero_image_url);
          if (s.teacher_photo_url) setTeacherImg(s.teacher_photo_url);
        } else {
          setHeroImg(LOCAL_HERO);
        }
        if (c) setCourses(c);
        if (instData) setInstructors(instData);
      } catch (err) {
        console.error("Home data error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Stats count-up trigger
  useEffect(() => {
    if (!statsRef.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ background: '#060a14', color: '#fff', overflowX: 'hidden', fontFamily: "'Inter','Outfit',sans-serif" }}>

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center' }}>

        {/* bg image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#07101f' }}>
          {heroImg && <img src={heroImg} onError={() => setHeroImg(LOCAL_HERO)} alt=""
            className="hm-hero-img"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4) saturate(1.3)' }} />}
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(120deg, rgba(3,7,18,0.8) 40%, rgba(14,165,233,0.06) 100%)' }} />
        </div>

        {/* floating orbs */}
        <div className="hm-orb hm-orb-1" />
        <div className="hm-orb hm-orb-2" />

        {/* content */}
        <div className="hm-container" style={{ position: 'relative', zIndex: 10, paddingTop: '6rem', paddingBottom: '6rem' }}>
          <p className="hero-badge hm-fade-1">🇱🇰 Sri Lanka's #1 Higher Education Platform</p>

          <h1 className="hm-fade-2" style={{
            fontSize: 'clamp(3.2rem,10vw,7.5rem)', fontWeight: 900,
            lineHeight: 0.92, letterSpacing: '-0.04em', marginBottom: '0.5rem'
          }}>
            <span className="hm-radical-text">NEXUS</span><br />
            <span className="hm-gradient-text">ONLINE</span>
          </h1>
          
          <p className="hm-fade-2" style={{
            fontSize: 'clamp(1rem,3vw,1.8rem)', color: '#38bdf8', letterSpacing: '4px',
            fontWeight: 400, textTransform: 'uppercase', marginBottom: '2rem', fontFamily: "'Inter', sans-serif"
          }}>
            Higher Education Institute
          </p>

          <p className="hm-fade-3" style={{
            fontSize: 'clamp(1rem,2vw,1.4rem)', color: 'rgba(255,255,255,0.65)',
            maxWidth: '600px', lineHeight: 1.7, marginBottom: '3rem'
          }}>
            "{settings?.motto || 'Transforming theoretical knowledge into real-world practical mastery.'}"
          </p>

          <div className="hm-fade-4 hero-btns">
            <Link to="/register" className="hm-btn-primary">
              ලියාපදිංචි වන්න <ArrowRight size={20} />
            </Link>
            <Link to="/courses" className="hm-btn-ghost">
              <Play size={18} /> Explore Courses
            </Link>
          </div>
        </div>

        {/* mouse-wheel hint — minimal, no text */}
        <div className="hm-scroll-hint">
          <div className="hm-scroll-wheel">
            <div className="hm-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ─── STATS ───────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ padding: '5rem 0', background: '#07101f' }}>
        <div className="hm-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.5rem' }}>
            <StatCard icon={Users}    value={5000} suffix="+" label="Students Enrolled" color="#0ea5e9"  animate={statsVisible} delay="0s" />
            <StatCard icon={Trophy}   value={98}   suffix="%" label="Pass Rate"         color="#f59e0b"  animate={statsVisible} delay="0.1s" />
            <StatCard icon={BookOpen} value={12}   suffix="+" label="Active Courses"    color="#6366f1"  animate={statsVisible} delay="0.2s" />
            <StatCard icon={Star}     value={10}   suffix="Y" label="Experience"        color="#10b981"  animate={statsVisible} delay="0.3s" />
          </div>
        </div>
      </section>

      {/* ─── EXPERT PANEL ────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 0', background: 'linear-gradient(to bottom, #0b1121, #07101f)' }}>
        <div className="hm-container">
          <div className="sr" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ color: '#0ea5e9', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '1rem' }}>Our Faculty</div>
            <h2 style={{ fontSize: 'clamp(2.5rem,5vw,4rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#fff' }}>
              Learn from <span style={{ color: '#7dd3fc' }}>Top Educators</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start', justifyContent: 'center' }}>
            {loading ? (
               <div className="hm-skeleton" style={{ width: '320px', height: '480px' }} />
            ) : (
               /* Founder Card (Slightly larger but still compact) */
               <div className="sr" style={{ width: '320px', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(14, 165, 233, 0.2)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                     <img src={settings?.teacher_photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Founder" />
                     <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', padding: '0.5rem 1rem', borderRadius: '10px', color: '#fff', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>INSTITUTE OWNER</div>
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>{settings?.teacher_name || 'Manjula Prabhath'}</h3>
                  <p style={{ color: '#0ea5e9', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Founder & Senior Director</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Leading the next generation of scholars with expert guidance.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <Link to="/about" className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}>View Story</Link>
                  </div>
               </div>
            )}

            {/* Other Experts Row */}
            <div style={{ flex: 1, minWidth: '300px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {loading ? (
                    /* Show 3 skeletons when loading */
                    [1, 2, 3].map(i => (
                        <div key={i} className="hm-skeleton" style={{ height: '220px', borderRadius: '20px' }} />
                    ))
                ) : (
                    instructors.slice(0, 4).map((inst, index) => (
                        <div key={inst.id} className="sr" style={{ '--delay': `${index * 0.1}s`, background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1rem', border: '3px solid #0ea5e9' }}>
                                {inst.photo_url ? (
                                    <img src={inst.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={inst.name} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: '#0ea5e922', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Users size={40} color="#0ea5e9" />
                                    </div>
                                )}
                            </div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>{inst.name}</h4>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{inst.subject || 'Expert'}</p>
                        </div>
                    ))
                )}
                
                {instructors.length > 4 && (
                    <Link to="/experts" className="sr" style={{ background: 'rgba(14, 165, 233, 0.1)', borderRadius: '20px', padding: '1.25rem', border: '1px dashed #0ea5e9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textDecoration: 'none', transition: 'background 0.3s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <ArrowRight size={28} />
                        </div>
                        <span style={{ color: '#0ea5e9', fontWeight: 900, fontSize: '0.9rem' }}>See All Experts</span>
                    </Link>
                )}

                {instructors.length <= 4 && instructors.length > 0 && (
                     <Link to="/experts" className="sr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', fontWeight: 800, gap: '0.5rem', textDecoration: 'none' }}>
                        View All <ArrowRight size={16} />
                     </Link>
                )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COURSES ─────────────────────────────────────────────────── */}
      <section style={{ padding: '8rem 0', background: '#07101f' }}>
        <div className="hm-container">
          <div className="sr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ color: '#0ea5e9', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Our Programs</div>
              <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>Choose Your Path</h2>
            </div>
            <Link to="/courses" className="hm-link-arrow">
              All Courses <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '2rem' }}>
              {[1, 2, 3].map(i => <div key={i} className="hm-skeleton" />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '2rem' }}>
              {courses.map((c, i) => <CourseCard key={c.id} course={c} idx={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ─── INTRO VIDEO ─────────────────────────────────────────────── */}
      {settings?.intro_video_url && (
        <section style={{ padding: '8rem 0' }}>
          <div className="hm-container">
            <div className="sr" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, color: '#fff' }}>See It in Action</h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '0.75rem' }}>A glimpse into our teaching style</p>
            </div>
            <div className="sr video-container" style={{ maxWidth: '920px', margin: '0 auto' }}>
              {(() => {
                const v = settings.intro_video_url;
                const yt = v.match(/[?&]v=([^&]+)/) || v.match(/youtu\.be\/([^?]+)/) || v.match(/\/(?:live|embed|shorts)\/([^?&]+)/);
                if (yt) return (
                  <iframe 
                    src={`https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`}
                    title="Intro Video" allow="autoplay; encrypted-media" allowFullScreen />
                );
                return <video src={v} autoPlay muted loop playsInline controls />;
              })()}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA BAND ────────────────────────────────────────────────── */}
      <section style={{ padding: '7rem 0', background: 'linear-gradient(135deg,#07101f,#0b1a30)', position: 'relative', overflow: 'hidden' }}>
        <div className="hm-orb" style={{ width: '500px', height: '500px', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(14,165,233,0.06)' }} />
        <div className="hm-container sr" style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎓</p>
          <h2 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1.5rem', lineHeight: 1.1, color: '#fff' }}>
            Ready to Transform<br />
            <span className="hm-gradient-text">Your Future?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', maxWidth: '550px', margin: '0 auto 3rem', lineHeight: 1.7 }}>
            Join thousands of successful students and start your Commerce journey today.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="hm-btn-primary">ලියාපදිංචි වන්න <ArrowRight size={20} /></Link>
            <Link to="/contact" className="hm-btn-ghost">සම්බන්ධ වන්න</Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ padding: '3rem 0', background: '#030712', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          POWERED BY <span style={{ fontWeight: 'bold' }}>රැඩිකල්</span> COMMERCE
        </p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
          © {new Date().getFullYear()} Nexus Online · Sri Lanka
        </p>
      </footer>

      {/* ─── ALL SCOPED STYLES ────────────────────────────────────────── */}
      <style>{`
        .hm-container { max-width:1200px; margin:0 auto; padding:0 2rem; }

        /* ── Scroll Reveal ── */
        .sr          { opacity:0; transform:translateY(36px); transition:opacity .9s cubic-bezier(.33,1,.68,1), transform .9s cubic-bezier(.33,1,.68,1); transition-delay:var(--delay,0s); }
        .sr-left     { transform:translateX(-50px); }
        .sr-right    { transform:translateX(50px); }
        .sr-visible  { opacity:1 !important; transform:translate(0,0) !important; }

        /* ── Hero sequential fade-ups ── */
        .hm-fade-1,.hm-fade-2,.hm-fade-3,.hm-fade-4 { opacity:0; animation:hm-fadeUp 1s cubic-bezier(.33,1,.68,1) forwards; }
        .hm-fade-1 { animation-delay:.15s; }
        .hm-fade-2 { animation-delay:.4s; }
        .hm-fade-3 { animation-delay:.65s; }
        .hm-fade-4 { animation-delay:.9s; }
        @keyframes hm-fadeUp {
          from { opacity:0; transform:translateY(40px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }

        /* ── "Radical" silver-blue shimmer text ── */
        .hm-radical-text {
          background: linear-gradient(120deg, #38bdf8, #e0f2fe, #7dd3fc, #38bdf8);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: hm-radicalShimmer 4s ease infinite;
          filter: drop-shadow(0 4px 20px rgba(56,189,248,0.3));
        }
        @keyframes hm-radicalShimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── Hero background slow zoom (Ken Burns) ── */
        .hm-hero-img {
          animation: hm-heroZoom 25s ease-in-out infinite alternate;
          transform-origin: center center;
        }
        @keyframes hm-heroZoom {
          from { transform: scale(1); }
          to   { transform: scale(1.12); }
        }

        /* ── Animated gradient text for "Commerce" ── */
        .hm-gradient-text {
          background: linear-gradient(270deg, #0ea5e9, #38bdf8, #e0f2fe, #0ea5e9, #0ea5e9);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: hm-gradientShift 6s ease infinite;
        }
        @keyframes hm-gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── Floating orbs ── */
        .hm-orb {
          position: absolute; border-radius: 50%; pointer-events: none;
          filter: blur(80px); z-index: 1;
          animation: hm-float 18s ease-in-out infinite;
        }
        .hm-orb-1 { width:500px; height:500px; top:-5%; right:-8%; background:rgba(225,29,72,0.08); }
        .hm-orb-2 { width:350px; height:350px; bottom:10%; left:-5%; background:rgba(99,102,241,0.06); animation-delay:-7s; }
        @keyframes hm-float {
          0%,100% { transform:translate(0,0) scale(1); }
          33%     { transform:translate(20px,-30px) scale(1.05); }
          66%     { transform:translate(-15px,20px) scale(0.97); }
        }

        /* ── Scroll hint (mouse-wheel, no text) ── */
        .hm-scroll-hint {
          position:absolute; bottom:2.5rem; left:50%; transform:translateX(-50%);
          z-index:10; animation:hm-hintBounce 2.5s ease-in-out infinite;
        }
        .hm-scroll-wheel {
          width:26px; height:42px; border:2px solid rgba(255,255,255,0.18);
          border-radius:14px; display:flex; justify-content:center; padding-top:8px;
        }
        .hm-scroll-dot {
          width:3px; height:8px; background:rgba(255,255,255,0.4);
          border-radius:2px; animation:hm-dotDrop 1.8s ease-in-out infinite;
        }
        @keyframes hm-hintBounce {
          0%,100% { transform:translateX(-50%) translateY(0); }
          50%     { transform:translateX(-50%) translateY(8px); }
        }
        @keyframes hm-dotDrop {
          0%   { opacity:0; transform:translateY(0); }
          40%  { opacity:1; transform:translateY(8px); }
          100% { opacity:0; transform:translateY(16px); }
        }

        /* ── Hero badge ── */
        .hero-badge {
          display:inline-flex; align-items:center; gap:.5rem;
          padding:.55rem 1.4rem; border-radius:100px;
          background:rgba(14,165,233,.08); border:1px solid rgba(14,165,233,.22);
          color:rgba(255,255,255,.85); font-size:.82rem; font-weight:700; letter-spacing:1.5px;
          margin-bottom:1.75rem;
        }

        /* ── Buttons ── */
        .hero-btns { display:flex; gap:1rem; flex-wrap:wrap; }
        .hm-btn-primary {
          display:inline-flex; align-items:center; gap:10px;
          padding:1.1rem 3rem; border-radius:100px;
          background:linear-gradient(135deg,#0ea5e9,#0284c7);
          color:#fff; font-weight:800; font-size:1.05rem; text-decoration:none;
          box-shadow:0 14px 44px rgba(14,165,233,.35);
          transition:transform .25s, box-shadow .25s;
          position: relative; overflow: hidden;
        }
        .hm-btn-primary::after {
          content:''; position:absolute; top:0; left:-100%; width:50%; height:100%;
          background:linear-gradient(to right,transparent,rgba(255,255,255,.15),transparent);
          transform:skewX(-20deg); transition:.7s;
        }
        .hm-btn-primary:hover::after { left:150%; }
        .hm-btn-primary:hover { transform:translateY(-4px); box-shadow:0 22px 55px rgba(14,165,233,.5); color:#fff; }

        .hm-btn-ghost {
          display:inline-flex; align-items:center; gap:8px;
          padding:1.1rem 2.4rem; border-radius:100px;
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.15);
          color:rgba(255,255,255,.8); font-weight:700; font-size:1rem; text-decoration:none;
          transition:background .25s, color .25s, border-color .25s;
        }
        .hm-btn-ghost:hover { background:rgba(255,255,255,.14); color:#fff; border-color:rgba(255,255,255,.3); }

        /* ── Stat cards ── */
        .stat-card {
          padding:2.5rem 2rem; border-radius:24px;
          background:rgba(255,255,255,.035); border:1px solid rgba(255,255,255,.07);
          transition:transform .35s, border-color .35s, box-shadow .35s;
        }
        .stat-card:hover {
          transform:translateY(-8px);
          border-color:rgba(255,255,255,.18);
          box-shadow:0 25px 55px rgba(0,0,0,.35);
        }

        /* ── Feature pills ── */
        .hm-feature-pill {
          display:flex; align-items:center; gap:6px;
          padding:.6rem 1.1rem;
          background:rgba(16,185,129,.07); border:1px solid rgba(16,185,129,.18);
          border-radius:100px; color:#10b981; font-weight:700; font-size:.85rem;
          transition:background .2s;
        }
        .hm-feature-pill:hover { background:rgba(16,185,129,.14); }

        /* ── Teacher photo accents ── */
        .hm-photo-border {
          position:absolute; inset:-16px; border:2px solid rgba(14,165,233,.15);
          border-radius:36px; pointer-events:none;
          animation:hm-borderPulse 4s ease-in-out infinite;
        }
        @keyframes hm-borderPulse {
          0%,100% { border-color:rgba(14,165,233,.12); transform:scale(1); }
          50%     { border-color:rgba(14,165,233,.25); transform:scale(1.01); }
        }
        .hm-exp-badge {
          position:absolute; top:2rem; right:-1.5rem; z-index:20;
          background:#0f172a; border:1px solid rgba(14,165,233,.25);
          border-radius:18px; padding:1rem 1.5rem; text-align:center;
          backdrop-filter:blur(12px); box-shadow:0 20px 40px rgba(0,0,0,.4);
          animation:hm-badgeFloat 5s ease-in-out infinite;
        }
        @keyframes hm-badgeFloat {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-8px); }
        }

        /* ── Link arrow ── */
        .hm-link-arrow {
          color:rgba(255,255,255,.6); font-weight:700; display:flex; align-items:center;
          gap:6px; transition:color .2s; text-decoration:none;
        }
        .hm-link-arrow:hover { color:#fff; }

        /* ── Skeleton loader ── */
        .hm-skeleton {
          height:420px; border-radius:24px;
          background:linear-gradient(110deg,rgba(255,255,255,.03) 8%,rgba(255,255,255,.06) 18%,rgba(255,255,255,.03) 33%);
          background-size:200% 100%;
          animation:hm-shimmer 1.5s linear infinite;
        }
        @keyframes hm-shimmer { to { background-position-x:-200%; } }

        @media (max-width:640px) { .hm-container { padding:0 1rem; } }
      `}</style>
    </div>
  );
}

function CourseCard({ course, idx }) {
  const accents = ['#0ea5e9', '#6366f1', '#f59e0b'];
  const c = accents[idx % 3];
  const [hov, setHov] = useState(false);

  return (
    <div className="sr" style={{ '--delay': `${idx * 0.12}s` }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        borderRadius: '24px', overflow: 'hidden', background: hov ? '#111827' : '#0b1120',
        border: `1px solid ${hov ? c + '44' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov ? `0 25px 60px ${c}22` : '0 4px 15px rgba(0,0,0,0.25)',
        transition: 'all .35s ease',
      }}>
        <div style={{ height: '200px', background: `linear-gradient(135deg,${c}22,${c}08)`, position: 'relative', overflow: 'hidden' }}>
          {course.thumbnail_url && <img src={course.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: hov ? .95 : .8, transition: 'opacity .3s, transform .6s', transform: hov ? 'scale(1.06)' : 'scale(1)' }} />}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom,transparent 50%,rgba(11,17,32,0.95))` }} />
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: c, color: '#fff', padding: '4px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {course.class_type || 'Theory'}
          </div>
        </div>
        <div style={{ padding: '1.75rem' }}>
          <div style={{ color: c, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>
            Grade {course.year || 'A/L'} • {course.subject}
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', lineHeight: '1.4' }}>{course.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{course.price}</span>
            <Link to="/register" style={{
              background: c, color: '#fff', padding: '0.55rem 1.4rem', borderRadius: '12px',
              fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
              transition: 'transform .2s, box-shadow .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${c}44`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >Enroll Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
