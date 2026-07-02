import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Users,
  Search,
  Heart,
  Sparkles,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import CollaborationDashboard from '@/components/collaboration/CollaborationDashboard';
import CreatorDirectoryCard from '@/components/collaboration/CreatorDirectoryCard';

export default function CollaborationHub() {
  const queryClient = useQueryClient();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    collab_type: 'stream',
    duration_minutes: 60,
    revenue_split_percent: 50,
    message: ''
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-for-collab'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100)
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCreator || !formData.title) {
        throw new Error('Missing required fields');
      }

      return base44.entities.CollabRequest.create({
        requester_creator_id: creator.id,
        requester_name: creator.display_name,
        recipient_creator_id: selectedCreator.id,
        recipient_name: selectedCreator.display_name,
        title: formData.title,
        description: formData.description,
        collab_type: formData.collab_type,
        duration_minutes: formData.duration_minutes,
        revenue_split_percent: formData.revenue_split_percent,
        message: formData.message
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-requests-outgoing', creator?.id] });
      setShowRequestDialog(false);
      setSelectedCreator(null);
      setFormData({
        title: '',
        description: '',
        collab_type: 'stream',
        duration_minutes: 60,
        revenue_split_percent: 50,
        message: ''
      });
      toast.success('Collaboration request sent!');
    },
    onError: () => toast.error('Failed to send request')
  });

  const filteredCreators = creators.filter(c => {
    if (c.id === creator?.id) return false;
    const matchesSearch =
      c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    'gaming',
    'music',
    'talk_show',
    'dance',
    'cooking',
    'fitness',
    'education',
    'art',
    'comedy',
    'other'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2 flex items-center gap-2">
            <Network className="w-8 h-8 text-amber-400" />
            Collaboration Hub
          </h1>
          <p className="text-amber-400/70">Connect with creators and build something amazing together</p>
        </div>

        {/* Tabs Section */}
        {creator ? (
          <>
            {/* My Collaborations */}
            <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-amber-400" />
                  My Collaborations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CollaborationDashboard creatorId={creator.id} />
              </CardContent>
            </Card>

            {/* Creator Directory */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
                  <Users className="w-6 h-6 text-amber-400" />
                  Discover Creators
                </h2>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                  <Input
                    placeholder="Search creators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-stone-800/50 border-amber-600/20 text-amber-100"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-48 bg-stone-800/50 border-amber-600/20 text-amber-100">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-amber-600/30">
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Creator Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCreators.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                  >
                    <CreatorDirectoryCard
                      creator={c}
                      onCollabClick={(creator) => {
                        setSelectedCreator(creator);
                        setShowRequestDialog(true);
                      }}
                    />
                  </motion.div>
                ))}
              </div>

              {filteredCreators.length === 0 && (
                <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
                  <Users className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold text-lg mb-2">No creators found</h3>
                  <p className="text-amber-400/70">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <Card className="bg-stone-800/50 border-amber-600/20">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-amber-100 mb-2">Become a Creator First</h3>
              <p className="text-amber-400/70 mb-6">
                You need to set up your creator profile to participate in collaborations
              </p>
              <Button className="bg-amber-600 hover:bg-amber-700">Get Started</Button>
            </CardContent>
          </Card>
        )}

        {/* Collaboration Request Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="bg-stone-900 border-amber-600/30 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-amber-100 flex items-center gap-2">
                <Heart className="w-5 h-5 text-amber-400" />
                Request Collaboration with {selectedCreator?.display_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label className="text-amber-200 mb-2 block">Project Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="E.g., Gaming Marathon 2025"
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-amber-200 mb-2 block">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell them about your collaboration idea..."
                  className="bg-stone-800 border-amber-600/20 text-amber-100 h-24"
                />
              </div>

              {/* Type & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-amber-200 mb-2 block">Type</Label>
                  <Select value={formData.collab_type} onValueChange={(val) => setFormData({ ...formData, collab_type: val })}>
                    <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-amber-600/30">
                      {['stream', 'podcast', 'music_session', 'gaming', 'talk_show', 'project'].map(type => (
                        <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-amber-200 mb-2 block">Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
              </div>

              {/* Revenue Split */}
              <div>
                <Label className="text-amber-200 mb-2 block">Your Revenue Split (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.revenue_split_percent}
                  onChange={(e) => setFormData({ ...formData, revenue_split_percent: parseInt(e.target.value) })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
                <p className="text-amber-400/60 text-xs mt-1">They get {100 - formData.revenue_split_percent}%</p>
              </div>

              {/* Personal Message */}
              <div>
                <Label className="text-amber-200 mb-2 block">Personal Message (optional)</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Say something nice to make them interested..."
                  className="bg-stone-800 border-amber-600/20 text-amber-100 h-20"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowRequestDialog(false)}
                  variant="outline"
                  className="flex-1 border-amber-600/20 text-amber-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => sendRequestMutation.mutate()}
                  disabled={sendRequestMutation.isPending || !formData.title}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Send Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}