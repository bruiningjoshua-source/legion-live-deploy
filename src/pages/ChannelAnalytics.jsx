import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

export default function ChannelAnalytics() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-amber-100">Channel Analytics</h1>
            <p className="text-amber-400/70">Detailed channel performance metrics</p>
          </div>
        </div>

        <div className="bg-stone-800/30 border border-amber-600/20 rounded-xl p-8 text-center">
          <p className="text-amber-400/70 mb-4">Comprehensive channel analytics are coming soon.</p>
          <p className="text-amber-300/60 mb-6">In the meantime, visit your Creator Analytics page for detailed performance data.</p>
          <Button 
            onClick={() => navigate(createPageUrl('CreatorAnalytics'))}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Go to Creator Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}