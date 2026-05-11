import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Scissors, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ClipButton({ streamId, creatorId, user, videoUrl }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const clipMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Clip.create({
        creator_id: creatorId,
        clipper_email: user.email,
        stream_id: streamId,
        title: title || `Clip from ${new Date().toLocaleTimeString()}`,
        clip_url: videoUrl,
        duration_seconds: 30
      });

      // Notify creator
      await base44.entities.Notification.create({
        user_email: creatorId,
        type: 'milestone',
        title: 'New Clip Created',
        message: `${user.full_name} clipped your stream: "${title}"`,
        from_user_email: user.email,
        from_user_name: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success('Clip created!');
      setOpen(false);
      setTitle('');
    }
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-400 hover:text-amber-300 hover:bg-amber-600/20"
        >
          <Scissors className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-stone-900 border-amber-600/30">
        <DialogHeader>
          <DialogTitle className="text-amber-100">Create Clip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Input
            placeholder="Give your clip a title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-stone-800 border-amber-600/30 text-amber-100"
          />
          <p className="text-amber-400/70 text-sm">
            This will capture the last 30 seconds of the stream.
          </p>
          <Button
            onClick={() => clipMutation.mutate()}
            disabled={clipMutation.isPending}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {clipMutation.isPending ? 'Creating...' : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Clip
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}