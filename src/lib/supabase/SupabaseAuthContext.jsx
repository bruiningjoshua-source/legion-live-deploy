
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseCore';

const AuthContext = createContext();

// Mock auth for local development
const MOCK_USER = {
  id: 'mock-user-123',
  email: 'demo@legion.local',
  full_name: 'Demo Creator',
  role: 'user',
  avatar_url: '',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const isMockMode = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

  useEffect(() => {
    let mounted = true;

    // Mock mode: skip Supabase auth entirely, use mock user
    if (isMockMode) {
      setTimeout(() => {
        if (mounted) {
          setUser(MOCK_USER);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
        }
      }, 500); // Simulate async auth check
      return;
    }

    // Check for existing session on mount.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        loadUser(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    });

    // Listen for auth state changes — fires on sign in, sign out, token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        loadUser(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isMockMode]);

  const loadUser = async (authUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const fullUser = {
        ...(profile || {}),
        // Auth fields always win — never let profile override the real auth id/email
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
        role: profile?.role || 'user',
        avatar_url: profile?.avatar_url || '',
      };

      setUser(fullUser);
      setIsAuthenticated(true);
    } catch (error) {
      setUser({ id: authUser.id, email: authUser.email, role: 'user' });
      setIsAuthenticated(true);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    if (isMockMode) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      logout,
      supabase,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;