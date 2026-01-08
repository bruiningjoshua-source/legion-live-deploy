import React, { useState } from 'react';
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
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import StreamCard from '@/components/stream/StreamCard';

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

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator, isLoading } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: pastStreams = [] } = useQuery({
    queryKey: ['my-past-streams', creator?.id],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creator.id, status: 'ended' }, '-created_date', 20),
    enabled: !!creator?.id
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['my-followers', creator?.id],
    queryFn: () => base44.entities.Follow.filter({ following_creator_id: creator.id }, '-created_date', 100),
    enabled: !!creator?.id
  });

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
    navigator.clipboard.writeText(link);
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
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <Card className="bg-gradient-to-br from-amber-900/30 to-stone-900 border-amber-600/30 overflow-hidden mb-8">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-amber-800 via-stone-800 to-amber-800 relative">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800')] bg-cover bg-center opacity-30" />
          </div>

          <CardContent className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="relative -mt-16 mb-4">
              <div className="relative inline-block">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1">
                  <div className="w-full h-full rounded-full overflow-hidden bg-stone-800 border-4 border-stone-900">
                    {creator?.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                    )}
                  </div>
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-700 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-amber-100">{creator?.display_name || user?.full_name || 'Legionnaire'}</h1>
                  {creator?.is_verified && <Crown className="w-5 h-5 text-amber-400" />}
                  <Badge className={`bg-${badge.color}-600/20 text-${badge.color}-300 border-${badge.color}-500/30`}>
                    {badge.icon} {badge.label}
                  </Badge>
                </div>
                <p className="text-amber-400/70 capitalize mb-2">{creator?.category?.replace('_', ' ') || 'Content Creator'}</p>
                {creator?.bio && (
                  <p className="text-amber-100/80 text-sm max-w-md">{creator.bio}</p>
                )}
              </div>

              <Button onClick={handleEdit} variant="outline" className="border-amber-500/30 text-amber-300">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-100">{(creator?.follower_count || 0).toLocaleString()}</p>
                <p className="text-amber-400/60 text-sm">Followers</p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-100">{creator?.level || 1}</p>
                <p className="text-amber-400/60 text-sm">Level</p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-100">{creator?.pk_wins || 0}</p>
                <p className="text-amber-400/60 text-sm">PK Wins</p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-100">{totalEarnings.toLocaleString()}</p>
                <p className="text-amber-400/60 text-sm">🪙 Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="streams" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl">
            <TabsTrigger value="streams" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              Past Streams
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              Statistics
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              Affiliate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="streams" className="mt-0">
            {pastStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastStreams.map((stream, i) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <StreamCard stream={{ ...stream, status: 'ended' }} creator={creator} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold mb-2">No Streams Yet</h3>
                  <p className="text-amber-400/60">Start streaming to build your legacy!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-orange-400" />
                    PK Battle Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Wins</span>
                      <span className="text-green-400 font-bold">{creator?.pk_wins || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Losses</span>
                      <span className="text-red-400 font-bold">{creator?.pk_losses || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Win Rate</span>
                      <span className="text-amber-100 font-bold">{pkWinRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(creator?.badges || []).length > 0 ? (
                      creator.badges.map((badge, i) => (
                        <Badge key={i} className="bg-amber-600/20 text-amber-300 border-amber-500/30">
                          {badge}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-amber-400/60 text-sm">No badges earned yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="affiliate" className="mt-0">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-green-400" />
                  Affiliate Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-amber-400/70 mb-4">
                    Share your unique link and earn 10% of any purchases made by users you refer!
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}?ref=${creator?.affiliate_code || 'legion'}`}
                      readOnly
                      className="bg-stone-900 border-amber-600/20 text-amber-100"
                    />
                    <Button onClick={copyAffiliateLink} className="bg-amber-600 hover:bg-amber-700">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-400">{(creator?.affiliate_earnings || 0).toLocaleString()}</p>
                    <p className="text-amber-400/60 text-sm">🪙 Earned</p>
                  </div>
                  <div className="bg-stone-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-amber-100">0</p>
                    <p className="text-amber-400/60 text-sm">Referrals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="bg-stone-900 border-amber-600/30 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-amber-100">Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-amber-200">Display Name</Label>
                <Input
                  value={editData.display_name || ''}
                  onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
              </div>
              <div>
                <Label className="text-amber-200">Category</Label>
                <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                  <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-amber-600/30">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-amber-100">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-amber-200">Bio</Label>
                <Textarea
                  value={editData.bio || ''}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                  maxLength={200}
                />
              </div>
              <Button onClick={handleSave} className="w-full bg-amber-600 hover:bg-amber-700">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}