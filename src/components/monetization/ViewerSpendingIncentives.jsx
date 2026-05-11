import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ViewerSpendingIncentives({ userSpending = 0 }) {
  const [selectedGoal, setSelectedGoal] = useState(50);

  const spendingTiers = [
    { threshold: 10, rewards: 200, perks: ["Custom chat badge", "5% tip discount"] },
    { threshold: 50, rewards: 1000, perks: ["VIP viewer status", "10% tip discount", "Early access to content"] },
    { threshold: 100, rewards: 2500, perks: ["Permanent VIP badge", "20% tip discount", "Private messages", "Creator priority support"] },
    { threshold: 250, rewards: 6000, perks: ["Platinum VIP", "Free music access", "30% all discounts", "Exclusive streams"] }
  ];

  const remainingToGoal = Math.max(0, selectedGoal - userSpending);

  return (
    <div className="space-y-6">
      {/* Current Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6"
      >
        <h3 className="text-amber-100 font-bold text-lg mb-4">Your Spending Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-3xl font-bold text-amber-300">${userSpending.toFixed(2)}</div>
            <div className="text-amber-400/70 text-sm">Spent This Month</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">${(selectedGoal - userSpending).toFixed(2)}</div>
            <div className="text-amber-400/70 text-sm">To Next Tier</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">{Math.floor((userSpending / selectedGoal) * 100)}%</div>
            <div className="text-amber-400/70 text-sm">Goal Progress</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">1250</div>
            <div className="text-amber-400/70 text-sm">Rewards Earned</div>
          </div>
        </div>
        <div className="mt-4 w-full bg-stone-900 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (userSpending / selectedGoal) * 100)}%` }}
            transition={{ duration: 1 }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full"
          />
        </div>
      </motion.div>

      {/* Tier Selection */}
      <div>
        <h3 className="text-amber-100 font-bold text-lg mb-4">Spending Tiers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {spendingTiers.map((tier, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedGoal(tier.threshold)}
              className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                selectedGoal === tier.threshold
                  ? 'border-amber-400 bg-amber-500/20'
                  : 'border-amber-600/20 bg-stone-800/50 hover:border-amber-500/50'
              }`}
            >
              <div className="font-bold text-amber-100">${tier.threshold}</div>
              <div className="text-sm text-amber-400/70">{tier.rewards} rewards</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Selected Tier Benefits */}
      {spendingTiers.map((tier, i) => {
        if (tier.threshold !== selectedGoal) return null;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-800/50 border border-amber-600/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-bold text-amber-100">Tier ${tier.threshold} Rewards</h4>
              <Badge className="bg-green-600 text-white border-0">+{tier.rewards} Points</Badge>
            </div>
            <div className="space-y-2 mb-4">
              {tier.perks.map((perk, idx) => (
                <div key={idx} className="flex items-center gap-2 text-amber-100">
                  <Zap className="w-4 h-4 text-amber-400" />
                  {perk}
                </div>
              ))}
            </div>
            <div className="bg-stone-900/50 rounded-lg p-3">
              <div className="text-amber-400/70 text-sm mb-2">Only ${remainingToGoal.toFixed(2)} away</div>
              <div className="w-full bg-stone-800 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(userSpending / tier.threshold) * 100}%` }}
                  transition={{ duration: 1 }}
                  className="bg-green-500 h-2 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Limited Time Offers */}
      <div>
        <h3 className="text-amber-100 font-bold text-lg mb-4">⏰ Limited Time Offers (This Week)</h3>
        <div className="space-y-3">
          {[
            { title: "2x Rewards on Gifts", desc: "Double points on all gifts sent", expires: "3 days" },
            { title: "50% Bonus Denarii", desc: "Get 50% more coins when you buy", expires: "2 days" },
            { title: "Free VIP Trial", desc: "Try VIP for 7 days free", expires: "5 days" }
          ].map((offer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-4"
            >
              <div>
                <h4 className="text-white font-semibold">{offer.title}</h4>
                <p className="text-amber-400/70 text-sm">{offer.desc}</p>
              </div>
              <Badge className="bg-red-600 text-white border-0 text-xs">Expires in {offer.expires}</Badge>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}