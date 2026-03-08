import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, BookmarkIcon, Share2, Download, Flag, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function VideoContextMenu({ video, onAddToPlaylist }) {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/watch?id=${video.id}`;
    if (navigator.share) {
      navigator.share({ title: video.title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleSaveToLater = async () => {
    if (!user?.email) {
      toast.error('Sign in to save videos');
      return;
    }
    
    await base44.entities.WatchLater.create({
      user_email: user.email,
      video_id: video.id,
      video_title: video.title
    });
    toast.success('Added to Watch Later');
  };

  const handleReport = async () => {
    if (!user?.email) {
      toast.error('Sign in to report videos');
      return;
    }

    await base44.entities.ModerationAlert.create({
      reporter_email: user.email,
      content_id: video.id,
      content_type: 'video',
      reason: 'user_flagged',
      status: 'pending'
    });
    toast.success('Report submitted');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4 text-white/70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-stone-900 border-stone-700 w-48">
        <DropdownMenuItem onClick={handleSaveToLater} className="text-stone-200 cursor-pointer">
          <Clock className="w-4 h-4 mr-2" />
          Save to Watch Later
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddToPlaylist} className="text-stone-200 cursor-pointer">
          <BookmarkIcon className="w-4 h-4 mr-2" />
          Save to Playlist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} className="text-stone-200 cursor-pointer">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem className="text-stone-200 cursor-pointer">
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-stone-700" />
        <DropdownMenuItem onClick={handleReport} className="text-red-400 cursor-pointer">
          <Flag className="w-4 h-4 mr-2" />
          Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}