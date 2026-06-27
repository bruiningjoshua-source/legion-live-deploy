/**
 * ReportStreamButton — one-tap stream reporting for viewers.
 * Creates a moderation_alert and notifies admins.
 * Categories match the Legion Live content policy.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const REPORT_CATEGORIES = [
  { id:'sexual_content',    label:'Nudity / Sexual content',       emoji:'🔞' },
  { id:'minor_on_screen',   label:'Minor on screen',               emoji:'⚠️' },
  { id:'hard_drugs',        label:'Hard drug use',                 emoji:'💉' },
  { id:'extremism',         label:'Extremist / Terrorist content', emoji:'🚨' },
  { id:'lgbtq_promotion',   label:'LGBTQ+ ideology / pronoun push',emoji:'🏳️' },
  { id:'harassment',        label:'Harassment / Hate campaign',    emoji:'😤' },
  { id:'doxxing',           label:'Doxxing / Private info shared', emoji:'📋' },
  { id:'spam',              label:'Spam / Bot stream',             emoji:'🤖' },
  { id:'other',             label:'Other policy violation',        emoji:'📌' },
];

export default function ReportStreamButton({ streamId, creatorEmail, creatorName }) {
  const [open, setOpen]       = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]   = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({ queryKey:['current-user'], queryFn:()=>base44.auth.me() });

  const submit = async () => {
    if (!selected) { toast.error('Select a reason'); return; }
    setLoading(true);
    try {
      await base44.entities.ModerationAlert.create({
        stream_id:      streamId,
        user_email:     creatorEmail,
        user_name:      creatorName,
        reporter_email: user?.email,
        alert_type:     selected,
        severity:       ['sexual_content','minor_on_screen','extremism'].includes(selected) ? 'high' : 'medium',
        content:        detail?.slice(0, 500) || `Viewer report: ${selected}`,
        ai_confidence:  null,
        action_taken:   'reported',
      });
      // Also notify via notification to admin
      await base44.functions.invoke('notifyAdmins', {
        type:    'stream_report',
        message: `Stream reported: ${creatorName} — ${selected}${detail ? ` — "${detail.slice(0,80)}"` : ''}`,
        stream_id: streamId,
      }).catch(() => {}); // non-blocking

      setSubmitted(true);
      setTimeout(() => { setOpen(false); setSubmitted(false); setSelected(null); setDetail(''); }, 2500);
    } catch (e) {
      toast.error('Report failed — try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ll-interactive transition-all"
        style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)' }}>
        <Flag className="w-3.5 h-3.5 text-red-400" />
        <span className="text-red-400 text-xs font-semibold">Report</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',damping:30,stiffness:300}}
              className="w-full max-w-sm bg-[#0a0a14] rounded-3xl border border-white/10 overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/8">
                <div>
                  <h3 className="ll-heading text-white text-base">Report Stream</h3>
                  <p className="text-white/35 text-xs truncate">{creatorName}</p>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl ll-card flex items-center justify-center ll-interactive">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              <div className="p-4">
                {submitted ? (
                  <div className="py-8 text-center">
                    <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',bounce:0.5}}>
                      <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                        <Check className="w-7 h-7 text-green-400" />
                      </div>
                    </motion.div>
                    <p className="text-white font-bold">Report submitted</p>
                    <p className="text-white/40 text-sm mt-1">Our team will review this stream</p>
                  </div>
                ) : (
                  <>
                    <p className="ll-label text-white/30 mb-3">What's the issue?</p>
                    <div className="space-y-1.5 mb-4 max-h-72 overflow-y-auto">
                      {REPORT_CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setSelected(cat.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ll-interactive text-left transition-all"
                          style={{
                            background: selected === cat.id ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${selected === cat.id ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                          }}>
                          <span className="text-lg leading-none">{cat.emoji}</span>
                          <span className="text-sm font-medium"
                            style={{ color: selected === cat.id ? '#f87171' : 'rgba(255,255,255,0.7)' }}>
                            {cat.label}
                          </span>
                          {selected === cat.id && <Check className="w-4 h-4 text-red-400 ml-auto shrink-0" />}
                        </button>
                      ))}
                    </div>

                    <textarea value={detail} onChange={e => setDetail(e.target.value)}
                      placeholder="Additional details (optional)..."
                      className="ll-input text-sm resize-none mb-4 py-2.5"
                      rows={2} maxLength={500} />

                    <button onClick={submit} disabled={!selected || loading}
                      className="w-full py-3 rounded-2xl font-bold text-sm ll-interactive disabled:opacity-40 transition-all"
                      style={{
                        background: selected ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${selected ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color: selected ? '#f87171' : 'rgba(255,255,255,0.3)',
                      }}>
                      {loading ? 'Submitting…' : 'Submit Report'}
                    </button>

                    <p className="text-white/20 text-[10px] text-center mt-3">
                      False reports may result in account suspension
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
