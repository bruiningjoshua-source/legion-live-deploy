import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, DollarSign, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CollabProjectCard({ project }) {
  const collabTypeIcons = {
    stream: '📡',
    podcast: '🎙️',
    music_session: '🎵',
    gaming: '🎮',
    talk_show: '💬',
    project: '🎬'
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
            {project.thumbnail_url && (
              <img
                src={project.thumbnail_url}
                alt={project.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-amber-100 font-bold">{project.title}</h3>
                <Badge
                  className={
                    project.status === 'live'
                      ? 'bg-red-600 text-white animate-pulse'
                      : project.status === 'scheduled'
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-600 text-white'
                  }
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-amber-300/70 text-sm mb-2">{project.description}</p>
              <div className="flex items-center gap-2 text-amber-300/60 text-xs">
                <Users className="w-3 h-3" />
                <span>{project.creator_names?.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-stone-900/50 rounded-lg">
            <div className="flex items-center gap-2 text-amber-300/80 text-xs">
              <Eye className="w-4 h-4" />
              <span>{(project.total_viewers || 0).toLocaleString()} viewers</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300/80 text-xs">
              <DollarSign className="w-4 h-4" />
              <span>${(project.total_revenue_usd || 0).toFixed(0)}</span>
            </div>
            {project.scheduled_date && (
              <div className="flex items-center gap-2 text-amber-300/80 text-xs">
                <Calendar className="w-4 h-4" />
                <span>{new Date(project.scheduled_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {project.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="bg-stone-900/50 border-amber-600/20 text-amber-300">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}