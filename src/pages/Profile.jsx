import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  User, 
  Edit, 
  Camera, 
  Crown, 
  Trophy, 
  Swords, 
  Users, 
  Heart,
  Link as LinkIcon,
  Copy,
  Check,
  Share2,
  BarChart3,
  DollarSign,
  Video
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';
import StreamCard from '@/components/stream/StreamCard';
import CreatorPayoutSettings from '@/components/creator/CreatorPayoutSettings';
import HostSubscriptionGate from '@/components/creator/HostSubscriptionGate';
import DirectDonationSettings from '@/components/creator/DirectDonationSettings';
import VideoUploadSection from '@/components/creator/VideoUploadSection';
import FreeTierWalletTip from '@/components/creator/FreeTierWalletTip';
import CreatorInfoSection from '@/components/creator/CreatorInfoSection';
import EarningsDashboard from '@/components/earnings/EarningsDashboard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const categories = [
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'talk_show', label: 'Talk Show' },
  { value: 'dance', label: 'Dance' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'education', label: 'Education' },
  { value: 'art', label: 'Art' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'other', label: 'Other' }
];

export default function Profile() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editData, setEditData] = useState({});

  // Handle subscription redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success') {
      toast.success('🎉 Host subscription activated! You can now monetize your streams.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('subscription') === 'cancelled') {
      toast.info('Subscription cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: creator, isLoading } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: pastStreams = [] } = useQuery({
    queryKey: ['my-past-streams', creator?.id],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creator.id, status: 'ended' }, '-created_date', 20),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: myVideos = [] } = useQuery({
    queryKey: ['my-videos', creator?.id],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['my-followers', creator?.id],
    queryFn: () => base44.entities.Follow.filter({ following_creator_id: creator.id }, '-created_date', 100),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: hostSubscription } = useQuery({
    queryKey: ['host-subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.CreatorSubscription.filter({ 
        user_email: user.email, 
        status: 'active' 
      }, '-created_date', 1);
      return subs[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isSubscribed = hostSubscription?.status === 'active';

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (creator) {
        return base44.entities.Creator.update(creator.id, data);
      } else {
        return base44.entities.Creator.create({
          user_email: user.email,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-creator']);
      setIsEditing(false);
      toast.success('Profile updated');
    }
  });

  const handleEdit = () => {
    setEditData({
      display_name: creator?.display_name || user?.full_name || '',
      bio: creator?.bio || '',
      category: creator?.category || '',
      social_links: creator?.social_links || {}
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      updateMutation.mutate({ avatar_url: result.file_url });
    }
  };

  const copyAffiliateLink = () => {
    const link = `${window.location.origin}?ref=${creator?.affiliate_code || 'legion'}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Affiliate link copied!');
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const levelBadges = {
    1: { label: 'Recruit', color: 'stone', icon: '🔰' },
    5: { label: 'Legionary', color: 'green', icon: '⚔️' },
    10: { label: 'Decanus', color: 'blue', icon: '🛡️' },
    20: { label: 'Centurion', color: 'purple', icon: '🏛️' },
    35: { label: 'Praetor', color: 'amber', icon: '👑' },
    50: { label: 'Consul', color: 'rose', icon: '🦅' },
    75: { label: 'Imperator', color: 'yellow', icon: '✨' }
  };

  const getLevelBadge = (level) => {
    const thresholds = Object.keys(levelBadges).map(Number).sort((a, b) => b - a);
    const threshold = thresholds.find(t => level >= t) || 1;
    return levelBadges[threshold];
  };

  const badge = getLevelBadge(creator?.level || 1);
  const totalEarnings = creator?.total_earnings_denarii || 0;
  const pkWinRate = creator?.pk_wins && creator?.pk_losses 
    ? ((creator.pk_wins / (creator.pk_wins + creator.pk_losses)) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Profile Header */}
        <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08] overflow-hidden mb-6">
          {/* Cover */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-amber-900/60 via-stone-800/40 to-amber-900/60 relative">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800')] bg-cover bg-center opacity-30" />
          </div>

          <CardContent className="relative px-4 sm:px-6 pb-6">
            {/* Avatar + Edit button row */}
            <div className="flex items-end justify-between -mt-14 mb-4">
              <div className="relative inline-block">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1">
                  <div className="w-full h-full rounded-full overflow-hidden bg-stone-800 border-4 border-stone-900">
                    {creator?.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">👤</div>
                    )}
                  </div>
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-700 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <Button onClick={handleEdit} variant="outline" size="sm" className="border-amber-500/30 text-amber-300 mb-1">
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-amber-100">{creator?.display_name || user?.full_name || 'Legionnaire'}</h1>
                {creator?.is_verified && <Crown className="w-5 h-5 text-amber-400" />}
                <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30 text-xs">
                  {badge.icon} {badge.label}
                </Badge>
              </div>
              <p className="text-amber-400/70 capitalize text-sm mb-1">{creator?.category?.replace('_', ' ') || 'Content Creator'}</p>
              {creator?.bio && (
                <p className="text-amber-100/80 text-sm max-w-md">{creator.bio}</p>
              )}
              {/* Social links display */}
              {creator?.social_links && Object.values(creator.social_links).some(Boolean) && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {Object.entries(creator.social_links).filter(([,v]) => v).map(([platform, value]) => (
                    <a key={platform} href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" 
                       className="text-amber-400/60 hover:text-amber-300 text-xs flex items-center gap-1 transition-colors">
                      <LinkIcon className="w-3 h-3" /> {platform}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-4">
              {[
                { val: formatCount(creator?.follower_count), label: 'Followers' },
                { val: creator?.level || 1, label: 'Level' },
                { val: formatCount(creator?.pk_wins), label: 'PK Wins' },
                { val: formatCount(totalEarnings), label: '🪙 Earned' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold text-amber-100">{stat.val}</p>
                  <p className="text-amber-400/60 text-[10px] sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="videos" className="space-y-4">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <TabsList className="bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-2xl inline-flex min-w-max">
              <TabsTrigger value="videos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60 text-xs sm:text-sm px-3">
                <Video className="w-3.5 h-3.5 mr-1" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="info" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60 text-xs sm:text-sm px-3">
                Info
              </TabsTrigger>
              <TabsTrigger value="streams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60 text-xs sm:text-sm px-3">
                Streams
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60 text-xs sm:text-sm px-3">
                Stats
              </TabsTrigger>
              <TabsTrigger value="earnings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60 text-xs sm:text-sm px-3">
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Earn
              </TabsTrigger>
              <TabsTrigger value="affiliate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60 text-xs sm:text-sm px-3">
                Affiliate
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="videos" className="mt-0">
            <VideoUploadSection creator={creator} videos={myVideos} />
          </TabsContent>

          <TabsContent value="info" className="mt-0">
            <CreatorInfoSection creator={creator} isOwnProfile={true} />
          </TabsContent>

          <TabsContent value="streams" className="mt-0">
            {pastStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastStreams.map((stream, i) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
                  >
                    <StreamCard stream={{ ...stream, status: 'ended' }} creator={creator} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08]">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No Streams Yet</h3>
                  <p className="text-white/50 mb-4">Start streaming to build your legacy!</p>
                  <Link to={createPageUrl('GoLive')}>
                    <Button className="bg-red-600 hover:bg-red-700">
                      Go Live Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Swords className="w-5 h-5 text-orange-400" />
                    PK Battle Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-white/50">Wins</span>
                      <span className="text-green-400 font-bold">{creator?.pk_wins || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Losses</span>
                      <span className="text-red-400 font-bold">{creator?.pk_losses || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Win Rate</span>
                      <span className="text-white font-bold">{pkWinRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(creator?.badges || []).length > 0 ? (
                      creator.badges.map((badge, i) => (
                        <Badge key={i} className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                          {badge}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-white/40 text-sm">No badges earned yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings" className="mt-0">
            {/* Earnings Dashboard with analytics */}
            <EarningsDashboard creator={creator} user={user} />

            {/* Free Tier Wallet */}
            <div className="mt-8">
              <FreeTierWalletTip creator={creator} isOwnProfile={true} />
            </div>

            {/* Payout Settings & Donation Settings */}
            <div className="mt-8">
              {isSubscribed ? (
                <div className="space-y-8">
                  <CreatorPayoutSettings creator={creator} user={user} />
                  <DirectDonationSettings creator={creator} subscription={hostSubscription} />
                </div>
              ) : (
                <HostSubscriptionGate 
                  user={user} 
                  creator={creator} 
                  subscription={hostSubscription}
                  onSubscribed={() => queryClient.invalidateQueries(['host-subscription'])}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="affiliate" className="mt-0">
            <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-green-400" />
                  Affiliate Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-white/50 mb-4">
                    Share your unique link and earn 10% of any purchases made by users you refer!
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}?ref=${creator?.affiliate_code || 'legion'}`}
                      readOnly
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Button onClick={copyAffiliateLink} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-400">{formatCount(creator?.affiliate_earnings)}</p>
                    <p className="text-white/50 text-sm">🪙 Earned</p>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-white/50 text-sm">Referrals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="bg-[#131316]/98 backdrop-blur-2xl border-white/[0.1] max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <Label className="text-white/70">Display Name</Label>
                <Input
                  value={editData.display_name || ''}
                  onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Category</Label>
                <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131316]/98 backdrop-blur-2xl border-white/[0.1]">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-white">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Bio</Label>
                <Textarea
                  value={editData.bio || ''}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  maxLength={200}
                />
              </div>
              
              {/* Social Links */}
              <div className="space-y-3">
                <Label className="text-white/70">Social Links</Label>
                {[
                  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourchannel' },
                  { key: 'tiktok', label: 'TikTok', placeholder: '@username' },
                  { key: 'instagram', label: 'Instagram', placeholder: '@username' },
                  { key: 'twitter', label: 'X / Twitter', placeholder: '@username' },
                ].map(link => (
                  <div key={link.key}>
                    <span className="text-white/40 text-xs">{link.label}</span>
                    <Input
                      value={editData.social_links?.[link.key] || ''}
                      onChange={(e) => setEditData({ 
                        ...editData, 
                        social_links: { ...editData.social_links, [link.key]: e.target.value } 
                      })}
                      placeholder={link.placeholder}
                      className="bg-white/5 border-white/10 text-white mt-1"
                    />
                  </div>
                ))}
              </div>
              
              <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}