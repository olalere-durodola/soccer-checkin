import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import AttendancePage from './pages/AttendanceForm';
import AttendanceHistory from './pages/AttendanceHistory';
import FollowUp from './pages/FollowUp';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Donations from './pages/Donations';
import DonationDetails from './pages/DonationDetails';
import DonationComparison from './pages/DonationComparison';
import Login from './pages/Login';
import Register from './pages/Register';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
            <Route path="/attendance/history" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />
            <Route path="/follow-up" element={<ProtectedRoute><FollowUp /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/groups/:id" element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
            <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
            <Route path="/donations/compare" element={<ProtectedRoute><DonationComparison /></ProtectedRoute>} />
            <Route path="/donations/:id" element={<ProtectedRoute><DonationDetails /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
