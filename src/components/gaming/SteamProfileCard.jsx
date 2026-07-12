/**
 * SteamProfileCard — shows a creator's linked Steam: live "now playing" badge
 * and their most-played games. Read-only, public. Renders nothing if the
 * creator hasn't linked Steam.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Gamepad2 } from 'lucide-react';

export default function SteamProfileCard({ email }) {
  const [steam, setSteam] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email) return;
      try {
        const res = await base44.functions.invoke('getGamingAccounts', { email });
        const accounts = res.data?.accounts || res.accounts || [];
        const s = accounts.find(a => a.platform === 'steam');
        if (!cancelled) setSteam(s || null);
      } catch (_) { /* none */ }
    })();
    return () => { cancelled = true; };
  }, [email]);

  if (!steam) return null;
  const games = (steam.library_json || []).slice(0, 6);

  return (
    <div className="ll-card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-amber-400" />
          <span className="text-white font-semibold text-sm">Steam</span>
        </div>
        {steam.now_playing && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Playing {steam.now_playing}
          </span>
        )}
      </div>

      {games.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {games.map(g => (
            <div key={g.appid} className="ll-card-inset p-2 flex flex-col items-center text-center gap-1">
              {g.icon
                ? <img src={g.icon} alt="" className="w-8 h-8 rounded" />
                : <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs">🎮</div>}
              <p className="text-white/70 text-[10px] leading-tight line-clamp-2">{g.name}</p>
              {g.playtime_hours > 0 && (
                <p className="text-amber-400/70 text-[9px]">{g.playtime_hours}h</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/40 text-xs">{steam.platform_username} on Steam</p>
      )}
    </div>
  );
}
