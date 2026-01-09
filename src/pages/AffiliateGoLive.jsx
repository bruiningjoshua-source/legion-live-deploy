import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Radio, 
  Camera, 
  ShoppingBag, 
  DollarSign,
  Copy,
  Check,
  Zap,
  Users,
  TrendingUp,
  X,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function AffiliateGoLive() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCampaignId = urlParams.get('campaign');

  const [selectedCampaignId, setSelectedCampaignId] = useState(preselectedCampaignId || '');
  const [streamTitle, setStreamTitle] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showProductOverlay, setShowProductOverlay] = useState(true);
  
  // Live stats
  const [liveStats, setLiveStats] = useState({
    viewers: 0,
    clicks: 0,
    conversions: 0,
    earnings: 0
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: partner } = useQuery({
    queryKey: ['affiliate-partner', user?.email],
    queryFn: async () => {
      const partners = await base44.entities.AffiliatePartner.filter({ user_email: user.email }, null, 1);
      return partners[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: myCampaigns = [] } = useQuery({
    queryKey: ['my-joined-campaigns', partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const campaigns = await base44.entities.LiveCampaign.filter({ status: 'active' });
      return campaigns.filter(c => c.assigned_partners?.includes(partner.id));
    },
    enabled: !!partner?.id
  });

  const selectedCampaign = myCampaigns.find(c => c.id === selectedCampaignId);

  // Request camera on mount
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        toast.error('Camera access required for streaming');
      }
    };
    initCamera();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCampaignId) throw new Error('Please select a campaign');
      if (!streamTitle) throw new Error('Please enter a stream title');

      const stream = await base44.entities.AffiliateLiveStream.create({
        partner_id: partner.id,
        campaign_id: selectedCampaignId,
        title: streamTitle,
        status: 'live',
        started_at: new Date().toISOString()
      });

      return stream;
    },
    onSuccess: (stream) => {
      setActiveStream(stream);
      setIsLive(true);
      toast.success('You are now LIVE!');
    },
    onError: (error) => toast.error(error.message)
  });

  const endStreamMutation = useMutation({
    mutationFn: async () => {
      const duration = Math.floor((new Date() - new Date(activeStream.started_at)) / 60000);
      
      // Calculate earnings
      const commissionEarned = liveStats.conversions * (selectedCampaign.product_price_usd * selectedCampaign.commission_rate / 100);
      const partnerPayout = commissionEarned * 0.75;
      
      await base44.entities.AffiliateLiveStream.update(activeStream.id, {
        status: 'ended',
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
        peak_viewers: Math.max(liveStats.viewers, activeStream.peak_viewers || 0),
        product_clicks: liveStats.clicks,
        conversions: liveStats.conversions,
        sales_revenue_usd: liveStats.conversions * selectedCampaign.product_price_usd,
        commission_earned_usd: commissionEarned,
        total_earnings_usd: partnerPayout
      });

      // Update partner earnings
      await base44.entities.AffiliatePartner.update(partner.id, {
        total_earnings_usd: (partner.total_earnings_usd || 0) + partnerPayout,
        pending_payout_usd: (partner.pending_payout_usd || 0) + partnerPayout,
        lifetime_conversions: (partner.lifetime_conversions || 0) + liveStats.conversions
      });
    },
    onSuccess: () => {
      toast.success('Stream ended! Earnings added to your balance.');
      navigate(createPageUrl('AffiliateHub'));
    }
  });

  const copyPromoCode = () => {
    navigator.clipboard.writeText(selectedCampaign?.promo_code || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Promo code copied!');
  };

  // Simulate live engagement (in production, this would be real-time)
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        viewers: Math.max(1, prev.viewers + Math.floor(Math.random() * 3) - 1),
        clicks: prev.clicks + (Math.random() > 0.7 ? 1 : 0),
        conversions: prev.conversions + (Math.random() > 0.95 ? 1 : 0),
        earnings: prev.conversions * (selectedCampaign?.product_price_usd * selectedCampaign?.commission_rate / 100 * 0.75)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive, selectedCampaign]);

  if (!partner || partner.status !== 'approved') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-stone-800/50 border-amber-600/20">
          <CardContent className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
            <h2 className="text-xl text-amber-100 mb-2">Partner Access Required</h2>
            <p className="text-amber-400/70 mb-4">You need to be an approved affiliate partner to stream</p>
            <Button onClick={() => navigate(createPageUrl('AffiliateHub'))} className="bg-green-600 hover:bg-green-700">
              Go to Affiliate Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Full screen video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Bar - Live indicator & Stats */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLive && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping" />
                  LIVE
                </Badge>
              )}
              {isLive && (
                <div className="flex items-center gap-4 text-white text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {liveStats.viewers}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    {liveStats.conversions} sales
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <DollarSign className="w-4 h-4" />
                    ${liveStats.earnings.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {isLive && (
              <Button
                onClick={() => endStreamMutation.mutate()}
                disabled={endStreamMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                End Stream
              </Button>
            )}
          </div>
        </div>

        {/* Product Overlay (Right Side) */}
        {isLive && selectedCampaign && showProductOverlay && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute right-4 top-20 w-72 pointer-events-auto"
          >
            <Card className="bg-black/80 backdrop-blur border-green-600/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-green-600 text-white text-xs">
                    🛒 Featured Product
                  </Badge>
                  <button onClick={() => setShowProductOverlay(false)}>
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>
                
                {selectedCampaign.product_image_url && (
                  <img 
                    src={selectedCampaign.product_image_url} 
                    alt="" 
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                
                <h3 className="text-white font-bold text-sm mb-1">{selectedCampaign.product_name}</h3>
                <p className="text-amber-300 text-lg font-bold mb-2">
                  ${selectedCampaign.product_price_usd}
                  {selectedCampaign.discount_percent && (
                    <span className="text-green-400 text-sm ml-2">
                      -{selectedCampaign.discount_percent}% OFF
                    </span>
                  )}
                </p>
                
                {selectedCampaign.promo_code && (
                  <div className="flex items-center gap-2 mb-3">
                    <code className="flex-1 bg-green-900/50 px-3 py-2 rounded text-green-300 text-sm font-mono">
                      {selectedCampaign.promo_code}
                    </code>
                    <Button
                      onClick={copyPromoCode}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}

                <a
                  href={selectedCampaign.product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Shop Now
                  <ExternalLink className="w-4 h-4" />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pre-Stream Setup (Center) */}
        {!isLive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <Card className="bg-black/90 backdrop-blur border-amber-600/30 w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-500" />
                  Start Affiliate Stream
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myCampaigns.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingBag className="w-10 h-10 text-amber-400/30 mx-auto mb-3" />
                    <p className="text-amber-400/70 mb-4">Join a campaign first to start streaming</p>
                    <Button onClick={() => navigate(createPageUrl('AffiliateHub'))} className="bg-green-600 hover:bg-green-700">
                      Browse Campaigns
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-amber-200 text-sm block mb-2">Select Campaign</label>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                        className="w-full bg-stone-900 border border-amber-600/20 rounded-lg px-4 py-3 text-amber-100"
                      >
                        <option value="">Choose a campaign...</option>
                        {myCampaigns.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.brand_name} - {c.campaign_name} ({c.commission_rate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedCampaign && (
                      <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          {selectedCampaign.product_image_url && (
                            <img src={selectedCampaign.product_image_url} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div>
                            <p className="text-green-300 font-semibold text-sm">{selectedCampaign.product_name}</p>
                            <p className="text-green-400/70 text-xs">
                              ${selectedCampaign.product_price_usd} • {selectedCampaign.commission_rate}% commission
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-amber-200 text-sm block mb-2">Stream Title</label>
                      <Input
                        value={streamTitle}
                        onChange={(e) => setStreamTitle(e.target.value)}
                        placeholder="e.g., Exclusive deals on..."
                        className="bg-stone-900 border-amber-600/20 text-amber-100"
                      />
                    </div>

                    <Button
                      onClick={() => goLiveMutation.mutate()}
                      disabled={!selectedCampaignId || !streamTitle || goLiveMutation.isPending}
                      className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg"
                    >
                      <Radio className="w-5 h-5 mr-2 animate-pulse" />
                      {goLiveMutation.isPending ? 'Starting...' : 'GO LIVE'}
                    </Button>

                    <Button
                      onClick={() => navigate(createPageUrl('AffiliateHub'))}
                      variant="outline"
                      className="w-full border-amber-600/30 text-amber-300"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Engagement Actions (Bottom - During Live) */}
        {isLive && (
          <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={() => setShowProductOverlay(!showProductOverlay)}
                className="bg-green-600/80 hover:bg-green-600"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {showProductOverlay ? 'Hide' : 'Show'} Product
              </Button>
              <Button
                className="bg-amber-600/80 hover:bg-amber-600"
              >
                <Zap className="w-4 h-4 mr-2" />
                Flash Sale
              </Button>
              <Button
                className="bg-purple-600/80 hover:bg-purple-600"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Show QR
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}