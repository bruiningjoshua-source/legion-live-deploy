import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase/supabaseCore';
import { toast } from 'sonner';

/**
 * WaitingLounge — shown to viewers when a stream is status:'scheduled' (the
 * streamer has generated OBS credentials and is setting up, but Zego hasn't
 * confirmed a real video feed yet). Lets supporters chat and see the game
 * while they wait, instead of a spinner or dead air.
 *
 * The host can customize the message and background image (stored on the
 * stream row); everyone else just sees the lounge and can chat.
 */
export default function WaitingLounge({ stream, creator, isHost, chatSlot }) {
  const [message, setMessage] = useState(stream?.lounge_message || '');
  const [bgUrl, setBgUrl] = useState(stream?.lounge_background_url || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!stream?.id) return;
    const chan = supabase
      .channel(`lounge_${stream.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'streams', filter: `id=eq.${stream.id}` },
        (payload) => {
          if (payload.new?.lounge_message !== undefined) setMessage(payload.new.lounge_message || '');
          if (payload.new?.lounge_background_url !== undefined) setBgUrl(payload.new.lounge_background_url || '');
        })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [stream?.id]);

  const saveLounge = async () => {
    setSaving(true);
    try {
      await base44.entities.Stream.update(stream.id, {
        lounge_message: message.trim().slice(0, 200),
        lounge_background_url: bgUrl.trim(),
      });
      toast.success('Lounge updated');
      setEditing(false);
    } catch (e) {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  const onUploadBg = (e) => {
    const file = e.target.files?.[0];
    if (file) setBgUrl(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{
      background: bgUrl ? `center/cover url(${bgUrl})` : 'radial-gradient(circle at 50% 30%, #2a1810 0%, #0c0704 75%)',
    }}>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {stream?.game_cover_url && (
          <img src={stream.game_cover_url} alt="" className="w-16 h-22 object-cover rounded-lg shadow-lg mb-4" />
        )}
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500/70 mb-3">
          {creator?.avatar_url
            ? <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-amber-600 to-orange-800 flex items-center justify-center text-white font-bold">{creator?.display_name?.[0]}</div>}
        </div>
        <h2 className="text-white text-lg font-bold mb-1">{creator?.display_name || 'Stream'} is setting up</h2>
        {stream?.game_name && <p className="text-amber-400 text-sm font-medium mb-2">Playing {stream.game_name}</p>}
        <p className="text-white/60 text-sm max-w-xs">{message || 'Stream starting soon — hang tight!'}</p>

        {isHost && !editing && (
          <>
            <p className="text-white/40 text-xs mt-3 mb-2 max-w-xs">
              Once OBS shows "Streaming" in its bottom-right status, tap below to go live.
            </p>
            <button
              onClick={async () => {
                try {
                  const res = await base44.functions.invoke('confirmStreamLive', { streamId: stream.id });
                  const payload = res?.data ?? res ?? {};
                  if (payload.error) throw new Error(payload.error);
                  toast.success('🔴 You are live!');
                } catch (e) {
                  toast.error(e.message || 'Could not go live');
                }
              }}
              className="px-6 py-2.5 rounded-full bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/30"
            >
              I'm streaming — Go Live
            </button>
            <button onClick={() => setEditing(true)}
              className="mt-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold">
              Customize lounge
            </button>
          </>
        )}

        {isHost && editing && (
          <div className="mt-4 w-full max-w-xs space-y-2 text-left">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              placeholder="Message for viewers while you set up…"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-xs placeholder:text-white/30 outline-none resize-none"
              rows={3}
            />
            <label className="block w-full text-center py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs cursor-pointer">
              Upload background image
              <input type="file" accept="image/*" onChange={onUploadBg} className="hidden" />
            </label>
            <div className="flex gap-2">
              <button onClick={saveLounge} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {chatSlot && <div className="relative z-10">{chatSlot}</div>}
    </div>
  );
}
