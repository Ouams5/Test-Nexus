import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Announcements } from './pages/Announcements';
import { Clubs } from './pages/Clubs';
import { ClubPanel } from './pages/ClubPanel';
import { ClubDetails } from './pages/ClubDetails';
import { Events } from './pages/Events';
import { Projects } from './pages/Projects';
import { AdminPanel } from './pages/AdminPanel';
import { Profile } from './pages/Profile';
import { BugReportPage } from './pages/BugReport';
import { Conversation } from './pages/Conversation';
import { EventPlanningChat } from './pages/EventPlanningChat';
import { ClubChat } from './pages/ClubChat';
import { Credits } from './pages/Credits';
import { DebugPanel } from './pages/DebugPanel';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route: Login */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      
      {/* Protected Routes */}
      <Route path="/*" element={
        user ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/clubs/:clubId" element={<ClubDetails />} />
              <Route path="/clubs/:clubId/chat" element={<ClubChat />} />
              <Route path="/club-panel/:clubId" element={<ClubPanel />} />
              <Route path="/events" element={<Events />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bugs" element={<BugReportPage />} />
              <Route path="/chat" element={<Conversation />} />
              <Route path="/event-planning" element={<EventPlanningChat />} />
              <Route path="/credits" element={<Credits />} />
              <Route path="/debug" element={<DebugPanel />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UIProvider>
          <AuthProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </AuthProvider>
        </UIProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;