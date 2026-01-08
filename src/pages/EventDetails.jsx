import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Users,
  ArrowLeft,
  Star,
  Gift,
  Swords
} from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

export default function EventDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }, null, 1).then(r => r[0]),
    enabled: !!eventId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-64 rounded-2xl bg-stone-800 mb-6" />
          <Skeleton className="h-48 rounded-2xl bg-stone-800" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-stone-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Event Not Found</h1>
          <Link to={createPageUrl('Events')}>
            <Button className="bg-amber-600 hover:bg-amber-700">
              View All Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startDate = event.start_date ? parseISO(event.start_date) : null;
  const endDate = event.end_date ? parseISO(event.end_date) : null;
  
  const isUpcoming = startDate && isAfter(startDate, now);
  const isActive = startDate && endDate && isBefore(startDate, now) && isAfter(endDate, now);

  const eventTypeIcons = {
    tournament: Swords,
    special_stream: Star,
    holiday: Gift,
    collab: Users,
    challenge: Trophy
  };

  const Icon = eventTypeIcons[event.event_type] || Trophy;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-16 pb-12">
      {/* Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {event.banner_url ? (
          <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-amber-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />
        
        <div className="absolute top-20 left-4">
          <Link to={createPageUrl('Events')}>
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <Badge className={`${isActive ? 'bg-green-500 animate-pulse' : isUpcoming ? 'bg-amber-500' : 'bg-stone-500'} text-white border-0 mb-4`}>
              {isActive ? '🔴 LIVE NOW' : isUpcoming ? 'UPCOMING' : 'ENDED'}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{event.title}</h1>
            <div className="flex items-center gap-4 text-white/80">
              <Badge variant="outline" className="border-white/30 capitalize">
                <Icon className="w-3 h-3 mr-1" />
                {event.event_type?.replace('_', ' ')}
              </Badge>
              {startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(startDate, 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Description */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardContent className="p-6">
            <p className="text-amber-100/90 text-lg leading-relaxed">
              {event.description}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schedule */}
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {startDate && (
                <div>
                  <p className="text-amber-400/60 text-sm">Starts</p>
                  <p className="text-amber-100 font-semibold">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-amber-300">{format(startDate, 'h:mm a')}</p>
                </div>
              )}
              {endDate && (
                <div>
                  <p className="text-amber-400/60 text-sm">Ends</p>
                  <p className="text-amber-100 font-semibold">{format(endDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-amber-300">{format(endDate, 'h:mm a')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prizes */}
          {event.prizes && event.prizes.length > 0 && (
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Prizes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.prizes.map((prize, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 rounded-xl border ${
                      prize.place === 1 ? 'bg-amber-900/30 border-amber-500/50' :
                      prize.place === 2 ? 'bg-stone-700/30 border-stone-500/50' :
                      'bg-amber-800/20 border-amber-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {prize.place === 1 ? '🥇' : prize.place === 2 ? '🥈' : '🥉'}
                        </span>
                        <div>
                          <p className="text-amber-100 font-medium">{prize.reward}</p>
                          {prize.denarii_value && (
                            <p className="text-amber-300 text-sm">🪙 {prize.denarii_value.toLocaleString()} Denarii</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Rules */}
        {event.rules && (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100">Rules & Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-100/80 whitespace-pre-wrap">{event.rules}</p>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        {isActive && (
          <div className="text-center py-6">
            <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-12 py-6 text-lg">
              Join Event Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}