import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Clock, AlertCircle, PlayCircle, Video, FileText, Phone, ShieldCheck,
  CreditCard, Calendar, Megaphone, UserCircle, UploadCloud, X, CheckCircle, Youtube, Search, MapPin, School, GraduationCap, LogOut, Lock, Sparkles, Download, Mail, Bell, User, ClipboardList, Zap, HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { sendSMS } from '../../utils/smsGateway';

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
  const [mcqExams, setMcqExams] = useState([]);
  const [mcqAttempts, setMcqAttempts] = useState([]);
  const [mcqRetakeRequests, setMcqRetakeRequests] = useState([]);
  const [activeMcqExam, setActiveMcqExam] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [mcqResult, setMcqResult] = useState(null);
  const [mcqTimeLeft, setMcqTimeLeft] = useState(null);
  const [activeMcqIdx, setActiveMcqIdx] = useState(0);
  const mcqTimerRef = useRef(null);

  // Notifications
  const [newNoticesCount, setNewNoticesCount] = useState(0);
  const [latestNoticeTitle, setLatestNoticeTitle] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [instituteSettings, setInstituteSettings] = useState(null);
  const [activeTuteBankIdx, setActiveTuteBankIdx] = useState(0);
  const [lastReadTime, setLastReadTime] = useState(0);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Video Playback
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // High-precision Live Timer
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeBankIdx, setActiveBankIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Toast & Badge Notification Logic (Timestamp Based)
  useEffect(() => {
    if (announcements.length > 0) {
      const unreadNotices = announcements.filter(n => new Date(n.created_at).getTime() > lastReadTime);
      
      if (unreadNotices.length > 0) {
          setNewNoticesCount(unreadNotices.length);
          // Only show toast once for the latest one if we aren't already looking at them
          if (activeTab !== 'special_announce') {
              setLatestNoticeTitle(unreadNotices[0].title);
              setShowToast(true);
              const timer = setTimeout(() => setShowToast(false), 5000); // Hide toast after 5s
              return () => clearTimeout(timer);
          }
      } else {
          setNewNoticesCount(0);
      }
    } else {
        setNewNoticesCount(0);
    }
  }, [announcements, lastReadTime, activeTab]);

  // Mark as read after 3s on tab
  useEffect(() => {
    if (activeTab === 'special_announce' && announcements.length > 0) {
        const timer = setTimeout(async () => {
            const latestTime = new Date(announcements[0].created_at).getTime();
            localStorage.setItem('last_read_notices_time', latestTime.toString());
            setLastReadTime(latestTime);
            setNewNoticesCount(0);
            
            if (studentProfile) {
                await supabase.from('profiles').update({ last_read_notices_time: latestTime }).eq('id', studentProfile.id);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [activeTab, announcements, studentProfile]);

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

  const fetchData = useCallback(async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
             navigate('/login');
             return;
          }
          if (session && session.user) {
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
              if (profile) {
                  setStudentProfile(profile);
                  if(profile.nic) setNicNumber(profile.nic);

                  if (profile.last_read_notices_time) {
                      setLastReadTime(parseInt(profile.last_read_notices_time));
                      localStorage.setItem('last_read_notices_time', profile.last_read_notices_time.toString());
                  } else {
                      setLastReadTime(parseInt(localStorage.getItem('last_read_notices_time') || '0'));
                  }

                   // 1. Fetch available current enrollments
                   const { data: enrollData } = await supabase
                       .from('enrollments')
                       .select('*, courses(subject)')
                       .eq('student_id', session.user.id);
                   
                   const enrolledSubjects = (enrollData || [])
                     .filter(e => e.status === 'approved')
                     .map(e => e.courses?.subject)
                     .filter(Boolean)
                     .join(' ');

                   if(enrollData) {
                       setAllEnrollments(enrollData);
                       const hasActive = enrollData.some(e => e.status === 'approved' && (!e.expires_at || new Date(e.expires_at) > new Date()));
                       setEnrollmentStatus(hasActive ? 'approved' : 'not_active');
                   }

                   // 2. Fetch all courses for the student's grade
                   const { data: allCourses } = await supabase
                       .from('courses')
                       .select('*, instructors(*)');
                   
                   if (allCourses) {
                       const filtered = allCourses.filter(course => {
                           const studentGrade = String(profile.grade || '').toLowerCase();
                           const studentYear = String(profile.year || '').toLowerCase();
                           const courseGrade = String(course.year || '').toLowerCase();
                           const courseSubject = String(course.subject || '').toLowerCase();
                           
                           // Grade Match (Student Profile Grade includes Course Year)
                           const gradeMatch = studentGrade.includes(courseGrade) || studentYear.includes(courseGrade) || courseGrade.includes(studentGrade);
                           
                           // Subject Match (Profile Subject includes Course Subject)
                           const studentProfileSubjects = String(profile.subject || '').toLowerCase();
                           const isProfileSubject = studentProfileSubjects.includes(courseSubject);

                           // IMPORTANT: If they are ALREADY enrolled, ALWAYS show it. 
                           // Otherwise, only show if Grade Matches AND it's their subject.
                           const isEnrolled = (enrollData || []).some(e => e.course_id === course.id);

                           return isEnrolled || (gradeMatch && isProfileSubject);
                       });
                       setAvailableCourses(filtered);
                   }

                   const isAudienceMatch = (targetAudienceStr, profileData, extraSubjects = '') => {
                       if (!targetAudienceStr || targetAudienceStr === 'All Students') return true;
                       if (!profileData) return false;
                       
                       const normalizedGrade = String(profileData.grade || '').toLowerCase();
                       const gradeWithPrefix = normalizedGrade.startsWith('grade') ? normalizedGrade : `grade ${normalizedGrade}`;
                       
                       const studentData = `${normalizedGrade} ${gradeWithPrefix} ${profileData.year} ${profileData.subject} ${extraSubjects} ${profileData.medium}`.toLowerCase();
                       const targets = targetAudienceStr.split(',').map(t => t.trim().toLowerCase());
                       
                       return targets.some(target => {
                           const words = target.split(' ').filter(w => w !== '');
                           return words.every(word => studentData.includes(word));
                       });
                   };

                   // 3. Load other filtered content
                   const { data: notices } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
                   if(notices) setAnnouncements(notices.filter(n => isAudienceMatch(n.target_audience, profile, enrolledSubjects)));

                   const { data: timetable } = await supabase.from('schedules').select('*').order('created_at', { ascending: false });
                   if(timetable) setSchedules(timetable.filter(n => isAudienceMatch(n.target_audience, profile, enrolledSubjects)));

                   const { data: sessions } = await supabase.from('live_sessions').select('*').order('created_at', { ascending: false });
                   if(sessions) setLiveSessions(sessions);

                   const { data: freeContent } = await supabase.from('free_classes').select('*').order('created_at', { ascending: false });
                   if(freeContent) setFreeClasses(freeContent.filter(n => isAudienceMatch(n.target_audience, profile, enrolledSubjects)));

                   const { data: records } = await supabase.from('recordings').select('*').order('created_at', { ascending: false });
                   if(records) setRecordings(records.filter(r => isAudienceMatch(r.target_audience, profile, enrolledSubjects)));

                   const { data: recAccess } = await supabase.from('recording_access_requests').select('*').eq('student_id', session.user.id);
                   if(recAccess) setRecordingAccess(recAccess);

                   const { data: allDocs } = await supabase.from('tutes').select('*, instructors(*)').order('created_at', { ascending: false });
                   if(allDocs) {
                       setTutes(allDocs.filter(d => isAudienceMatch(d.target_audience, profile, enrolledSubjects)));
                   }

                   const { data: myTutes } = await supabase.from('tute_enrollments').select('*').eq('student_id', session.user.id);
                   if(myTutes) setTuteEnrollments(myTutes);

                   // Fetch MCQ Exams for enrolled courses
                   const enrolledCourseIds = (enrollData || []).filter(e => e.status === 'approved').map(e => e.course_id);
                   if (enrolledCourseIds.length > 0) {
                       const { data: mcqData } = await supabase
                           .from('mcq_exams')
                           .select('*, courses(title)')
                           .in('course_id', enrolledCourseIds)
                           .eq('is_published', true)
                           .order('created_at', { ascending: false });
                       if (mcqData) setMcqExams(mcqData);

                       const { data: attemptData } = await supabase
                           .from('mcq_attempts')
                           .select('*')
                           .eq('student_id', session.user.id);
                       if (attemptData) setMcqAttempts(attemptData);

                       const { data: retakeData } = await supabase
                           .from('mcq_retake_requests')
                           .select('*')
                           .eq('student_id', session.user.id);
                       if (retakeData) setMcqRetakeRequests(retakeData);
                   }

                   const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 'global').maybeSingle();
                   if(settings) setInstituteSettings(settings);
              } else {
                  // NO PROFILE FOUND IN DB - forcefully log out this invalid session!
                  await supabase.auth.signOut();
                  localStorage.removeItem('admin_role');
                  window.location.href = '/login';
              }
          }
      } catch(e) { console.error(e) }
  }, [navigate]);

  useEffect(() => {
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
         .on('postgres_changes', { event: '*', schema: 'public', table: 'tutes' }, () => fetchData())
         .on('postgres_changes', { event: '*', schema: 'public', table: 'mcq_attempts' }, () => fetchData())
         .on('postgres_changes', { event: '*', schema: 'public', table: 'mcq_retake_requests' }, () => fetchData())
         .subscribe();
       return () => { supabase.removeChannel(channel); }
  }, [fetchData]);

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

        // 1. Image Only Validation
        if (!selectedFile.type.startsWith('image/')) {
            throw new Error("⚠️ Invalid File: Please upload an image receipt (JPG/PNG). Videos are not allowed.");
        }

        // 2. Duplicate Detection (Hashing)
        const calculateHash = async (file) => {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };

        const fileHash = await calculateHash(selectedFile);

        // Check for duplicates in enrollments
        const { data: duplicate } = await supabase
            .from('enrollments')
            .select('id, profiles(full_name)')
            .eq('slip_hash', fileHash)
            .maybeSingle();

        if (duplicate) {
            throw new Error(`⚠️ DUPLICATE SLIP: This receipt has already been used by ${duplicate.profiles?.full_name || 'another student'}.`);
        }

        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `slip-${session.user.id}-${selectedCourseId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('payment_slips').upload(fileName, selectedFile);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('payment_slips').getPublicUrl(fileName);

        const { error: upsertError } = await supabase.from('enrollments').upsert({
            student_id: session.user.id,
            course_id: selectedCourseId,
            slip_url: data.publicUrl,
            slip_hash: fileHash,
            status: 'pending'
        }, { onConflict: 'student_id, course_id' });

        if (upsertError) throw upsertError;

        const courseInfo = availableCourses.find(c => c.id === selectedCourseId);

        // Automatically update student profile subject if it's a new subject
        if (courseInfo && studentProfile) {
            const currentSubjects = String(studentProfile.subject || '').trim();
            const courseSubject = (courseInfo.subject || '').trim();
            
            if (courseSubject && !currentSubjects.split(' ').some(s => s.toLowerCase() === courseSubject.toLowerCase())) {
                const updatedSubjectString = currentSubjects ? `${currentSubjects} ${courseSubject}` : courseSubject;
                await supabase.from('profiles').update({ subject: updatedSubjectString }).eq('id', studentProfile.id);
            }
        }

        // SMS Notifications
        if (courseInfo) {
            try {
                // Fetch Instructor
                if (courseInfo.instructor_id) {
                    const { data: instructorData } = await supabase.from('instructors').select('phone, name').eq('id', courseInfo.instructor_id).single();
                    if (instructorData?.phone) {
                        const sirMessage = `Nexus: Student ${studentProfile.full_name} has paid for ${courseInfo.title}. Pls verify in Dashboard.`;
                        await sendSMS(instructorData.phone, sirMessage);
                    }
                }
                // Notify Student
                if (studentProfile?.phone) {
                    const stuMessage = `Nexus: Dear ${studentProfile.full_name}, your slip for ${courseInfo.title} is sent to sir for approval.`;
                    await sendSMS(studentProfile.phone, stuMessage);
                }
                // Notify Super Admin
                await sendSMS('0721803785', `Nexus: New Course Slip! Student ${studentProfile.full_name} paid for ${courseInfo.title}. Please check Sales Hub.`);
            } catch (smsErr) {
                console.error("Dashboard Payment SMS Error:", smsErr);
            }
        }

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

        // 1. Image Only Validation
        if (!selectedFile.type.startsWith('image/')) {
            throw new Error("⚠️ Invalid File: Please upload an image receipt (JPG/PNG). Videos are not allowed.");
        }

        // 2. Duplicate Detection
        const calculateHash = async (file) => {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };
        const fileHash = await calculateHash(selectedFile);

        const { data: duplicate } = await supabase
            .from('tute_enrollments')
            .select('id, profiles(full_name)')
            .eq('slip_hash', fileHash)
            .maybeSingle();

        if (duplicate) {
            throw new Error(`⚠️ DUPLICATE SLIP: This receipt has already been used by ${duplicate.profiles?.full_name || 'another student'}.`);
        }

        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `tute_slip-${session.user.id}-${selectedTute.id}-${Date.now()}.${fileExt}`;
        await supabase.storage.from('tute_slips').upload(fileName, selectedFile);
        const { data } = supabase.storage.from('tute_slips').getPublicUrl(fileName);

        await supabase.from('tute_enrollments').upsert({
          student_id: session.user.id,
          tute_id: selectedTute.id,
          slip_url: data.publicUrl,
          slip_hash: fileHash,
          status: 'pending'
        }, { onConflict: 'student_id, tute_id' });

      // Refresh tute enrollments
      const { data: myTutes } = await supabase.from('tute_enrollments').select('*').eq('student_id', session.user.id);
      if(myTutes) setTuteEnrollments(myTutes);

      // SMS Notifications
      try {
          if (selectedTute.instructor_id) {
              const { data: instructorData } = await supabase.from('instructors').select('phone, name').eq('id', selectedTute.instructor_id).single();
              if (instructorData?.phone) {
                  const sirMessage = `Nexus: Student ${studentProfile.full_name} has paid for Tute (${selectedTute.title}). Pls verify.`;
                  await sendSMS(instructorData.phone, sirMessage);
              }
          }
          if (studentProfile?.phone) {
              const stuMessage = `Nexus: Your payment for Tute (${selectedTute.title}) has been sent for approval.`;
              await sendSMS(studentProfile.phone, stuMessage);
          }
          // Notify Super Admin
          await sendSMS('0721803785', `Nexus: New Tute Slip! Student ${studentProfile.full_name} paid for Tute (${selectedTute.title}). Please check Sales Hub.`);
      } catch (smsErr) {
          console.error("Dashboard Tute SMS Error:", smsErr);
      }

      setShowTuteModal(false);
      setSelectedTute(null);
      setSelectedFile(null);
      showGlobalToast("Tute payment slip uploaded successfully! It will be reviewed shortly.", 'success');
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
    { id: 'mcq_exams', label: 'MCQ Exams', icon: <ClipboardList size={18} />, isPremium: true },
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
            const isActuallyLive = (item) => {
                if (!item.is_live) return false;
                if (!item.expires_at) return true;
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

                    if (!isSelfUnlock) {
                        try {
                            const recInfo = recordings.find(r => r.id === recId);
                            if (recInfo?.instructor_id) {
                                const { data: inst } = await supabase.from('instructors').select('phone').eq('id', recInfo.instructor_id).single();
                                if (inst?.phone) {
                                    await sendSMS(inst.phone, `Nexus: Student ${studentProfile.full_name} requested access for recording (${recInfo.title}). Pls confirm.`);
                                }
                            }
                            // Notify Super Admin
                            await sendSMS('0721803785', `Nexus: Video Access Request! ${studentProfile.full_name} requested recording (${recInfo?.title}).`);
                        } catch(err) { console.error("Rec SMS Error:", err); }
                    }

                    showGlobalToast(isSelfUnlock ? "පැය 5කට වීඩියෝව Unlock වුණා! (One-time Access Granted for 5h)" : "අනුමැතිය සඳහා ගුරුවරයා වෙත යොමු කළා! (Recording Request Sent to Instructor)", 'success');
                    
                    const { data: updated } = await supabase.from('recording_access_requests').select('*').eq('student_id', studentProfile.id);
                    setRecordingAccess(updated || []);
                } catch (e) { 
                    showGlobalToast("Request failed. Please try again.", 'error'); 
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
                        const isApproved = myEnroll?.status === 'approved';
                        const expiresAt = myEnroll?.expires_at ? new Date(myEnroll.expires_at) : null;
                        const isExpired = isApproved && expiresAt && expiresAt < new Date();
                        const isUnlocked = tute.is_free || (isApproved && !isExpired);

                        return (
                            <div key={tute.id} className="card" style={{ borderLeft: isUnlocked ? '6px solid var(--color-success)' : isExpired ? '6px solid #ef4444' : '6px solid var(--color-primary-light)', opacity: isExpired ? 0.9 : 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    {tute.is_free ? <span className="badge badge-success">FREE TUTE</span> : isExpired ? <span className="badge badge-danger">ACCESS EXPIRED</span> : <span className="badge badge-primary">PREMIUM (Rs. {tute.price})</span>}
                                    {!tute.is_free && myEnroll?.status === 'pending' && <span className="badge badge-warning" style={{ color: 'white' }}>PENDING REVIEW</span>}
                                    {isApproved && !isExpired && expiresAt && (
                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {Math.ceil((expiresAt - new Date()) / 3600000)}h left
                                        </div>
                                    )}
                                </div>
                                <h3 style={{ fontWeight: 800 }}>{tute.title}</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{tute.description}</p>

                                {isUnlocked ? (
                                    <a href={tute.file_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #166534' }}>
                                        <FileText size={18} /> Open/Download PDF
                                    </a>
                                ) : isExpired ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#991b1b', fontWeight: 800 }}>⚠️ පැය 7ක කාලය අවසන්! නැවත විවෘත කිරීමට Admin හමුවන්න.</p>
                                        <button
                                            onClick={() => window.open(`https://wa.me/94771234567?text=Nexus%20LMS:%20Hi,%20My%20tute%20access%20expired%20for%20(${tute.title}).%20Please%20unlock%20it.`, '_blank')}
                                            className="btn btn-outline"
                                            style={{ color: '#ef4444', borderColor: '#ef4444', fontWeight: 800 }}
                                        >
                                            Request Unlock (WhatsApp)
                                        </button>
                                    </div>
                                ) : myEnroll?.status === 'pending' ? (
                                    <button disabled className="btn btn-outline" style={{ width: '100%', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                        <Clock size={18} /> Waiting for Approval
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setSelectedTute(tute); setActiveTuteBankIdx(0); setShowTuteModal(true); }}
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
                                            onClick={() => { setSelectedCourseId(course.id); setActiveBankIdx(0); setShowUploadModal(true); }} 
                                            className="btn btn-primary" style={{ width: '100%' }}
                                        >
                                            <CreditCard size={18} /> Pay Now
                                        </button>
                                    ) : enrollment.status === 'pending' ? (
                                        <button disabled className="btn btn-outline" style={{ width: '100%', opacity: 0.5 }}>Waiting for Approval</button>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', boxShadow: 'inset 0 2px 4px rgba(34,197,94,0.05)' }}>
                                            <div style={{ color: '#166534', fontWeight: 900, fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div> 
                                                Access Active
                                            </div>
                                            {enrollment.expires_at && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Access Ends In:</div>
                                                    {(() => {
                                                        const diff = new Date(enrollment.expires_at) - currentTime;
                                                        if (diff <= 0) return <span style={{ color: '#ef4444', fontWeight: 900 }}>EXPIRED</span>;
                                                        
                                                        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                                                        const m = Math.floor((diff / 1000 / 60) % 60);
                                                        const s = Math.floor((diff / 1000) % 60);
                                                        
                                                        return (
                                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                                {[
                                                                    { label: 'D', val: d },
                                                                    { label: 'H', val: h },
                                                                    { label: 'M', val: m },
                                                                    { label: 'S', val: s }
                                                                ].map((unit, idx) => (
                                                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', padding: '0.2rem 0.5rem', borderRadius: '6px', minWidth: '32px', border: '1px solid #dcfce7' }}>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#14532d' }}>{String(unit.val).padStart(2, '0')}</span>
                                                                        <span style={{ fontSize: '0.5rem', fontWeight: 800, color: '#16a34a' }}>{unit.label}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div 
                            onClick={() => navigate('/courses')}
                            className="card glass shimmer" 
                            style={{ 
                                padding: '1.5rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                textAlign: 'center',
                                border: '3px dashed var(--color-primary-light)',
                                background: 'rgba(225, 29, 72, 0.02)',
                                cursor: 'pointer',
                                gap: '1rem',
                                minHeight: '300px'
                            }}
                        >
                            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                <BookOpen size={32} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Join New Subject?</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Browse our catalog to join other classes and subjects for your grade.</p>
                            </div>
                            <div className="btn btn-primary" style={{ width: '100%', borderRadius: '50px' }}>Browse All Classes</div>
                        </div>
                    </div>
                </div>
            );
        case 'mcq_exams':
            // --- Helpers defined inside case ---
            const submitMcq = async () => {
                if (!activeMcqExam) return;
                try {
                    clearInterval(mcqTimerRef.current);
                    const { data: correctAnswers } = await supabase.from('mcq_answers').select('*').eq('exam_id', activeMcqExam.id);
                    let score = 0;
                    const review = {};
                    (correctAnswers || []).forEach(a => {
                        const studentAns = mcqAnswers[a.question_number];
                        const isCorrect = studentAns === a.correct_option;
                        if (isCorrect) score++;
                        review[a.question_number] = { correct: a.correct_option, student: studentAns, isCorrect };
                    });

                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                        alert("Session expired. Please login again.");
                        return;
                    }

                    const totalQuestions = correctAnswers?.length || activeMcqExam.num_questions;

                    const { error: upsertErr } = await supabase.from('mcq_attempts').upsert({
                        student_id: session.user.id, 
                        exam_id: activeMcqExam.id,
                        student_answers: mcqAnswers, 
                        score, 
                        completed_at: new Date().toISOString(), 
                        is_submitted: true
                    }, { onConflict: 'student_id,exam_id' });

                    if (upsertErr) throw upsertErr;

                    // Update local attempts list
                    const { data: newAttempts } = await supabase.from('mcq_attempts').select('*').eq('student_id', session.user.id);
                    if (newAttempts) setMcqAttempts(newAttempts);

                    showGlobalToast(`Exam submitted! Score: ${score} / ${totalQuestions}`, 'success');
                    setMcqResult({ score, total: totalQuestions, review });
                    setActiveMcqExam(null);
                    setMcqAnswers({});
                    fetchData(); // Sync everything
                } catch (err) {
                    console.error("MCQ Submission Failed:", err);
                    alert("Submission Failed: " + err.message);
                }
            };

            const startMcq = async (exam) => {
                // Load questions from mcq_questions table
                const { data: qData } = await supabase.from('mcq_questions').select('*').eq('exam_id', exam.id).order('question_number');
                setActiveMcqExam({ ...exam, questions: qData || [] });
                setMcqAnswers({});
                setMcqResult(null);
                setMcqTimeLeft(exam.time_limit_minutes * 60);
                clearInterval(mcqTimerRef.current);
                mcqTimerRef.current = setInterval(() => {
                    setMcqTimeLeft(prev => {
                        if (prev <= 1) { clearInterval(mcqTimerRef.current); submitMcq(); return 0; }
                        return prev - 1;
                    });
                }, 1000);
            };

            // RESULT SCREEN
            if (mcqResult) {
                const pct = Math.round((mcqResult.score / mcqResult.total) * 100);
                const emoji = pct >= 75 ? '🎉' : pct >= 50 ? '👍' : '📖';
                const msg = pct >= 75 ? 'Excellent Work!' : pct >= 50 ? 'Good Try!' : 'Keep Studying!';
                const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
                const bg = pct >= 75 ? '#f0fdf4' : pct >= 50 ? '#fffbeb' : '#fef2f2';
                return (
                    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', background: bg }}>
                            <div style={{ fontSize: '5rem', marginBottom: '1rem', lineHeight: 1 }}>{emoji}</div>
                            <h2 style={{ fontWeight: 900, fontSize: '2rem', marginBottom: '0.5rem', color }}>{msg}</h2>
                            <div style={{ fontSize: '1.2rem', color: '#374151', marginBottom: '0.5rem' }}>
                                You scored <span style={{ fontSize: '2.5rem', fontWeight: 900, color }}>{mcqResult.score}</span>
                                <span style={{ color: '#9ca3af' }}> / {mcqResult.total}</span>
                            </div>
                            <div style={{ fontSize: '3rem', fontWeight: 900, color, marginBottom: '2rem' }}>{pct}%</div>
                            {/* Progress bar */}
                            <div style={{ height: '12px', backgroundColor: '#e5e7eb', borderRadius: '99px', overflow: 'hidden', marginBottom: '2rem' }}>
                                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '99px', transition: 'width 1s ease' }} />
                            </div>
                            <button onClick={() => setMcqResult(null)} className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>Back to Exams</button>
                        </div>
                        {/* Review Grid */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontWeight: 900, marginBottom: '1rem', fontSize: '1rem' }}>Question Review</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.5rem' }}>
                                {Object.entries(mcqResult.review).map(([qNum, r]) => (
                                    <div key={qNum} title={r.isCorrect ? `Q${qNum}: Correct ✓` : `Q${qNum}: Your ans ${r.student || '—'}, Correct: ${r.correct}`}
                                        style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: r.isCorrect ? '#dcfce7' : '#fee2e2', textAlign: 'center', cursor: 'default' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: r.isCorrect ? '#15803d' : '#dc2626' }}>Q{qNum}</div>
                                        <div style={{ fontSize: '1rem' }}>{r.isCorrect ? '✓' : '✗'}</div>
                                        {!r.isCorrect && <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>→{r.correct}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            // ACTIVE EXAM — Telegram-style one-by-one
            if (activeMcqExam) {
                const qList = activeMcqExam.questions || [];
                const currentQ = qList[activeMcqIdx] || null;
                const mins = String(Math.floor(mcqTimeLeft / 60)).padStart(2, '0');
                const secs = String(mcqTimeLeft % 60).padStart(2, '0');
                const isLow = mcqTimeLeft < 300;
                const totalQ = qList.length;
                const answered = Object.keys(mcqAnswers).length;
                const optionLabels = ['i', 'ii', 'iii', 'iv', 'v'];
                const selectedAns = currentQ ? mcqAnswers[currentQ.question_number] : null;

                const getOptionStyle = (optNum) => {
                    if (!selectedAns) return { bg: 'white', border: '#e2e8f0', color: '#374151', transform: 'scale(1)' };
                    if (optNum === selectedAns) {
                        return { bg: 'var(--color-primary)', border: 'var(--color-primary)', color: 'white', transform: 'scale(1.02)' };
                    }
                    return { bg: '#f8fafc', border: '#f1f5f9', color: '#94a3b8', transform: 'scale(1)' };
                };

                return (
                    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Top bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isLow ? '#fef2f2' : 'var(--color-surface)', padding: '1rem 1.5rem', borderRadius: '16px', border: `2px solid ${isLow ? '#ef4444' : '#e2e8f0'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>{activeMcqExam.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{answered} of {totalQ} answered</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: isLow ? '#ef4444' : '#16a34a', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                                        {mins}:{secs}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isLow ? '#ef4444' : '#6b7280' }}>TIME LEFT</div>
                                </div>
                                <button onClick={submitMcq} className="btn btn-primary" style={{ padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>Submit</button>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(activeMcqIdx / totalQ) * 100}%`, background: 'linear-gradient(90deg, var(--color-primary), #f97316)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                        </div>

                        {/* Question Card */}
                        {currentQ ? (
                            <div className="card" style={{ padding: '2.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #f97316)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', flexShrink: 0 }}>
                                        {currentQ.question_number}
                                    </div>
                                    <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', lineHeight: 1.6, margin: 0 }}>
                                        {currentQ.question_text}
                                    </p>
                                </div>

                                {/* Options */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[1, 2, 3, 4, 5].filter(n => currentQ[`option_${n}`]).map(optNum => {
                                        const s = getOptionStyle(optNum);
                                        return (
                                            <button key={optNum} type="button"
                                                onClick={() => {
                                                    if (selectedAns) return; // locked after answer
                                                    setMcqAnswers(prev => ({ ...prev, [currentQ.question_number]: optNum }));
                                                    // Auto-advance after 1.2s
                                                    setTimeout(() => {
                                                        if (activeMcqIdx < totalQ - 1) setActiveMcqIdx(i => i + 1);
                                                    }, 1200);
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: '12px', border: `2px solid ${s.border}`, backgroundColor: s.bg, color: s.color, cursor: selectedAns ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.25s', transform: s.transform, fontWeight: 600, fontSize: '1rem' }}>
                                                <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: selectedAns ? (optNum === selectedAns ? 'rgba(255,255,255,0.25)' : '#f1f5f9') : 'var(--color-primary-light)', color: selectedAns ? (optNum === selectedAns ? 'white' : '#94a3b8') : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', flexShrink: 0 }}>
                                                    {optionLabels[optNum - 1]}
                                                </span>
                                                {currentQ[`option_${optNum}`]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>All questions done!</div>
                        )}

                        {/* Navigation */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button onClick={() => setActiveMcqIdx(i => Math.max(0, i - 1))} disabled={activeMcqIdx === 0} className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }}>← Previous</button>
                            {activeMcqIdx < totalQ - 1
                                ? <button onClick={() => setActiveMcqIdx(i => i + 1)} className="btn btn-primary" style={{ flex: 2, padding: '0.75rem' }}>Next Question →</button>
                                : <button onClick={submitMcq} className="btn btn-primary" style={{ flex: 2, padding: '0.75rem', background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>🏁 Submit Exam</button>
                            }
                        </div>

                        {/* Question dots navigator */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', padding: '0.5rem' }}>
                            {qList.map((q, idx) => (
                                <button key={idx} onClick={() => setActiveMcqIdx(idx)}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid', borderColor: idx === activeMcqIdx ? 'var(--color-primary)' : mcqAnswers[q.question_number] ? '#86efac' : '#e2e8f0', backgroundColor: idx === activeMcqIdx ? 'var(--color-primary)' : mcqAnswers[q.question_number] ? '#f0fdf4' : 'white', color: idx === activeMcqIdx ? 'white' : '#374151', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            }

            // EXAM LIST
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {mcqExams.length === 0 ? (
                        <div className="card" style={{ gridColumn: '1/-1', padding: '5rem', textAlign: 'center', opacity: 0.5 }}>
                            <ClipboardList size={48} style={{ margin: '0 auto 1rem' }} />
                            <p style={{ fontWeight: 700 }}>No MCQ exams available yet.</p>
                        </div>
                    ) : mcqExams.map(exam => {
                        const attempt = mcqAttempts.find(a => a.exam_id === exam.id);
                        const retakeReq = mcqRetakeRequests.find(r => r.exam_id === exam.id);
                        
                        // If instructor approved a retake, we should act as if there is no attempt
                        const isRetakeApproved = retakeReq && retakeReq.status === 'approved';
                        const showStart = !attempt || isRetakeApproved;

                        return (
                            <div key={exam.id} className="card glass-premium" style={{ 
                                padding: '2rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '1.5rem', 
                                border: attempt ? '2px solid #bbf7d0' : '1px solid #f1f5f9', 
                                backgroundColor: attempt ? '#f0fdf4' : 'white',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease'
                            }}>
                                {attempt && !isRetakeApproved && (
                                    <div style={{ position: 'absolute', top: '1rem', right: '-2.5rem', background: '#16a34a', color: 'white', padding: '0.25rem 3rem', transform: 'rotate(45deg)', fontSize: '0.7rem', fontWeight: 900, boxShadow: '0 2px 10px rgba(22,163,74,0.3)' }}>
                                        COMPLETED
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ 
                                        backgroundColor: attempt ? 'rgba(22, 163, 74, 0.1)' : 'var(--color-primary-light)', 
                                        color: attempt ? '#16a34a' : 'var(--color-primary)', 
                                        width: '56px', 
                                        height: '56px', 
                                        borderRadius: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: attempt ? 'none' : '0 10px 20px rgba(139, 92, 246, 0.1)'
                                    }}>
                                        {attempt ? <CheckCircle size={32} /> : <ClipboardList size={32} />}
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                            <Clock size={12} /> {exam.time_limit_minutes} Min
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                            <HelpCircle size={12} /> {exam.num_questions} Qs
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'white', backgroundColor: 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                            {exam.courses?.title || 'Subject Exam'}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.3 }}>{exam.title}</h3>
                                    
                                    {attempt && !isRetakeApproved && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>Your Result</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>{attempt.score} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/ {exam.num_questions}</span></div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>{Math.round((attempt.score / exam.num_questions) * 100)}%</div>
                                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>{new Date(attempt.completed_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {isRetakeApproved && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #16a34a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ backgroundColor: '#16a34a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Zap size={16} fill="white" />
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 800 }}>Reset Approved! You can retake now.</div>
                                        </div>
                                    )}
                                </div>
                                
                                {showStart ? (
                                    <button 
                                        onClick={async () => { 
                                            // If it was a retake, clear the request record now that they've started
                                            if (isRetakeApproved) {
                                                await supabase.from('mcq_retake_requests').delete().eq('id', retakeReq.id);
                                            }
                                            setActiveMcqIdx(0); 
                                            startMcq(exam); 
                                        }} 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', borderRadius: '12px', marginTop: 'auto' }}
                                    >
                                        🚀 Start Exam
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                                        <button 
                                            onClick={async () => {
                                                const { data: qData } = await supabase.from('mcq_questions').select('*').eq('exam_id', exam.id).order('question_number');
                                                const { data: correctAnswers } = await supabase.from('mcq_answers').select('*').eq('exam_id', exam.id);
                                                const review = {};
                                                (correctAnswers || []).forEach(a => {
                                                    const studentAns = attempt.student_answers[a.question_number];
                                                    const isCorrect = studentAns === a.correct_option;
                                                    review[a.question_number] = { correct: a.correct_option, student: studentAns, isCorrect };
                                                });
                                                setMcqResult({ score: attempt.score, total: exam.num_questions, review });
                                            }} 
                                            className="btn btn-outline" 
                                            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9rem', borderRadius: '12px', borderColor: '#16a34a', color: '#16a34a' }}
                                        >
                                            📄 View Results Review
                                        </button>
                                        
                                        {retakeReq && retakeReq.status !== 'rejected' ? (
                                            <div style={{ padding: '0.75rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                                                {retakeReq.status === 'pending' ? '⏳ Retake Request Pending' : '✓ Request Handled'}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {retakeReq?.status === 'rejected' && (
                                                    <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 800, textAlign: 'center' }}>⚠️ Previous request was rejected. Try again?</div>
                                                )}
                                                <button 
                                                    onClick={async () => {
                                                        if (window.confirm('Request instructor to let you redo this exam?')) {
                                                            const { data: { session } } = await supabase.auth.getSession();
                                                            
                                                            // Mandatory delete before insert to be 100% sure and atomic
                                                            await supabase.from('mcq_retake_requests').delete().eq('student_id', session.user.id).eq('exam_id', exam.id);
                                                            const { error } = await supabase.from('mcq_retake_requests').insert({
                                                                student_id: session.user.id,
                                                                exam_id: exam.id,
                                                                status: 'pending'
                                                            });

                                                            if (!error) {
                                                                showGlobalToast('Request sent to instructor!', 'success');
                                                                fetchData(); // Instant Refresh
                                                            } else {
                                                                showGlobalToast(error.message, 'error');
                                                            }
                                                        }
                                                    }}
                                                    className="btn btn-outline"
                                                    style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', borderRadius: '10px', borderColor: '#94a3b8', color: '#64748b' }}
                                                >
                                                    {retakeReq?.status === 'rejected' ? '🔄 Re-request Retake' : '🔄 Request Retake'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
      {showToast && (
        <div 
          onClick={() => { setActiveTab('special_announce'); setShowToast(false); }}
          style={{ 
            position: 'fixed', 
            top: '24px', 
            right: '24px', 
            zIndex: 100000, 
            width: '400px',
            backgroundColor: '#0f172a', /* Deep midnight dark */
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            overflow: 'hidden',
            cursor: 'pointer',
            animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              color: '#8b5cf6',
              padding: '10px',
              borderRadius: '14px',
              display: 'flex'
            }}>
              <Megaphone size={22} strokeWidth={2.5} />
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: 900, 
                color: '#8b5cf6', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                New Notice <Sparkles size={12} fill="#8b5cf6" />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'white', lineHeight: 1.3, marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>
                නිවේදනයක් (New Alert!)
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                {latestNoticeTitle}
              </div>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); setShowToast(false); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.3)', borderRadius: '50%', cursor: 'pointer', padding: '6px', display: 'flex', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Draining Progress Bar Container */}
          <div style={{ height: '4px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }}>
             <div style={{
                height: '100%',
                backgroundColor: '#8b5cf6',
                width: '100%',
                animation: 'toastDrain 5s linear forwards'
             }} />
          </div>
          
          <style>{`
            @keyframes toastDrain { from { width: 100%; } to { width: 0%; } }
            @keyframes slideIn { from { transform: translateX(100%) scale(0.9); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}
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
                            {s.id === 'special_announce' && newNoticesCount > 0 && (
                                <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid white', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)' }}>
                                    {newNoticesCount}
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
                    {activeTab === 'special_announce' && newNoticesCount > 0 && (
                        <span className="glass-premium" style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem', borderRadius: '12px', backgroundColor: '#ef4444', color: 'white', fontWeight: 800, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
                          {newNoticesCount} New
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
              { id: 'mcq_exams', label: 'MCQ', icon: <ClipboardList size={20} /> },
              { id: 'special_announce', label: 'Notices', icon: <Megaphone size={20} /> },
              { id: 'about_me', label: 'Me', icon: <UserCircle size={20} /> }
          ].map(s => (
              <button key={s.id} onClick={() => setActiveTab(s.id)} className={`nav-item-mobile ${activeTab === s.id ? 'active' : ''}`} style={{ position: 'relative' }}>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {s.icon}
                    {s.id === 'special_announce' && newNoticesCount > 0 && (
                        <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid white', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)' }}>
                            {newNoticesCount}
                        </span>
                    )}
                  </div>
                  <span>{s.label}</span>
              </button>
          ))}
      </nav>
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="card shadow-premium" style={{ width: '100%', maxWidth: '1100px', height: 'auto', maxHeight: '95vh', overflowY: 'auto', position: 'relative', padding: window.innerWidth < 768 ? '1.5rem' : '2.5rem', background: 'white', color: '#0f172a', borderRadius: '32px', display: 'grid', gridTemplateColumns: window.innerWidth < 992 ? '1fr' : '1.1fr 0.9fr', gap: '2.5rem' }}>
            
            <button onClick={() => setShowUploadModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', zIndex: 10, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24} /></button>

            {/* Left Section: Video Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <div style={{ color: 'var(--color-primary)', display: 'flex' }}><Video size={28} /></div>
                   <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>About this Class</h2>
                </div>

                <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #eee' }}>
                     {(() => {
                        const course = availableCourses.find(c => c.id === selectedCourseId);
                        const videoUrl = course?.promo_video_url;
                        if (!videoUrl) return (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                                <PlayCircle size={80} />
                            </div>
                        );

                        const ytId = extractYouTubeId(videoUrl);
                        if (ytId) {
                            return (
                                <iframe 
                                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0&modestbranding=1&loop=1&playlist=${ytId}`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="Promo Video"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                />
                            );
                        }
                        return <video src={videoUrl} autoPlay muted loop playsInline controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                     })()}
                </div>

                <div style={{ padding: '2rem', borderRadius: '24px', border: '2px solid #22c55e', backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                     <div style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limited Time Access</div>
                     <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem', color: '#14532d' }}>Watch a Free Demo Lesson</h3>
                     <p style={{ margin: 0, fontSize: '0.95rem', color: '#166534', fontWeight: 600 }}>Check the teaching style before you enroll.</p>
                     <button 
                        onClick={() => { setShowUploadModal(false); setSelectedVideo({ url: availableCourses.find(c => c.id === selectedCourseId).free_lesson_url, title: `Demo: ${availableCourses.find(c => c.id === selectedCourseId).title}` }); }}
                        className="btn btn-primary" 
                        style={{ background: '#22c55e', width: '100%', height: '56px', fontSize: '1.1rem', gap: '0.75rem', marginTop: '0.5rem', color: 'white' }}
                     >
                        <PlayCircle size={22} fill="white" /> Watch Free Lesson
                     </button>
                </div>
            </div>

            {/* Right Section: Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <div style={{ color: '#0ea5e9', display: 'flex' }}><CreditCard size={28} /></div>
                   <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>Secure Payment</h2>
                </div>

                <div style={{ background: '#f0f9ff', padding: '1.75rem', borderRadius: '24px', borderLeft: '8px solid #0ea5e9', marginBottom: '0.5rem', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.05)' }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#0369a1', lineHeight: '1.8', fontSize: '1rem' }}>
                        ⚠️ බැංකු රිසිට් පතේ (Slip) පෑනෙන් පැහැදිලිව පහත විස්තර ලියන්න:<br/>
                        1. ඔබේ සම්පූර්ණ නම<br/>
                        2. පන්තියේ නම<br/>
                        3. දුරකථන අංකය
                    </p>
                </div>

                {/* Bank Payment Details Card */}
                {(() => {
                    const course = availableCourses.find(c => c.id === selectedCourseId);
                    if (!course) return null;

                    const instructorBanks = course.instructors?.bank_accounts || [];
                    const hasMultiBanks = instructorBanks.length > 0;
                    
                    const activeBank = hasMultiBanks 
                        ? instructorBanks[activeBankIdx] || instructorBanks[0]
                        : { 
                            bank_name: course.bank_name, 
                            account_no: course.bank_account_no, 
                            account_name: course.bank_account_name, 
                            branch: course.bank_branch 
                          };

                    if (!activeBank.account_no && !hasMultiBanks) return null;

                    return (
                        <div style={{ border: '2.5px solid #22c55e', borderRadius: '28px', padding: '1.75rem', background: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)', boxShadow: '0 12px 30px rgba(34, 197, 94, 0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '48px', height: '48px', backgroundColor: '#16a34a', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>🏦</div>
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#14532d' }}>ගෙවීමේ බැංකු විස්තර</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>Select a Bank Account to Pay</p>
                                </div>
                            </div>

                            {/* Bank Selection Tabs */}
                            {hasMultiBanks && instructorBanks.length > 1 && (
                                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                    {instructorBanks.map((bank, idx) => (
                                        <button 
                                            key={bank.id}
                                            type="button"
                                            onClick={() => setActiveBankIdx(idx)}
                                            style={{ 
                                                padding: '0.6rem 1.25rem', 
                                                borderRadius: '50px', 
                                                border: '2px solid',
                                                borderColor: activeBankIdx === idx ? '#16a34a' : '#e2e8f0',
                                                background: activeBankIdx === idx ? '#16a34a' : 'white',
                                                color: activeBankIdx === idx ? 'white' : '#64748b',
                                                fontSize: '0.85rem',
                                                fontWeight: 800,
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: activeBankIdx === idx ? '0 4px 12px rgba(22, 163, 74, 0.2)' : 'none'
                                            }}
                                        >
                                            {bank.bank_name || `Account ${idx + 1}`}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {[
                                    { label: 'BANK NAME / බැංකුව', value: activeBank.bank_name },
                                    { label: 'ACCOUNT NUMBER / ගිණුම් අංකය', value: activeBank.account_no || activeBank.bank_account_no },
                                    { label: 'NAME / නම', value: activeBank.account_name || activeBank.bank_account_name },
                                    { label: 'BRANCH / ශාඛාව', value: activeBank.branch || activeBank.bank_branch },
                                ].filter(item => item.value).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1rem 1.5rem', borderRadius: '18px', border: '1px solid #bbf7d0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '0.02em' }}>{item.label}</span>
                                        <span style={{ fontWeight: 900, color: '#14532d', fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1.5fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>NIC Number</label>
                            <input placeholder="NIC Not Linked..." value={nicNumber} disabled style={{ width: '100%', padding: '1.1rem', background: '#e2e8f0', border: '2px dashed #cbd5e1', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 800, color: '#64748b', cursor: 'not-allowed' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Payment Receipt</label>
                            <div onClick={() => fileInputRef.current.click()} style={{ border: '2.5px dashed #0ea5e9', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <UploadCloud size={24} color="#0ea5e9" />
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 800, color: '#0ea5e9', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile ? selectedFile.name : 'Select Receipt Slip'}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>JPEG, PNG allowed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {uploadErrorMsg && <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 800, margin: 0, textAlign: 'center' }}>❌ {uploadErrorMsg}</p>}
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} />
                    
                    <button type="submit" disabled={isUploading} style={{ background: 'var(--color-primary-gradient)', color: 'white', padding: '1.25rem', borderRadius: '20px', border: 'none', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 12px 24px rgba(14, 165, 233, 0.4)', transition: 'transform 0.2s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {isUploading ? 'Registering Your Payment...' : 'Submit Payment Slip'}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>We will verify your payment within 24 hours.</p>
                </form>
            </div>
          </div>
        </div>
      )}

        {/* Tute Payment Modal */}
        {showTuteModal && selectedTute && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', padding: '1.5rem' }}>
                <div className="card" style={{ width: '100%', maxWidth: '450px', maxHeight: '95vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Purchase Tute PDF</h2>
                        <X onClick={() => {setShowTuteModal(false); setSelectedTute(null);}} style={{ cursor: 'pointer', opacity: 0.5 }} />
                    </div>
                    <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{selectedTute.title}</h3>
                        <p style={{ margin: '0.25rem 0 0', fontWeight: 900, color: 'var(--color-primary)', fontSize: '1.25rem' }}>Rs. {selectedTute.price}.00</p>
                    </div>

                    {/* Tute Bank Details Display */}
                    {(() => {
                        const instructor = selectedTute.instructors;
                        if (!instructor) return null;

                        const instructorBanks = instructor.bank_accounts || [];
                        const hasMultiBanks = instructorBanks.length > 0;
                        
                        const activeBank = hasMultiBanks 
                            ? instructorBanks[activeTuteBankIdx] || instructorBanks[0]
                            : { 
                                bank_name: instructor.bank_name, 
                                account_no: instructor.bank_account_no, 
                                account_name: instructor.bank_account_name, 
                                branch: instructor.bank_branch 
                              };

                        if (!activeBank.account_no && !hasMultiBanks) return null;

                        return (
                            <div className="glass-premium" style={{ border: '2px solid #22c55e', borderRadius: '20px', padding: '1.25rem', background: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div style={{ width: '36px', height: '36px', backgroundColor: '#16a34a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🏦</div>
                                    <div>
                                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#14532d' }}>ගෙවීමේ බැංකු විස්තර</h3>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>Instructor: {instructor.name}</p>
                                    </div>
                                </div>

                                {hasMultiBanks && instructorBanks.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                                        {instructorBanks.map((bank, idx) => (
                                            <button 
                                                key={bank.id || idx}
                                                type="button"
                                                onClick={() => setActiveTuteBankIdx(idx)}
                                                style={{ 
                                                    padding: '0.4rem 0.8rem', 
                                                    borderRadius: '50px', 
                                                    border: '2px solid',
                                                    borderColor: activeTuteBankIdx === idx ? '#16a34a' : '#e2e8f0',
                                                    background: activeTuteBankIdx === idx ? '#16a34a' : 'white',
                                                    color: activeTuteBankIdx === idx ? 'white' : '#64748b',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    whiteSpace: 'nowrap',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {bank.bank_name || `Acc ${idx + 1}`}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {[
                                        { label: 'Bank Name', value: activeBank.bank_name },
                                        { label: 'Acc Number', value: activeBank.account_no || activeBank.bank_account_no },
                                        { label: 'Acc Name', value: activeBank.account_name || activeBank.bank_account_name },
                                        { label: 'Branch', value: activeBank.branch || activeBank.bank_branch }
                                    ].filter(item => item.value).map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</span>
                                            <span style={{ fontWeight: 800, color: '#14532d', fontSize: '0.85rem', fontFamily: 'monospace' }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600, color: '#1e293b' }}>ඉහත බැංකු ගිණුමට රු. {selectedTute.price}/= ගෙවා එහි රිසිට් පත පහතින් Upload කරන්න.</p>

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
