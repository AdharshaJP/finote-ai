import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Homepage from './pages/Homepage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Budgets from './pages/Budgets.jsx';
import AIInsightsPage from './pages/AIInsightsPage.jsx';
import AIPredictPage from './pages/AIPredictPage.jsx';
import AffordPage from './pages/AffordPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import UploadBillPage from './pages/UploadBillPage.jsx';
import BillsPage from './pages/BillsPage.jsx';

const protect = (Component) => (
  <ProtectedRoute><Component /></ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <Router>
            <div className="app">
              <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={protect(Dashboard)} />
                <Route path="/transactions" element={protect(Transactions)} />
                <Route path="/budgets" element={protect(Budgets)} />
                <Route path="/ai-insights" element={protect(AIInsightsPage)} />
                <Route path="/ai-predict" element={protect(AIPredictPage)} />
                <Route path="/afford" element={protect(AffordPage)} />
                <Route path="/assistant" element={protect(AssistantPage)} />
                <Route path="/upload-bill" element={protect(UploadBillPage)} />
                <Route path="/bills" element={protect(BillsPage)} />
              </Routes>
            </div>
          </Router>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
