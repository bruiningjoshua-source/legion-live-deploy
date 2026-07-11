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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  DollarSign, 
  Target,
  Plus,
  ExternalLink,
  MousePointerClick,
  Award,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';

// Ambassador program admin
const AMBASSADOR_ADMIN = 'rankincadence@gmail.com';

export default function AmbassadorProgram() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    brand_name: '',
    campaign_name: '',
    description: '',
    affiliate_link: '',
    commission_rate: 10,
    flat_rate_usd: 0,
    target_audience: '',
    requirements: '',
    total_budget_usd: 1000,
    start_date: '',
    end_date: ''
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user?.email === AMBASSADOR_ADMIN || user?.role === 'admin';

  const { data: ambassador } = useQuery({
    queryKey: ['my-ambassador', user?.email],
    queryFn: async () => {
      const ambassadors = await base44.entities.BrandAmbassador.filter({ user_email: user.email }, null, 1);
      return ambassadors[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['ambassador-campaigns'],
    queryFn: () => base44.entities.AmbassadorCampaign.filter({ status: 'active' }, '-created_date', 50),
    enabled: !!user
  });

  const { data: allCampaigns = [] } = useQuery({
    queryKey: ['all-campaigns'],
    queryFn: () => base44.entities.AmbassadorCampaign.list('-created_date', 100),
    enabled: isAdmin
  });

  const { data: allAmbassadors = [] } = useQuery({
    queryKey: ['all-ambassadors'],
    queryFn: () => base44.entities.BrandAmbassador.list('-created_date', 100),
    enabled: isAdmin
  });

  const { data: myEarnings = [] } = useQuery({
    queryKey: ['my-ambassador-earnings', ambassador?.id],
    queryFn: () => base44.entities.AmbassadorEarning.filter({ ambassador_id: ambassador.id }, '-created_date', 100),
    enabled: !!ambassador?.id
  });

  const joinMutation = useMutation({
    mutationFn: () => base44.entities.BrandAmbassador.create({
      user_email: user.email,
      display_name: user.full_name,
      status: 'pending',
      role: 'ambassador',
      first_payout_eligible_date: format(addMonths(new Date(), 6), 'yyyy-MM-dd'),
      platform_cut_percent: 10,
      ambassador_cut_percent: 90
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-ambassador'] });
      toast.success('Application submitted! Awaiting approval.');
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data) => base44.entities.AmbassadorCampaign.create({
      ...data,
      status: 'active',
      created_by_admin: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambassador-campaigns', 'all-campaigns'] });
      setShowCampaignForm(false);
      toast.success('Campaign created!');
    }
  });

  const approveAmbassadorMutation = useMutation({
    mutationFn: (id) => base44.entities.BrandAmbassador.update(id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-ambassadors'] });
      toast.success('Ambassador approved!');
    }
  });

  const totalEarnings = myEarnings.reduce((sum, e) => sum + (e.ambassador_share_usd || 0), 0);
  const pendingEarnings = myEarnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.ambassador_share_usd || 0), 0);

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050508] pb-12 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-amber-600/20 max-w-md">
          <CardContent className="p-8 text-center">
            <Briefcase className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-100 mb-2">Ambassador Program</h2>
            <p className="text-amber-400/70 mb-4">Sign in to join or manage the ambassador program</p>
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-amber-600 hover:bg-amber-700">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not an ambassador yet
  if (!ambassador && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#050508] pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Briefcase className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-amber-100 mb-4">Brand Ambassador Program</h1>
            <p className="text-amber-400/70 text-lg mb-8">
              Partner with top brands and earn 90% of all commissions. First payout after 6 months.
            </p>
          </motion.div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-amber-100 mb-2">90% Earnings</h3>
                <p className="text-amber-400/70 text-sm">Keep 90% of all commission earnings. Only 10% annual platform cut.</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-900/20 to-stone-900 border-amber-600/25">
              <CardContent className="p-6 text-center">
                <Target className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-amber-100 mb-2">Curated Campaigns</h3>
                <p className="text-amber-400/70 text-sm">Access exclusive brand partnerships curated by our admin team.</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-900/20 to-stone-900 border-amber-600/25">
              <CardContent className="p-6 text-center">
                <Award className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-amber-100 mb-2">Monthly Payouts</h3>
                <p className="text-amber-400/70 text-sm">Receive monthly payouts after 6-month qualification period.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-lg"
            >
              <Users className="w-5 h-5 mr-2" />
              {joinMutation.isPending ? 'Applying...' : 'Apply to Join'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending approval
  if (ambassador?.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#050508] pb-12 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-amber-600/20 max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-100 mb-2">Application Pending</h2>
            <p className="text-amber-400/70">Your ambassador application is under review. We'll notify you once approved.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] pb-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-amber-400" />
              Ambassador Program
            </h1>
            <p className="text-amber-400/70">
              {isAdmin ? 'Manage campaigns and ambassadors' : 'Promote brands and earn commissions'}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={showCampaignForm} onOpenChange={setShowCampaignForm}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-stone-900 border-amber-600/30 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-amber-100">Create Brand Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-200">Brand Name</Label>
                      <Input
                        value={campaignForm.brand_name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, brand_name: e.target.value })}
                        className="bg-stone-800 border-amber-600/20 text-amber-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-200">Campaign Name</Label>
                      <Input
                        value={campaignForm.campaign_name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, campaign_name: e.target.value })}
                        className="bg-stone-800 border-amber-600/20 text-amber-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-200">Description</Label>
                    <Textarea
                      value={campaignForm.description}
                      onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-200">Affiliate Link</Label>
                    <Input
                      value={campaignForm.affiliate_link}
                      onChange={(e) => setCampaignForm({ ...campaignForm, affiliate_link: e.target.value })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-200">Commission %</Label>
                      <Input
                        type="number"
                        value={campaignForm.commission_rate}
                        onChange={(e) => setCampaignForm({ ...campaignForm, commission_rate: parseFloat(e.target.value) })}
                        className="bg-stone-800 border-amber-600/20 text-amber-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-200">Flat Rate ($)</Label>
                      <Input
                        type="number"
                        value={campaignForm.flat_rate_usd}
                        onChange={(e) => setCampaignForm({ ...campaignForm, flat_rate_usd: parseFloat(e.target.value) })}
                        className="bg-stone-800 border-amber-600/20 text-amber-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-200">Budget ($)</Label>
                      <Input
                        type="number"
                        value={campaignForm.total_budget_usd}
                        onChange={(e) => setCampaignForm({ ...campaignForm, total_budget_usd: parseFloat(e.target.value) })}
                        className="bg-stone-800 border-amber-600/20 text-amber-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-200">Requirements</Label>
                    <Textarea
                      value={campaignForm.requirements}
                      onChange={(e) => setCampaignForm({ ...campaignForm, requirements: e.target.value })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                  <Button
                    onClick={() => createCampaignMutation.mutate(campaignForm)}
                    disabled={!campaignForm.brand_name || !campaignForm.campaign_name}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    Create Campaign
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">${totalEarnings.toFixed(2)}</p>
              <p className="text-amber-400/60 text-sm">Total Earnings</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-900/30 to-stone-900 border-yellow-600/30">
            <CardContent className="p-4">
              <Clock className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">${pendingEarnings.toFixed(2)}</p>
              <p className="text-amber-400/60 text-sm">Pending Payout</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-900/20 to-stone-900 border-amber-600/25">
            <CardContent className="p-4">
              <Target className="w-6 h-6 text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{campaigns.length}</p>
              <p className="text-amber-400/60 text-sm">Active Campaigns</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-900/20 to-stone-900 border-amber-600/25">
            <CardContent className="p-4">
              <Award className="w-6 h-6 text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">90%</p>
              <p className="text-amber-400/60 text-sm">Your Share</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-amber-600">Dashboard</TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-amber-600">Campaigns</TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-amber-600">Earnings</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-amber-600">Admin</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Your Ambassador Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-amber-600/30 flex items-center justify-center">
                    <Users className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-100">{ambassador?.display_name}</h3>
                    <Badge className={ambassador?.status === 'approved' ? 'bg-green-600' : 'bg-yellow-600'}>
                      {ambassador?.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-stone-900/50 rounded-lg p-4">
                    <p className="text-amber-400/70 text-sm">Campaigns Completed</p>
                    <p className="text-2xl font-bold text-amber-100">{ambassador?.campaigns_completed || 0}</p>
                  </div>
                  <div className="bg-stone-900/50 rounded-lg p-4">
                    <p className="text-amber-400/70 text-sm">First Payout Eligible</p>
                    <p className="text-lg font-bold text-amber-100">
                      {ambassador?.first_payout_eligible_date ? format(new Date(ambassador.first_payout_eligible_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign, i) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.25 }}
                >
                  <Card className="bg-stone-800/30 border-amber-600/20 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Badge className="bg-amber-600/20 text-amber-300">{campaign.brand_name}</Badge>
                        <Badge className="bg-green-600/20 text-green-300">{campaign.commission_rate}% commission</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-amber-100 mb-2">{campaign.campaign_name}</h3>
                      <p className="text-amber-400/70 text-sm mb-4 line-clamp-3">{campaign.description}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <div className="flex items-center gap-1 text-amber-400/60">
                          <MousePointerClick className="w-4 h-4" />
                          {campaign.total_clicks || 0} clicks
                        </div>
                        <div className="flex items-center gap-1 text-green-400">
                          <DollarSign className="w-4 h-4" />
                          ${campaign.spent_usd || 0} earned
                        </div>
                      </div>

                      {campaign.affiliate_link && (
                        <a
                          href={campaign.affiliate_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                        >
                          Get Link <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="earnings" className="mt-6">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Earnings History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myEarnings.length > 0 ? (
                    myEarnings.map(earning => (
                      <div key={earning.id} className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg">
                        <div>
                          <p className="text-amber-100 font-semibold">${earning.ambassador_share_usd?.toFixed(2)}</p>
                          <p className="text-amber-400/60 text-sm">{earning.earning_type}</p>
                        </div>
                        <Badge className={
                          earning.status === 'paid' ? 'bg-green-600' :
                          earning.status === 'cleared' ? 'bg-blue-600' : 'bg-yellow-600'
                        }>
                          {earning.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-amber-400/50 text-center py-8">No earnings yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="mt-6 space-y-6">
              {/* Pending Ambassadors */}
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    Pending Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allAmbassadors.filter(a => a.status === 'pending').map(amb => (
                      <div key={amb.id} className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg">
                        <div>
                          <p className="text-amber-100 font-semibold">{amb.display_name}</p>
                          <p className="text-amber-400/60 text-sm">{amb.user_email}</p>
                        </div>
                        <Button
                          onClick={() => approveAmbassadorMutation.mutate(amb.id)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    ))}
                    {allAmbassadors.filter(a => a.status === 'pending').length === 0 && (
                      <p className="text-amber-400/50 text-center py-4">No pending applications</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* All Campaigns */}
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100">All Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allCampaigns.map(campaign => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg">
                        <div>
                          <p className="text-amber-100 font-semibold">{campaign.campaign_name}</p>
                          <p className="text-amber-400/60 text-sm">{campaign.brand_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            campaign.status === 'active' ? 'bg-green-600' :
                            campaign.status === 'paused' ? 'bg-yellow-600' : 'bg-stone-600'
                          }>
                            {campaign.status}
                          </Badge>
                          <span className="text-amber-400/70">${campaign.spent_usd || 0} / ${campaign.total_budget_usd}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}