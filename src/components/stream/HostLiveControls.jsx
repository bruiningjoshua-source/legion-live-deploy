import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Settings2, Edit3, Pin, X } from 'lucide-react';

const CHAT_MODES = [
  { id: 'all',         label: 'All',        icon: '🌍', desc: 'Anyone can chat'      },
  { id: 'slow',        label: 'Slow',        icon: '⏱️', desc: '30 second delay'      },
  { id: 'followers',   label: 'Followers',   icon: '❤️', desc: 'Must follow to chat'  },
  { id: 'subscribers', label: 'Subs Only',   icon: '⭐',      desc: 'Subscribers only'     },
  { id: 'locked',      label: 'Locked',      icon: '🔒', desc: 'Chat is closed'       },
];

export default function HostLiveControls({ stream, streamId, viewerCount = 0, onClose }) {
  const queryClient = useQueryClient();
  const [editTitle, setEditTitle] = useState(false);
  const [newTitle,  setNewTitle]  = useState(stream?.title || '');
  const [chatMode,  setChatMode]  = useState(stream?.chat_mode || 'all');
  const [showPin,   setShowPin]   = useState(false);
  const [pinText,   setPinText]   = useState('');

  const updateMutation = useMutation({
    mutationFn: updates => base44.entities.Stream.update(streamId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['stream', streamId]);
      toast.success('Stream updated');
      setEditTitle(false);
    },
    onError: () => toast.error('Update failed'),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{   opacity: 0, y: 40 }}
      className="absolute bottom-20 left-0 right-0 z-40 mx-3 rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,8,18,0.95)", backdropFilter: "blur(20px) saturate(180%)", border: "1px solid rgba(255,255,255,0.10)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Stream Controls</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)", fontFamily: "DM Mono, monospace" }}>{viewerCount} watching</span>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><X className="w-3.5 h-3.5 text-white/50" /></button>
        </div>
      </div>
      <div className="p-4 space-y-5">

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>Stream Title</span>
            <button onClick={() => setEditTitle(v => !v)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#f5a623" }}>
              <Edit3 className="w-3 h-3" />{editTitle ? "Cancel" : "Edit"}
            </button>
          </div>
          {editTitle ? (
            <div className="flex gap-2">
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} maxLength={100}
                placeholder="Stream title…" autoFocus
                className="flex-1 rounded-xl px-3 py-2 text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#f5a623" }}
              />
              <button onClick={() => updateMutation.mutate({ title: newTitle.trim() })} disabled={!newTitle.trim() || updateMutation.isPending}
                className="px-4 py-2 rounded-xl font-bold text-sm text-black disabled:opacity-50" style={{ background: "#f5a623" }}>
                Save
              </button>
            </div>
          ) : (
            <p className="text-white text-sm font-medium">{stream?.title || "No title set"}</p>
          )}
        </div>

        <div>
          <span className="block text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "rgba(255,255,255,0.40)" }}>Chat Mode</span>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CHAT_MODES.map(mode => (
              <button key={mode.id} onClick={() => { setChatMode(mode.id); updateMutation.mutate({ chat_mode: mode.id }); }} title={mode.desc}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                style={{
                  background:   chatMode === mode.id ? 'rgba(245,166,35,0.18)' : 'rgba(255,255,255,0.04)',
                  borderColor:  chatMode === mode.id ? 'rgba(245,166,35,0.55)' : 'rgba(255,255,255,0.08)',
                  color:        chatMode === mode.id ? '#f5a623' : 'rgba(255,255,255,0.50)',
                }}
              >
                <span>{mode.icon}</span><span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>Pinned Message</span>
            <button onClick={() => setShowPin(v => !v)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#f5a623" }}>
              <Pin className="w-3 h-3" />Pin
            </button>
          </div>
          {showPin && (
            <div className="flex gap-2 mb-2">
              <input type="text" value={pinText} onChange={e => setPinText(e.target.value)} maxLength={200}
                placeholder="Message to pin in chat…"
                className="flex-1 rounded-xl px-3 py-2 text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#f5a623" }}
              />
              <button onClick={() => { updateMutation.mutate({ pinned_message: pinText.trim() }); setShowPin(false); }} disabled={!pinText.trim()}
                className="px-4 py-2 rounded-xl font-bold text-sm text-black disabled:opacity-50" style={{ background: "#f5a623" }}>
                Pin
              </button>
            </div>
          )}
          {stream?.pinned_message && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: "rgba(245,166,35,0.10)", border: "1px solid rgba(245,166,35,0.22)" }}>
              <Pin className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs flex-1" style={{ color: "rgba(245,166,35,0.90)" }}>{stream.pinned_message}</p>
              <button onClick={() => updateMutation.mutate({ pinned_message: null })} className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.30)" }}>×</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}