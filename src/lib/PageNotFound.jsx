import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Home, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

// Legion-Forged · LF-2026-Ω
export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-8">

        {/* Forge badge */}
        <div className="flex items-center justify-center gap-1.5 text-white/15 text-[10px] font-mono">
          <Shield className="w-3 h-3" /> Legion-Forged · LF-2026-Ω
        </div>

        {/* 404 display */}
        <div>
          <p className="text-[96px] font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400/30 to-amber-600/10 leading-none select-none">
            404
          </p>
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mx-auto mt-2" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Page Not Found</h2>
          {pageName && (
            <p className="text-white/30 text-sm">
              <span className="font-mono text-amber-400/60">/{pageName}</span> doesn't exist on this platform.
            </p>
          )}
        </div>

        {/* Admin note */}
        {isFetched && authData?.isAuthenticated && authData?.user?.role === 'admin' && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-left">
            <p className="text-amber-400 text-xs font-semibold mb-1">Admin Note</p>
            <p className="text-white/40 text-xs leading-relaxed">
              This page hasn't been built yet. Ask the AI to implement it in the chat.
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => navigate(createPageUrl('Home'))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors"
          >
            <Home className="w-4 h-4" /> Home
          </button>
        </div>
      </div>
    </div>
  );
}