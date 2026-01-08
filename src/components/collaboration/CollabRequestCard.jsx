import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function CollabRequestCard({ request, onAccept, onReject, isProcessing }) {
  const collabTypeIcons = {
    stream: '📡',
    podcast: '🎙️',
    music_session: '🎵',
    gaming: '🎮',
    talk_show: '💬',
    project: '🎬',
    other: '✨'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="bg-stone-800/50 border-amber-600/20 hover:border-amber-500/40 transition-colors overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <span className="text-4xl">{collabTypeIcons[request.collab_type]}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-amber-100 font-bold text-lg">{request.title}</h3>
                <Badge className="bg-blue-600 text-white">{request.collab_type}</Badge>
              </div>
              <p className="text-amber-300/70 text-sm mb-3">{request.requester_name} wants to collaborate</p>
              <p className="text-amber-300/60 text-sm line-clamp-2">{request.description}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-3 my-4 p-3 bg-stone-900/50 rounded-lg">
            {request.proposed_date && (
              <div className="flex items-center gap-2 text-amber-300/80 text-xs">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(request.proposed_date), 'MMM d, h:mm a')}</span>
              </div>
            )}
            {request.duration_minutes && (
              <div className="flex items-center gap-2 text-amber-300/80 text-xs">
                <Users className="w-4 h-4" />
                <span>{request.duration_minutes} minutes</span>
              </div>
            )}
            {request.revenue_split_percent && (
              <div className="flex items-center gap-2 text-amber-300/80 text-xs">
                <DollarSign className="w-4 h-4" />
                <span>{request.revenue_split_percent}% split</span>
              </div>
            )}
          </div>

          {/* Personal Message */}
          {request.message && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
              <p className="text-blue-200 text-sm italic">"{request.message}"</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onAccept}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button
              onClick={onReject}
              disabled={isProcessing}
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-900/20"
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}