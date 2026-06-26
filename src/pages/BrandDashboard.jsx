import { SEEDED_BRANDS, BRAND_CATEGORIES as SEEDED_BRAND_CATS, getFeaturedBrands, getTopPayingBrands } from '@/components/marketplace/SeededBrands';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  DollarSign,
  Crown,
  Star,
  Eye,
  ShoppingCart,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function BrandDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: brandPartner } = useQuery({
    queryKey: ['brand-partner', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const partners = await base44.entities.BrandPartner.filter({ contact_email: user.email }, null, 1);
      return partners[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['brand-campaigns', brandPartner?.id],
    queryFn: () => base44.entities.BrandCampaign.filter({ brand_partner_id: brandPartner.id }, '-created_date', 50),
    enabled: !!brandPartner?.id
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['all-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100)
  });

  const filteredCreators = creators.filter(c => 
    c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createBrandMutation = useMutation({
    mutationFn: (data) => base44.entities.BrandPartner.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brand-partner'] })
  });

  const bookCreatorMutation = useMutation({
    mutationFn: (campaignData) => base44.entities.BrandCampaign.create(campaignData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-campaigns'] });
      setShowBookingDialog(false);
      setSelectedCreator(null);
    }
  });

  const stats = {
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalSpent: campaigns.reduce((sum, c) => sum + (c.payment_amount || 0), 0),
    totalViews: campaigns.reduce((sum, c) => sum + (c.total_views || 0), 0),
    totalConversions: campaigns.reduce((sum, c) => sum + (c.total_conversions || 0), 0)
  };

  if (!brandPartner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-amber-400" />
                Brand Partner Registration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BrandRegistrationForm onSubmit={createBrandMutation.mutate} isPending={createBrandMutation.isPending} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Brand Dashboard</h1>
          <p className="text-amber-400/70">{brandPartner.company_name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-400" />
                <Badge className="bg-blue-500/20 text-blue-200">{brandPartner.tier}</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.activeCampaigns}</div>
              <div className="text-blue-200/70 text-sm">Active Campaigns</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-500/30">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 text-green-400 mb-2" />
              <div className="text-3xl font-bold text-white mb-1">${stats.totalSpent}</div>
              <div className="text-green-200/70 text-sm">Total Investment</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6">
              <Eye className="w-8 h-8 text-purple-400 mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{stats.totalViews}</div>
              <div className="text-purple-200/70 text-sm">Total Views</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border-amber-500/30">
            <CardContent className="p-6">
              <ShoppingCart className="w-8 h-8 text-amber-400 mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{stats.totalConversions}</div>
              <div className="text-amber-200/70 text-sm">Conversions</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="creators" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20">
            <TabsTrigger value="creators">Book Creators</TabsTrigger>
            <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="creators" className="space-y-4">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/50" />
                <Input
                  placeholder="Search creators by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-stone-800/50 border-amber-600/20 text-amber-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreators.map((creator) => (
                <motion.div key={creator.id} whileHover={{ y: -4 }}>
                  <Card className="bg-stone-800/30 border-amber-600/20 hover:border-amber-500/40 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5">
                          <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
                            {creator.avatar_url ? (
                              <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-amber-100 font-semibold flex items-center gap-1">
                            {creator.display_name}
                            {creator.is_verified && <Crown className="w-4 h-4 text-amber-400" />}
                          </h3>
                          <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                            {creator.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div className="text-amber-400/70">
                          <Users className="w-3 h-3 inline mr-1" />
                          {creator.follower_count || 0}
                        </div>
                        <div className="text-amber-400/70">
                          <Star className="w-3 h-3 inline mr-1" />
                          Level {creator.level || 1}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedCreator(creator);
                          setShowBookingDialog(true);
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Book Creator
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                    <h3 className="text-amber-100 font-semibold text-lg mb-2">No Campaigns Yet</h3>
                    <p className="text-amber-400/60">Book a creator to start your first campaign</p>
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((campaign) => {
                  const creator = creators.find(c => c.id === campaign.creator_id);
                  return (
                    <Card key={campaign.id} className="bg-stone-800/30 border-amber-600/20">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-amber-100 font-semibold text-lg mb-1">{campaign.campaign_name}</h3>
                            <p className="text-amber-400/70 text-sm">with {creator?.display_name}</p>
                          </div>
                          <Badge className={
                            campaign.status === 'active' ? 'bg-green-500/20 text-green-200' :
                            campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-200' :
                            campaign.status === 'pending' ? 'bg-yellow-500/20 text-yellow-200' :
                            'bg-gray-500/20 text-gray-200'
                          }>
                            {campaign.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <div className="text-amber-400/70 text-xs mb-1">Budget</div>
                            <div className="text-amber-100 font-semibold">${campaign.budget || 0}</div>
                          </div>
                          <div>
                            <div className="text-amber-400/70 text-xs mb-1">Views</div>
                            <div className="text-amber-100 font-semibold">{campaign.total_views || 0}</div>
                          </div>
                          <div>
                            <div className="text-amber-400/70 text-xs mb-1">Clicks</div>
                            <div className="text-amber-100 font-semibold">{campaign.total_clicks || 0}</div>
                          </div>
                          <div>
                            <div className="text-amber-400/70 text-xs mb-1">Conversions</div>
                            <div className="text-amber-100 font-semibold">{campaign.total_conversions || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="bg-stone-900 border-amber-600/30 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-amber-100">Book {selectedCreator?.display_name}</DialogTitle>
            </DialogHeader>
            <BookingForm
              creator={selectedCreator}
              brandPartner={brandPartner}
              onSubmit={bookCreatorMutation.mutate}
              isPending={bookCreatorMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function BrandRegistrationForm({ onSubmit, isPending }) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    website: '',
    industry: '',
    budget_monthly: 1000
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-amber-200">Company Name *</Label>
        <Input
          value={formData.company_name}
          onChange={(e) => setFormData({...formData, company_name: e.target.value})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Contact Name *</Label>
        <Input
          value={formData.contact_name}
          onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Contact Email *</Label>
        <Input
          type="email"
          value={formData.contact_email}
          onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Website</Label>
        <Input
          value={formData.website}
          onChange={(e) => setFormData({...formData, website: e.target.value})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Industry *</Label>
        <Select value={formData.industry} onValueChange={(v) => setFormData({...formData, industry: v})}>
          <SelectTrigger className="bg-stone-900/50 border-amber-600/20 text-amber-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-stone-900 border-amber-600/30">
            {['technology', 'fashion', 'gaming', 'beauty', 'fitness', 'food', 'entertainment', 'other'].map(i => (
              <SelectItem key={i} value={i} className="text-amber-100">{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Monthly Budget ($)</Label>
        <Input
          type="number"
          value={formData.budget_monthly}
          onChange={(e) => setFormData({...formData, budget_monthly: parseInt(e.target.value)})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
        />
      </div>
      <Button
        onClick={() => onSubmit(formData)}
        disabled={isPending || !formData.company_name || !formData.contact_email || !formData.industry}
        className="w-full bg-amber-600 hover:bg-amber-700"
      >
        {isPending ? 'Registering...' : 'Register as Brand Partner'}
      </Button>
    </div>
  );
}

function BookingForm({ creator, brandPartner, onSubmit, isPending }) {
  const [formData, setFormData] = useState({
    campaign_name: '',
    description: '',
    campaign_type: 'sponsored_stream',
    budget: 500,
    payment_amount: 400,
    commission_rate: 10,
    streams_required: 1,
    requirements: ''
  });

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      brand_partner_id: brandPartner.id,
      creator_id: creator.id,
      status: 'pending'
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-amber-200">Campaign Name *</Label>
        <Input
          value={formData.campaign_name}
          onChange={(e) => setFormData({...formData, campaign_name: e.target.value})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Campaign Type *</Label>
        <Select value={formData.campaign_type} onValueChange={(v) => setFormData({...formData, campaign_type: v})}>
          <SelectTrigger className="bg-stone-900/50 border-amber-600/20 text-amber-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-stone-900 border-amber-600/30">
            <SelectItem value="product_placement" className="text-amber-100">Product Placement</SelectItem>
            <SelectItem value="sponsored_stream" className="text-amber-100">Sponsored Stream</SelectItem>
            <SelectItem value="affiliate_promotion" className="text-amber-100">Affiliate Promotion</SelectItem>
            <SelectItem value="brand_takeover" className="text-amber-100">Brand Takeover</SelectItem>
            <SelectItem value="series_partnership" className="text-amber-100">Series Partnership</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-amber-200">Total Budget ($) *</Label>
          <Input
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value)})}
            className="bg-stone-900/50 border-amber-600/20 text-amber-100"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-amber-200">Creator Payment ($) *</Label>
          <Input
            type="number"
            value={formData.payment_amount}
            onChange={(e) => setFormData({...formData, payment_amount: parseInt(e.target.value)})}
            className="bg-stone-900/50 border-amber-600/20 text-amber-100"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Description *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-amber-200">Requirements</Label>
        <Textarea
          value={formData.requirements}
          onChange={(e) => setFormData({...formData, requirements: e.target.value})}
          className="bg-stone-900/50 border-amber-600/20 text-amber-100"
          placeholder="Specific mentions, product demos, etc..."
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isPending || !formData.campaign_name || !formData.description}
        className="w-full bg-amber-600 hover:bg-amber-700"
      >
        {isPending ? 'Booking...' : `Book for $${formData.payment_amount}`}
      </Button>
    </div>
  );
}