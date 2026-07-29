import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';

// Pages imports
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';
import Dashboard from './pages/Dashboard';
import Footfall from './pages/Footfall';
import Feedback from './pages/Feedback';
import FeedbackQR from './pages/FeedbackQR';
import FeedbackList from './pages/FeedbackList';
import Divert from './pages/Divert';
import PMView from './pages/PMView';
import Reports from './pages/Reports';
import CashSettlement from './pages/CashSettlement';
import VmChecklist from './pages/VmChecklist';
import Admin from './pages/Admin';
import TVDisplay from './pages/TVDisplay';

interface SetupGateProps {
  children: React.ReactNode;
}

const SetupGate: React.FC<SetupGateProps> = ({ children }) => {
  const { loading, setupComplete } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginTop: '10px' }}>Loading Retail CRM…</p>
        </div>
      </div>
    );
  }

  if (!setupComplete) {
    return <Navigate to="/onboard" replace />;
  }

  return <>{children}</>;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/onboard" element={<Onboarding />} />
        <Route path="/success" element={<Success />} />
        
        {/* Public QR Code Feedback Landing Page */}
        <Route path="/feedback-public" element={<Feedback />} />

        <Route 
          path="/login" 
          element={
            <SetupGate>
              {user ? <Navigate to="/app" replace /> : <Login />}
            </SetupGate>
          } 
        />

        {/* TV display dashboard - rendered full screen without AppLayout sidebar */}
        <Route 
          path="/app/tv" 
          element={
            <ProtectedRoute>
              <TVDisplay />
            </ProtectedRoute>
          } 
        />

        {/* Standard Protected layout pages */}
        <Route 
          path="/app/*" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/footfall" element={<Footfall />} />
                  <Route path="/feedback-qr" element={<FeedbackQR />} />
                  <Route path="/feedback-list" element={<FeedbackList />} />
                  <Route path="/divert" element={<Divert />} />
                  <Route path="/pm-view" element={<PMView />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/cash-settlement" element={<CashSettlement />} />
                  <Route path="/vm-checklist" element={<VmChecklist />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
