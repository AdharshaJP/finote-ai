import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User } from 'lucide-react';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { aiAPI } from '../services/api.js';

const QUICK_PROMPTS = [
  'How is my spending this month?',
  'Am I saving enough?',
  'What is my biggest expense?',
  'How long will my balance last?',
];

const TypingIndicator = () => (
  <div className="chat-bubble ai typing-indicator">
    <div className="chat-avatar"><Bot size={14} /></div>
    <div className="chat-bubble-content">
      <span /><span /><span />
    </div>
  </div>
);

const ChatMessage = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
      {!isUser && <div className="chat-avatar"><Bot size={14} /></div>}
      <div className="chat-bubble-content">
        <p>{msg.text}</p>
        <span className="chat-time">{msg.time}</span>
      </div>
      {isUser && <div className="chat-avatar user"><User size={14} /></div>}
    </div>
  );
};

const AIChat = () => {
  const { isOpen, close } = useChat();
  const { user } = useAuth();

  const [messages, setMessages] = useState([{
    role: 'ai',
    text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your Finote AI assistant. Ask me anything about your finances — spending habits, savings tips, or whether you can afford something.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || !user?.id) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: question, time }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await aiAPI.chat(question, user.id);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.answer, time: aiTime }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Sorry, I had trouble connecting. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Overlay to close panel on outside click
  return (
    <>
      {isOpen && <div className="chat-overlay" onClick={close} />}

      <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chat-panel-header">
          <div className="chat-panel-title">
            <div className="chat-panel-avatar"><Sparkles size={16} /></div>
            <div>
              <div className="chat-panel-name">Finote AI</div>
              <div className="chat-panel-status">
                <span className="chat-status-dot" /> Online · Powered by Groq
              </div>
            </div>
          </div>
          <button onClick={close} className="chat-icon-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length === 1 && (
          <div className="chat-quick-prompts">
            {QUICK_PROMPTS.map(p => (
              <button key={p} className="chat-quick-btn" onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            className="chat-input"
            placeholder="Ask about your finances..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={isTyping}
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default AIChat;
