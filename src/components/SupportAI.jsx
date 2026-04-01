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

    // Mock AI Response
    setTimeout(() => {
      setIsTyping(false);
      let response = "ස්තූතියි ඔබේ පණිවිඩයට. අපේ කණ්ඩායම ඉක්මනින් ඔබව සම්බන්ධ කර ගනීවි. ඔබට දැනට ඇති ගැටලුව විස්තර කරන්න.";
      
      if (userMsg.toLowerCase().includes('hello') || userMsg.toLowerCase().includes('hi')) {
        response = "ආයුබෝවන්! ඔබට අද දිනයේ සහාය අවශ්‍ය වන්නේ කුමන පාඨමාලාව සම්බන්ධයෙන්ද?";
      } else if (userMsg.toLowerCase().includes('course') || userMsg.toLowerCase().includes('panthi')) {
        response = "ඔබට අපගේ පාඨමාලා (Courses) මෙනුවෙන් සියලුම විස්තර බලාගත හැකියි. නැතිනම් වැඩිදුර විස්තර සඳහා 077 123 4567 අමතන්න.";
      }

      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    }, 1500);
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, fontFamily: 'var(--font-family)' }}>
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
