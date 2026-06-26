/**
 * WatchMarketplaceLive — Dedicated viewer for Affiliate Marketplace streams.
 * Completely isolated from Legion Live streams — separate Zego room prefix,
 * separate UI with product panels, auction widgets, and affiliate tracking.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, ExternalLink, Heart, Share2, Copy, Check,
  X, Eye, Tag, Star, ChevronUp, ChevronDown, Gift, Zap,
  ShoppingCart, TrendingUp, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ZegoService from '@/components/stream/ZegoService';
import StreamChat from '@/components/stream/StreamChat';
import ChatService from '@/components/services/ChatService';

function fmtCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n/1_000).toFixed(0)}K`;
  return String(n);
}

export default function WatchMarketplaceLive() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const videoRef = useRef(null);
  const liveStreamRef = useRef(null);
  const zegoInitRef = useRef(false);
  const chatUnsubRef = useRef(null);

  const [liveStream, setLiveStream] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(true);
  const [showProducts, setShowProducts] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [likedProducts, setLikedProducts] = useState(new Set());
  const [viewerCount, setViewerCount] = useState(0);

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: stream, isLoading } = useQuery({
    queryKey: ['marketplace-stream', streamId],
    queryFn: async () => {
      const streams = await base44.entities.AffiliateLiveStream.filter({ id: streamId }, null, 1);
      return streams[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 15000,
  });

  const { data: campaign } = useQuery({
    queryKey: ['stream-campaign', stream?.campaign_id],
    queryFn: async () => {
      const campaigns = await base44.entities.LiveCampaign.filter({ id: stream.campaign_id }, null, 1);
      return campaigns[0] || null;
    },
    enabled: !!stream?.campaign_id,
  });

  const { data: partner } = useQuery({
    queryKey: ['stream-partner', stream?.partner_id],
    queryFn: async () => {
      const partners = await base44.entities.AffiliatePartner.filter({ id: stream.partner_id }, null, 1);
      return partners[0] || null;
    },
    enabled: !!stream?.partner_id,
  });

  // Track affiliate click
  const trackClick = useCallback(async (productId, affiliateCode) => {
    try {
      await base44.entities.AffiliateClick.create({
        stream_id: streamId,
        partner_id: stream?.partner_id,
        product_id: productId,
        user_email: user?.email || 'anonymous',
        click_source: 'live_stream',
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}
  }, [streamId, stream, user]);

  const copyCode = (code, productId) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(productId);
    toast.success(`Code copied: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Zego viewer init — uses 'mktplace_' prefix to isolate from Legion Live rooms
  useEffect(() => {
    if (!stream || stream.status !== 'live' || !user || zegoInitRef.current) return;
    zegoInitRef.current = true;
    let mounted = true;

    const init = async () => {
      try {
        const viewerId = user.email?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32) || `viewer_${Date.now()}`;
        // 'mktplace_' prefix ensures complete room separation from Legion Live streams
        const marketplaceRoomId = `mktplace_${streamId}`;
        const res = await base44.functions.invoke('generateZegoToken', {
          roomId: marketplaceRoomId,
          userId: viewerId,
          role: 'audience',
        });
        if (!mounted) return;
        const { appId, token, serverUrl } = res.data || {};
        if (!appId || !token) return;

        await ZegoService.initialize(appId, serverUrl);
        if (!mounted) return;
        await ZegoService.loginRoom(marketplaceRoomId, viewerId, user.full_name || 'Viewer', token);
        if (!mounted) return;

        ZegoService.onRoomEvent((event) => {
          if (event.type === 'remoteStreamAdded') {
            const { remoteStream } = event;
            if (!mounted) return;
            liveStreamRef.current = remoteStream;
            setLiveStream(remoteStream);
            if (videoRef.current) {
              videoRef.current.srcObject = remoteStream;
              videoRef.current.muted = false;
              videoRef.current.playsInline = true;
              videoRef.current.play().catch(() => {});
            }
          }
          if (event.type === 'remoteStreamRemoved') {
            if (videoRef.current) videoRef.current.srcObject = null;
            setLiveStream(null);
          }
        });

        if (mounted) await ZegoService.getRemoteStreams();
        // Track viewer join
        base44.functions.invoke('updateViewerCount', { streamId, action: 'join' }).catch(() => {});
        setViewerCount(v => v + 1);
      } catch (e) {
        console.error('[MarketplaceLive] Zego init failed:', e.message);
      }
    };

    init();
    return () => {
      mounted = false;
      zegoInitRef.current = false;
      ZegoService.leave().catch(() => {});
      base44.functions.invoke('updateViewerCount', { streamId, action: 'leave' }).catch(() => {});
    };
  }, [stream?.status, streamId, user]);

  // Chat subscription
  useEffect(() => {
    if (!streamId) return;
    const unsub = ChatService.subscribe(streamId, (msg) => {
      setChatMessages(prev => ChatService.addToBuffer(prev, msg));
    });
    chatUnsubRef.current = unsub;
    return () => unsub?.();
  }, [streamId]);

  const sendMessage = async (text) => {
    if (!user || !streamId) return;
    const optimistic = ChatService.createOptimisticMessage({ streamId, user, messageData: text });
    setChatMessages(prev => ChatService.addToBuffer(prev, optimistic));
    try {
      await ChatService.sendMessage({ streamId, user, messageData: text });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const products = campaign?.products || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="w-12 h-12 text-white/20" />
        <p className="text-white/50">Stream not found</p>
        <button onClick={() => navigate(createPageUrl('AffiliateMarketplaceLive'))}
          className="text-emerald-400 text-sm hover:underline">Browse Live Shops</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl('AffiliateMarketplaceLive'))}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />SHOP LIVE
              </span>
              <span className="text-white text-sm font-semibold truncate max-w-40">{stream.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Eye className="w-3 h-3 text-white/40" />
              <span className="text-white/40 text-xs">{fmtCount(stream.viewer_count || viewerCount)}</span>
              {partner && <span className="text-white/40 text-xs">· {partner.brand_name || partner.store_name}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowChat(v => !v)}
            className={`w-8 h-8 rounded-full backdrop-blur flex items-center justify-center transition-colors ${showChat ? 'bg-emerald-500/40' : 'bg-black/50'}`}>
            <MessageCircle className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setShowProducts(v => !v)}
            className={`w-8 h-8 rounded-full backdrop-blur flex items-center justify-center transition-colors ${showProducts ? 'bg-emerald-500/40' : 'bg-black/50'}`}>
            <ShoppingBag className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Video */}
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      {!liveStream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white/60 text-sm">Connecting to live shop…</p>
          </div>
        </div>
      )}

      {/* Bottom: products + chat */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {/* Product shelf */}
        <AnimatePresence>
          {showProducts && products.length > 0 && (
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="px-4 mb-2">
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {products.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-40 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                    <div className="h-24 bg-gradient-to-br from-emerald-900/50 to-black flex items-center justify-center text-4xl">
                      {product.emoji || '🛍️'}
                    </div>
                    <div className="p-2">
                      <p className="text-white text-xs font-semibold line-clamp-1">{product.name}</p>
                      <p className="text-emerald-400 text-xs font-bold">${product.price_usd?.toFixed(2)}</p>
                      {product.affiliate_code && (
                        <button onClick={() => copyCode(product.affiliate_code, product.id)}
                          className="mt-1.5 w-full flex items-center justify-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg py-1 text-[10px] text-emerald-400 font-semibold">
                          {copiedCode === product.id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          {product.affiliate_code}
                        </button>
                      )}
                      <a href={product.product_url || '#'} target="_blank" rel="noopener noreferrer"
                        onClick={() => trackClick(product.id, product.affiliate_code)}
                        className="mt-1 w-full flex items-center justify-center gap-1 bg-emerald-500 rounded-lg py-1 text-[10px] text-white font-bold">
                        <ShoppingCart className="w-2.5 h-2.5" /> Buy Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat */}
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="h-52 px-4 mb-4">
              <StreamChat
                messages={chatMessages}
                onSendMessage={sendMessage}
                onOpenGifts={() => {}}
                currentUser={user}
                streamId={streamId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
