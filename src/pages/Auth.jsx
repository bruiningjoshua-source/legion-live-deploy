import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseCore';

export default function Login() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isSignUp, setIsSignUp]   = useState(false);
  const [isForgot, setIsForgot]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);

  useEffect(() => {
    // Detect recovery mode from URL hash (Supabase sets #type=recovery)
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (hash.includes('type=recovery') || params.get('type') === 'recovery') {
      setIsRecovery(true);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !isRecovery) window.location.replace('/');
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setResetComplete(true);
      setTimeout(() => window.location.replace('/'), 2000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address above first'); return; }
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/Auth?type=recovery`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-1">LEGION LIVE</h1>
          <p className="text-white/40 text-sm">
            {isForgot ? 'Reset your password' : isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {isRecovery ? (
          <div className="space-y-4">
            {resetComplete ? (
              <div className="text-center space-y-3">
                <div className="text-4xl">✅</div>
                <p className="text-white font-semibold">Password updated!</p>
                <p className="text-white/40 text-sm">Redirecting you in…</p>
              </div>
            ) : (
              <>
                <p className="text-white/60 text-sm text-center">Choose your new password</p>
                <input type="password" placeholder="New password (min 6 chars)" value={newPassword}
                  onChange={e=>setNewPassword(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleUpdatePassword()}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-amber-500" />
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <button onClick={handleUpdatePassword} disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50">
                  {loading ? 'Updating…' : 'Set New Password'}
                </button>
              </>
            )}
          </div>
        ) : resetSent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <span className="text-2xl">✉️</span>
            </div>
            <p className="text-white font-semibold">Check your email</p>
            <p className="text-white/50 text-sm">We sent a reset link to <strong>{email}</strong></p>
            <button onClick={() => { setIsForgot(false); setResetSent(false); }}
              className="w-full text-white/40 text-sm text-center mt-2">
              Back to sign in
            </button>
          </div>
          ) : (
          <div className="space-y-4">
            <input
              type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white
                placeholder-white/40 focus:outline-none focus:border-amber-500"
            />
            {!isForgot && (
              <input
                type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white
                  placeholder-white/40 focus:outline-none focus:border-amber-500"
              />
            )}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            {isForgot ? (
              <>
                <button onClick={handleForgotPassword} disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm
                    hover:bg-amber-400 transition-colors disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button onClick={() => { setIsForgot(false); setError(''); }}
                  className="w-full text-white/40 text-sm text-center">
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <button onClick={handleSubmit} disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm
                    hover:bg-amber-400 transition-colors disabled:opacity-50">
                  {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
                </button>
                <button onClick={handleGoogleSignIn}
                  className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm
                    hover:bg-gray-100 transition-colors">
                  Continue with Google
                </button>
                {!isSignUp && (
                  <button onClick={() => { setIsForgot(true); setError(''); }}
                    className="w-full text-white/40 text-sm text-center">
                    Forgot password?
                  </button>
                )}
                <button onClick={() => { setIsSignUp(v => !v); setError(''); }}
                  className="w-full text-white/40 text-sm text-center">
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
