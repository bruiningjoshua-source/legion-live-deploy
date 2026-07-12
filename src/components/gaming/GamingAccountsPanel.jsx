/**
 * GamingAccountsPanel — connect Steam (full: library + achievements +
 * now-playing) and Epic (login/identity). Shown in Settings.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Gamepad2, RefreshCw, Link2, Unlink } from 'lucide-react';

export default function GamingAccountsPanel({ userEmail }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    if (!userEmail) return;
    try {
      const res = await base44.functions.invoke('getGamingAccounts', { email: userEmail });
      setAccounts(res.data?.accounts || res.accounts || []);
    } catch (_) { /* none linked */ }
  };

  useEffect(() => { load(); }, [userEmail]);

  // Handle the ?steam=linked redirect after connecting
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('steam') === 'linked') { toast.success('Steam connected!'); load(); window.history.replaceState({}, '', window.location.pathname); }
    if (p.get('steam') === 'error') { toast.error('Steam connection failed'); window.history.replaceState({}, '', window.location.pathname); }
  }, []);

  const connectSteam = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('steamLinkStart', {});
      const url = res.data?.redirectUrl || res.redirectUrl;
      if (url) window.location.href = url;
    } catch (e) { toast.error('Could not start Steam connection'); }
    finally { setLoading(false); }
  };

  const connectEpic = async () => {
    try {
      const res = await base44.functions.invoke('epicLinkStart', {});
      const url = res.data?.redirectUrl || res.redirectUrl;
      if (url) window.location.href = url;
      else toast.error('Epic sign-in is not configured yet');
    } catch (e) { toast.error('Epic sign-in is not configured yet'); }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('steamSync', {});
      toast.success('Steam library refreshed');
      load();
    } catch (e) { toast.error('Sync failed'); }
    finally { setSyncing(false); }
  };

  const unlink = async (platform) => {
    try {
      await base44.functions.invoke('unlinkGamingAccount', { platform });
      toast.success(`${platform} disconnected`);
      load();
    } catch (e) { toast.error('Could not disconnect'); }
  };

  const steam = accounts.find(a => a.platform === 'steam');
  const epic = accounts.find(a => a.platform === 'epic');

  return (
    <div className="ll-panel p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Gamepad2 className="w-4 h-4 text-amber-400" />
        <span className="ll-panel-title !text-sm">Gaming Accounts</span>
      </div>

      {/* Steam */}
      {steam ? (
        <div className="ll-card p-3">
          <div className="flex items-center gap-3">
            {steam.avatar_url && <img src={steam.avatar_url} alt="" className="w-10 h-10 rounded-lg" />}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{steam.platform_username || 'Steam'}</p>
              {steam.now_playing
                ? <p className="text-emerald-400 text-xs">Playing {steam.now_playing}</p>
                : <p className="text-white/40 text-xs">{(steam.library_json?.length || 0)} games</p>}
            </div>
            <button onClick={sync} disabled={syncing} className="ll-icon-btn" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => unlink('steam')} className="ll-icon-btn" aria-label="Disconnect">
              <Unlink className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={connectSteam} disabled={loading} className="ll-btn ll-btn-secondary w-full justify-start">
          <Link2 className="w-4 h-4" /> Connect Steam
          <span className="ml-auto text-white/40 text-xs">library · achievements · now playing</span>
        </button>
      )}

      {/* Epic */}
      {epic ? (
        <div className="ll-card p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{epic.platform_username || 'Epic Games'}</p>
            <p className="text-white/40 text-xs">Connected</p>
          </div>
          <button onClick={() => unlink('epic')} className="ll-icon-btn"><Unlink className="w-4 h-4" /></button>
        </div>
      ) : (
        <button onClick={connectEpic} className="ll-btn ll-btn-secondary w-full justify-start">
          <Link2 className="w-4 h-4" /> Connect Epic Games
          <span className="ml-auto text-white/40 text-xs">sign-in</span>
        </button>
      )}

      <p className="text-white/30 text-[11px]">
        Steam shows your game library, achievements, and what you're playing live.
        Epic connects your account identity.
      </p>
    </div>
  );
}
