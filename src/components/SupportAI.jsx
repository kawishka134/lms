import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, User, Bot, Loader2 } from 'lucide-react';

export default function SupportAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'ආයුබෝවන්! මම Nexus Online AI සහායකයා. ඔබට උදව් කරන්නේ කොහොමද?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage('');
    setIsTyping(true);

    // Enhanced AI Logic for Singlish, Sinhala, English
    setTimeout(() => {
      setIsTyping(false);
      let response = "ස්තූතියි ඔබේ පණිවිඩයට. මට ඒක හරියටම තේරුණේ නෑ. ඒත් ඔයාට අපේ Admin ව සම්බන්ධ කරගන්න ඕන නම් Contact Us පිටුවට යන්න පුළුවන්. (Thank you. I didn't quite catch that. If you need admin support, please visit the Contact page.)";
      
      const msgLower = userMsg.toLowerCase();
      
      if (msgLower.includes('contact') || msgLower.includes('admin') || msgLower.includes('sir wa') || msgLower.includes('sirva') || msgLower.includes('katha karanna') || msgLower.includes('adminwa') || msgLower.includes('help') || msgLower.includes('udawwa')) {
        response = <span>ඔබට Admin හෝ ගුරුවරයා සමග සම්බන්ධ වීමට අවශ්‍ය නම් කරුණාකර අපගේ <a href="/contact" style={{color: '#ffbaba', textDecoration: 'underline'}}>Contact Us පිටුවට යන්න</a>. (Please visit our <a href="/contact" style={{color: '#ffbaba', textDecoration: 'underline'}}>Contact Us page</a> to get in touch with the Admin).</span>;
      } 
      else if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey') || msgLower.includes('kohomada') || msgLower.includes('halo')) {
        response = "ආයුබෝවන්! (Hello!) ඔබට අද දිනයේ සහාය අවශ්‍ය වන්නේ කුමන දේටද? පන්ති ගැනද? ගෙවීම් ගැනද? (How can I help you today?)";
      } 
      else if (msgLower.includes('class') || msgLower.includes('panthi') || msgLower.includes('course') || msgLower.includes('schedule') || msgLower.includes('timetable') || msgLower.includes('kalasathahana')) {
        response = "ඔබට පන්ති වේලාවන් සහ දින (Class Schedules) ඔයාගේ Dashboard එකේ තියෙන 'Schedule' (කාලසටහන) අංශයෙන් බලාගත හැකියි. (You can view class times in the 'Schedule' tab on your Dashboard.)";
      }
      else if (msgLower.includes('payment') || msgLower.includes('pay') || msgLower.includes('salli') || msgLower.includes('gewim') || msgLower.includes('gewanna')) {
        response = "පන්ති ගාස්තු ගෙවන්න ඕනෙ නම්, Dashboard එකේ තියෙන 'Payment' අංශයට ගිහින් අදාළ පන්තිය තෝරලා Slip එක අප්ලෝඩ් කරන්න. (To make a payment, go to the 'Payment' section in your Dashboard and upload your bank slip.)";
      }
      else if (msgLower.includes('video') || msgLower.includes('record') || msgLower.includes('balanne') || msgLower.includes('balanna')) {
        response = "Recordings සහ වීඩියෝ බලන්න ඔයාගේ Dashboard එකේ 'Recordings' අංශයට යන්න. මේවා බලන්න ඔයා අදාළ මාසයට ගෙවීම් කරලා තියෙන්න ඕනේ. (Go to the 'Recordings' tab in your Dashboard to watch videos.)";
      }
      else if (msgLower.includes('password') || msgLower.includes('login') || msgLower.includes('log wenne')) {
        response = "ඔයාගේ පාස්වර්ඩ් එක අමතක වෙලා නම් හදාගන්න බැරි නම්, ඉක්මනින් Admin ව කන්ටැක්ට් කරගන්න. Contact Us පිටුවට යන්න.";
      }

      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    }, 1200);
  };

  return (
    <div className="support-ai-wrapper">
      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            backgroundColor: 'white', color: 'var(--color-primary)', border: 'none', 
            padding: '0.8rem 1.6rem', borderRadius: '100px', boxShadow: '0 10px 40px rgba(225,29,72,0.25)', 
            fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', 
            cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
        >
          <Sparkles size={20} className="ai-star" />
          Support AI
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{ 
          width: '380px', height: '550px', backgroundColor: '#0f172a', borderRadius: '24px', 
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', 
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.2rem 1.5rem', background: 'linear-gradient(135deg, #e11d48, #be123c)', 
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Nexus Assistant</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <div style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }}></div>
                   Active Now
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}>
              <X size={24} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', scrollBehavior: 'smooth' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', display: 'flex', gap: '8px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{ 
                  padding: '10px', borderRadius: '12px', background: msg.role === 'user' ? 'rgba(255,255,255,0.05)' : '#4115d4', color: 'white'
                }}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div style={{ 
                  padding: '1rem', borderRadius: '18px', 
                  backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  color: 'white', fontSize: '0.9rem', lineHeight: 1.5,
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                  borderBottomLeftRadius: msg.role === 'user' ? '18px' : '4px',
                  boxShadow: msg.role === 'user' ? '0 10px 20px rgba(225,29,72,0.15)' : 'none'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px' }}>
                <div style={{ padding: '1rem', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Loader2 size={16} className="typing-spin" />
                   <span style={{ fontSize: '0.8rem' }}>AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..." 
              style={{ 
                flex: 1, padding: '0.8rem 1.2rem', borderRadius: '100px', backgroundColor: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none'
              }}
            />
            <button type="submit" style={{ 
              backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', 
              width: '42px', height: '42px', borderRadius: '50%', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        .support-ai-wrapper {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 1000;
          font-family: var(--font-family);
        }
        @media (max-width: 992px) {
          .support-ai-wrapper {
             bottom: 80px; /* Moves above the bottom nav */
             right: 1.5rem;
          }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ai-star {
          0%, 100% { transform: scale(1) rotate(0); }
          50% { transform: scale(1.2) rotate(15deg); }
        }
        .ai-star { animation: ai-star 2s ease-in-out infinite; }
        .typing-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
