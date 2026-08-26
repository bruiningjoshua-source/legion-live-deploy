import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Monitor, Copy, Check, X, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function OBSSetupPanel({ user, creator, onClose, onStreamCreated }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('gaming');
  const [loading, setLoading] = useState(false);
  const [obsData, setObsData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    if (!gameQuery.trim() || selectedGame) { setGameResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('listGames', { search: gameQuery.trim(), limit: 8 });
        const rows = res?.data?.games ?? res?.games ?? [];
        setGameResults(rows);
      } catch { /* ignore search errors, non-critical */ }
    }, 300);
    return () => clearTimeout(t);
  }, [gameQuery, selectedGame]);

  const handleGenerateKey = async () => {
    if (!title.trim()) {
      toast.error('Stream title is required');
      return;
    }

    setLoading(true);
    try {
      let creatorId = creator?.id;

      // Create creator profile if needed
      if (!creatorId) {
        const existing = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
        if (existing[0]) {
          creatorId = existing[0].id;
        } else {
          const newCreator = await base44.entities.Creator.create({
            user_email: user.email,
            display_name: user.full_name || 'New Creator',
            category: category || 'other'
          });
          creatorId = newCreator.id;
        }
      }

      // Clean up stale streams
      if (creatorId) {
        const stale = await base44.entities.Stream.filter({ creator_id: creatorId, status: 'live' }, '-created_date', 10);
        for (const s of stale) {
          await base44.entities.Stream.update(s.id, { status: 'ended', viewer_count: 0 });
        }
      }

      // Create stream record — starts as SCHEDULED (waiting lounge), not live.
      // It flips to live only once OBS is confirmed actually sending video, so
      // viewers who join early see the lounge and chat instead of dead air.
      const stream = await base44.entities.Stream.create({
        creator_id: creatorId,
        creator_email: user.email,   // required by confirmStreamLive's host check
        title: title.trim().substring(0, 100),
        category,
        stream_type: 'solo',
        platform_type: 'legion_live',
        status: 'scheduled',
        game_id: selectedGame?.id || null,
        game_name: selectedGame?.name || null,
        game_cover_url: selectedGame?.cover_url || null,
        viewer_count: 0,
        peak_viewers: 0,
        total_gifts_received: 0,
        total_denarii_earned: 0,
      });

      // Mark creator as live
      // NOT marking is_live yet — the stream is 'scheduled' (lounge) until OBS's
      // RTMP feed is actually confirmed. current_stream_id is set now so the
      // creator's profile can link to the lounge/live page either way.
      await base44.entities.Creator.update(creatorId, { current_stream_id: stream.id });

      // Get OBS RTMP key
      const response = await base44.functions.invoke('getOBSStreamKey', { streamId: stream.id });
      const data = response.data;

      setObsData({ ...data, stream });
      onStreamCreated?.(stream);
      toast.success('OBS stream key generated!');
    } catch (err) {
      console.error('[OBS Setup]', err);
      toast.error(err.message || 'Failed to generate stream key');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, field) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyField = ({ label, value, fieldKey }) => (
    <div className="mb-3">
      <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1 block">{label}</label>
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5">
        <code className="flex-1 text-white text-xs break-all font-mono select-all">{value}</code>
        <button
          onClick={() => copyToClipboard(value, fieldKey)}
          className="shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
        >
          {copiedField === fieldKey
            ? <Check className="w-4 h-4 text-green-400" />
            : <Copy className="w-4 h-4 text-white/60" />
          }
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="fixed bottom-0 left-0 right-0 z-[101] bg-[#12121a] border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-bold text-base">OBS / RTMP Setup</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {!obsData ? (
            /* Step 1: Stream setup */
            <div className="space-y-4">
              <p className="text-white/50 text-xs">
                Stream from OBS Studio, Streamlabs, or any RTMP-compatible software.
              </p>

              <div>
                <label className="text-white/60 text-xs font-semibold mb-1 block">Stream Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Enter your stream title..."
                  maxLength={100}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-green-500/40"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs font-semibold mb-1 block">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'gaming', label: '🎮 Gaming' },
                    { value: 'talk_show', label: '💬 Chat' },
                    { value: 'music', label: '🎵 Music' },
                    { value: 'art', label: '🎨 Art' },
                    { value: 'education', label: '📚 Education' },
                    { value: 'other', label: '✨ Other' },
                  ].map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        category === cat.value
                          ? 'bg-green-500/20 border-green-500/40 text-green-300'
                          : 'bg-white/[0.04] border-white/10 text-white/50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game picker — only for Gaming category. Real IGDB catalog, so
                  the stream is tagged with the actual game + cover art rather
                  than a generic 'Gaming' label. */}
              {category === 'gaming' && (
                <div>
                  <label className="text-white/60 text-xs font-semibold mb-1 block">What are you playing?</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={gameQuery}
                      onChange={(e) => { setGameQuery(e.target.value); setSelectedGame(null); }}
                      placeholder="Search for a game…"
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-green-500/40"
                    />
                    {gameResults.length > 0 && !selectedGame && (
                      <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[#1a1a24] border border-white/10 rounded-xl max-h-56 overflow-y-auto">
                        {gameResults.map(g => (
                          <button key={g.id} onClick={() => { setSelectedGame(g); setGameQuery(g.name); setGameResults([]); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left">
                            {g.cover_url && <img src={g.cover_url} alt="" className="w-6 h-8 object-cover rounded" />}
                            <span className="text-white text-xs truncate">{g.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedGame && (
                    <div className="flex items-center gap-2 mt-2 bg-green-500/10 border border-green-500/20 rounded-xl px-2.5 py-1.5">
                      {selectedGame.cover_url && <img src={selectedGame.cover_url} alt="" className="w-5 h-7 object-cover rounded" />}
                      <span className="text-green-300 text-xs font-medium flex-1 truncate">{selectedGame.name}</span>
                      <button onClick={() => { setSelectedGame(null); setGameQuery(''); }} className="text-white/40 text-xs">✕</button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleGenerateKey}
                disabled={loading || !title.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Monitor className="w-4 h-4" />
                    Generate Stream Key
                  </>
                )}
              </button>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-200/80 text-[11px] leading-relaxed">
                    Your stream will go live as soon as OBS starts sending data. Make sure you're ready before connecting.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Show OBS credentials */
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                <p className="text-green-300 text-xs font-semibold">Stream key ready! Copy these into OBS:</p>
                <p className="text-green-200/60 text-[10px] mt-1">Settings → Stream → Service: Custom</p>
              </div>

              <CopyField
                label="Server URL"
                value={obsData.obsServer}
                fieldKey="server"
              />

              <CopyField
                label="Stream Key"
                value={obsData.obsStreamKey}
                fieldKey="key"
              />

              {obsData.allUrls?.length > 1 && (
                <CopyField
                  label="Backup Server"
                  value={obsData.allUrls[1]?.substring(0, obsData.allUrls[1].lastIndexOf('/')) || ''}
                  fieldKey="backup"
                />
              )}

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2">
                <h3 className="text-white/80 text-xs font-bold">OBS Recommended Settings</h3>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-white/40">Encoder:</span> <span className="text-white/70">x264 or NVENC</span></div>
                  <div><span className="text-white/40">Bitrate:</span> <span className="text-white/70">2500-6000 kbps</span></div>
                  <div><span className="text-white/40">Resolution:</span> <span className="text-white/70">1920x1080</span></div>
                  <div><span className="text-white/40">FPS:</span> <span className="text-white/70">30 or 60</span></div>
                  <div><span className="text-white/40">Keyframe:</span> <span className="text-white/70">2 seconds</span></div>
                  <div><span className="text-white/40">Profile:</span> <span className="text-white/70">High</span></div>
                </div>
              </div>

              <a
                href="https://obsproject.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Download OBS Studio
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}