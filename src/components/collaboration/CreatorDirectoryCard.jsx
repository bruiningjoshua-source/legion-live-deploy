import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CreatorDirectoryCard({ creator, onCollabClick }) {
  const collaborationInterests = creator.collab_interests || [];
  const isAvailable = creator.availability_status === 'available';

  return (
    <Card className="bg-stone-800/50 border-amber-600/20 hover:border-amber-500/40 transition-colors overflow-hidden h-full flex flex-col">
      <CardContent className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5">
            <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">👤</div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-amber-100 font-bold">{creator.display_name}</h3>
            <p className="text-amber-400/70 text-xs">{creator.category}</p>
            {isAvailable && (
              <Badge className="bg-green-600/20 text-green-300 border-green-500/30 text-xs mt-1">
                Available for collab
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-stone-900/50 rounded p-2">
            <div className="flex items-center gap-1 text-amber-400">
              <Users className="w-3 h-3" />
              <span className="font-bold">{(creator.follower_count || 0).toLocaleString()}</span>
            </div>
            <div className="text-amber-400/60">Followers</div>
          </div>
          <div className="bg-stone-900/50 rounded p-2">
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp className="w-3 h-3" />
              <span className="font-bold">Lvl {creator.level || 1}</span>
            </div>
            <div className="text-amber-400/60">Creator</div>
          </div>
        </div>

        {/* Bio */}
        {creator.bio && <p className="text-amber-300/70 text-xs mb-3 line-clamp-2">{creator.bio}</p>}

        {/* Collaboration Interests */}
        {collaborationInterests.length > 0 && (
          <div className="mb-3">
            <p className="text-amber-300/60 text-xs font-semibold mb-1">Interested in:</p>
            <div className="flex flex-wrap gap-1">
              {collaborationInterests.slice(0, 3).map((interest, i) => (
                <Badge key={i} variant="outline" className="bg-stone-900/50 border-amber-600/20 text-amber-300 text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-amber-600/20 text-amber-300 hover:bg-amber-800/20"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              View
            </Button>
          </Link>
          <Button
            onClick={() => onCollabClick(creator)}
            size="sm"
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Heart className="w-3 h-3 mr-1" />
            Collab
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}