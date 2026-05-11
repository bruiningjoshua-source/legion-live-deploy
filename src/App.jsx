import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/supabase/SupabaseAuthContext';
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
    const key = 'll_last_reward_check';
    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(key) !== today) {
      const t = setTimeout(() => { setShowDailyReward(true); localStorage.setItem(key, today); }, 2000);
      return () => clearTimeout(t);
    }
  }, [user?.email]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated && window.location.pathname === '/login') {
    return <Auth />;
  }

  return (
    <>
      <Routes>
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
        <DailyLoginReward user={user} onClose={() => setShowDailyReward(false)} />
      )}
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App