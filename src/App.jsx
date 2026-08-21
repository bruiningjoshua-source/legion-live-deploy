import React from 'react';
import VTuberTest from '@/pages/VTuberTest';
import LAFAvatarTest from '@/pages/LAFAvatarTest';
import MoCapTest from '@/pages/MoCapTest';
import BackdropTest from '@/pages/BackdropTest';
import SplatTest from '@/pages/SplatTest';
import GiftTest from '@/pages/GiftTest';
import AdminOnlyRoute from '@/components/shared/AdminOnlyRoute';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/supabase/SupabaseAuthContext';
import { MiniPlayerProvider } from '@/components/stream/MiniPlayerContext';
import FloatingMiniPlayer from '@/components/stream/FloatingMiniPlayer';
import Auth from './pages/Auth';
import DailyLoginReward from '@/components/rewards/DailyLoginReward';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();

  const [showDailyReward, setShowDailyReward] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (!user?.email) return;
    if (!localStorage.getItem('ll_onboarded')) {
      const t = setTimeout(() => setShowOnboarding(true), 1500);
      return () => clearTimeout(t);
    }
  }, [user?.email]);

  React.useEffect(() => {
    if (!user?.email) return;
    const key = 'll_last_reward_claimed';
    const today = new Date().toISOString().split('T')[0];
    // Only skip if the user already CLAIMED today (not just saw the modal)
    if (localStorage.getItem(key) === today) return;
    const t = setTimeout(() => setShowDailyReward(true), 2000);
    return () => clearTimeout(t);
  }, [user?.email]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Unauthenticated: show login page regardless of path
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/vtuber-test" element={<AdminOnlyRoute><VTuberTest /></AdminOnlyRoute>} />
        <Route path="/laf-test" element={<AdminOnlyRoute><LAFAvatarTest /></AdminOnlyRoute>} />
        <Route path="/mocap-test" element={<AdminOnlyRoute><MoCapTest /></AdminOnlyRoute>} />
        <Route path="/backdrop-test" element={<AdminOnlyRoute><BackdropTest /></AdminOnlyRoute>} />
        <Route path="/splat-test" element={<AdminOnlyRoute><SplatTest /></AdminOnlyRoute>} />
        <Route path="/gift-test" element={<AdminOnlyRoute><GiftTest /></AdminOnlyRoute>} />
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase())}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/login" element={<Auth />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      {showOnboarding && user && (
        <OnboardingFlow user={user} onComplete={() => setShowOnboarding(false)} />
      )}
      {showDailyReward && user && (
        <DailyLoginReward user={user} onClose={() => setShowDailyReward(false)} onClaimed={() => {
          localStorage.setItem('ll_last_reward_claimed', new Date().toISOString().split('T')[0]);
        }} />
      )}
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <MiniPlayerProvider>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
            <FloatingMiniPlayer />
          </Router>
          <Toaster />
        </MiniPlayerProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App