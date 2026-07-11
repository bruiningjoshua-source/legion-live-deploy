import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PayoutForecast from '@/components/earnings/PayoutForecast';

/**
 * Creator Payout Forecast Page
 * Full-page view with detailed projections and financial planning tools
 */

export default function CreatorPayoutForecast() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const downloadForecast = async () => {
    const response = await base44.functions.invoke('forecastCreatorPayouts', {});
    const forecast = response.data.forecast;
    
    const csv = [
      ['30-Day Payout Forecast', ''],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['SUMMARY', ''],
      ['Total Projected Payout', `$${forecast.totalProjectedUsd}`],
      ['Daily Average', `$${(parseFloat(forecast.totalProjectedUsd) / 30).toFixed(2)}`],
      ['Withdrawal Limit', forecast.withdrawalLimit || 'N/A'],
      ['Revenue Share', forecast.revenueShare],
      [''],
      ['REVENUE BREAKDOWN', ''],
      ['Subscriptions', `$${forecast.breakdown.subscriptions}`],
      ['Tips & Gifts', `$${forecast.breakdown.tips}`],
      ['Video Ad Share', `$${forecast.breakdown.videoAdShare}`],
      ['Music Royalties', `$${forecast.breakdown.musicRoyalties}`],
      ['Referral Bonuses', `$${forecast.breakdown.referralBonuses}`],
      [''],
      ['GROWTH TRENDS (vs Last Month)', ''],
      ['Subscription Growth', forecast.trends.subscriptionGrowth],
      ['Tipping Growth', forecast.trends.tippingGrowth],
      ['Ad Growth', forecast.trends.adGrowth],
      [''],
      ['DAILY PROJECTION', 'Date', 'Daily Projected', 'Cumulative'],
      ...forecast.dailyProjection.map(d => [d.day, d.date, `$${d.projectedUsd.toFixed(2)}`, `$${d.cumulativeUsd.toFixed(2)}`])
    ];

    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout_forecast_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">30-Day Payout Forecast</h1>
          <p className="text-gray-400">Plan your finances with AI-powered revenue projections</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Button 
            onClick={downloadForecast}
            className="gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
          <Button 
            variant="outline"
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            View Detailed Analytics
          </Button>
        </div>

        {/* Forecast Dashboard */}
        <PayoutForecast />

        {/* Info Box */}
        <div className="mt-12 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 max-w-2xl">
          <h3 className="font-bold text-blue-300 mb-2">💡 How This Forecast Works</h3>
          <ul className="text-sm text-blue-200/70 space-y-1">
            <li>• Analyzes 60 days of historical data (subscriptions, tips, ad revenue)</li>
            <li>• Applies growth trends to project next 30 days</li>
            <li>• Includes all revenue streams: subs, tips, video ads, music royalties, referrals</li>
            <li>• Accounts for your current {user?.role || 'creator'} tier and revenue share</li>
            <li>• Updates hourly as new data comes in</li>
          </ul>
        </div>
      </div>
    </div>
  );
}