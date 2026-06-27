/**
 * LotteryOverlay — In-stream lottery system (BIGO-style).
 *
 * HOST creates a lottery with a Denarii ticket price and prize pool.
 * VIEWERS buy tickets (deducted from wallet, credited to host).
 * HOST draws winner — server picks random ticket holder.
 * Winner receives prize Denarii instantly.
 *
 * State: stored in stream.lottery_config (JSON). Results in gift_transactions.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CONFIG = {
  active: false,
  title: 'Stream Lottery',
  ticketPrice: 100,
  prizePool: 0,
  maxTickets: 0, // 0 = unlimited
  tickets: [], // [{user_email, user_name, count}]
  winner: null,
  drawn: false,
};

export default function LotteryOverlay({ streamId, creatorId, user, wallet, isCreator, onClose }) {
  const queryClient = useQueryClient();
  const [ticketCount, setTicketCount] = useState(1);
  const [showConfig, setShowConfig] = useState(false);
  const [editConfig, setEditConfig] = useState({ title:'Stream Lottery', ticketPrice:100, maxTickets:0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [rollingName, setRollingName] = useState('');

  const { data: stream, isLoading } = useQuery({
    queryKey: ['stream-lottery', streamId],
    queryFn: () => base44.entities.Stream.filter({ id: streamId }, null, 1).then(r => r[0]),
    enabled: !!streamId,
    refetchInterval: 3000,
  });

  const lottery = { ...DEFAULT_CONFIG, ...(stream?.lottery_config || {}) };
  const myTickets = lottery.tickets?.filter(t => t.user_email === user?.email).reduce((s, t) => s + (t.count || 1), 0) || 0;
  const totalTickets = lottery.tickets?.reduce((s, t) => s + (t.count || 1), 0) || 0;
  const totalPlayers = new Set(lottery.tickets?.map(t => t.user_email) || []).size;
  const costTotal = ticketCount * (lottery.ticketPrice || 100);
  const canAfford = (wallet?.denarii_balance || 0) >= costTotal;
  const atMax = lottery.maxTickets > 0 && totalTickets >= lottery.maxTickets;

  // ── Buy tickets ──────────────────────────────────────────────────────────
  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!canAfford) throw new Error(`Need ${costTotal.toLocaleString()} Denarii`);
      if (atMax) throw new Error('Lottery is full');
      if (lottery.drawn) throw new Error('Lottery already drawn');

      // Deduct cost — send to creator as gift
      await base44.functions.invoke('sendGift', {
        giftId: null, quantity: 1, creatorId, streamId,
        amountDenarii: costTotal, reason: 'lottery_ticket',
      });

      // Add ticket(s) to lottery config
      const existing = lottery.tickets?.find(t => t.user_email === user.email);
      const newTickets = lottery.tickets ? [...lottery.tickets] : [];
      if (existing) {
        existing.count = (existing.count || 1) + ticketCount;
      } else {
        newTickets.push({ user_email: user.email, user_name: user.full_name || 'Viewer', count: ticketCount });
      }

      await base44.entities.Stream.update(stream.id, {
        lottery_config: {
          ...lottery,
          tickets: newTickets,
          prizePool: (lottery.prizePool || 0) + costTotal,
        }
      });
    },
    onSuccess: () => {
      toast.success(`🎫 ${ticketCount} ticket${ticketCount > 1 ? 's' : ''} purchased!`);
      queryClient.invalidateQueries({ queryKey: ['stream-lottery'] });
    },
    onError: e => toast.error(e.message),
  });

  // ── Draw winner (host only) ──────────────────────────────────────────────
  const drawMutation = useMutation({
    mutationFn: async () => {
      if (!lottery.tickets?.length) throw new Error('No tickets sold');

      // Build weighted pool (one entry per ticket)
      const pool = [];
      lottery.tickets.forEach(t => {
        for (let i = 0; i < (t.count || 1); i++) pool.push(t);
      });

      // Animated roll
      setIsDrawing(true);
      const allNames = lottery.tickets.map(t => t.user_name);
      let rollCount = 0;
      const rollInterval = setInterval(() => {
        setRollingName(allNames[Math.floor(Math.random() * allNames.length)]);
        rollCount++;
        if (rollCount > 20) clearInterval(rollInterval);
      }, 100);

      await new Promise(r => setTimeout(r, 2500));
      clearInterval(rollInterval);

      // Pick winner
      const winner = pool[Math.floor(Math.random() * pool.length)];

      // Credit prize to winner
      const prizeAmount = lottery.prizePool || 0;
      if (prizeAmount > 0) {
        const [winnerWallet] = await base44.entities.Wallet.filter({ user_email: winner.user_email }, null, 1);
        if (winnerWallet) {
          await base44.entities.Wallet.update(winnerWallet.id, {
            denarii_balance: (winnerWallet.denarii_balance || 0) + prizeAmount
          });
        }
        // Notify winner
        await base44.entities.Notification.create({
          user_email: winner.user_email,
          type: 'gift',
          title: '🎉 You won the lottery!',
          message: `You won ${prizeAmount.toLocaleString()} Denarii in ${stream?.title || 'the stream'} lottery!`,
        }).catch(() => {});
      }

      // Log
      await base44.entities.GiftTransaction.create({
        stream_id: streamId, sender_email: creatorId,
        sender_name: 'Legion Lottery',
        receiver_email: winner.user_email,
        receiver_name: winner.user_name,
        quantity: 1, total_as_value: prizeAmount,
        reason: 'lottery_win',
      }).catch(() => {});

      // Save result
      await base44.entities.Stream.update(stream.id, {
        lottery_config: { ...lottery, winner, drawn: true, active: false }
      });

      setIsDrawing(false);
      setRollingName('');
      return winner;
    },
    onSuccess: (winner) => {
      toast.success(`🏆 ${winner.user_name} wins ${lottery.prizePool?.toLocaleString()} Denarii!`, { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ['stream-lottery'] });
    },
    onError: e => { setIsDrawing(false); toast.error(e.message); },
  });

  // ── Host start/reset lottery ─────────────────────────────────────────────
  const configMutation = useMutation({
    mutationFn: async (action) => {
      if (action === 'start') {
        await base44.entities.Stream.update(stream.id, {
          lottery_config: {
            title: editConfig.title,
            ticketPrice: editConfig.ticketPrice,
            maxTickets: editConfig.maxTickets,
            prizePool: 0, tickets: [], winner: null, drawn: false, active: true,
          }
        });
      } else if (action === 'reset') {
        await base44.entities.Stream.update(stream.id, {
          lottery_config: { ...DEFAULT_CONFIG, active: false }
        });
      }
    },
    onSuccess: (_, action) => {
      toast.success(action === 'start' ? 'Lottery started!' : 'Lottery reset');
      queryClient.invalidateQueries({ queryKey: ['stream-lottery'] });
      setShowConfig(false);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-4 px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="relative w-full max-w-sm ll-card p-5 space-y-4"
        style={{ background:'#0a0a14', border:'1px solid rgba(139,92,246,0.3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ll-heading text-lg text-white">🎫 {lottery.title || 'Stream Lottery'}</h2>
            <p className="text-white/40 text-xs">{lottery.ticketPrice?.toLocaleString()} Denarii per ticket</p>
          </div>
          <div className="flex gap-2">
            {isCreator && (
              <button onClick={() => setShowConfig(v => !v)}
                className="w-8 h-8 ll-card-inset rounded-xl flex items-center justify-center ll-interactive">
                <Settings className="w-4 h-4 text-white/50" />
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 ll-card-inset rounded-xl flex items-center justify-center ll-interactive">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Host config */}
        <AnimatePresence>
          {showConfig && isCreator && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              className="ll-card-inset p-3 space-y-3 overflow-hidden">
              <p className="ll-label text-white/30">Lottery Config</p>
              <div><p className="text-white/50 text-xs mb-1">Title</p>
                <input value={editConfig.title} onChange={e => setEditConfig(p => ({ ...p, title: e.target.value }))}
                  className="ll-input h-9 text-sm" /></div>
              <div><p className="text-white/50 text-xs mb-1">Ticket price (Denarii)</p>
                <input type="number" value={editConfig.ticketPrice} onChange={e => setEditConfig(p => ({ ...p, ticketPrice: Number(e.target.value) }))}
                  className="ll-input h-9 text-sm" min={50} step={50} /></div>
              <div><p className="text-white/50 text-xs mb-1">Max tickets (0 = unlimited)</p>
                <input type="number" value={editConfig.maxTickets} onChange={e => setEditConfig(p => ({ ...p, maxTickets: Number(e.target.value) }))}
                  className="ll-input h-9 text-sm" min={0} /></div>
              <div className="flex gap-2">
                <button onClick={() => configMutation.mutate('start')} disabled={configMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                  style={{ background:'rgba(139,92,246,0.2)', border:'1px solid rgba(139,92,246,0.4)', color:'#a78bfa' }}>
                  🎫 Start Lottery
                </button>
                <button onClick={() => configMutation.mutate('reset')} disabled={configMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)' }}>
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:'Prize Pool', value:`${(lottery.prizePool || 0).toLocaleString()} 🪙`, color:'#f5a623' },
            { label:'Players', value:totalPlayers, color:'#8b5cf6' },
            { label:'My Tickets', value:myTickets, color:'#10b981' },
          ].map(s => (
            <div key={s.label} className="ll-card-inset p-2.5 text-center">
              <p className="font-black text-lg" style={{ color: s.color }}>{s.value}</p>
              <p className="text-white/30 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Winner reveal */}
        <AnimatePresence>
          {(isDrawing || lottery.drawn) && (
            <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
              className="text-center p-4 rounded-2xl"
              style={{ background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.3)' }}>
              {isDrawing ? (
                <>
                  <p className="text-white/50 text-xs mb-1">Drawing winner…</p>
                  <motion.p animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:0.4 }}
                    className="ll-display text-xl text-amber-400">{rollingName || '…'}</motion.p>
                </>
              ) : lottery.winner ? (
                <>
                  <p className="text-white/50 text-xs mb-1">🏆 Winner!</p>
                  <p className="ll-heading text-xl text-amber-400">{lottery.winner.user_name}</p>
                  <p className="text-white/50 text-xs mt-1">Won {lottery.prizePool?.toLocaleString()} Denarii</p>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewer buy tickets */}
        {!isCreator && lottery.active && !lottery.drawn && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 ll-card-inset rounded-xl px-3 py-2">
                <button onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  className="text-white/50 font-bold w-6 text-center">−</button>
                <span className="text-white font-bold w-6 text-center">{ticketCount}</span>
                <button onClick={() => setTicketCount(Math.min(20, ticketCount + 1))}
                  className="text-white/50 font-bold w-6 text-center">+</button>
              </div>
              <div className="flex-1">
                <p className="text-white/70 text-sm font-semibold">{ticketCount} ticket{ticketCount > 1 ? 's' : ''}</p>
                <p className="text-amber-400/70 text-xs">{costTotal.toLocaleString()} Denarii</p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.96 }}
              onClick={() => buyMutation.mutate()}
              disabled={buyMutation.isPending || !canAfford || atMax}
              className="w-full py-3.5 rounded-2xl font-black text-base text-black disabled:opacity-50"
              style={{ background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow:'0 4px 20px rgba(139,92,246,0.35)' }}>
              {buyMutation.isPending ? '…' : atMax ? 'Lottery Full' : !canAfford ? `Need ${costTotal.toLocaleString()} 🪙` : `🎫 Buy ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`}
            </motion.button>
          </div>
        )}

        {/* Host draw button */}
        {isCreator && lottery.active && !lottery.drawn && totalTickets > 0 && (
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => drawMutation.mutate()}
            disabled={isDrawing || drawMutation.isPending}
            className="w-full py-3.5 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2"
            style={{ background:'linear-gradient(135deg,#f5a623,#e6950a)', boxShadow:'0 4px 20px rgba(245,166,35,0.4)' }}>
            {isDrawing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Drawing…</> : <>🏆 Draw Winner ({totalTickets} tickets)</>}
          </motion.button>
        )}

        {!lottery.active && !lottery.drawn && !isCreator && (
          <div className="text-center py-2">
            <p className="text-white/40 text-sm">No lottery running right now</p>
            <p className="text-white/25 text-xs mt-0.5">The host will start one soon</p>
          </div>
        )}

        {/* Ticket holders */}
        {lottery.tickets?.length > 0 && (
          <div className="ll-card-inset p-3">
            <p className="ll-label text-white/25 mb-2">Participants ({totalPlayers})</p>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {[...new Map(lottery.tickets.map(t => [t.user_email, t])).values()].map(t => (
                <div key={t.user_email} className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">{t.user_name}</span>
                  <span className="text-amber-400/70 text-xs font-semibold">{t.count || 1} 🎫</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
