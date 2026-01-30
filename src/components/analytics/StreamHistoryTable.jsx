import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Eye, Clock, Gift, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function StreamHistoryTable({ streams = [] }) {
  if (streams.length === 0) {
    return (
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardContent className="p-8 text-center">
          <Video className="w-12 h-12 text-amber-400/30 mx-auto mb-3" />
          <p className="text-amber-400/70">No stream history yet</p>
          <p className="text-amber-400/50 text-sm">Your past streams will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-stone-800/30 border-amber-600/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Video className="w-5 h-5 text-amber-400" />
          Stream History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {streams.map((stream, i) => (
              <motion.div
                key={stream.id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-stone-900/50 rounded-xl p-4 border border-white/5 hover:border-amber-600/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 aspect-video bg-stone-800 rounded-lg overflow-hidden flex-shrink-0">
                    {stream.thumbnail_url ? (
                      <img src={stream.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-amber-400/30" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-100 font-semibold truncate">{stream.title || 'Untitled Stream'}</p>
                    <p className="text-amber-400/50 text-xs mb-2">
                      {stream.created_date ? format(new Date(stream.created_date), 'MMM d, yyyy • h:mm a') : 'Unknown date'}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-1 text-blue-400">
                        <Eye className="w-3 h-3" />
                        <span>{(stream.peak_viewers || 0).toLocaleString()} peak</span>
                      </div>
                      <div className="flex items-center gap-1 text-purple-400">
                        <Clock className="w-3 h-3" />
                        <span>{stream.stream_duration_minutes || 0}m</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Gift className="w-3 h-3" />
                        <span>{(stream.total_gift_value_denarii || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-400">
                        <MessageSquare className="w-3 h-3" />
                        <span>{(stream.chat_messages || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance Indicator */}
                  <div className="flex-shrink-0">
                    {stream.engagement_rate >= 15 ? (
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                    ) : stream.engagement_rate >= 8 ? (
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-700/50 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-stone-500" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}