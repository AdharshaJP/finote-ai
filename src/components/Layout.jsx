import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import AIChat from './AIChat.jsx';
import { MessageCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext.jsx';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOpen: chatOpen, toggle: toggleChat } = useChat();

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`main-content ${sidebarOpen ? 'sidebar-pushed' : ''}`}>
        <Navbar onMenuToggle={() => setSidebarOpen(v => !v)} />
        <div className="content">
          {children}
        </div>
      </div>

      {/* Floating chat button */}
      <button
        className={`chat-fab ${chatOpen ? 'chat-fab-active' : ''}`}
        onClick={toggleChat}
        title="AI Chat Assistant"
      >
        <MessageCircle size={22} />
        {!chatOpen && <span className="chat-fab-pulse" />}
      </button>

      {/* Chat panel */}
      <AIChat />
    </div>
  );
};

export default Layout;
