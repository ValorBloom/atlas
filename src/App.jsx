import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Layout
import AppLayout from './components/layout/AppLayout';
import LoginScreen from './components/LoginScreen';

// Pages
import Home from './pages/Home';
import Setup from './pages/Setup';
import Actions from './pages/Actions';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import MovementWizard from './pages/MovementWizard';
import ReachedUpdate from './pages/ReachedUpdate';
import SFTSubmission from './pages/SFTSubmission';
import StatusMenu from './pages/StatusMenu';
import StatusReport from './pages/StatusReport';
import StatusUpdate from './pages/StatusUpdate';
import Points from './pages/Points';
import Leaderboard from './pages/Leaderboard';
import PointLogs from './pages/PointLogs';
import EditPoints from './pages/EditPoints';
import DrawNames from './pages/DrawNames';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import LocationTracker from './pages/admin/LocationTracker';
import AppointAdmin from './pages/admin/AppointAdmin';
import PTAdmin from './pages/admin/PTAdmin';
import ParadeState from './pages/admin/ParadeState';
import ImportUsers from './pages/admin/ImportUsers';
import DataClear from './pages/admin/DataClear';
import Announcements from './pages/admin/Announcements';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-900 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500">Loading Anchor...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <LoginScreen onLogin={navigateToLogin} />;
    }
  }

  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/actions/movement" element={<MovementWizard />} />
        <Route path="/actions/movement/reached" element={<ReachedUpdate />} />
        <Route path="/actions/sft" element={<SFTSubmission />} />
        <Route path="/actions/status" element={<StatusMenu />} />
        <Route path="/actions/status/report/:type" element={<StatusReport />} />
        <Route path="/actions/status/update/:type" element={<StatusUpdate />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/points" element={<Points />} />
        <Route path="/points/leaderboard" element={<Leaderboard />} />
        <Route path="/points/logs" element={<PointLogs />} />
        <Route path="/points/edit" element={<EditPoints />} />
        <Route path="/points/draw" element={<DrawNames />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/locations" element={<LocationTracker />} />
        <Route path="/admin/appoint" element={<AppointAdmin />} />
        <Route path="/admin/pt" element={<PTAdmin />} />
        <Route path="/admin/parade-state" element={<ParadeState />} />
        <Route path="/admin/import" element={<ImportUsers />} />
        <Route path="/admin/data-clear" element={<DataClear />} />
        <Route path="/admin/announcements" element={<Announcements />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App