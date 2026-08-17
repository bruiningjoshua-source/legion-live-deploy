import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * GameCatalogSync — admin panel to populate the games_catalog from IGDB.
 * Pulls real games with cover art (IGDB is Twitch's games database).
 * Paginated: each run fetches a page, so several runs build up the library.
 */
export default function GameCatalogSync() {
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(l => [`${new Date().toLocaleTimeString()} — ${msg}`, ...l].slice(0, 20));

  const runSync = useCallback(async ({ mobileOnly = false, pages = 3 } = {}) => {
    setSyncing(true);
    addLog(`Starting ${mobileOnly ? 'MOBILE' : 'general'} sync (${pages} pages)…`);
    let total = 0;
    try {
      for (let i = 0; i < pages; i++) {
        const offset = i * 200;
        const res = await base44.functions.invoke('syncGameCatalog', {
          limit: 200, offset, mobileOnly,
        });
        const payload = res?.data ?? res ?? {};
        if (payload.error) {
          addLog(`ERROR [${payload.stage || '?'}]: ${payload.error}`);
          toast.error('Sync failed — see log');
          break;
        }
        const n = payload.synced ?? 0;
        total += n;
        addLog(`page ${i + 1}: fetched ${payload.fetched ?? '?'}, saved ${n} (offset ${offset})`);
        if (n === 0) break;               // no more results
        await new Promise(r => setTimeout(r, 400));  // be gentle on IGDB rate limits
      }
      toast.success(`Synced ${total} ${mobileOnly ? 'mobile ' : ''}games`);
      addLog(`Done — ${total} games total.`);
    } catch (e) {
      const msg = e?.message || String(e);
      addLog(`ERROR: ${msg}`);
      toast.error(`Sync failed: ${msg}`);
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base">Game Catalog (IGDB)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-white/50 text-xs">
          Pulls real games with cover art from IGDB (Twitch's game database) into the local catalog.
          Run the general sync first, then the mobile sync for the mobile library.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            disabled={syncing}
            onClick={() => runSync({ mobileOnly: false, pages: 3 })}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'rgba(245,166,35,0.18)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.4)' }}>
            {syncing ? 'Syncing…' : 'Sync Popular Games'}
          </button>
          <button
            disabled={syncing}
            onClick={() => runSync({ mobileOnly: true, pages: 3 })}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'rgba(168,85,247,0.18)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }}>
            {syncing ? 'Syncing…' : 'Sync Mobile Games'}
          </button>
        </div>

        {log.length > 0 && (
          <div className="bg-black/40 rounded-xl p-3 max-h-52 overflow-y-auto">
            {log.map((l, i) => (
              <div key={i} className={`text-[11px] font-mono ${l.includes('ERROR') ? 'text-red-400' : 'text-white/60'}`}>
                {l}
              </div>
            ))}
          </div>
        )}

        <p className="text-white/30 text-[11px]">
          Requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in Netlify env (functions scope).
          Each page fetches up to 200 games; runs are spaced to respect IGDB rate limits.
        </p>
      </CardContent>
    </Card>
  );
}
