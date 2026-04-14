import { useState, useEffect } from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { MapPin } from 'lucide-react'; 

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtp, setUserOtp] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    nic: '',
    school: '',
    grade: '',
    subject: [], // Array for multiple subjects
    year: '',
    district: '',
    town: '',
    address: '',
    password: ''
  });

  const [validations, setValidations] = useState({
    nic: true,
    phone: true,
    email: true
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all courses to get available subjects and their grades
      const { data: coursesData } = await supabase
        .from('courses')
        .select('subject, year, instructors(name)');
      
      if (coursesData) {
        setAllCourses(coursesData);
        const uniqueSubjects = [...new Set(coursesData.map(c => c.subject))];
        setAvailableSubjects(uniqueSubjects);
      }
    };
    fetchData();
  }, []);

  // Filter subjects based on selected grade
  const displayedSubjects = formData.grade 
    ? [...new Set(allCourses.filter(c => c.year.toString() === formData.grade.toString()).map(c => c.subject))]
    : availableSubjects;

  const srilankaDistricts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 
    'Moneragala', 'Ratnapura', 'Kegalle'
  ];

  // Comprehensive list of major towns in Sri Lanka grouped by relevance or alphabet
  const srilankaTowns = [
    "Abalangoda", "Agalawatta", "Akurana", "Akuressa", "Alutgama", "Ambalangoda", "Ambalantota", "Ampara", "Anamaduwa", "Anuradhapura", "Aranayaka", "Avissawella",
    "Baddegama", "Badulla", "Bakamoona", "Balangoda", "Bandaragama", "Bandarawela", "Battaramulla", "Batticaloa", "Beliatta", "Benthota", "Beruwala", "Biyagama", "Boralesgamuwa",
    "Chavakachcheri", "Chilaw", "Chunnakam", "Colombo 1-15",
    "Dambulla", "Dankotuwa", "Dehiowita", "Dehiwala", "Deniyaya", "Deraniyagala", "Dickwella", "Digana", "Diyatalawa", "Dombivli", "Drankotuwa",
    "Eheliyagoda", "Ellakkala", "Elpitiya", "Embilipitiya", "Eppawala",
    "Galenbindunuwewa", "Galgamuwa", "Galle", "Galnewa", "Gampaha", "Gampola", "Gelioya", "Ginigathena", "Giriulla", "Godakawela",
    "Habarana", "Hakmana", "Hambantota", "Hanguranketha", "Hanwella", "Haputale", "Hatton", "Hikkaduwa", "Hingurakgoda", "Homagama", "Horana",
    "Ja-Ela", "Jaffna",
    "Kadawatha", "Kaduwela", "Kadugannawa", "Kahawatta", "Kakirawa", "Kalmunai", "Kalutara", "Kamburupitiya", "Kandana", "Kandy", "Karapitiya", "Katubedda", "Katugastota", "Katunayake", "Kegalle", "Kekirawa", "Kelaniya", "Kesbewa", "Kilinochchi", "Kiribathgoda", "Kirinda", "Kitulgala", "Kochi", "Koggala", "Kohuwala", "Kotagala", "Kotte", "Kuliyapitiya", "Kurunegala", "Kuruwita",
    "Maharagama", "Mahiyanganaya", "Maho", "Malabe", "Mannar", "Maradana", "Marawila", "Matale", "Matara", "Mathugama", "Mau-ara", "Mawanella", "Medawachchiya", "Medirigiriya", "Meegoda", "Mihintale", "Minuwangoda", "Mirigama", "Moneragala", "Moratuwa", "Mount Lavinia", "Mullaitivu",
    "Nallur", "Narammala", "Nattandiya", "Nawalapitiya", "Nawala", "Negombo", "Nelliady", "Nikaweratiya", "Nilaveli", "Nivithigala", "Nochchiyagama", "Nugegoda", "Nuwara Eliya",
    "Opanayaka",
    "Padukka", "Padiyathalawa", "Pagoda", "Pallepola", "Panadura", "Pannala", "Pannipitiya", "Passara", "Pasyala", "Peliyagoda", "Pelmadulla", "Peradeniya", "Piliyandala", "Point Pedro", "Polgahawela", "Polonnaruwa", "Puttalam",
    "Ragama", "Rajagiriya", "Rambukkana", "Ratmalana", "Ratnapura", "Rattota", "Ruwanwella",
    "Samanthurai", "Sigiriya", "Siyambalanduwa",
    "Talawakele", "Talawa", "Tangalle", "Teldeniya", "Thalahena", "Thalawatugoda", "Thihariya", "Thimbirigasyaya", "Tissamaharama", "Trincomalee",
    "Udugama", "Ukuwela", "Unawatuna", "Urubokka",
    "Vavuniya", "Veyangoda",
    "Wadduwa", "Walapane", "Warakapola", "Wariyapola", "Waskaduwa", "Wathelgoda", "Wattala", "Wattegama", "Welimada", "Weligama", "Welisara", "Wellampitiya", "Wellawaya", "Wellawatte", "Wennappuwa",
    "Yakkala", "Yatawatta", "Yatiyanthota"
  ];

  const validateNIC = (nic) => {
    // 1. Structural Check
    const oldNicRegex = /^[0-9]{9}[vVxX]$/;
    const newNicRegex = /^[0-9]{12}$/;
    
    if (!oldNicRegex.test(nic) && !newNicRegex.test(nic)) return false;

    // 2. Logical Mathematical Check (Birth Year & Day Code)
    let dayCode = 0;
    if (nic.length === 10) { // Old Format: 99XXXXXXV
        dayCode = parseInt(nic.substring(2, 5));
    } else { // New Format: 1999XXXXXXXX
        dayCode = parseInt(nic.substring(4, 7));
    }

    // Day code rules:
    // Male: 1 - 366
    // Female: 501 - 866 (Day + 500)
    const isMale = dayCode >= 1 && dayCode <= 366;
    const isFemale = dayCode >= 501 && dayCode <= 866;

    if (!isMale && !isFemale) return false;

    return true; // Passed structural and logical tests
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(?:0|94|\+94)?7(0|1|2|4|5|6|7|8)[0-9]{7}$/;
    return phoneRegex.test(phone);
  };

  const toggleSubject = (sub) => {
    const current = [...formData.subject];
    if (current.includes(sub)) {
        setFormData({ ...formData, subject: current.filter(s => s !== sub) });
    } else {
        setFormData({ ...formData, subject: [...current, sub] });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Real-time validation
    if (name === 'nic') {
        setValidations(prev => ({ ...prev, nic: value === '' || validateNIC(value) }));
    }
    if (name === 'phone') {
        setValidations(prev => ({ ...prev, phone: value === '' || validatePhone(value) }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Final check
    if (!validateNIC(formData.nic)) {
        showToast('Invalid NIC number format. Please provide a valid Sri Lankan NIC.', 'error');
        return;
    }
    if (!validatePhone(formData.phone)) {
        showToast('Invalid WhatsApp number. Please provide a valid Sri Lankan mobile number.', 'error');
        return;
    }

    setLoading(true);

    try {
      // 1. CRITICAL: Check if NIC already exists in PROFILES to prevent duplicates before Auth
      // phone check is temporarily disabled for testing upon user request
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('nic', formData.nic)
        .single();

      if (existingProfile) {
        throw new Error('NIC is already registered. Please login or use different details.');
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      // Send via SMSLenz API
      let formattedPhone = formData.phone.trim();
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '94' + formattedPhone.slice(1);
      } else if (!formattedPhone.startsWith('94') && !formattedPhone.startsWith('+')) {
        formattedPhone = '94' + formattedPhone;
      }
      formattedPhone = formattedPhone.replace('+', ''); // Formatting properly for SMSLenz

      const response = await fetch('https://smslenz.lk/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '1553',
          api_key: 'e35daf6c-d086-4a9d-a6b9-9b5f43b9ed38',
          sender_id: 'SMSlenzDEMO',
          contact: `+${formattedPhone}`,
          message: `Your Registration OTP is: ${otp}`
        })
      });

      const result = await response.json();
      if (!result.success) {
         throw new Error('Failed to send OTP SMS. ' + (result.message || ''));
      }

      setShowOtpModal(true);
      showToast('OTP sent successfully to your mobile number!', 'success');

    } catch (err) {
      showToast(err.message || 'Operation failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndRegister = async () => {
    if (userOtp !== generatedOtp) {
      showToast('Invalid OTP. Please try again.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 2. Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.fullName } }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Insert Profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              nic: formData.nic,
              school: formData.school,
              grade: formData.grade,
              year: formData.year,
              subject: formData.subject.join(', '),
              district: formData.district,
              town: formData.town,
              address: formData.address,
              role: formData.email === 'kawishkaperera134@gmail.com' ? 'admin' : 'student'
            }
          ]);

        if (profileError) {
            throw profileError;
        }
      }
      
      setShowOtpModal(false);
      showToast('Congratulations! Account created successfully. Redirecting to login...', 'success');
      setTimeout(() => { navigate('/login'); }, 2500);

    } catch (err) {
      showToast(err.message || 'Registration failed. This email might already be in use.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isFormInvalid = !validations.nic || !validations.phone || !formData.nic || !formData.phone || !formData.email || !formData.password || formData.subject.length === 0 || loading;

  return (
    <div className="auth-wrapper" style={{ backgroundColor: 'var(--color-bg)', padding: '4rem 1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '900px', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', border: 'none', margin: '0 auto', overflow: 'hidden' }}>
        <div style={{ padding: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', backgroundColor: 'var(--color-primary)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'white', boxShadow: '0 8px 16px -4px rgba(225, 29, 72, 0.4)' }}>
                <ShieldCheck size={40} />
            </div>
            <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--color-text)' }}>Student Registration</h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontWeight: 600, fontSize: '1.1rem' }}>Secure your spot in the future of education.</p>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem' }}>
            
            {/* Identity Group */}
            <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="var(--color-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Personal Information</span>
            </div>

            <div>
                <label className="input-label">Full Name</label>
                <input name="fullName" type="text" className="input-field" placeholder="Kamal Perera" required onChange={handleChange} />
            </div>

            <div>
                <label className="input-label">Email Address</label>
                <input name="email" type="email" className="input-field" placeholder="kamal@gmail.com" required onChange={handleChange} />
            </div>

            <div>
                <label className="input-label" style={{ color: !validations.nic ? 'var(--color-danger)' : 'inherit' }}>
                    NIC Number { !validations.nic && <span style={{ fontSize: '0.75rem' }}>(Invalid Format)</span> }
                </label>
                <input 
                    name="nic" 
                    type="text" 
                    className={`input-field ${!validations.nic ? 'input-error' : ''}`} 
                    placeholder="2001XXXXXXXX or 99XXXXXXV" 
                    required 
                    onChange={handleChange} 
                    style={{ borderColor: !validations.nic ? 'var(--color-danger)' : '' }}
                />
            </div>

            <div>
                <label className="input-label" style={{ color: !validations.phone ? 'var(--color-danger)' : 'inherit' }}>
                    WhatsApp Number { !validations.phone && <span style={{ fontSize: '0.75rem' }}>(Invalid)</span> }
                </label>
                <input 
                    name="phone" 
                    type="tel" 
                    className={`input-field ${!validations.phone ? 'input-error' : ''}`} 
                    placeholder="07XXXXXXXX" 
                    required 
                    onChange={handleChange} 
                    style={{ borderColor: !validations.phone ? 'var(--color-danger)' : '' }}
                />
            </div>

            {/* Academic Group */}
            <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="var(--color-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Class Selection</span>
            </div>

            <div>
                <label className="input-label">Exam Year (විභාග වසර)</label>
                <select name="year" className="input-field" required onChange={handleChange}>
                    <option value="">Select Exam Year</option>
                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div>
                <label className="input-label">Grade</label>
                <select name="grade" className="input-field" required onChange={handleChange}>
                    <option value="">Select Grade</option>
                    {[6,7,8,9,10,11,12,13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Select Your Subjects ({formData.grade ? `Grade ${formData.grade}` : 'All Grades'})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {displayedSubjects.length > 0 ? (
                        displayedSubjects.map(sub => {
                            // Find instructors who teach this subject in this grade
                            const subjectTeachers = [...new Set(allCourses
                                .filter(c => c.subject === sub && (!formData.grade || c.year.toString() === formData.grade.toString()))
                                .map(c => c.instructors?.name)
                                .filter(Boolean))];

                            return (
                                <div key={sub} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => toggleSubject(sub)}
                                        className="glass-premium"
                                        style={{ 
                                            padding: '0.75rem 1.5rem', 
                                            borderRadius: '12px', 
                                            border: formData.subject.includes(sub) ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-border)',
                                            backgroundColor: formData.subject.includes(sub) ? 'rgba(225, 29, 72, 0.05)' : 'white',
                                            color: formData.subject.includes(sub) ? 'var(--color-primary)' : 'var(--color-text)',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {sub}
                                    </button>
                                    {subjectTeachers.length > 0 && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textAlign: 'center', fontWeight: 600 }}>
                                            {subjectTeachers.join(', ')}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            {formData.grade ? `No subjects found for Grade ${formData.grade} yet.` : 'Loading subjects...'}
                        </p>
                    )}
                </div>
            </div>

            <div><label className="input-label">School</label><input name="school" type="text" className="input-field" placeholder="School Name" required onChange={handleChange} /></div>

            {/* Logistics Group */}
            <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="var(--color-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Delivery Details</span>
            </div>

            <div>
                <label className="input-label">District</label>
                <input name="district" list="districts-list" className="input-field" placeholder="Select District" required onChange={handleChange} />
                <datalist id="districts-list">{srilankaDistricts.map(d => <option key={d} value={d} />)}</datalist>
            </div>

            <div>
                <label className="input-label">Town</label>
                <input name="town" list="towns-list" className="input-field" placeholder="Your City" required onChange={handleChange} />
                <datalist id="towns-list">{srilankaTowns.map(t => <option key={t} value={t} />)}</datalist>
            </div>

            <div style={{ gridColumn: '1 / -1' }}><label className="input-label">Home Address (For Tutes)</label><textarea name="address" className="input-field" rows="2" placeholder="Full address including house number..." required onChange={handleChange} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label className="input-label">Create Password</label><input name="password" type="password" className="input-field" placeholder="Choose a strong password (min 6 chars)" minLength={6} required onChange={handleChange} /></div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <button 
                    type="submit" 
                    disabled={isFormInvalid} 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '1.25rem', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.4)', opacity: isFormInvalid ? 0.6 : 1 }}
                >
                    {loading ? 'Verifying Details...' : 'Register as Student'}
                </button>
            </div>
            </form>
            
            <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 800, textDecoration: 'none', borderBottom: '2px solid var(--color-primary)' }}>Login Securely</Link>
            </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card glass-premium" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)' }}>Verify Mobile Number</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>We sent a 6-digit OTP to your Mobile number.</p>
            <input 
              type="text" 
              maxLength="6" 
              value={userOtp} 
              onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter OTP" 
              className="input-field" 
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.25em', marginBottom: '1.5rem' }}
            />
            <button 
              onClick={verifyAndRegister} 
              disabled={loading || userOtp.length !== 6} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 800 }}
            >
              {loading ? 'Verifying...' : 'Verify & Complete'}
            </button>
            <button 
              onClick={() => setShowOtpModal(false)}
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: 'none' }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
