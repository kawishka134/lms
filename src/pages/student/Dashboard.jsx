import { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Clock, AlertCircle, PlayCircle, Video, FileText, Phone, ShieldCheck,
  CreditCard, Calendar, Megaphone, UserCircle, UploadCloud, X, CheckCircle, Youtube, Search, MapPin, School, GraduationCap, LogOut, Lock, Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';

const WatermarkVideo = ({ videoId, title, studentProfile }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const playerDivId = `yt-player-${videoId}`;

  useEffect(() => {
    // 1. Load YT API script if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // 2. Initialize Player when API is ready
    let checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        
        playerRef.current = new window.YT.Player(playerDivId, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 1,      // Autoplay as requested
            controls: 0,      // Hide native controls
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
              event.target.playVideo(); // Force play on ready
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

  const watermarkText = studentProfile ? `${studentProfile.email || studentProfile.full_name} | ${studentProfile.phone}` : 'Nexus Online Protected Content';
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
      className="secure-player-container"
      style={{ 
        position: 'relative', 
        width: '100%', 
        backgroundColor: 'black', 
        overflow: 'hidden', 
        aspectRatio: '16/9',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. ACTUAL PLAYER DIV */}
      <div id={playerDivId} style={{ position: 'absolute', inset: 0 }}></div>

      {/* 2. THE FULL SHIELD (Transparent & Blocks all underlying clicks) */}
      <div 
        style={{ 
          position: 'absolute', inset: 0, zIndex: 100, 
          background: 'transparent',
          cursor: isPlaying ? 'default' : 'pointer'
        }}
        onClick={togglePlay}
      ></div>

      {/* 3. CUSTOM OVERLAY CONTROLS (Programmatic only) */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 110, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', opacity: isPlaying ? 0 : 1, transition: 'opacity 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = isPlaying ? 0 : 1}>
        
        <button onClick={(e) => skip(-10, e)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={20} style={{ transform: 'scaleX(-1)' }} />
          <span style={{ position: 'absolute', fontSize: '8px', fontWeight: 900, marginTop: '2px' }}>10</span>
        </button>

        <button onClick={togglePlay} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '50%', width: '64px', height: '64px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(225, 29, 72, 0.4)' }}>
          {isPlaying ? <Lock size={28} /> : <PlayCircle size={32} fill="white" />}
        </button>

        <button onClick={(e) => skip(10, e)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={20} />
          <span style={{ position: 'absolute', fontSize: '8px', fontWeight: 900, marginTop: '2px' }}>10</span>
        </button>

        <button onClick={toggleFullscreen} style={{ position: 'absolute', right: '20px', background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>
          {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
        </button>
      </div>

      {!isReady && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
          <div className="shimmer" style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'white', marginTop: '15px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>INITIALIZING SECURE LINK...</p>
        </div>
      )}

      {/* 4. WATERMARK */}
      <div style={{ position: 'absolute', top: watermarkPos.top, left: watermarkPos.left, zIndex: 115, pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.75rem', fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', transition: 'all 5s ease-in-out' }}>
        {watermarkText}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast: showGlobalToast } = useToast();
  const [studentProfile, setStudentProfile] = useState(null); 
  const [activeTab, setActiveTab] = useState('monthly_payment');
  
  // Payment States
  const [availableCourses, setAvailableCourses] = useState([]);
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null); 
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [recordingAccess, setRecordingAccess] = useState([]);
  const [requestingRecId, setRequestingRecId] = useState(null);
  const [nicNumber, setNicNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');
  
  // Dynamic Views
  const [liveSessions, setLiveSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [freeClasses, setFreeClasses] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [tutes, setTutes] = useState([]);
  const [tuteEnrollments, setTuteEnrollments] = useState([]);
  const [selectedTute, setSelectedTute] = useState(null);
  const [showTuteModal, setShowTuteModal] = useState(false);

  // Notifications
  const [newNoticesCount, setNewNoticesCount] = useState(0);
  const [latestNoticeTitle, setLatestNoticeTitle] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [instituteSettings, setInstituteSettings] = useState(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Video Playback
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // High-precision Live Timer
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Browser Back Button for Modal
  useEffect(() => {
    if (selectedVideo) {
      window.history.pushState({ modalOpen: true }, '');
    }
    
    const handlePopState = (e) => {
      if (selectedVideo) {
        setSelectedVideo(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVideo]);

  const fileInputRef = useRef(null);

  useEffect(() => {
     let isMounted = true;
     const fetchData = async () => {
         try {
             const { data: { session } } = await supabase.auth.getSession();
             if (!session && isMounted) {
                navigate('/login');
                return;
             }
             if (session && session.user && isMounted) {
                 const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                 if (profile) {
                     setStudentProfile(profile);
                     if(profile.nic) setNicNumber(profile.nic);

                     // 1. Fetch available courses and filter by student profile (Year/Grade/Subject)
                     const { data: allCourses } = await supabase
                         .from('courses')
                         .select('*, instructors(name)');
                     
                     if (allCourses && isMounted) {
                         const filtered = allCourses.filter(course => {
                             const studentGrade = String(profile.grade || '').toLowerCase();
                             const studentYear = String(profile.year || '').toLowerCase();
                             const studentSubjects = String(profile.subject || '').toLowerCase();
                             
                             const courseGrade = String(course.year || '').toLowerCase();
                             const courseBatch = String(course.batch || '').toLowerCase();
                             const courseSubject = String(course.subject || '').toLowerCase();

                             // Match Grade/Year:
                             // Course 'year' (Grade) should match profile.grade or be contained in it (e.g. "12" in "Grade 12")
                             const gradeMatch = studentGrade.includes(courseGrade) || studentYear.includes(courseGrade) || courseGrade.includes(studentGrade);
                             
                             // Match Subject:
                             // Course 'subject' should be inside the student's combined subject string
                             const subjectMatch = studentSubjects.includes(courseSubject);

                             // Optional Batch match: if course has a batch year, it should match student's year
                             if (courseBatch && profile.year) {
                                 const batchMatch = studentYear.includes(courseBatch);
                                 return gradeMatch && subjectMatch && batchMatch;
                             }

                             return gradeMatch && subjectMatch;
                         });
                         setAvailableCourses(filtered);
                     }

                     // 2. Fetch all current enrollments
                     const { data: enrollData } = await supabase
                         .from('enrollments')
                         .select('*')
                         .eq('student_id', session.user.id);
                     
                     if(enrollData && isMounted) {
                         setAllEnrollments(enrollData);
                         const hasActive = enrollData.some(e => e.status === 'approved' && (!e.expires_at || new Date(e.expires_at) > new Date()));
                         setEnrollmentStatus(hasActive ? 'approved' : 'not_active');
                     }

                     const isAudienceMatch = (targetAudienceStr, profileData) => {
                         if (!targetAudienceStr || targetAudienceStr === 'All Students') return true;
                         if (!profileData) return false;
                         const studentData = `${profileData.grade} ${profileData.year} ${profileData.subject} ${profileData.medium}`.toLowerCase();
                         const targets = targetAudienceStr.split(',').map(t => t.trim().toLowerCase());
                         return targets.some(target => {
                             const words = target.split(' ').filter(w => w !== '');
                             return words.every(word => studentData.includes(word));
                         });
                     };

                     // Load filtered content
                     const { data: notices } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
                     if(notices) setAnnouncements(notices.filter(n => isAudienceMatch(n.target_audience, profile)));

                     const { data: timetable } = await supabase.from('schedules').select('*').order('created_at', { ascending: false });
                     if(timetable) setSchedules(timetable.filter(n => isAudienceMatch(n.target_audience, profile)));

                     const { data: sessions } = await supabase.from('live_sessions').select('*').order('created_at', { ascending: false });
                     if(sessions) setLiveSessions(sessions);

                     const { data: freeContent } = await supabase.from('free_classes').select('*').order('created_at', { ascending: false });
                     if(freeContent) setFreeClasses(freeContent.filter(n => isAudienceMatch(n.target_audience, profile)));

                      const { data: records } = await supabase.from('recordings').select('*').order('created_at', { ascending: false });
                     if(records) setRecordings(records.filter(r => isAudienceMatch(r.target_audience, profile)));

                     const { data: recAccess } = await supabase.from('recording_access_requests').select('*').eq('student_id', session.user.id);
                     if(recAccess && isMounted) setRecordingAccess(recAccess);

                     const { data: allTutes } = await supabase.from('tutes').select('*').order('created_at', { ascending: false });
                     if(allTutes) setTutes(allTutes.filter(t => isAudienceMatch(t.target_audience, profile)));

                     const { data: myTutes } = await supabase.from('tute_enrollments').select('*').eq('student_id', session.user.id);
                     if(myTutes) setTuteEnrollments(myTutes);

                     const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
                     if(settings) setInstituteSettings(settings);
                 }
             }
         } catch(e) { console.error(e) }
     };
     fetchData();
      const channel = supabase.channel('dashboard_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'free_classes' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recordings' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recording_access_requests' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tute_enrollments' }, () => fetchData())
        .subscribe();
      return () => { isMounted = false; supabase.removeChannel(channel); }
  }, [studentProfile?.id]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadErrorMsg('');
    if(!nicNumber || !selectedFile || !selectedCourseId) { 
        setUploadErrorMsg("Select a class, provide NIC and Receipt."); 
        return; 
    }

    if (studentProfile && nicNumber !== studentProfile.nic) {
        setUploadErrorMsg("Entered NIC does not match your registered profile.");
        return;
    }

    setIsUploading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `slip-${session.user.id}-${selectedCourseId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('payment_slips').upload(fileName, selectedFile);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('payment_slips').getPublicUrl(fileName);

        const { error: upsertError } = await supabase.from('enrollments').upsert({
            student_id: session.user.id,
            course_id: selectedCourseId,
            slip_url: data.publicUrl,
            status: 'pending'
        }, { onConflict: 'student_id, course_id' });

        if (upsertError) throw upsertError;

        setShowUploadModal(false);
        showGlobalToast("Receipt uploaded! Admin will approve it shortly.", 'success');
        window.location.reload(); 
    } catch (err) { setUploadErrorMsg(err.message); } finally { setIsUploading(false); }
  };

  const handleTuteRequest = async (e) => {
    e.preventDefault();
    if (!selectedTute || !selectedFile) {
      alert("Please select a tute and upload a payment slip.");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated.");

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `tute_slip-${session.user.id}-${selectedTute.id}-${Date.now()}.${fileExt}`;
      await supabase.storage.from('tute_slips').upload(fileName, selectedFile);
      const { data } = supabase.storage.from('tute_slips').getPublicUrl(fileName);

      await supabase.from('tute_enrollments').upsert({
        student_id: session.user.id,
        tute_id: selectedTute.id,
        slip_url: data.publicUrl,
        status: 'pending'
      }, { onConflict: 'student_id, tute_id' });

      // WhatsApp Notify
      const waMsg = `Hi Admin, I have requested Tute PDF: *${selectedTute.title}* and uploaded the slip. My Phone: ${studentProfile.phone}. Please approve.`;
      const waUrl = `https://wa.me/94761180532?text=${encodeURIComponent(waMsg)}`;
      window.open(waUrl, '_blank');

      // Refresh tute enrollments
      const { data: myTutes } = await supabase.from('tute_enrollments').select('*').eq('student_id', session.user.id);
      if(myTutes) setTuteEnrollments(myTutes);

      setShowTuteModal(false);
      setSelectedTute(null);
      setSelectedFile(null);
      alert("Tute payment slip uploaded successfully! It will be reviewed shortly.");
    } catch (err) {
      console.error("Error uploading tute slip:", err);
      alert("Failed to upload tute slip: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const extractYouTubeId = (url) => {
      if (!url) return null;
      const match = url.match(/[?&]v=([^&]+)/) || 
                    url.match(/youtu\.be\/([^?]+)/) || 
                    url.match(/\/(?:live|embed|shorts)\/([^?&]+)/);
      return match ? match[1] : null;
  };


  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };




  const sections = [
    { id: 'monthly_payment', label: 'Payment', icon: <CreditCard size={18} /> },
    { id: 'free_class', label: 'Free Class', icon: <PlayCircle size={18} /> },
    { id: 'recordings', label: 'Recordings', icon: <Video size={18} />, isPremium: true },
    { id: 'live_today', label: 'Live Today', icon: <Clock size={18} />, isPremium: true },
    { id: 'class_schedule', label: 'Class Schedule', icon: <Calendar size={18} />, isPremium: true },
    { id: 'tute_pdf', label: 'Class Tute PDF', icon: <FileText size={18} />, isPremium: true },
    { id: 'special_announce', label: 'Special Announce', icon: <Megaphone size={18} /> },
    { id: 'about_me', label: 'About Me', icon: <UserCircle size={18} /> },
  ];

  const LockNotice = () => (
    <div className="card glass" style={{ padding: '4rem 2rem', textAlign: 'center', border: '2px solid var(--color-primary-light)', backgroundColor: 'rgba(225, 29, 72, 0.03)' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'var(--color-primary)' }}>
            <CreditCard size={40} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem' }}>Restricted Access</h2>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', lineHeight: '1.6', marginBottom: '2.5rem' }}>
            මෙම අංශය නැරඹීමට කරුණාකර මාසික ගාස්තු ගෙවා අනුමැතිය ලබාගන්න.<br/>
            (Please pay the monthly fee to unlock this section).
        </p>
        <button onClick={() => setActiveTab('monthly_payment')} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>Go to Payment Section</button>
    </div>
  );

  const renderContent = () => {
    const todayDay = getCurrentDay();

    const currentSection = sections.find(s => s.id === activeTab);
    if (currentSection?.isPremium && enrollmentStatus !== 'approved') {
        return <LockNotice />;
    }

    switch(activeTab) {
        case 'live_today':
            const currentLiveSchedules = schedules.filter(s => s.day === todayDay);
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {liveSessions.map(session => (
                        <div key={session.id} className="card glass" style={{ borderLeft: '6px solid var(--color-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
                            <div>
                                <span className="badge badge-danger" style={{ marginBottom: '0.5rem' }}>LIVE NOW</span>
                                <h3 style={{ margin: 0, fontWeight: 900 }}>{session.title}</h3>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)' }}>Type: {session.class_type} | Time: {session.time}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {session.zoom_link && <a href={session.zoom_link} target="_blank" rel="noreferrer" className="btn btn-primary">Join Zoom</a>}
                                {session.youtube_link && (
                                    <button 
                                        onClick={() => setSelectedVideo({ url: session.youtube_link, title: session.title })} 
                                        className="btn btn-outline" 
                                        style={{ color: '#ff0000', borderColor: '#ff0000', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Youtube size={18} /> Watch Live
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {currentLiveSchedules.map(s => (
                        <div key={s.id} className="card" style={{ borderLeft: '6px solid var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
                            <div>
                                <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>WEEKLY CLASS</span>
                                <h3 style={{ margin: 0, fontWeight: 900 }}>{s.topic}</h3>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)' }}>Time: {s.time}</p>
                            </div>
                            {s.zoom_link && <a href={s.zoom_link} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ backgroundColor: '#2D8CFF' }}>Join Zoom</a>}
                        </div>
                    ))}
                    {liveSessions.length === 0 && currentLiveSchedules.length === 0 && (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>No live classes scheduled for this moment.</div>
                    )}
                </div>
            );
        case 'free_class':
            // Logic: Live events expire 2 hours after start (if date/time exists) or if explicitly expired
            const isActuallyLive = (item) => {
                if (!item.is_live) return false;
                if (!item.expires_at) return true; // If no expiry set, keep it live
                return new Date(item.expires_at) > new Date();
            };

            const freeSchedules = schedules.filter(s => s.day === todayDay && s.is_free);
            const liveContentFree = freeClasses.filter(isActuallyLive);
            
            const allLiveFree = [
                ...freeSchedules.map(s => ({ ...s, type: 'schedule' })),
                ...liveContentFree.map(c => ({ ...c, type: 'content', topic: c.topic || c.title }))
            ];

            const filteredFree = freeClasses.filter(i => !isActuallyLive(i) && i.title.toLowerCase().includes(searchQuery.toLowerCase()));

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Live & Featured Free Classes (Banners) */}
                    {allLiveFree.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} /> Today's Live Events</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                                {allLiveFree.map((s, idx) => (
                                    <div key={idx} className="card glass shimmer" style={{ borderLeft: '6px solid var(--color-success)', overflow: 'hidden', position: 'relative', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                <span className="badge badge-success" style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}>LIVE FREE CLASS</span>
                                                {s.time && <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>| {s.time}</span>}
                                            </div>
                                            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem' }}>{s.topic}</h3>
                                            <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', opacity: 0.8, fontWeight: 500 }}>Join the live session for free now!</p>
                                        </div>
                                        {(s.zoom_link || s.youtube_link) && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {s.zoom_link && <a href={s.zoom_link} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', borderRadius: '50px' }}>Join Zoom</a>}
                                                {s.type === 'content' && s.youtube_link && (
                                                    <button 
                                                        onClick={() => setSelectedVideo({ url: s.youtube_link, title: s.topic })} 
                                                        className="btn btn-outline" 
                                                        style={{ color: '#ff0000', borderColor: '#ff0000', padding: '0.6rem 1.25rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                    >
                                                        <Youtube size={18} /> Watch Live
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Permanent Free Content Library */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlayCircle size={18} /> Lesson Library</h3>
                        {filteredFree.length === 0 ? (
                            <div className="card" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No free lessons found matching your criteria.</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                                {filteredFree.map(item => (
                                    <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-surface-border)', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedVideo({ url: item.youtube_link, title: item.title })}>
                                            {extractYouTubeId(item.youtube_link) ? (
                                                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                                                    <img 
                                                        src={`https://img.youtube.com/vi/${extractYouTubeId(item.youtube_link)}/maxresdefault.jpg`} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                        alt={item.title}
                                                        onError={(e) => e.target.src = `https://img.youtube.com/vi/${extractYouTubeId(item.youtube_link)}/0.jpg`}
                                                    />
                                                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                                            <PlayCircle size={32} color="white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={48} color="var(--color-primary)" /></div>
                                            )}
                                            {!item.youtube_link && item.zoom_link && (
                                                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                                                    <span className="badge badge-primary" style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>ZOOM RESOURCE</span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ padding: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: '1.4' }}>{item.title}</h3>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', minHeight: '2.4rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                                            
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                {item.youtube_link && (
                                                    <button 
                                                        onClick={() => setSelectedVideo({ url: item.youtube_link, title: item.title })} 
                                                        className="btn btn-outline" 
                                                        style={{ flex: 1, color: '#ff0000', borderColor: '#ff0000', fontSize: '0.8rem', padding: '0.5rem' }}
                                                    >
                                                        <Youtube size={16} /> Watch In-App
                                                    </button>
                                                )}
                                                {!item.youtube_link && item.zoom_link && <a href={item.zoom_link} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}>Join Zoom</a>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        case 'recordings':
            const allRecsContent = [...recordings, ...freeClasses.filter(f => f.youtube_link).map(f => ({...f, is_free_bonus: true}))].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            const filteredRecs = allRecsContent.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const handleRequestAccess = async (recId, isSelfUnlock = false) => {
                setRequestingRecId(recId);
                try {
                    const now = new Date();
                    const expiryHours = isSelfUnlock ? 5 : null; 
                    const expires_at = expiryHours ? new Date(now.getTime() + (expiryHours * 60 * 60 * 1000)).toISOString() : null;
                    
                    // First delete any previous requests ('stuck' or expired) to ensure a fresh one
                    await supabase.from('recording_access_requests')
                        .delete()
                        .eq('student_id', studentProfile.id)
                        .eq('recording_id', recId);

                    const { error } = await supabase.from('recording_access_requests').insert({
                        student_id: studentProfile.id,
                        recording_id: recId,
                        status: isSelfUnlock ? 'approved' : 'pending',
                        approved_at: isSelfUnlock ? now.toISOString() : null,
                        expires_at: expires_at
                    });
                    
                    if (error) throw error;
                    alert(isSelfUnlock ? "පැය 5කට වීඩියෝව Unlock වුණා! (One-time Access Granted for 5h)" : "අනුමැතිය සඳහා ගුරුවරයා වෙත යොමු කළා! (Recording Request Sent to Instructor)");
                    
                    const { data: updated } = await supabase.from('recording_access_requests').select('*').eq('student_id', studentProfile.id);
                    setRecordingAccess(updated || []);
                } catch (e) { 
                    alert("Request failed. Please try again."); 
                    console.error(e);
                }
                setRequestingRecId(null);
            };

            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {filteredRecs.map((item, idx) => {
                        const now = currentTime;
                        const created = new Date(item.created_at);
                        const diffMs = now - created;
                        const limitSeconds = 12 * 3600;
                        const elapsedSeconds = Math.floor(diffMs / 1000);
                        const remainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);
                        const isInitialTimeExpired = elapsedSeconds >= limitSeconds && !item.is_free_bonus;
                        
                        const accessReq = recordingAccess.find(a => a.recording_id === item.id);
                        const isApproved = accessReq?.status === 'approved' && (!accessReq.expires_at || new Date(accessReq.expires_at) > now);
                        const isLocked = isInitialTimeExpired && !isApproved;

                        const h = Math.floor(remainingSeconds / 3600);
                        const m = Math.floor((remainingSeconds % 3600) / 60);
                        const s = remainingSeconds % 60;

                        return (
                            <div key={item.id + '_' + idx} className="card" style={{ padding: 0, overflow: 'hidden', border: isLocked ? '2px dashed #94a3b8' : '1px solid #f1f5f9', transition: 'all 0.3s' }}>
                                <div style={{ position: 'relative', cursor: isLocked ? 'default' : 'pointer' }} onClick={() => !isLocked && setSelectedVideo({ url: item.youtube_link, title: item.title, studentProfile })}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                                        <img 
                                            src={`https://img.youtube.com/vi/${extractYouTubeId(item.youtube_link)}/maxresdefault.jpg`} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isLocked ? 'blur(10px) grayscale(1)' : 'none', opacity: isLocked ? 0.6 : 1, transition: 'all 0.5s' }} 
                                            alt={item.title}
                                            onError={(e) => e.target.src = `https://img.youtube.com/vi/${extractYouTubeId(item.youtube_link)}/0.jpg`}
                                        />
                                        <div style={{ position: 'absolute', inset: 0, backgroundColor: isLocked ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {isLocked ? (
                                                <>
                                                    <Lock size={42} color="#475569" />
                                                    <div style={{ backgroundColor: 'rgba(71, 85, 105, 0.9)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 900 }}>🔒 ACCESS EXPIRED</div>
                                                </>
                                            ) : (
                                                <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                                    <PlayCircle size={32} color="white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{item.title}</h3>
                                        {item.is_free_bonus && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>FREE</span>}
                                        {isApproved && accessReq?.expires_at && <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>{accessReq.approved_at === accessReq.expires_at ? 'ADMIN' : 'EXTRA TIME'}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                                    </div>

                                    {isLocked ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            {!accessReq ? (
                                                <>
                                                    <p style={{ fontSize: '0.72rem', color: '#991b1b', margin: 0, fontWeight: 800 }}>⚠️ කාල සීමාව අවසන්! තව පැය 5ක් මෙය බැලීමට Self-Unlock කළ හැක.</p>
                                                    <button onClick={() => handleRequestAccess(item.id, true)} disabled={requestingRecId === item.id} className="btn btn-primary" style={{ width: '100%', fontWeight: 900, backgroundColor: '#991b1b', borderColor: '#991b1b', height: '48px' }}>
                                                        {requestingRecId === item.id ? 'Unlocking...' : 'Unlock Now (5 Hours Free)'}
                                                    </button>
                                                </>
                                            ) : accessReq.status === 'pending' ? (
                                                <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b', color: '#92400e', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>⏳ Access Request Pending...</div>
                                            ) : (
                                                <>
                                                    <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: 0, fontWeight: 700 }}>පැය 5 අමතර කාලයත් අවසන්. නැවත බලන්න අවශ්‍ය නම් පණිවිඩයක් එවන්න.</p>
                                                    <button onClick={() => handleRequestAccess(item.id, false)} disabled={requestingRecId === item.id} className="btn btn-primary" style={{ width: '100%', backgroundColor: '#1e40af', fontWeight: 900, height: '48px' }}>
                                                        {requestingRecId === item.id ? 'Sending...' : 'Request More Time (Admin)'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                             {!isInitialTimeExpired && (
                                                <div style={{ padding: '0.6rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534' }}>
                                                        <Clock size={16} /> <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>Live Time:</span>
                                                    </div>
                                                    <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#166534', backgroundColor: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '1rem' }}>{h}h {m}m {s}s</div>
                                                </div>
                                             )}
                                             {isApproved && accessReq?.expires_at && (
                                                <div style={{ padding: '0.6rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #f97316', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c2410c' }}>
                                                        <Clock size={16} /> <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>Until Expire:</span>
                                                    </div>
                                                    <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#c2410c' }}>{Math.max(0, Math.floor((new Date(accessReq.expires_at) - now) / 3600000))}h {Math.floor(((new Date(accessReq.expires_at) - now) / 60000) % 60)}m {Math.floor(((new Date(accessReq.expires_at) - now) / 1000) % 60)}s</div>
                                                </div>
                                             )}
                                             <button onClick={() => setSelectedVideo({ url: item.youtube_link, title: item.title, studentProfile })} className="btn btn-outline" style={{ width: '100%', color: '#ff0000', borderColor: '#ff0000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '48px' }}>
                                                <PlayCircle size={18} /> Watch Recording
                                             </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        case 'tute_pdf':
            const filteredTutes = tutes.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredTutes.map(tute => {
                        const myEnroll = tuteEnrollments.find(e => e.tute_id === tute.id);
                        const isUnlocked = tute.is_free || myEnroll?.status === 'approved';
                        return (
                            <div key={tute.id} className="card" style={{ borderLeft: isUnlocked ? '6px solid var(--color-success)' : '6px solid var(--color-primary-light)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    {tute.is_free ? <span className="badge badge-success">FREE TUTE</span> : <span className="badge badge-primary">PREMIUM (Rs. {tute.price})</span>}
                                    {!tute.is_free && myEnroll?.status === 'pending' && <span className="badge badge-warning" style={{ color: 'white' }}>PENDING REVIEW</span>}
                                </div>
                                <h3 style={{ fontWeight: 800 }}>{tute.title}</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{tute.description}</p>

                                {isUnlocked ? (
                                    <a href={tute.file_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #166534' }}>
                                        <FileText size={18} /> Open/Download PDF
                                    </a>
                                ) : (
                                    <button
                                        onClick={() => { setSelectedTute(tute); setShowTuteModal(true); }}
                                        className="btn btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                                    >
                                        <Lock size={18} /> Buy This Tute
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        case 'about_me':
            return (
                <div className="card" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}><UserCircle size={28} /> My Profile</h3>
                    {studentProfile && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
                            <div><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>FULL NAME</span>{studentProfile.full_name}</div>
                            <div><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>🎫 NIC NUMBER</span>{studentProfile.nic || 'Not Linked'}</div>
                            <div><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>📞 WHATSAPP</span>{studentProfile.phone}</div>
                            <div><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>GRADE / YEAR</span>{studentProfile.grade || 'N/A'} - {studentProfile.year || ''}</div>
                            <div><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>📚 ENROLLED SUBJECTS</span>{studentProfile.subject || 'None selected'}</div>
                            <div><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>SCHOOL</span>{studentProfile.school || 'N/A'}</div>
                            <div><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>DISTRICT</span>{studentProfile.district}</div>
                            <div style={{ gridColumn: '1 / -1' }}><span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>ADDRESS</span>{studentProfile.address}</div>
                        </div>
                    )}
                    <button onClick={handleLogout} className="btn btn-outline" style={{ marginTop: '3rem', width: '100%', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Logout Session</button>
                </div>
            );
        case 'monthly_payment':
            if (availableCourses.length === 0) return (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                    <AlertCircle size={48} style={{ marginBottom: '1rem', color: 'var(--color-warning)' }} />
                    <h3 style={{ fontWeight: 800 }}>No Classes Found</h3>
                    <p>ඔබේ ශ්‍රේණියට සහ විෂයට අදාළව දැනට පන්ති සොයාගත නොහැක. කරුණාකර Admin සම්බන්ධ කරගන්න.</p>
                </div>
            );
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-primary-light)', borderRadius: '1rem', border: '1px solid var(--color-primary)' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                            👋 පහත දැක්වෙන්නේ ඔබේ {studentProfile?.year} - {studentProfile?.subject} විෂය නිර්දේශයට අදාළ පන්ති වේ. ඔබට අවශ්‍ය පන්තිය තෝරා "Pay Now" මගින් ගෙවීම් කරන්න.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {availableCourses.map(course => {
                            const enrollment = allEnrollments.find(e => e.course_id === course.id);
                            const isExpired = enrollment?.expires_at && new Date(enrollment.expires_at) < new Date();
                            
                            let statusBadge = <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>NOT ENROLLED</span>;
                            if (enrollment) {
                                if (enrollment.status === 'pending') statusBadge = <span className="badge badge-warning" style={{ color: 'white' }}>PENDING REVIEW</span>;
                                else if (enrollment.status === 'approved') {
                                    if (isExpired) statusBadge = <span className="badge badge-danger">EXPIRED</span>;
                                    else statusBadge = <span className="badge badge-success">ACTIVE / PAID</span>;
                                }
                                else if (enrollment.status === 'rejected') statusBadge = <span className="badge badge-danger">REJECTED</span>;
                            }

                            return (
                                <div key={course.id} className="card glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: enrollment?.status === 'approved' && !isExpired ? '2px solid #22c55e' : '1px solid #eee' }}>
                                    {course.thumbnail_url && (
                                        <div style={{ width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid var(--color-surface-border)' }}>
                                            <img src={course.thumbnail_url} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        {statusBadge}
                                        <span style={{ fontWeight: 900, color: 'var(--color-primary)' }}>{course.price}</span>
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>{course.title}</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', flex: 1 }}>{course.description || 'Access monthly lessons, recordings and tutes for this class.'}</p>
                                    
                                    {course.free_lesson_url && (
                                        <button 
                                            onClick={(e) => { e.preventDefault(); setSelectedVideo({ url: course.free_lesson_url, title: `Free Lesson: ${course.title}` }); }} 
                                            className="btn btn-outline" 
                                            style={{ width: '100%', marginBottom: '0.75rem', color: '#10b981', borderColor: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}
                                        >
                                            <PlayCircle size={16} /> Watch Free Lesson
                                        </button>
                                    )}

                                    {(!enrollment || enrollment.status === 'rejected' || isExpired) ? (
                                        <button 
                                            onClick={() => { setSelectedCourseId(course.id); setShowUploadModal(true); }} 
                                            className="btn btn-primary" style={{ width: '100%' }}
                                        >
                                            <CreditCard size={18} /> Pay Now
                                        </button>
                                    ) : enrollment.status === 'pending' ? (
                                        <button disabled className="btn btn-outline" style={{ width: '100%', opacity: 0.5 }}>Waiting for Approval</button>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534', fontWeight: 800, fontSize: '0.9rem' }}>
                                            ✅ Access Unlocked
                                            {enrollment.expires_at && <div style={{ fontSize: '0.7rem', fontWeight: 500 }}>Expires: {new Date(enrollment.expires_at).toLocaleDateString()}</div>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        case 'special_announce':
            return <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>{announcements.map(ann => <div key={ann.id} className="card" style={{ padding: '2.5rem', borderLeft: '6px solid var(--color-primary)' }}><h3>{ann.title}</h3><p style={{ whiteSpace: 'pre-line' }}>{ann.message}</p></div>)}</div>;
        case 'class_schedule':
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {schedules.map(block => (
                        <div key={block.id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '0.5rem', textAlign: 'center', borderRadius: '8px', color: 'var(--color-primary)', fontWeight: 800, marginBottom: '1rem' }}>{block.day}</div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{block.topic}</h3>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 600 }}><Clock size={14} /> {block.time}</div>
                        </div>
                    ))}
                </div>
            );
        default: return <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>Coming Soon...</div>;
    }
  };

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden' }}>
      {showToast && <div className="glass shimmer" style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 3000, borderLeft: '5px solid var(--color-primary)', padding: '1.25rem', borderRadius: '1rem', boxShadow: 'var(--shadow-premium)', display: 'flex', alignItems: 'center', gap: '1.25rem', width: '380px', maxWidth: 'calc(100vw - 3rem)' }}><Megaphone size={26} color="var(--color-primary)" /><div style={{ flex: 1 }}><h4 style={{ margin: 0, fontWeight: 900 }}>New Alert!</h4><p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>{latestNoticeTitle}</p></div><X size={20} onClick={() => setShowToast(false)} style={{ cursor: 'pointer', opacity: 0.4 }} /></div>}
      <header style={{ height: '85px', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', zIndex: 1000, position: 'relative' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div><h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Student Dashboard</h1><p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>Welcome, {studentProfile?.full_name}</p></div>
             {enrollmentStatus === 'approved' && <div style={{ backgroundColor: 'white', color: 'var(--color-primary)', padding: '0.4rem 1.25rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem' }}>ENROLLED</div>}
          </div>
      </header>
      <div className="container" style={{ height: 'calc(100vh - 85px)', display: 'flex', overflow: 'hidden', padding: '1.5rem 0' }}>
          <div className="dashboard-grid" style={{ width: '100%', height: '100%' }}>
              <aside className="dashboard-sidebar card glass" style={{ margin: '0 0.5rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h2 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', padding: '0.5rem 1rem' }}>Menu</h2>
                  {sections.map(s => (
                      <button key={s.id} onClick={() => setActiveTab(s.id)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '1rem 1.2rem', borderRadius: '12px', border: 'none', background: activeTab === s.id ? 'var(--color-primary-light)' : 'transparent', color: activeTab === s.id ? 'var(--color-primary)' : 'inherit', fontWeight: activeTab === s.id ? 900 : 500, cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem' }}>
                          <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {s.icon}
                            {s.id === 'special_announce' && announcements.length > 0 && (
                                <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid white', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)' }}>
                                    {announcements.length}
                                </span>
                            )}
                          </span>
                          <span className="sidebar-label">{s.label}</span>
                      </button>
                  ))}
                  <button onClick={handleLogout} style={{ marginTop: 'auto', background: 'none', border: 'none', padding: '1rem', color: 'var(--color-danger)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LogOut size={18} /> Logout</button>
              </aside>
              <main className="dashboard-main" style={{ flex: 1, padding: '0 1rem' }}>
                  <div style={{ position: 'sticky', top: 0, background: 'var(--color-bg)', backdropFilter: 'blur(10px)', padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {sections.find(s => s.id === activeTab)?.label}
                        {activeTab === 'special_announce' && announcements.length > 0 && (
                            <span className="glass-premium" style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem', borderRadius: '12px', backgroundColor: '#ef4444', color: 'white', fontWeight: 800, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
                              {announcements.length} New
                            </span>
                        )}
                      </h2>
                      {(activeTab === 'free_class' || activeTab === 'recordings') && <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: '0.6rem 1.2rem', borderRadius: '50px', border: '1px solid var(--color-surface-border)' }} />}
                  </div>
                  <div style={{ paddingBottom: '12rem' }}>{renderContent()}</div>
              </main>
          </div>
      </div>
      <nav className="mobile-bottom-nav">
          {[
              { id: 'monthly_payment', label: 'Payment', icon: <CreditCard size={20} /> },
              { id: 'free_class', label: 'Free', icon: <PlayCircle size={20} /> },
              { id: 'recordings', label: 'Rec', icon: <Video size={20} /> },
              { id: 'live_today', label: 'Live', icon: <Clock size={20} /> },
              { id: 'class_schedule', label: 'Schedule', icon: <Calendar size={20} /> },
              { id: 'tute_pdf', label: 'Tutes', icon: <FileText size={20} /> },
              { id: 'special_announce', label: 'Notices', icon: <Megaphone size={20} /> },
              { id: 'about_me', label: 'Me', icon: <UserCircle size={20} /> }
          ].map(s => (
              <button key={s.id} onClick={() => setActiveTab(s.id)} className={`nav-item-mobile ${activeTab === s.id ? 'active' : ''}`} style={{ position: 'relative' }}>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {s.icon}
                    {s.id === 'special_announce' && announcements.length > 0 && (
                        <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid white', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)' }}>
                            {announcements.length}
                        </span>
                    )}
                  </div>
                  <span>{s.label}</span>
              </button>
          ))}
      </nav>
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '1100px', height: 'auto', maxHeight: '95vh', overflowY: 'auto', position: 'relative', padding: '2rem', background: 'white', color: '#0f172a', borderRadius: '24px', border: '5px solid #eee', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem' }}>
            
            <button onClick={() => setShowUploadModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', zIndex: 10 }}><X size={28} /></button>

            {/* Left Section: Video Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <Video size={24} color="var(--color-primary)" />
                   <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>About this Class</h2>
                </div>

                <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.1)', border: '1px solid #eee' }}>
                     {(() => {
                        const course = availableCourses.find(c => c.id === selectedCourseId);
                        const videoUrl = course?.promo_video_url;
                        if (!videoUrl) return (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                                <PlayCircle size={64} />
                            </div>
                        );

                        const ytId = extractYouTubeId(videoUrl);
                        if (ytId) {
                            return (
                                <iframe 
                                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="Promo Video"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                />
                            );
                        }
                        return <video src={videoUrl} autoPlay loop playsInline controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                     })()}
                </div>

                {availableCourses.find(c => c.id === selectedCourseId)?.free_lesson_url && (
                    <div style={{ padding: '1.5rem', borderRadius: '20px', border: '2px solid #22c55e', backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                         <div style={{ background: '#22c55e', color: 'white', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>Limited Time Access</div>
                         <h3 style={{ margin: 0, fontWeight: 800 }}>Watch a Free Demo Lesson</h3>
                         <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', opacity: 0.8 }}>Check the teaching style before you enroll.</p>
                         <button 
                            onClick={() => { setShowUploadModal(false); setSelectedVideo({ url: availableCourses.find(c => c.id === selectedCourseId).free_lesson_url, title: `Demo: ${availableCourses.find(c => c.id === selectedCourseId).title}` }); }}
                            className="btn btn-primary" 
                            style={{ background: '#22c55e', width: '100%', gap: '0.75rem' }}
                         >
                            <PlayCircle size={20} /> Watch Free Lesson
                         </button>
                    </div>
                )}
            </div>

            {/* Right Section: Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <CreditCard size={24} color="#0ea5e9" />
                   <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Secure Payment</h2>
                </div>

                <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '20px', borderLeft: '6px solid #0ea5e9', marginBottom: '0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0369a1', lineHeight: '1.7', fontSize: '0.95rem' }}>
                        ⚠️ බැංකු රිසිට් පතේ (Slip) පෑනෙන් පැහැදිලිව පහත විස්තර ලියන්න:<br/>
                        1. ඔබේ සම්පූර්ණ නම<br/>
                        2. පන්තියේ නම<br/>
                        3. දුරකථන අංකය
                    </p>
                </div>

                {/* Bank Payment Details */}
                {(() => {
                    const course = availableCourses.find(c => c.id === selectedCourseId);
                    if (!course?.bank_account_no) return null;
                    return (
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid #22c55e', borderRadius: '20px', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ width: '42px', height: '42px', backgroundColor: '#16a34a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🏦</div>
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#14532d' }}>ගෙවීමේ බැංකු විස්තර</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Bank Transfer Details</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[
                                    { label: 'Bank Name / බැංකුව', value: course.bank_name },
                                    { label: 'Account Number / ගිණුම් අංකය', value: course.bank_account_no },
                                    { label: 'Account Name / නම', value: course.bank_account_name },
                                    { label: 'Branch / ශාඛාව', value: course.bank_branch },
                                ].filter(item => item.value).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</span>
                                        <span style={{ fontWeight: 900, color: '#14532d', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ margin: '1rem 0 0', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, textAlign: 'center' }}>
                                💡 ඉහත ගිණුමට මුදල් transfer කර, රිසිට් පත photo ගෙන upload කරන්න
                            </p>
                        </div>
                    );
                })()}

                <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Verify NIC Number</label>
                        <input placeholder="200414402846" value={nicNumber} onChange={e => setNicNumber(e.target.value)} style={{ width: '100%', padding: '1.25rem', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Upload Receipt Image</label>
                        <div onClick={() => fileInputRef.current.click()} style={{ border: '3px dashed #0ea5e9', background: '#f8fafc', padding: '2.5rem', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <UploadCloud size={40} color="#0ea5e9" style={{ marginBottom: '1rem', opacity: 0.7 }} />
                            <p style={{ margin: 0, fontWeight: 800, color: '#0ea5e9', fontSize: '1rem' }}>{selectedFile ? selectedFile.name : 'Click to Upload Slip Image'}</p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>0 Files With Changes</p>
                        </div>
                    </div>
                    {uploadErrorMsg && <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>❌ {uploadErrorMsg}</p>}
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} />
                    
                    <button type="submit" disabled={isUploading} style={{ background: 'var(--color-primary-gradient)', color: 'white', padding: '1.25rem', borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(14, 165, 233, 0.3)' }}>
                        {isUploading ? 'Registering...' : 'Submit Payment Slip'}
                    </button>
                </form>
            </div>
          </div>
        </div>
      )}

       {/* Tute Payment Modal */}
       {showTuteModal && selectedTute && (
           <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
               <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Purchase Tute PDF</h2>
                        <X onClick={() => {setShowTuteModal(false); setSelectedTute(null);}} style={{ cursor: 'pointer', opacity: 0.5 }} />
                    </div>
                    <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{selectedTute.title}</h3>
                        <p style={{ margin: '0.5rem 0 0', fontWeight: 900, color: 'var(--color-primary)', fontSize: '1.5rem' }}>Rs. {selectedTute.price}.00</p>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>කරුණාකර රු. {selectedTute.price}/= ගෙවා එහි රිසිට් පත පහතින් Upload කරන්න. පසුව Admin මගින් අනුමත කරනු ඇත.</p>

                    <form onSubmit={handleTuteRequest}>
                        <div onClick={() => fileInputRef.current.click()} style={{ border: '2px dashed var(--color-primary)', padding: '2rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', marginBottom: '2rem' }}>
                            <FileText size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p style={{ margin: 0, fontWeight: 700 }}>{selectedFile ? selectedFile.name : 'Upload Payment Slip'}</p>
                        </div>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                        <button disabled={isUploading} className="btn btn-primary" style={{ width: '100%' }}>
                            {isUploading ? 'Uploading...' : 'Confirm & Buy Tute'}
                        </button>
                    </form>
               </div>
           </div>
       )}

        {selectedVideo && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(15px)', padding: 'env(safe-area-inset-top) 1rem env(safe-area-inset-bottom)' }}>
                {/* Close Button UI - Positioned top right of the whole modal on mobile */}
                <button 
                  onClick={() => setSelectedVideo(null)} 
                  style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 6001, background: 'rgba(255,100,100,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                >
                  <X size={20} />
                </button>

                <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ color: 'white', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                        <h2 style={{ fontSize: window.innerWidth < 640 ? '1.1rem' : '1.5rem', fontWeight: 900, margin: 0 }}>{selectedVideo.title}</h2>
                        <p style={{ margin: '0.1rem 0 0', opacity: 0.6, fontSize: '0.8rem' }}>Secure Study Environment</p>
                    </div>

                    <div style={{ backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.1)', borderRadius: window.innerWidth < 640 ? '0' : '16px', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
                        <WatermarkVideo videoId={extractYouTubeId(selectedVideo.url)} title={selectedVideo.title} studentProfile={studentProfile} />
                    </div>

                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                         <div style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50px', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>
                            🛡️ Protected Content: {studentProfile?.email}
                         </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
