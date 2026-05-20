import { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(v => !v);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <ChatContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </ChatContext.Provider>
  );
};
