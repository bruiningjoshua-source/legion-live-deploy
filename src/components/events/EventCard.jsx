import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, ArrowRight, Coins } from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const TYPE_META = {
  tournament:     { icon: '⚔️', gradient: 'from-red-900 to-orange-900',    border: 'border-red-500/20',    label: 'Tournament'    },
  special_stream: { icon: '🎬', gradient: 'from-purple-900 to-pink-900',   border: 'border-purple-500/20', label: 'Special Stream' },
  holiday:        { icon: '🎉', gradient: 'from-green-900 to-emerald-900', border: 'border-green-500/20',  label: 'Holiday'       },
  collab:         { icon: '🤝', gradient: 'from-blue-900 to-cyan-900',     border: 'border-blue-500/20',   label: 'Collab'        },
  challenge:      { icon: '🏆', gradient: 'from-amber-900 to-yellow-900',  border: 'border-amber-500/20',  label: 'Challenge'     },
};

const DEFAULT_META = { icon: '🎭', gradient: 'from-stone-800 to-stone-900', border: 'border-white/10', label: 'Event' };

function StatusBadge({ start, end }) {
  const now = new Date();
  const isActive   = start && end  && isBefore(start, now) && isAfter(end, now);
  const isUpcoming = start && isAfter(start, now);
  const isEnded    = end   && isBefore(end, now);

  if (isActive)   return <Badge className="bg-green-500/90 text-white border-0 text-[10px] font-bold tracking-wide flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE</Badge>;
  if (isUpcoming) return <Badge className="bg-amber-500/80 text-white border-0 text-[10px] font-bold tracking-wide">UPCOMING</Badge>;
  if (isEnded)    return <Badge className="bg-white/10 text-white/50 border-0 text-[10px] font-semibold">ENDED</Badge>;
  return null;
}

export default function EventCard({ event }) {
  const meta      = TYPE_META[event.event_type] || DEFAULT_META;
  const startDate = event.start_date ? parseISO(event.start_date) : null;
  const endDate   = event.end_date   ? parseISO(event.end_date)   : null;
  const topPrize  = event.prizes?.[0];
  const totalPool = event.prizes?.reduce((s, p) => s + (p.denarii_value || 0), 0) || 0;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${meta.gradient} border ${meta.border} shadow-xl flex flex-col h-full`}>

        {/* ── Banner ── */}
        <div className="relative h-44 overflow-hidden flex-shrink-0">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl opacity-20 select-none">{meta.icon}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <StatusBadge start={startDate} end={endDate} />
            <Badge variant="outline" className="bg-black/40 backdrop-blur text-white/70 border-white/15 text-[10px] capitalize">
              {meta.label}
            </Badge>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h3 className="text-white font-bold text-lg leading-snug line-clamp-2">{event.title}</h3>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 p-4 bg-black/40 backdrop-blur-sm gap-3">
          {event.description && (
            <p className="text-white/60 text-sm leading-relaxed line-clamp-2">{event.description}</p>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap gap-3 text-xs text-white/50">
            {startDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-white/30" />
                {format(startDate, 'MMM d, yyyy')}
              </span>
            )}
            {startDate && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                {format(startDate, 'h:mm a')}
              </span>
            )}
            {event.participating_creators?.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-white/30" />
                {event.participating_creators.length} competing
              </span>
            )}
          </div>

          {/* Prize pool */}
          {totalPool > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-amber-300 font-bold text-sm leading-none">
                  {totalPool.toLocaleString()} Denarii
                </p>
                <p className="text-amber-400/50 text-[10px] mt-0.5">Total prize pool</p>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-auto pt-1">
            <Link to={createPageUrl(`EventDetails?id=${event.id}`)}>
              <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl h-9 text-sm font-medium transition-colors">
                View Details
                <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}