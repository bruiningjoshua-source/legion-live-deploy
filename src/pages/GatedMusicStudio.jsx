/**
 * GatedMusicStudio — Access control wrapper for Music Studio feature
 * Only allows access to users who meet specific criteria (e.g., creators, premium)
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Music, LockKeyhole } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/supabase/SupabaseAuthContext';
import { createPageUrl } from '@/utils';
import MusicStudio from './MusicStudio';

const GatedMusicStudio = () => {
  const { user } = useAuth();
  const { data: creator, isLoading } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050508] px-4 flex items-center justify-center">
        <div className="ll-panel max-w-sm p-8 text-center">
          <LockKeyhole className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Sign in to use Music Studio</h1>
          <p className="text-sm text-white/50 mb-5">Music Studio is a workspace for creators.</p>
          <button onClick={() => base44.auth.redirectToLogin()} className="ll-btn ll-btn-primary w-full">Sign in</button>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen bg-[#050508]" />;

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#050508] px-4 flex items-center justify-center">
        <div className="ll-panel max-w-sm p-8 text-center">
          <Music className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Create your channel first</h1>
          <p className="text-sm text-white/50 mb-5">Music Studio is available after you set up a public creator profile.</p>
          <Link to={createPageUrl('CreatorOnboarding')} className="ll-btn ll-btn-primary w-full">Set up creator profile</Link>
        </div>
      </div>
    );
  }

  return <MusicStudio />;
};

export default GatedMusicStudio;
