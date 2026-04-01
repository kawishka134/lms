import { UploadCloud, CheckCircle, Lock, Download, PlayCircle, Info, FileText, Check, BookOpen, Clock } from 'lucide-react';
import { useToast } from '../../components/Toast';

export default function CourseDetails() {
  const { id } = useParams();
  const { showToast } = useToast();
  
  // Mock Data: Course state
  const [accessStatus, setAccessStatus] = useState('unpaid'); // 'unpaid' | 'pending' | 'approved'
  const [file, setFile] = useState(null);

  const course = {
    title: '2024 A/L Economics Revision - March',
    description: 'Complete revision covering Macroeconomics and past papers discussion.',
    price: 'Rs. 2500',
    bankDetails: [
        { label: 'Bank', value: 'Bank of Ceylon' },
        { label: 'Account No', value: '8472910' },
        { label: 'Name', value: 'M. Prabath' },
        { label: 'Branch', value: 'Nugegoda' }
    ],
    videoId: 'iYVeuwF8v_E',
    tutes: [
        { name: 'March Tute 1 - MCQ.pdf', size: '2 MB' },
        { name: 'March Tute 2 - Essay.pdf', size: '5 MB' },
    ]
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if(file) {
        setAccessStatus('pending');
        showToast('Receipt uploaded! Admin will approve it shortly.', 'success');
    } else {
        showToast('Please select a file to upload first.', 'error');
    }
  };

  return (
    <div className="container mt-8 lg:mt-12 mb-20 max-w-5xl w-full">
       {/* Breadcrumbs / Header Info */}
       <div className="mb-8">
           <div className="flex items-center gap-3 mb-4">
                <span className="badge badge-primary">Economics</span>
                <span className="badge badge-neutral">March 2024</span>
                {accessStatus === 'approved' && <span className="badge badge-success flex gap-1"><Check size={12}/> Access Granted</span>}
           </div>
           <h1 className="text-3xl lg:text-5xl font-bold mb-4 text-white tracking-tight">{course.title}</h1>
           <p className="text-text-muted text-lg max-w-3xl">{course.description}</p>
       </div>

       {/* Security Requirement: Locked State Centered Hero */}
       {accessStatus === 'unpaid' && (
           <div className="border border-surface-border bg-surface rounded-2xl overflow-hidden shadow-2xl relative mb-12">
               {/* Decorative background */}
               <div className="absolute inset-0 bg-gradient-to-br from-surface to-[#1e1e24] pointer-events-none"></div>
               <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
               
               <div className="relative z-10 p-8 lg:p-12 flex flex-col lg:flex-row gap-12 items-center">
                   
                   {/* Left Side: Info */}
                   <div className="flex-1 w-full text-center lg:text-left">
                       <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 text-danger mb-6">
                           <Lock size={32} />
                       </div>
                       <h2 className="text-3xl font-bold text-white mb-4">This Lesson is Locked</h2>
                       <p className="text-text-muted mb-6 text-lg">
                           You need to complete the monthly payment of <strong className="text-white bg-surface-hover px-2 py-1 rounded">{course.price}</strong> to access these videos and tutes.
                       </p>
                       
                       <div className="bg-bg border border-surface-border rounded-xl p-6 text-left shadow-inner">
                           <div className="text-sm font-semibold uppercase text-text-muted tracking-wider mb-4 flex items-center gap-2">
                               <FileText size={16} /> Bank Details
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               {course.bankDetails.map((detail, idx) => (
                                   <div key={idx}>
                                       <div className="text-xs text-text-muted">{detail.label}</div>
                                       <div className="font-medium text-white">{detail.value}</div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>

                   {/* Right Side: Upload Form */}
                   <div className="w-full lg:w-[400px]">
                       <form onSubmit={handleUpload} className="bg-bg border border-surface-border rounded-xl p-6 shadow-xl">
                            <h3 className="text-xl font-bold text-white mb-2 text-center">Verify Payment</h3>
                            <p className="text-sm text-text-muted text-center mb-6">Upload a clear photo of your bank deposit slip or online transfer screenshot.</p>
                            
                            <div className="relative border-2 border-dashed border-surface-hover hover:border-primary bg-surface/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group mb-4">
                               <UploadCloud className="w-10 h-10 text-text-muted group-hover:text-primary transition-colors mb-3" />
                               <span className="text-sm font-medium text-white mb-1">Select payment slip</span>
                               <span className="text-xs text-text-muted">JPEG, PNG or PDF (Max 5MB)</span>
                               <input 
                                   type="file" 
                                   accept="image/*,.pdf" 
                                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                   onChange={(e) => setFile(e.target.files[0])}
                               />
                            </div>
                            
                            {file ? (
                                <div className="text-sm text-success mb-6 flex items-center justify-center gap-2 bg-success/10 py-2 rounded-md border border-success/20">
                                    <CheckCircle size={16}/> {file.name}
                                </div>
                            ) : (
                                <div className="h-4 mb-6"></div>
                            )}
                            
                            <button type="submit" className="btn btn-primary w-full justify-center py-3 text-base shadow-lg shadow-primary/30">
                                Submit for Verification
                            </button>
                            
                            {/* Auto-approve logic purely for testing/prototyping */}
                            <div className="mt-4 pt-4 border-t border-surface-border text-center">
                                <button type="button" onClick={() => setAccessStatus('approved')} className="text-xs text-primary hover:underline" title="Demo: Skip Payment">
                                    Developer: Bypass Payment Lock
                                </button>
                            </div>
                       </form>
                   </div>
               </div>
           </div>
       )}

       {/* Pending State */}
       {accessStatus === 'pending' && (
            <div className="border border-warning/30 bg-warning/5 rounded-2xl overflow-hidden relative mb-12 p-8 lg:p-12 text-center">
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warning/10 text-warning mb-6">
                   <Clock size={40} />
               </div>
               <h2 className="text-3xl font-bold text-white mb-4">Verification in Progress</h2>
               <p className="text-text-muted text-lg max-w-xl mx-auto">
                   Thank you for submitting your payment slip. Manjula Sir or an admin will verify it shortly. You will gain access to the lesson automatically once approved.
               </p>
            </div>
       )}

       {/* Content Area - Blurred out if not approved */}
       <div className={`transition-all duration-700 ${accessStatus === 'approved' ? 'opacity-100 translate-y-0' : 'opacity-20 pointer-events-none blur-md translate-y-4'}`}>
           <div className="mb-12">
               <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                   <div className="p-2 bg-primary/20 text-primary rounded-lg">
                       <PlayCircle size={24} />
                   </div>
                   Video Lesson
               </h2>
               
               {/* Premium Video Player Container */}
               <div className="video-container shadow-2xl shadow-black/50 border border-surface-border relative group">
                   {accessStatus === 'approved' ? (
                       <iframe 
                        src={`https://www.youtube.com/embed/${course.videoId}?rel=0&modestbranding=1`} 
                        title="YouTube video player" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen>
                       </iframe>
                   ) : (
                       <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-text-muted bg-surface">
                            <Lock className="w-16 h-16 opacity-30 mb-2" />
                            <span className="text-lg font-medium">Content is locked</span>
                       </div>
                   )}
               </div>
           </div>

           <div>
               <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                   <div className="p-2 bg-success/20 text-success rounded-lg">
                       <BookOpen size={24} />
                   </div>
                   Tute Gallery
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {course.tutes.map((tute, i) => (
                       <div key={i} className="bg-surface border border-surface-border rounded-xl flex items-center justify-between p-4 hover:border-primary/50 transition-colors group">
                           <div className="flex items-center gap-4">
                               <div className="p-3 bg-surface-hover rounded-lg text-primary group-hover:scale-110 transition-transform">
                                   <FileText size={24} />
                               </div>
                               <div>
                                   <div className="font-bold text-white text-base">{tute.name}</div>
                                   <div className="text-sm text-text-muted mt-0.5">{tute.size} • PDF Document</div>
                               </div>
                           </div>
                           <button className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                               <Download size={18} />
                           </button>
                       </div>
                   ))}
               </div>
           </div>
       </div>
    </div>
  );
}
