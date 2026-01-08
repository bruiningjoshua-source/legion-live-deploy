import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  CheckCircle, 
  XCircle,
  Clock,
  DollarSign,
  Eye,
  MousePointerClick,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function BrandCampaigns() {
  const queryClient = useQueryClient();

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

  const { data: campaigns = [] } = useQuery({
    queryKey: ['creator-campaigns', creator?.id],
    queryFn: () => base44.entities.BrandCampaign.filter({ creator_id: creator.id }, '-created_date', 100),
    enabled: !!creator?.id
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brand-partners'],
    queryFn: () => base44.entities.BrandPartner.list(null, 100)
  });

  const brandMap = brands.reduce((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {});

  const respondMutation = useMutation({
    mutationFn: ({ campaignId, status }) => 
      base44.entities.BrandCampaign.update(campaignId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['creator-campaigns']);
    }
  });

  const pending = campaigns.filter(c => c.status === 'pending');
  const active = campaigns.filter(c => c.status === 'active' || c.status === 'accepted');
  const completed = campaigns.filter(c => c.status === 'completed');

  const totalEarnings = campaigns.reduce((sum, c) => 
    sum + (c.status === 'completed' || c.status === 'active' ? c.payment_amount || 0 : 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Brand Campaigns</h1>
          <p className="text-amber-400/70">Collaborate with brands and earn from sponsored content</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-500/30">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 text-yellow-400 mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{pending.length}</div>
              <div className="text-yellow-200/70 text-sm">Pending Offers</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-500/30">
            <CardContent className="p-6">
              <Briefcase className="w-8 h-8 text-green-400 mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{active.length}</div>
              <div className="text-green-200/70 text-sm">Active Campaigns</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <CheckCircle className="w-8 h-8 text-blue-400 mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{completed.length}</div>
              <div className="text-blue-200/70 text-sm">Completed</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border-amber-500/30">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 text-amber-400 mb-2" />
              <div className="text-3xl font-bold text-white mb-1">${totalEarnings.toLocaleString()}</div>
              <div className="text-amber-200/70 text-sm">Total Earnings</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20">
            <TabsTrigger value="pending">
              Pending Offers <Badge className="ml-2 bg-yellow-500/20">{pending.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active <Badge className="ml-2 bg-green-500/20">{active.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pending.length === 0 ? (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold text-lg mb-2">No Pending Offers</h3>
                  <p className="text-amber-400/60">Brand campaign offers will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pending.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    brand={brandMap[campaign.brand_partner_id]}
                    onAccept={() => respondMutation.mutate({ campaignId: campaign.id, status: 'accepted' })}
                    onDecline={() => respondMutation.mutate({ campaignId: campaign.id, status: 'cancelled' })}
                    isPending={respondMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            <div className="space-y-4">
              {active.map((campaign) => (
                <ActiveCampaignCard 
                  key={campaign.id} 
                  campaign={campaign} 
                  brand={brandMap[campaign.brand_partner_id]} 
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {completed.map((campaign) => (
                <CompletedCampaignCard 
                  key={campaign.id} 
                  campaign={campaign} 
                  brand={brandMap[campaign.brand_partner_id]} 
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CampaignCard({ campaign, brand, onAccept, onDecline, isPending }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              {brand?.logo_url && (
                <img src={brand.logo_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
              <div>
                <h3 className="text-amber-100 font-semibold text-lg mb-1">{campaign.campaign_name}</h3>
                <p className="text-amber-400/70 text-sm mb-2">by {brand?.company_name}</p>
                <Badge className="bg-amber-600/20 text-amber-200 capitalize">
                  {campaign.campaign_type?.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-400">${campaign.payment_amount?.toLocaleString()}</div>
              <div className="text-amber-400/70 text-sm">Payment</div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-amber-100/90">{campaign.description}</p>
            {campaign.requirements && (
              <div className="mt-3 p-3 bg-amber-900/20 rounded-lg border border-amber-600/20">
                <div className="text-amber-200 text-sm font-semibold mb-1">Requirements:</div>
                <p className="text-amber-100/70 text-sm">{campaign.requirements}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-stone-900/50 rounded-lg">
            <div>
              <div className="text-amber-400/70 text-xs mb-1">Streams Required</div>
              <div className="text-amber-100 font-semibold">{campaign.streams_required}</div>
            </div>
            <div>
              <div className="text-amber-400/70 text-xs mb-1">Budget</div>
              <div className="text-amber-100 font-semibold">${campaign.budget?.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-amber-400/70 text-xs mb-1">Commission</div>
              <div className="text-amber-100 font-semibold">{campaign.commission_rate}%</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onAccept}
              disabled={isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Campaign
            </Button>
            <Button
              onClick={onDecline}
              disabled={isPending}
              variant="outline"
              className="flex-1 border-red-500/30 text-red-300 hover:bg-red-900/20"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ActiveCampaignCard({ campaign, brand }) {
  const progress = (campaign.streams_completed / campaign.streams_required) * 100;

  return (
    <Card className="bg-stone-800/30 border-green-500/30">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-amber-100 font-semibold text-lg mb-1">{campaign.campaign_name}</h3>
            <p className="text-amber-400/70 text-sm">with {brand?.company_name}</p>
          </div>
          <Badge className="bg-green-500/20 text-green-200">Active</Badge>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Progress</div>
            <div className="text-amber-100 font-semibold">
              {campaign.streams_completed}/{campaign.streams_required}
            </div>
            <div className="w-full bg-stone-900 rounded-full h-2 mt-1">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Views</div>
            <div className="text-amber-100 font-semibold flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {campaign.total_views?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Clicks</div>
            <div className="text-amber-100 font-semibold flex items-center gap-1">
              <MousePointerClick className="w-3 h-3" />
              {campaign.total_clicks?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Earnings</div>
            <div className="text-green-400 font-semibold">${campaign.payment_amount?.toLocaleString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletedCampaignCard({ campaign, brand }) {
  const roi = campaign.budget > 0 ? ((campaign.revenue_generated / campaign.budget) * 100).toFixed(0) : 0;

  return (
    <Card className="bg-stone-800/30 border-blue-500/30">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-amber-100 font-semibold text-lg mb-1">{campaign.campaign_name}</h3>
            <p className="text-amber-400/70 text-sm">with {brand?.company_name}</p>
          </div>
          <Badge className="bg-blue-500/20 text-blue-200">Completed</Badge>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Earned</div>
            <div className="text-green-400 font-semibold">${campaign.payment_amount?.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Views</div>
            <div className="text-amber-100 font-semibold">{campaign.total_views?.toLocaleString() || 0}</div>
          </div>
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Clicks</div>
            <div className="text-amber-100 font-semibold">{campaign.total_clicks?.toLocaleString() || 0}</div>
          </div>
          <div>
            <div className="text-amber-400/70 text-xs mb-1">Sales</div>
            <div className="text-amber-100 font-semibold">{campaign.total_conversions?.toLocaleString() || 0}</div>
          </div>
          <div>
            <div className="text-amber-400/70 text-xs mb-1">ROI</div>
            <div className="text-amber-100 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              {roi}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}