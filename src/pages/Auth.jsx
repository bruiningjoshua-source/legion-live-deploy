import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseCore';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');

  // Redirect as soon as Supabase confirms the session is persisted.
  // This fires AFTER localStorage is written — window.location.href does not wait for that.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window.location.replace('/');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Do NOT redirect here. The useEffect listener handles it.
    } catch (err) {
      setError(err.message);
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-1">LEGION LIVE</h1>
          <p className="text-white/40 text-sm">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white
              placeholder-white/40 focus:outline-none focus:border-amber-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white
              placeholder-white/40 focus:outline-none focus:border-amber-500"
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm
              hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm
              hover:bg-gray-100 transition-colors"
          >
            Continue with Google
          </button>
          <button
            onClick={() => setIsSignUp(v => !v)}
            className="w-full text-white/40 text-sm text-center"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}