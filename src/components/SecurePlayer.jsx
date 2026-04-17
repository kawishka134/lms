import { useState, useEffect, useRef } from 'react';
import { PlayCircle, Clock, Lock } from 'lucide-react';

const SecurePlayer = ({ videoId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const playerDivId = `yt-player-${videoId}`;

  useEffect(() => {
    // Check if script is already present
    if (!window.YT) {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe_api';
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    let checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        playerRef.current = new window.YT.Player(playerDivId, {
          height: '100%', width: '100%', videoId: videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 1, controls: 0, modestbranding: 1, rel: 0, showinfo: 0,
            iv_load_policy: 3, enablejsapi: 1, origin: window.location.origin, playsinline: 1
          },
          events: {
            onReady: (event) => { setIsReady(true); event.target.playVideo(); },
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
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
    };
  }, [videoId]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!playerRef.current || !isReady) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const skip = (seconds, e) => {
    e.stopPropagation();
    if (!playerRef.current || !isReady) return;
    playerRef.current.seekTo(playerRef.current.getCurrentTime() + seconds, true);
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%', backgroundColor: 'black', overflow: 'hidden', aspectRatio: '16/9', borderRadius: '12px', userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <div id={playerDivId} style={{ position: 'absolute', inset: 0 }}></div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'transparent' }} onClick={togglePlay}></div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 110, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', opacity: isPlaying ? 0 : 1, transition: 'opacity 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = isPlaying ? 0 : 1}>
        <button onClick={(e) => skip(-10, e)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={20} style={{ transform: 'scaleX(-1)' }} /><span style={{ position: 'absolute', fontSize: '8px', fontWeight: 900 }}>10</span>
        </button>
        <button onClick={togglePlay} style={{ background: '#0ea5e9', border: 'none', borderRadius: '50%', width: '64px', height: '64px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isPlaying ? <Lock size={28} /> : <PlayCircle size={32} fill="white" />}
        </button>
        <button onClick={(e) => skip(10, e)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={20} /><span style={{ position: 'absolute', fontSize: '8px', fontWeight: 900 }}>10</span>
        </button>
        <button onClick={toggleFullscreen} style={{ position: 'absolute', right: '20px', background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>{isFullscreen ? 'EXIT' : 'FULLSCREEN'}</button>
      </div>
      {!isReady && <div style={{ position: 'absolute', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}><div style={{ width: '40px', height: '40px', border: '3px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>}
      <div style={{ position: 'absolute', top: watermarkPos.top, left: watermarkPos.left, zIndex: 115, pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.75rem', fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', transition: 'all 5s ease-in-out' }}>Nexus Online Protected Content</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SecurePlayer;
