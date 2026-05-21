import Layout from '../components/Layout.jsx';
import AIPredictions from '../components/AIPredictions.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const AIPredictPage = () => {
  const { user } = useAuth();

  return (
    <Layout>
      {user?.id ? (
        <AIPredictions userId={user.id} />
      ) : (
        <div className="insights-loading"><div className="insights-spinner" /><p>Loading...</p></div>
      )}
    </Layout>
  );
};

export default AIPredictPage;
