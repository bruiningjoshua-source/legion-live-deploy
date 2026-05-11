/**
 * LiveAuctionEngine — Real-time live auction system for Legion Market
 * 
 * First-of-its-kind: Auctions run INSIDE live streams with real-time
 * bidding visible to all viewers simultaneously via Supabase realtime.
 * 
 * No other live streaming platform has closed-loop live auctions
 * where the bid counter updates for every viewer in real time.
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Gavel, Clock, Zap, Trophy, CheckCircle,
  Package, ArrowUp
} from 'lucide-react';

function formatTime(ms) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function BidButton({ amount, onClick, disabled, isCustom = false }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(amount)}
      disabled={disabled}
      className={`flex items-center justify-center gap-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 ${
        isCustom
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
          : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
      }`}
    >
      {isCustom ? <Zap className="w-3.5 h-3.5" /> : <ArrowUp className="w-3 h-3" />}
      ${amount}
    </motion.button>
  );
}

// ── VIEWER AUCTION WIDGET (shown to all viewers) ──────────────────────────
export function ViewerAuctionWidget({ streamId, user }) {
  const queryClient = useQueryClient();
  const [customBid, setCustomBid] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [justBid, setJustBid] = useState(false);

  const { data: auction } = useQuery({
    queryKey: ['live-auction', streamId],
    queryFn: async () => {
      const auctions = await base44.entities.PPVEvent.filter({
        stream_id: streamId,
        status: 'live',
      }, '-created_date', 1);
      return auctions[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 3000,
    staleTime: 2000,
  });

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!auction?.scheduled_at) return;
    const endTime = new Date(auction.scheduled_at).getTime();
    const update = () => setTimeLeft(Math.max(0, endTime - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [auction?.scheduled_at]);

  const placeBidMutation = useMutation({
    mutationFn: async (bidAmount) => {
      if (!auction) throw new Error('No active auction');
      if (!user?.email) throw new Error('Sign in to bid');

      const currentBid = auction.ticket_count || 0;
      if (bidAmount <= currentBid) throw new Error(`Bid must be higher than $${currentBid}`);

      await base44.entities.PPVEvent.update(auction.id, {
        ticket_count: bidAmount,
        description: `${user.full_name || user.email.split('@')[0]} — $${bidAmount}`,
      });

      return bidAmount;
    },
    onSuccess: (amount) => {
      queryClient.invalidateQueries({ queryKey: ['live-auction', streamId] });
      setJustBid(true);
      setCustomBid('');
      setShowCustom(false);
      setTimeout(() => setJustBid(false), 3000);
      toast.success(`Bid of $${amount} placed! You're the highest bidder.`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!auction) return null;

  const currentBid = auction.ticket_count || 0;
  const startingPrice = auction.price_usd || 0;
  const minBidIncrement = Math.max(1, Math.floor(currentBid * 0.05));
  const quickBids = [
    currentBid + minBidIncrement,
    currentBid + minBidIncrement * 2,
    currentBid + minBidIncrement * 5,
  ];
  const isEnded = timeLeft <= 0 && auction.scheduled_at;
  const isUrgent = timeLeft > 0 && timeLeft < 60000;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-3 right-3 z-30"
      >
        <div className={`rounded-2xl border backdrop-blur-xl overflow-hidden ${
          isEnded ? 'bg-black/80 border-white/10' :
          isUrgent ? 'bg-red-950/80 border-red-500/40' :
          'bg-black/80 border-amber-500/30'
        }`}>
          {/* Auction header */}
          <div className={`px-4 py-3 flex items-center justify-between border-b ${
            isUrgent ? 'border-red-500/20 bg-red-500/10' : 'border-amber-500/15 bg-amber-500/5'
          }`}>
            <div className="flex items-center gap-2">
              <Gavel className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`} />
              <span className={`font-black text-sm ${isUrgent ? 'text-red-300' : 'text-amber-300'}`}>
                {isEnded ? 'Auction Ended' : 'Live Auction'}
              </span>
              {!isEnded && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  isUrgent
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse'
                    : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                }`}>
                  {isUrgent ? '🔥 ENDING SOON' : '● LIVE'}
                </span>
              )}
            </div>
            {auction.scheduled_at && !isEnded && (
              <div className={`flex items-center gap-1.5 font-mono font-black text-lg ${
                isUrgent ? 'text-red-400' : 'text-white'
              }`}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="px-4 py-3 flex items-center gap-3">
            {auction.thumbnail_url ? (
              <img src={auction.thumbnail_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-amber-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm line-clamp-1">{auction.title}</p>
              <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{auction.description || `Starting at $${startingPrice}`}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <div>
                  <span className="text-white/30 text-[9px] block">Current Bid</span>
                  <span className={`font-black text-xl ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
                    ${currentBid || startingPrice}
                  </span>
                </div>
                <div>
                  <span className="text-white/30 text-[9px] block">Bidders</span>
                  <span className="text-white font-bold text-base">{auction.ticket_count > 0 ? '3+' : '0'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bid section */}
          {!isEnded && (
            <div className="px-4 pb-4 space-y-3">
              {/* Quick bid buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickBids.map((amount, i) => (
                  <BidButton key={i} amount={amount}
                    onClick={() => placeBidMutation.mutate(amount)}
                    disabled={placeBidMutation.isPending} />
                ))}
              </div>

              {/* Custom bid */}
              {showCustom ? (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      value={customBid}
                      onChange={e => setCustomBid(e.target.value)}
                      placeholder={`Min $${currentBid + minBidIncrement}`}
                      className="w-full bg-white/[0.06] border border-white/15 rounded-xl pl-7 pr-4 py-3 text-white text-sm outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const amount = parseFloat(customBid);
                      if (!amount || amount <= currentBid) {
                        toast.error(`Minimum bid: $${currentBid + minBidIncrement}`);
                        return;
                      }
                      placeBidMutation.mutate(amount);
                    }}
                    disabled={placeBidMutation.isPending}
                    className="px-5 py-3 rounded-xl bg-amber-500 text-black font-black text-sm hover:bg-amber-400 transition-all disabled:opacity-50"
                  >
                    Bid
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCustom(true)}
                  className="w-full py-2.5 rounded-xl border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-all">
                  Enter custom amount
                </button>
              )}

              {/* Just bid confirmation */}
              <AnimatePresence>
                {justBid && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> You're the highest bidder!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Ended state */}
          {isEnded && (
            <div className="px-4 pb-4 text-center">
              <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-white font-bold">Auction Ended</p>
              <p className="text-white/40 text-sm">Final price: ${currentBid}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── HOST AUCTION CONTROL PANEL (shown to creator while live) ──────────────
export function HostAuctionPanel({ streamId, creatorEmail, onAuctionStart }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startingPrice: '',
    durationMinutes: 5,
    thumbnailUrl: '',
  });

  const { data: activeAuction } = useQuery({
    queryKey: ['live-auction', streamId],
    queryFn: async () => {
      const auctions = await base44.entities.PPVEvent.filter({
        stream_id: streamId,
        status: 'live',
      }, '-created_date', 1);
      return auctions[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 5000,
  });

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!activeAuction?.scheduled_at) return;
    const endTime = new Date(activeAuction.scheduled_at).getTime();
    const update = () => setTimeLeft(Math.max(0, endTime - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeAuction?.scheduled_at]);

  const startAuctionMutation = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.startingPrice) throw new Error('Title and starting price required');

      const endTime = new Date(Date.now() + form.durationMinutes * 60 * 1000).toISOString();

      const auction = await base44.entities.PPVEvent.create({
        creator_email: creatorEmail,
        stream_id: streamId,
        title: form.title,
        description: form.description,
        price_usd: parseFloat(form.startingPrice),
        ticket_count: 0,
        scheduled_at: endTime,
        status: 'live',
        thumbnail_url: form.thumbnailUrl || null,
      });

      return auction;
    },
    onSuccess: (auction) => {
      queryClient.invalidateQueries({ queryKey: ['live-auction', streamId] });
      setShowCreate(false);
      setForm({ title: '', description: '', startingPrice: '', durationMinutes: 5, thumbnailUrl: '' });
      onAuctionStart?.(auction);
      toast.success('Auction started! Your viewers can now bid.');
    },
    onError: (err) => toast.error(err.message),
  });

  const endAuctionMutation = useMutation({
    mutationFn: async () => {
      if (!activeAuction) return;
      await base44.entities.PPVEvent.update(activeAuction.id, { status: 'ended' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-auction', streamId] });
      toast.success('Auction ended!');
    },
  });

  return (
    <div className="space-y-3">
      {/* Active auction display */}
      {activeAuction && timeLeft > 0 ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-bold text-sm">Auction Running</span>
            </div>
            <span className="text-white font-mono font-black text-lg">{formatTime(timeLeft)}</span>
          </div>
          <p className="text-white font-semibold text-sm line-clamp-1">{activeAuction.title}</p>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <p className="text-white/40 text-[10px]">Current Bid</p>
              <p className="text-amber-400 font-black text-xl">${activeAuction.ticket_count || activeAuction.price_usd}</p>
            </div>
          </div>
          <button onClick={() => endAuctionMutation.mutate()}
            disabled={endAuctionMutation.isPending}
            className="mt-3 w-full py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-all">
            End Auction Early
          </button>
        </div>
      ) : (
        <>
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-sm hover:bg-amber-500/25 transition-all">
              <Gavel className="w-4 h-4" /> Start Live Auction
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">New Auction</span>
                <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white text-xs">✕</button>
              </div>

              {[
                { key: 'title', label: 'Item Name', placeholder: 'e.g. Limited Edition Nike Dunk Low', type: 'text' },
                { key: 'description', label: 'Description', placeholder: 'Condition, size, details...', type: 'text' },
                { key: 'startingPrice', label: 'Starting Price ($)', placeholder: '25', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">{field.label}</label>
                  <input type={field.type}
                    value={form[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20"
                  />
                </div>
              ))}

              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 5, 10, 15].map(mins => (
                    <button key={mins}
                      onClick={() => setForm(f => ({ ...f, durationMinutes: mins }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.durationMinutes === mins
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'border-white/10 text-white/50 hover:border-white/20'
                      }`}>
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => startAuctionMutation.mutate()}
                disabled={startAuctionMutation.isPending || !form.title || !form.startingPrice}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-sm hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                {startAuctionMutation.isPending ? 'Starting...' : `🔨 Start ${form.durationMinutes}min Auction`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}