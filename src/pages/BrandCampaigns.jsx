import { getFeaturedBrands, getTopPayingBrands } from '@/components/marketplace/SeededBrands';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Briefcase, CheckCircle, XCircle, Clock, DollarSign,
  Eye, MousePointerClick, Store,
  Plus, BarChart3, Users, Percent,
  Radio, Target, Award
} from 'lucide-react';

const BRAND_CATEGORIES = [
  'Technology', 'Fashion', 'Beauty', 'Health & Fitness',
  'Food & Beverage', 'Gaming', 'Home & Living', 'Services', 'Entertainment', 'Other'
];

function StatCard({ icon: Icon, label, value, color = 'emerald', sub }) {
  return (
    <div className={`p-4 rounded-2xl bg-${color}-500/5 border border-${color}-500/10`}>
      <Icon className={`w-5 h-5 text-${color}-400 mb-2`} />
      <p className="text-white font-black text-2xl">{value}</p>
      <p className="text-white/40 text-xs">{label}</p>
      {sub && <p className={`text-${color}-400 text-xs mt-1`}>{sub}</p>}
    </div>
  );
}

function CampaignCard({ campaign, brand, onAccept, onDecline, isPending }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Store className="w-6 h-6 text-emerald-400" />
            </div>
          )}
          <div>
            <h3 className="text-white font-bold text-base">{campaign.campaign_name}</h3>
            <p className="text-white/40 text-xs mt-0.5">by {brand?.company_name || 'Brand Partner'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold capitalize">
                {campaign.campaign_type?.replace('_', ' ') || 'Sponsored'}
              </span>
              {campaign.commission_rate && (
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  {campaign.commission_rate}% commission
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-emerald-400 font-black text-2xl">${campaign.payment_amount || 0}</p>
          <p className="text-white/30 text-xs">flat fee</p>
        </div>
      </div>

      <p className="text-white/60 text-sm mb-4 leading-relaxed">{campaign.description}</p>

      {campaign.requirements && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <p className="text-amber-400 text-xs font-bold mb-1 uppercase tracking-wider">Requirements</p>
          <p className="text-white/60 text-xs">{campaign.requirements}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Streams Required', value: campaign.streams_required || 1 },
          { label: 'Campaign Budget', value: `$${campaign.budget || 0}` },
          { label: 'Duration', value: `${campaign.duration_days || 30} days` },
        ].map(item => (
          <div key={item.label} className="text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-white font-bold text-sm">{item.value}</p>
            <p className="text-white/30 text-[10px]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onAccept} disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> Accept Campaign
        </button>
        <button onClick={onDecline} disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] font-semibold text-sm transition-all disabled:opacity-50">
          <XCircle className="w-4 h-4" /> Decline
        </button>
      </div>
    </motion.div>
  );
}

function ActiveCampaignCard({ campaign, brand }) {
  const progress = Math.min(100, ((campaign.streams_completed || 0) / (campaign.streams_required || 1)) * 100);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-white/[0.03] border border-emerald-500/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold">{campaign.campaign_name}</h3>
          <p className="text-white/40 text-xs mt-0.5">with {brand?.company_name || 'Brand Partner'}</p>
        </div>
        <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
          ACTIVE
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white/40 text-xs">Stream Progress</span>
          <span className="text-white text-xs font-semibold">
            {campaign.streams_completed || 0} / {campaign.streams_required || 1}
          </span>
        </div>
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Eye, label: 'Views', value: campaign.total_views || 0 },
          { icon: MousePointerClick, label: 'Clicks', value: campaign.total_clicks || 0 },
          { icon: Target, label: 'Sales', value: campaign.total_conversions || 0 },
          { icon: DollarSign, label: 'Earned', value: `$${campaign.payment_amount || 0}`, green: true },
        ].map(item => (
          <div key={item.label} className="text-center p-2.5 rounded-xl bg-white/[0.03]">
            <item.icon className={`w-3.5 h-3.5 ${item.green ? 'text-emerald-400' : 'text-white/30'} mx-auto mb-1`} />
            <p className={`font-bold text-sm ${item.green ? 'text-emerald-400' : 'text-white'}`}>{item.value}</p>
            <p className="text-white/30 text-[9px]">{item.label}</p>
          </div>
        ))}
      </div>

      <Link to={createPageUrl('AffiliateGoLive')}>
        <button className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-all">
          <Radio className="w-3.5 h-3.5" /> Go Live for This Campaign
        </button>
      </Link>
    </motion.div>
  );
}

const BRAND_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    period: 'month',
    color: '#10b981',
    features: [
      'Listed in Brand Marketplace',
      'Up to 3 creator partnerships/month',
      'Basic analytics dashboard',
      'Campaign management tools',
      'Standard support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 299,
    period: 'month',
    color: '#f5a623',
    badge: 'POPULAR',
    features: [
      'Featured placement in Brand Marketplace',
      'Unlimited creator partnerships',
      'Advanced analytics & reporting',
      'Priority creator matching',
      'Live stream product overlays',
      'Dedicated account manager',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    period: 'month',
    color: '#8b5cf6',
    features: [
      'Top-of-marketplace placement',
      'Exclusive creator partnerships',
      'Real-time campaign analytics',
      'White-label stream integration',
      'Custom commission structures',
      'API access',
      '24/7 priority support',
    ],
  },
];

function BrandSignupForm({ onClose }) {
  const [step, setStep]   = useState('tier'); // tier | details | success
  const [tier, setTier]   = useState(null);
  const [form, setForm]   = useState({
    company_name: '', website: '', category: '', description: '',
    contact_email: '', contact_name: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.company_name || !form.contact_email || !form.category || !tier) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      // Create Stripe checkout for the tier
      const result = await base44.functions.invoke('createBrandSubscription', {
        tier_id:       tier.id,
        tier_name:     tier.name,
        amount_usd:    tier.price,
        company_name:  form.company_name,
        website:       form.website,
        category:      form.category,
        description:   form.description,
        contact_email: form.contact_email,
        contact_name:  form.contact_name,
      });
      if (result?.data?.url) {
        window.location.href = result.data.url; // Stripe checkout
        return;
      }
      // Fallback: save application
      await base44.entities.BrandCampaign.create({
        campaign_name: `${form.company_name} — ${tier.name} Application`,
        description: form.description,
        budget: tier.price,
        status: 'pending_payment',
        campaign_type: 'brand_subscription',
        creator_id: 'pending_review',
      });
    } catch (e) {}
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-white font-black text-xl mb-2">Application Submitted!</h3>
        <p className="text-white/40 text-sm mb-6">We'll complete setup and connect you with creators within 24 hours.</p>
        <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm">Done</button>
      </div>
    );
  }

  if (step === 'tier') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-white font-black text-xl mb-1">Choose Your Plan</h3>
          <p className="text-white/40 text-sm">Select the advertising tier that fits your brand</p>
        </div>
        {BRAND_TIERS.map(t => (
          <button key={t.id} onClick={() => { setTier(t); setStep('details'); }}
            className="w-full p-4 rounded-2xl text-left ll-interactive transition-all"
            style={{ background: tier?.id===t.id ? `${t.color}15` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${tier?.id===t.id ? t.color+'60' : 'rgba(255,255,255,0.1)'}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-white font-black text-base">{t.name}</p>
                {t.badge && <span className="ll-pill text-[10px] font-black" style={{background:`${t.color}25`,border:`1px solid ${t.color}50`,color:t.color}}>{t.badge}</span>}
              </div>
              <div className="text-right">
                <span className="font-black text-xl" style={{color:t.color}}>${t.price}</span>
                <span className="text-white/30 text-xs">/{t.period}</span>
              </div>
            </div>
            <ul className="space-y-1">
              {t.features.map(f => <li key={f} className="text-white/50 text-xs flex items-center gap-1.5"><span style={{color:t.color}}>✓</span>{f}</li>)}
            </ul>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setStep('tier')} className="text-white/30 hover:text-white/60 ll-interactive">←</button>
        <div>
          <h3 className="text-white font-black text-xl mb-0.5">Brand Details</h3>
          <p className="text-white/40 text-sm">{tier?.name} plan · ${tier?.price}/{tier?.period}</p>
        </div>
      </div>

      {[
        { key: 'company_name', label: 'Company Name *', placeholder: 'Your brand name' },
        { key: 'website', label: 'Website', placeholder: 'https://yourbrand.com' },
        { key: 'contact_email', label: 'Contact Email *', placeholder: 'hello@yourbrand.com', type: 'email' },
        { key: 'budget', label: 'Monthly Budget ($)', placeholder: '1000', type: 'number' },
      ].map(field => (
        <div key={field.key}>
          <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">{field.label}</label>
          <input type={field.type || 'text'}
            value={form[field.key]}
            onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 placeholder:text-white/20"
          />
        </div>
      ))}

      <div>
        <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Category *</label>
        <select value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50">
          <option value="">Select category</option>
          {BRAND_CATEGORIES.map(cat => (
            <option key={cat} value={cat} className="bg-[#07090f]">{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Brand Description</label>
        <textarea value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Tell creators about your brand and products..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 placeholder:text-white/20 resize-none"
        />
      </div>

      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
        <p className="text-emerald-400 text-xs font-bold mb-2">What you get:</p>
        <div className="space-y-1.5">
          {[
            'Access to 1,000+ vetted live streaming creators',
            'Real-time performance analytics per creator',
            'Only pay commission on actual sales',
            'Live shopping integration on all streams',
            'Dedicated brand dashboard',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-white/60 text-xs">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-all">
          Cancel
        </button>
        <button onClick={handleSubmit}
          className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all">
          Submit Application
        </button>
      </div>
    </div>
  );
}

const TABS = ['pending', 'active', 'completed', 'for_brands'];

export default function BrandCampaigns() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [showBrandSignup, setShowBrandSignup] = useState(false);

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

  const brandMap = brands.reduce((acc, b) => { acc[b.id] = b; return acc; }, {});

  const respondMutation = useMutation({
    mutationFn: async ({ campaignId, status }) => {
      if (status === 'accepted') {
        const campaign = campaigns.find(c => c.id === campaignId);
        try {
          const result = await base44.functions.invoke('createCampaignCheckout', {
            campaignId,
            amount: campaign.payment_amount,
            campaignName: campaign.campaign_name
          });
          if (result.data?.url) window.location.href = result.data.url;
        } catch {
          await base44.entities.BrandCampaign.update(campaignId, { status: 'accepted' });
          toast.success('Campaign accepted!');
        }
        return;
      }
      return base44.entities.BrandCampaign.update(campaignId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
    }
  });

  const pending = campaigns.filter(c => c.status === 'pending');
  const active = campaigns.filter(c => c.status === 'active' || c.status === 'accepted');
  const completed = campaigns.filter(c => c.status === 'completed');
  const totalEarnings = campaigns.reduce((sum, c) =>
    sum + (c.status === 'completed' || c.status === 'active' ? c.payment_amount || 0 : 0), 0
  );

  return (
    <div className="min-h-screen bg-[#07090f] text-white pb-24">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#07090f]/98 backdrop-blur-xl border-b border-white/[0.05] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-base leading-none">Brand Campaigns</h1>
              <p className="text-white/30 text-[10px] leading-none mt-0.5">Sponsored partnerships</p>
            </div>
          </div>
          <button onClick={() => setShowBrandSignup(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all">
            <Store className="w-3.5 h-3.5" /> I'm a Brand
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Clock} label="Pending Offers" value={pending.length} color="amber" />
          <StatCard icon={Briefcase} label="Active" value={active.length} color="emerald" />
          <StatCard icon={CheckCircle} label="Completed" value={completed.length} color="blue" />
          <StatCard icon={DollarSign} label="Total Earned" value={`$${totalEarnings}`} color="emerald" sub="from campaigns" />
        </div>

        {/* Featured Brand Opportunities from Seeded Data */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black text-base">🔥 Hot Brand Opportunities</h2>
            <span className="text-white/30 text-xs">{getFeaturedBrands().length} available</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {getFeaturedBrands(8).map(brand => (
              <div key={brand.id} className="shrink-0 w-44 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${brand.color}22`, border: `1px solid ${brand.color}44` }}>
                    {brand.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-xs truncate">{brand.name}</p>
                    <p className="text-white/40 text-[10px] capitalize">{brand.category}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 font-black text-sm">{brand.commissionRate}%</span>
                  <span className="text-white/30 text-[10px]">commission</span>
                </div>
                <p className="text-white/50 text-[10px] leading-relaxed line-clamp-2 mb-2.5">{brand.tagline}</p>
                <div className="flex items-center gap-1 mb-2">
                  <Users className="w-2.5 h-2.5 text-white/30" />
                  <span className="text-white/30 text-[10px]">{brand.minFollowers.toLocaleString()}+ followers</span>
                </div>
                <button className="w-full py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{ background: `${brand.color}22`, color: brand.color, border: `1px solid ${brand.color}44` }}>
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Top Paying Brands */}
        <div>
          <h2 className="text-white font-black text-base mb-3">💰 Top Commission Rates</h2>
          <div className="space-y-2">
            {getTopPayingBrands(5).map((brand, i) => (
              <div key={brand.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 transition-all">
                <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <span className="text-amber-400 font-black text-xs">{i + 1}</span>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${brand.color}22` }}>
                  {brand.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{brand.name}</p>
                  <p className="text-white/40 text-[10px]">Avg order ${brand.avgOrderValue}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-emerald-400 font-black text-base">{brand.commissionRate}%</p>
                  <p className="text-white/30 text-[10px]">per sale</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'pending', label: 'Pending', count: pending.length },
            { id: 'active', label: 'Active', count: active.length },
            { id: 'completed', label: 'Completed', count: completed.length },
            { id: 'for_brands', label: 'For Brands', count: null },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
              }`}>
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Pending */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg mb-1">No pending offers</h3>
                <p className="text-white/30 text-sm">Brand campaign offers will appear here when brands invite you</p>
              </div>
            ) : pending.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign}
                brand={brandMap[campaign.brand_partner_id]}
                onAccept={() => respondMutation.mutate({ campaignId: campaign.id, status: 'accepted' })}
                onDecline={() => respondMutation.mutate({ campaignId: campaign.id, status: 'cancelled' })}
                isPending={respondMutation.isPending} />
            ))}
          </div>
        )}

        {/* Active */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {active.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30">No active campaigns</p>
              </div>
            ) : active.map(campaign => (
              <ActiveCampaignCard key={campaign.id} campaign={campaign}
                brand={brandMap[campaign.brand_partner_id]} />
            ))}
          </div>
        )}

        {/* Completed */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {completed.length === 0 ? (
              <div className="text-center py-20">
                <Award className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30">No completed campaigns yet</p>
              </div>
            ) : completed.map(campaign => (
              <motion.div key={campaign.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-5 rounded-2xl bg-white/[0.03] border border-blue-500/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold">{campaign.campaign_name}</h3>
                    <p className="text-white/40 text-xs mt-0.5">with {brandMap[campaign.brand_partner_id]?.company_name || 'Brand'}</p>
                  </div>
                  <span className="text-[10px] bg-blue-500/15 border border-blue-500/30 text-amber-400 px-2.5 py-1 rounded-full font-bold">COMPLETE</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Earned', value: `$${campaign.payment_amount || 0}`, green: true },
                    { label: 'Views', value: campaign.total_views || 0 },
                    { label: 'Clicks', value: campaign.total_clicks || 0 },
                    { label: 'Sales', value: campaign.total_conversions || 0 },
                  ].map(item => (
                    <div key={item.label} className="text-center p-2.5 rounded-xl bg-white/[0.03]">
                      <p className={`font-bold text-sm ${item.green ? 'text-emerald-400' : 'text-white'}`}>{item.value}</p>
                      <p className="text-white/30 text-[9px]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* For Brands */}
        {activeTab === 'for_brands' && (
          <div className="space-y-5">
            <div className="relative rounded-3xl overflow-hidden p-6"
              style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 60%, #0f172a 100%)' }}>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(16,185,129,0.2) 0%, transparent 60%)' }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">For Brands</span>
                </div>
                <h2 className="text-white font-black text-2xl mb-2">Reach Millions Through Live Commerce</h2>
                <p className="text-white/50 text-sm mb-5 max-w-md">
                  Partner with Legion Live creators to showcase your products in real-time live streams.
                  Pay only for results — commissions on actual sales.
                </p>
                <button onClick={() => setShowBrandSignup(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/30">
                  <Plus className="w-4 h-4" /> Apply as a Brand
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Users, title: '1,000+ Creators', desc: 'Vetted live streaming creators across all categories ready to promote your products', color: 'emerald' },
                { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track views, clicks, and conversions per creator in your brand dashboard live', color: 'blue' },
                { icon: Percent, title: 'Commission Only', desc: 'No upfront costs. Pay a percentage only when your products actually sell', color: 'amber' },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl bg-${item.color}-500/5 border border-${item.color}-500/10`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-400 mb-3`} />
                  <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-white/40 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <h3 className="text-white font-bold mb-4">How Brand Campaigns Work</h3>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Apply and Get Listed', desc: 'Submit your brand. We review and list your products in the marketplace within 24 hours.' },
                  { step: '02', title: 'Creators Apply to Promote', desc: 'Vetted creators browse your campaign and apply to promote your products on their streams.' },
                  { step: '03', title: 'Live Sales Happen', desc: 'Creators feature your products in live streams. Viewers buy directly through your affiliate link.' },
                  { step: '04', title: 'Pay Per Sale', desc: 'You pay the agreed commission only when a sale converts. Track everything in real time.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-emerald-500/30 font-black text-2xl leading-none shrink-0 w-8">{item.step}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{item.title}</p>
                      <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Brand Signup Modal */}
      <AnimatePresence>
        {showBrandSignup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowBrandSignup(false)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0f17] p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <BrandSignupForm onClose={() => setShowBrandSignup(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}