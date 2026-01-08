import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Trophy, Clock, ArrowRight } from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const eventTypeIcons = {
  tournament: '⚔️',
  special_stream: '🎬',
  holiday: '🎉',
  collab: '🤝',
  challenge: '🏆'
};

const eventTypeColors = {
  tournament: 'from-red-600 to-orange-600',
  special_stream: 'from-purple-600 to-pink-600',
  holiday: 'from-green-600 to-emerald-600',
  collab: 'from-blue-600 to-cyan-600',
  challenge: 'from-amber-600 to-yellow-600'
};

export default function EventCard({ event }) {
  const now = new Date();
  const startDate = event.start_date ? parseISO(event.start_date) : null;
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  
  const isUpcoming = startDate && isAfter(startDate, now);
  const isActive = startDate && endDate && isBefore(startDate, now) && isAfter(endDate, now);
  const isEnded = endDate && isBefore(endDate, now);

  const getStatus = () => {
    if (isActive) return { label: 'LIVE NOW', color: 'bg-green-500', pulse: true };
    if (isUpcoming) return { label: 'UPCOMING', color: 'bg-amber-500', pulse: false };
    if (isEnded) return { label: 'ENDED', color: 'bg-stone-500', pulse: false };
    return { label: 'TBA', color: 'bg-stone-600', pulse: false };
  };

  const status = getStatus();

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`overflow-hidden bg-gradient-to-br ${eventTypeColors[event.event_type] || 'from-stone-700 to-stone-800'} border-0 shadow-xl`}>
        {/* Banner */}
        <div className="relative h-40 overflow-hidden">
          {event.banner_url ? (
            <img 
              src={event.banner_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl opacity-30">{eventTypeIcons[event.event_type] || '🎭'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge className={`${status.color} text-white border-0 ${status.pulse ? 'animate-pulse' : ''}`}>
              {status.label}
            </Badge>
          </div>

          {/* Event Type */}
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="bg-black/40 text-white border-white/20 capitalize">
              {event.event_type?.replace('_', ' ')}
            </Badge>
          </div>

          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-xl">{event.title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 bg-stone-900/80 backdrop-blur">
          {/* Description */}
          <p className="text-amber-100/80 text-sm line-clamp-2 mb-4">
            {event.description || 'Join this exciting event and compete for glory!'}
          </p>

          {/* Date & Time */}
          <div className="flex items-center gap-4 text-sm mb-4">
            {startDate && (
              <div className="flex items-center gap-1.5 text-amber-300">
                <Calendar className="w-4 h-4" />
                <span>{format(startDate, 'MMM d, yyyy')}</span>
              </div>
            )}
            {startDate && (
              <div className="flex items-center gap-1.5 text-amber-300/70">
                <Clock className="w-4 h-4" />
                <span>{format(startDate, 'h:mm a')}</span>
              </div>
            )}
          </div>

          {/* Prizes Preview */}
          {event.prizes && event.prizes.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-sm">
                Prizes up to {event.prizes[0]?.denarii_value?.toLocaleString() || '???'} Denarii
              </span>
            </div>
          )}

          {/* Participants */}
          {event.participating_creators && event.participating_creators.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300/70 text-sm">
                {event.participating_creators.length} Creator{event.participating_creators.length > 1 ? 's' : ''} participating
              </span>
            </div>
          )}

          {/* Action Button */}
          <Link to={createPageUrl(`EventDetails?id=${event.id}`)}>
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20">
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}