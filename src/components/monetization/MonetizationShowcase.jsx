import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Crown, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MonetizationShowcase() {
  const scenarios = [
    {
      title: "Solo Creator",
      earnings: "$2,500/month",
      streams: "10 streams/week",
      viewers: "500-1000 per stream",
      icon: Target,
      features: ["50/50 revenue share", "Gift transactions", "Subscriber bonuses"]
    },
    {
      title: "Active Creator",
      earnings: "$5,000+/month",
      streams: "15+ streams/week",
      viewers: "1000-3000 per stream",
      icon: Crown,
      features: ["60/40 revenue share", "Brand deals eligible", "Creator bonus pool"]
    },
    {
      title: "Top Creator",
      earnings: "$10,000+/month",
      streams: "Daily streams",
      viewers: "5000+ per stream",
      icon: TrendingUp,
      features: ["70/30 revenue share", "Priority deals", "Higher tier bonuses"]
    }
  ];

  const revenueStreams = [
    { name: "Gifts & Tips", percentage: 35, color: "from-pink-500 to-red-500" },
    { name: "Subscriptions", percentage: 30, color: "from-amber-500 to-orange-500" },
    { name: "Affiliate", percentage: 20, color: "from-blue-500 to-cyan-500" },
    { name: "Brand Deals", percentage: 15, color: "from-purple-500 to-indigo-500" }
  ];

  return (
    <div className="space-y-8">
      {/* Early Adopter Bonus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <Badge className="bg-amber-600 text-white border-0">EARLY ADOPTER BONUS</Badge>
            </div>
            <h3 className="text-2xl font-bold text-amber-100 mb-2">Join Now, Earn Instantly</h3>
            <p className="text-amber-200/80 mb-4">Limited-time offer for first 100 creators</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-100">
                <span className="text-2xl font-bold">$500</span>
                <span className="text-sm text-amber-400/70">credited when you go live</span>
              </div>
              <div className="text-sm text-amber-400/70">+ 2x earnings multiplier for first 7 days</div>
            </div>
          </div>
          <div className="text-5xl text-amber-400 opacity-20">⚡</div>
        </div>
      </motion.div>

      {/* Creator Tiers */}
      <div>
        <h3 className="text-xl font-bold text-amber-100 mb-4">Creator Earning Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scenario, i) => {
            const Icon = scenario.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-stone-800/50 border-amber-600/20 hover:border-amber-500/50 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-amber-400" />
                      <CardTitle className="text-amber-100">{scenario.title}</CardTitle>
                    </div>
                    <div className="text-3xl font-bold text-amber-300">{scenario.earnings}</div>
                    <p className="text-amber-400/70 text-sm mt-1">{scenario.streams}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-amber-400/70">{scenario.viewers}</div>
                    <div className="space-y-2">
                      {scenario.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-amber-100/80 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Revenue Streams */}
      <div>
        <h3 className="text-xl font-bold text-amber-100 mb-4">Multiple Revenue Streams</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {revenueStreams.map((stream, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-stone-800/50 border border-amber-600/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-100 font-semibold">{stream.name}</span>
                <Badge className={`bg-gradient-to-r ${stream.color} text-white border-0`}>
                  {stream.percentage}%
                </Badge>
              </div>
              <div className="w-full bg-stone-900/50 rounded-full h-2">
                <div
                  className={`bg-gradient-to-r ${stream.color} h-2 rounded-full transition-all`}
                  style={{ width: `${stream.percentage}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Daily Earning Potential */}
      <Card className="bg-stone-800/50 border-amber-600/20">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Daily Earning Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Average Live Session", value: "$150-300", time: "2-3 hours" },
              { label: "Gifts Received", value: "$50-200", time: "Per stream" },
              { label: "Subscription Income", value: "$30-100", time: "Daily recurring" },
              { label: "Affiliate Commissions", value: "$20-80", time: "When promoted" }
            ].map((item, i) => (
              <div key={i} className="bg-stone-900/50 rounded-lg p-3">
                <div className="text-amber-400/70 text-xs mb-1">{item.label}</div>
                <div className="text-xl font-bold text-amber-100">{item.value}</div>
                <div className="text-xs text-amber-400/60 mt-1">{item.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bonus Opportunities */}
      <div>
        <h3 className="text-xl font-bold text-amber-100 mb-4">Quick Bonus Opportunities</h3>
        <div className="space-y-3">
          {[
            { title: "First Live Stream", bonus: "+$100", desc: "Go live and start earning" },
            { title: "7-Day Streak", bonus: "+$250", desc: "Stream 7 days in a row" },
            { title: "Refer a Creator", bonus: "+$50 each", desc: "Get $50 per creator you bring" },
            { title: "Hit 1K Followers", bonus: "+$500", desc: "Reach follower milestone" },
            { title: "Music Video Uploads", bonus: "+$25 each", desc: "Upload music to Amphitheatre" },
            { title: "Brand Deal (Exclusive)", bonus: "+$500-2000", desc: "Partner with brands" }
          ].map((opp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between bg-stone-800/50 border border-amber-600/20 rounded-lg p-4 hover:border-amber-500/50 transition-colors"
            >
              <div>
                <h4 className="text-amber-100 font-semibold">{opp.title}</h4>
                <p className="text-amber-400/70 text-sm">{opp.desc}</p>
              </div>
              <Badge className="bg-green-600 text-white border-0 text-lg py-2 px-3">{opp.bonus}</Badge>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}