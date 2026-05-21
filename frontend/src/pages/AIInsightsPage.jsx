import Layout from '../components/Layout.jsx';
import AIInsights from '../components/AIInsights.jsx';
import AnomalyAlert from '../components/AnomalyAlert.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const AIInsightsPage = () => {
  const { user } = useAuth();

  if (!user?.id) {
    return (
      <Layout>
        <div className="insights-loading">
          <div className="insights-spinner" />
          <p>Loading…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Anomaly alert sits above the main insights panel */}
      <AnomalyAlert userId={user.id} />
      <AIInsights userId={user.id} />
    </Layout>
  );
};

export default AIInsightsPage;
