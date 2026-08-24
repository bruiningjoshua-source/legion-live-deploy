import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown } from 'lucide-react';

/**
 * ViewerListSheet — shows who's currently watching, opened by tapping the
 * viewer count in the top bar. Backed by Supabase Realtime Presence (tracked
 * where the viewer joins the stream), not just a count.
 */
export default function ViewerListSheet({ open, onClose, viewers = [], hostEmail }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[70]"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-2xl max-h-[70vh] flex flex-col"
            style={{ background: 'rgba(15,12,8,0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(245,166,35,0.2)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-bold text-sm">Viewers ({viewers.length})</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-2 py-2">
              {viewers.length === 0 && (
                <p className="text-white/30 text-xs text-center py-8">No viewers yet</p>
              )}
              {viewers.map((v) => (
                <div key={v.email} className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 shrink-0">
                    {v.avatar_url
                      ? <img src={v.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{v.display_name?.[0] || '?'}</div>}
                  </div>
                  <span className="text-white text-sm flex-1 truncate">{v.display_name || v.email?.split('@')[0]}</span>
                  {v.email === hostEmail && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
