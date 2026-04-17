import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, X, PlayCircle, Clock, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const SecurePlayer = ({ videoId, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const playerDivId = `yt-player-${videoId}`;

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    let checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        playerRef.current = new window.YT.Player(playerDivId, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1
          },
          events: {
            onReady: (event) => {
              setIsReady(true);
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
              if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
              if (event.data === window.YT.PlayerState.ENDED) setIsPlaying(false);
            }
          }
        });
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!playerRef.current || !isReady) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const skip = (seconds, e) => {
    e.stopPropagation();
    if (!playerRef.current || !isReady) return;
    const currentTime = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(currentTime + seconds, true);
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
    } else {
        document.exitFullscreen();
        setIsFullscreen(false);
    }
  };

  const watermarkText = 'Nexus Online Protected Content';
  const [watermarkPos, setWatermarkPos] = useState({ top: '30%', left: '30%' });

  useEffect(() => {
    const int = setInterval(() => {
        setWatermarkPos({ 
            top: Math.floor(Math.random() * 60 + 10) + '%', 
            left: Math.floor(Math.random() * 60 + 10) + '%' 
        });
    }, 8000);
    return () => clearInterval(int);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        backgroundColor: 'black', 
        overflow: 'hidden', 
        aspectRatio: '16/9',
        borderRadius: '12px',
        userSelect: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div id={playerDivId} style={{ position: 'absolute', inset: 0 }}></div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'transparent' }} onClick={togglePlay}></div>
      
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 110, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', opacity: isPlaying ? 0 : 1, transition: 'opacity 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = isPlaying ? 0 : 1}>
        <button onClick={(e) => skip(-10, e)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={20} style={{ transform: 'scaleX(-1)' }} /><span style={{ position: 'absolute', fontSize: '8px', fontWeight: 900 }}>10</span>
        </button>
        <button onClick={togglePlay} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '50%', width: '64px', height: '64px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isPlaying ? <Lock size={28} /> : <PlayCircle size={32} fill="white" />}
        </button>
        <button onClick={(e) => skip(10, e)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={20} /><span style={{ position: 'absolute', fontSize: '8px', fontWeight: 900 }}>10</span>
        </button>
        <button onClick={toggleFullscreen} style={{ position: 'absolute', right: '20px', background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>
          {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
        </button>
      </div>

      {!isReady && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      )}

      <div style={{ position: 'absolute', top: watermarkPos.top, left: watermarkPos.left, zIndex: 115, pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.75rem', fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', transition: 'all 5s ease-in-out' }}>
        {watermarkText}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default function Catalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (data) setCourses(data);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/\/(?:live|embed|shorts)\/([^?&]+)/);
    return match ? match[1] : null;
  };

  // Handle Browser Back Button for Modal (Same as Dashboard)
  useEffect(() => {
    if (selectedVideoId) {
      window.history.pushState({ modalOpen: true }, '');
    }
    
    const handlePopState = (e) => {
      if (selectedVideoId) {
        setSelectedVideoId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVideoId]);

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {c.free_lesson_url && (
                      <button 
                          onClick={(e) => { e.preventDefault(); setSelectedVideoId(extractYouTubeId(c.free_lesson_url)); }} 
                          className="btn btn-outline" 
                          style={{ width: '100%', color: '#10b981', borderColor: '#10b981', fontWeight: 800 }}
                      >
                          Watch Free Demo
                      </button>
                  )}
                  <Link to={`/course/${c.id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: '48px', fontWeight: 800 }}>Explore Course</Link>
                </div>
            </div>
          </div>
        ))}
      </div>

      {selectedVideoId && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.98)', 
            zIndex: 1000, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem' 
          }}
          onClick={() => setSelectedVideoId(null)}
        >
          {/* Top Header for navigation */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1.5rem', display: 'flex', alignItems: 'center', zIndex: 1010 }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedVideoId(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '50px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.9rem',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              <ArrowLeft size={20} />
              BACK TO CATALOG
            </button>
          </div>

          {/* Secure Video Player */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', boxShadow: '0 0 100px rgba(0,0,0,1)' }} onClick={e => e.stopPropagation()}>
            <SecurePlayer videoId={selectedVideoId} />
          </div>
        </div>
      )}
    </div>
  );
}
