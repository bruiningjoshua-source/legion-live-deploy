import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  UserX, 
  MessageSquareOff, 
  MicOff, 
  VideoOff,
  Crown,
  Search,
  Users,
  Ban,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function ModerationPanel({ 
  isOpen, 
  onClose, 
  streamId,
  viewers = [],
  moderators = [],
  kickedUsers = [],
  chatMuted = false,
  onToggleChatMute,
  onAppointModerator,
  onRemoveModerator,
  onKickViewer,
  onResetKicks,
  onMuteViewerAudio,
  onEndViewerCamera,
  isHost = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('viewers');
  const queryClient = useQueryClient();

  const filteredViewers = viewers.filter(v => 
    v.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const appointModMutation = useMutation({
    mutationFn: async (viewer) => {
      // In production, this would update the stream's moderator list
      onAppointModerator?.(viewer);
      return viewer;
    },
    onSuccess: (viewer) => {
      toast.success(`${viewer.display_name || viewer.email} is now a moderator`);
    }
  });

  const removeModMutation = useMutation({
    mutationFn: async (mod) => {
      onRemoveModerator?.(mod);
      return mod;
    },
    onSuccess: (mod) => {
      toast.success(`Removed ${mod.display_name || mod.email} as moderator`);
    }
  });

  const kickMutation = useMutation({
    mutationFn: async (viewer) => {
      onKickViewer?.(viewer);
      return viewer;
    },
    onSuccess: (viewer) => {
      toast.success(`Kicked ${viewer.display_name || viewer.email} from stream`);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-stone-900 border-amber-600/30 max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-amber-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Moderation Tools
          </DialogTitle>
        </DialogHeader>

        {/* Global Controls */}
        <div className="bg-stone-800/50 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareOff className="w-4 h-4 text-amber-400" />
              <Label className="text-amber-200 text-sm">Mute All Chat</Label>
            </div>
            <Switch
              checked={chatMuted}
              onCheckedChange={onToggleChatMute}
            />
          </div>
          <p className="text-amber-400/60 text-xs">
            {chatMuted ? 'Chat is currently muted for all viewers' : 'Viewers can send messages'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-amber-600/20 pb-2">
          <Button
            size="sm"
            variant={selectedTab === 'viewers' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('viewers')}
            className={selectedTab === 'viewers' ? 'bg-amber-600' : 'text-amber-300'}
          >
            <Users className="w-4 h-4 mr-1" />
            Viewers ({viewers.length})
          </Button>
          <Button
            size="sm"
            variant={selectedTab === 'moderators' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('moderators')}
            className={selectedTab === 'moderators' ? 'bg-amber-600' : 'text-amber-300'}
          >
            <Crown className="w-4 h-4 mr-1" />
            Mods ({moderators.length})
          </Button>
          <Button
            size="sm"
            variant={selectedTab === 'kicked' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('kicked')}
            className={selectedTab === 'kicked' ? 'bg-amber-600' : 'text-amber-300'}
          >
            <Ban className="w-4 h-4 mr-1" />
            Kicked ({kickedUsers.length})
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-9 bg-stone-800 border-amber-600/20 text-amber-100"
          />
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <AnimatePresence mode="wait">
            {selectedTab === 'viewers' && (
              <motion.div
                key="viewers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {filteredViewers.length > 0 ? (
                  filteredViewers.map((viewer, i) => (
                    <ViewerItem
                      key={viewer.email || i}
                      viewer={viewer}
                      isHost={isHost}
                      isModerator={moderators.some(m => m.email === viewer.email)}
                      onAppoint={() => appointModMutation.mutate(viewer)}
                      onKick={() => kickMutation.mutate(viewer)}
                      onMuteAudio={() => onMuteViewerAudio?.(viewer)}
                      onEndCamera={() => onEndViewerCamera?.(viewer)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-amber-400/30 mx-auto mb-2" />
                    <p className="text-amber-400/60 text-sm">No viewers found</p>
                  </div>
                )}
              </motion.div>
            )}

            {selectedTab === 'moderators' && (
              <motion.div
                key="moderators"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {moderators.length > 0 ? (
                  moderators.map((mod, i) => (
                    <ModeratorItem
                      key={mod.email || i}
                      moderator={mod}
                      isHost={isHost}
                      onRemove={() => removeModMutation.mutate(mod)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Crown className="w-10 h-10 text-amber-400/30 mx-auto mb-2" />
                    <p className="text-amber-400/60 text-sm">No moderators appointed</p>
                    <p className="text-amber-400/40 text-xs mt-1">Appoint viewers as mods from the Viewers tab</p>
                  </div>
                )}
              </motion.div>
            )}

            {selectedTab === 'kicked' && (
              <motion.div
                key="kicked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {kickedUsers.length > 0 ? (
                  <>
                    {kickedUsers.map((user, i) => (
                      <KickedItem key={user.email || i} user={user} />
                    ))}
                    <Button
                      onClick={onResetKicks}
                      variant="outline"
                      className="w-full mt-4 border-amber-600/30 text-amber-300"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset All Kicks
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-green-400/30 mx-auto mb-2" />
                    <p className="text-amber-400/60 text-sm">No kicked users</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ViewerItem({ viewer, isHost, isModerator, onAppoint, onKick, onMuteAudio, onEndCamera }) {
  return (
    <div className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-600/30 flex items-center justify-center">
          {viewer.avatar_url ? (
            <img src={viewer.avatar_url} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-amber-200 text-sm">{viewer.display_name?.[0] || '?'}</span>
          )}
        </div>
        <div>
          <p className="text-amber-100 text-sm font-medium">{viewer.display_name || 'Anonymous'}</p>
          <p className="text-amber-400/60 text-xs">{viewer.email || 'Viewer'}</p>
        </div>
        {isModerator && (
          <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Mod
          </Badge>
        )}
      </div>
      
      {isHost && (
        <div className="flex items-center gap-1">
          {!isModerator && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onAppoint}
              className="w-7 h-7 text-purple-400 hover:bg-purple-800/20"
              title="Make Moderator"
            >
              <Crown className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={onMuteAudio}
            className="w-7 h-7 text-amber-400 hover:bg-amber-800/20"
            title="Mute Audio"
          >
            <MicOff className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEndCamera}
            className="w-7 h-7 text-amber-400 hover:bg-amber-800/20"
            title="End Camera"
          >
            <VideoOff className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onKick}
            className="w-7 h-7 text-red-400 hover:bg-red-800/20"
            title="Kick"
          >
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ModeratorItem({ moderator, isHost, onRemove }) {
  return (
    <div className="flex items-center justify-between p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center">
          {moderator.avatar_url ? (
            <img src={moderator.avatar_url} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-purple-200 text-sm">{moderator.display_name?.[0] || '?'}</span>
          )}
        </div>
        <div>
          <p className="text-amber-100 text-sm font-medium flex items-center gap-2">
            {moderator.display_name || 'Moderator'}
            <Crown className="w-3 h-3 text-purple-400" />
          </p>
          <p className="text-amber-400/60 text-xs">{moderator.email}</p>
        </div>
      </div>
      
      {isHost && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-red-400 hover:bg-red-800/20"
        >
          <XCircle className="w-4 h-4 mr-1" />
          Remove
        </Button>
      )}
    </div>
  );
}

function KickedItem({ user }) {
  return (
    <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-600/30 flex items-center justify-center">
          <Ban className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <p className="text-amber-100 text-sm font-medium">{user.display_name || 'User'}</p>
          <p className="text-amber-400/60 text-xs">{user.email}</p>
        </div>
      </div>
      <Badge className="bg-red-600/20 text-red-300 border-red-500/30 text-xs">
        Kicked
      </Badge>
    </div>
  );
}