import Layout from '../components/Layout.jsx';
import AffordCheck from '../components/AffordCheck.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const AffordPage = () => {
  const { user } = useAuth();

  return (
    <Layout>
      {user?.id ? (
        <AffordCheck userId={user.id} />
      ) : (
        <div className="insights-loading"><div className="insights-spinner" /><p>Loading...</p></div>
      )}
    </Layout>
  );
};

export default AffordPage;
