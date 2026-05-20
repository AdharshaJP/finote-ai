import Layout from '../components/Layout.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { MessageCircle, Sparkles, Brain, DollarSign, TrendingUp } from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'Financial Analysis', desc: 'Ask why you overspend or how your finances look.' },
  { icon: DollarSign, title: 'Afford Check', desc: 'Ask "Can I afford a new phone?" and get a real answer.' },
  { icon: TrendingUp, title: 'Spending Prediction', desc: 'Ask how long your money will last at the current rate.' },
  { icon: Sparkles, title: 'Personalized Tips', desc: 'Get advice based on your actual transaction data.' },
];

const AssistantPage = () => {
  const { open } = useChat();

  return (
    <Layout>
      <div className="assistant-page">
        <div className="assistant-hero">
          <div className="assistant-hero-icon">
            <Sparkles size={36} />
          </div>
          <h1>Meet Your AI Financial Assistant</h1>
          <p>Powered by Groq · Knows your real financial data · Available anytime</p>
          <button className="btn btn-primary assistant-open-btn" onClick={open}>
            <MessageCircle size={18} />
            Open AI Chat
          </button>
        </div>

        <div className="assistant-features-grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card assistant-feature-card" onClick={open}>
              <div className="assistant-feature-icon"><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        <div className="assistant-cta-card">
          <h3>Ask anything about your money</h3>
          <p>The assistant has access to your income, expenses, categories, and spending trends in real time.</p>
          <button className="btn btn-primary" onClick={open}>
            <MessageCircle size={16} /> Start a Conversation
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default AssistantPage;
