import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, BookOpen, Menu, X, MessageSquare, Sparkles, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import SupportAI from '../components/SupportAI';

export default function StudentLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  
  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.error('Signout failed', e); }
    localStorage.removeItem('admin_role');
    localStorage.removeItem('instructor_id');
    window.location.href = '/login';
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Our Classes', path: '/courses' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' }
  ];

  const isHomePage = location.pathname === '/';

  return (
    <div className="app-container">
      {/* Dynamic Header: Dark/transparent on Home, White elsewhere */}
      <header className="navbar" style={{ 
          backgroundColor: (isHomePage && !isMenuOpen) ? 'rgba(3,7,18,0.6)' : 'var(--color-surface)',
          backdropFilter: (isHomePage || isMenuOpen) ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: (isHomePage || isMenuOpen) ? 'blur(20px)' : 'none',
          position: 'fixed',
          top: 0, left: 0, right: 0, zIndex: 1000,
          boxShadow: isHomePage ? '0 1px 0 rgba(255,255,255,0.05)' : '0 2px 10px rgba(0,0,0,0.05)',
          borderBottom: isHomePage ? '1px solid rgba(255,255,255,0.07)' : '1px solid var(--color-surface-border)',
          height: '70px',
      }}>
        <div className="container navbar-inner" style={{ padding: '0 2rem' }}>
          
          <Link to="/" className="nav-brand" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <div style={{ position: 'relative' }}>
                 <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-primary)', transform: 'rotate(45deg)', borderRadius: '4px' }}></div>
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontStyle: 'italic', fontSize: '1.2rem', letterSpacing: '-1px' }}>
                    NO
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '1.25rem', fontWeight: 900, color: (isHomePage && !isMenuOpen) ? 'white' : 'var(--color-text)', letterSpacing: '1px' }}>NEXUS</span>
                 <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (isHomePage && !isMenuOpen) ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>ONLINE</span>
              </div>
            </div>
          </Link>

          {/* Centered Desktop Nav */}
          <nav className="nav-links-desktop">
             {navLinks.map(link => {
                const isActive = location.pathname === link.path;
                const textColor = isActive ? 'var(--color-primary)' : (isHomePage && !isMenuOpen ? 'white' : 'var(--color-text)');
                return (
                  <Link 
                    key={link.name} 
                    to={link.path} 
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={{ color: textColor, fontWeight: isActive ? 900 : 700 }}
                  >
                    {link.name}
                  </Link>
                );
              })}
              {session && (
                  <Link 
                    to="/dashboard" 
                    className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                    style={{ color: location.pathname === '/dashboard' ? 'var(--color-primary)' : (isHomePage && !isMenuOpen ? 'white' : 'var(--color-text)'), fontWeight: location.pathname === '/dashboard' ? 900 : 700 }}
                  >
                    My Dashboard
                  </Link>
              )}
          </nav>

          {/* Right side actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={toggleTheme} 
                style={{ background: 'none', border: 'none', color: (isHomePage && !isMenuOpen) ? 'white' : 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem' }}
              >
                {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
              </button>

              <div className="nav-actions">
                  {session ? (
                      <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: (isHomePage && !isMenuOpen) ? 'white' : 'var(--color-text)', borderColor: (isHomePage && !isMenuOpen) ? 'white' : 'var(--color-surface-border)' }}>
                          <LogOut size={16} /> Logout
                      </button>
                  ) : (
                      <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 2rem' }}>
                          Login
                      </Link>
                  )}
              </div>

              {/* Mobile Menu Button */}
              <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ color: (isHomePage && !isMenuOpen) ? 'white' : 'var(--color-text)' }}>
                {isMenuOpen ? <X /> : <Menu />}
              </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Dropdown */}
      {isMenuOpen && (
        <div className="mobile-drop">
            {navLinks.map(link => {
               const isActive = location.pathname === link.path;
               return (
                <Link key={link.name} to={link.path} onClick={() => setIsMenuOpen(false)} className="nav-item" style={isActive ? { color: 'var(--color-primary)' } : {}}>
                  {link.name}
                </Link>
               )
            })}
            {session && (
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="nav-item">
                     My Dashboard
                </Link>
            )}
            <div style={{height: '1px', background: 'var(--color-surface-hover)', margin: '8px 0'}}></div>
            {session ? (
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="btn btn-outline" style={{marginTop: '0.5rem', width: '100%', justifyContent: 'center'}}>
                    Logout
                </button>
            ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="btn btn-primary" style={{marginTop: '0.5rem', width: '100%', justifyContent: 'center'}}>
                    Login
                </Link>
            )}
        </div>
      )}

       {/* Main Content */}
       <main className="main-content" style={{ marginTop: isHomePage ? 0 : '70px', minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
         <div style={{ flex: 1 }}>
            <Outlet />
         </div>
         
         <footer style={{ 
            padding: '3rem 0', 
            background: isHomePage ? '#030712' : 'var(--color-surface)', 
            borderTop: isHomePage ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--color-surface-border)', 
            textAlign: 'center' 
         }}>
           <div className="container">
              <p style={{ color: isHomePage ? 'rgba(255,255,255,0.4)' : 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                © {new Date().getFullYear()} <span style={{ color: isHomePage ? '#fff' : 'var(--color-text)', fontWeight: 700 }}>Nexus Online</span> · Sri Lanka
              </p>
              <p style={{ color: isHomePage ? 'rgba(255,255,255,0.25)' : 'var(--color-text-muted)', fontSize: '0.75rem', opacity: isHomePage ? 1 : 0.6, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Developed & Powered by <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Radical Commerce</span>
              </p>
           </div>
         </footer>
       </main>

        {/* Floating AI Support Widget */}
        <SupportAI />
    </div>
  );
}
