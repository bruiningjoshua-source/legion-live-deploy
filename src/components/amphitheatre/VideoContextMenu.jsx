import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, BookmarkPlus, Download, Share2, ListPlus } from 'lucide-react';

export default function VideoContextMenu({ video, onAddToWatchLater, onAddToPlaylist, onDownload, onShare }) {
  const [open, setOpen] = useState(false);

  const handleShare = () => {
    onShare?.(video);
    setOpen(false);
  };

  const handleWatchLater = () => {
    onAddToWatchLater?.(video);
    setOpen(false);
  };

  const handlePlaylist = () => {
    onAddToPlaylist?.(video);
    setOpen(false);
  };

  const handleDownload = () => {
    onDownload?.(video);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="shrink-0 w-7 h-7 flex items-center justify-center text-white/30 hover:text-white transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1e] border-white/[0.1]">
        <DropdownMenuItem onClick={handleWatchLater} className="flex items-center gap-2 text-white/80 hover:text-white cursor-pointer">
          <BookmarkPlus className="w-4 h-4" />
          <span>Watch Later</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handlePlaylist} className="flex items-center gap-2 text-white/80 hover:text-white cursor-pointer">
          <ListPlus className="w-4 h-4" />
          <span>Add to Playlist</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/[0.1]" />

        <DropdownMenuItem onClick={handleDownload} className="flex items-center gap-2 text-white/80 hover:text-white cursor-pointer">
          <Download className="w-4 h-4" />
          <span>Download</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/[0.1]" />

        <DropdownMenuItem onClick={handleShare} className="flex items-center gap-2 text-white/80 hover:text-white cursor-pointer">
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}