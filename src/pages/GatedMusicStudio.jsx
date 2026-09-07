/**
 * GatedMusicStudio — Access control wrapper for Music Studio feature
 * Only allows access to users who meet specific criteria (e.g., creators, premium)
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/supabase/SupabaseAuthContext';
import MusicStudio from './MusicStudio';

const GatedMusicStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Gate criteria:
  // - User must be authenticated (already checked by App.jsx)
  // - Feature is currently hidden/disabled
  // Add your own criteria here (e.g., isCreator, isPremium, etc.)
  const isFeatureEnabled = false; // Set to true to enable
  const userHasAccess = isFeatureEnabled; // Add your own logic here

  if (!userHasAccess) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Music Studio Coming Soon</h1>
          <p className="text-white/60 text-sm mb-6">
            The Music Studio feature is currently in development and not yet available. Check back soon!
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold hover:bg-amber-500/30 transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return <MusicStudio />;
};

export default GatedMusicStudio;
