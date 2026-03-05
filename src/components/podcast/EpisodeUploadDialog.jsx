import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2, FileAudio, Image, X } from 'lucide-react';
import { toast } from 'sonner';

export default function EpisodeUploadDialog({ open, onOpenChange, podcast, creatorId, editEpisode = null }) {
  const queryClient = useQueryClient();
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: editEpisode?.title || '',
    description: editEpisode?.description || '',
    show_notes: editEpisode?.show_notes || '',
    audio_url: editEpisode?.audio_url || '',
    cover_art_url: editEpisode?.cover_art_url || '',
    season_number: editEpisode?.season_number || 1,
    episode_number: editEpisode?.episode_number || (podcast?.total_episodes || 0) + 1,
    is_explicit: editEpisode?.is_explicit || false,
    is_published: editEpisode?.is_published || false,
    guests: editEpisode?.guests?.join(', ') || '',
    tags: editEpisode?.tags?.join(', ') || '',
    duration_seconds: editEpisode?.duration_seconds || 0,
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    update('audio_url', result.file_url);

    // Try to get duration
    const audio = new Audio(result.file_url);
    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && isFinite(audio.duration)) {
        update('duration_seconds', Math.round(audio.duration));
      }
    });
    setUploading(false);
    toast.success('Audio uploaded');
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await base44.integrations.Core.UploadFile({ file });
    update('cover_art_url', result.file_url);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        podcast_id: podcast.id,
        creator_id: creatorId,
        title: form.title.trim(),
        description: form.description.trim(),
        show_notes: form.show_notes.trim(),
        audio_url: form.audio_url,
        cover_art_url: form.cover_art_url || podcast.cover_art_url || '',
        season_number: Number(form.season_number) || 1,
        episode_number: Number(form.episode_number) || 1,
        is_explicit: form.is_explicit,
        is_published: form.is_published,
        duration_seconds: form.duration_seconds,
        guests: form.guests ? form.guests.split(',').map(g => g.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (editEpisode) {
        await base44.entities.PodcastEpisode.update(editEpisode.id, data);
      } else {
        await base44.entities.PodcastEpisode.create(data);
        // Update podcast episode count
        await base44.entities.Podcast.update(podcast.id, {
          total_episodes: (podcast.total_episodes || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['my-podcasts'] });
      onOpenChange(false);
      toast.success(editEpisode ? 'Episode updated!' : 'Episode created!');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-stone-900 border-amber-600/30 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-100">
            {editEpisode ? 'Edit Episode' : 'Upload New Episode'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Audio Upload */}
          <div>
            <Label className="text-amber-200 mb-2 block">Audio File *</Label>
            {form.audio_url ? (
              <div className="flex items-center gap-2 p-3 bg-stone-800 rounded-lg border border-green-500/30">
                <FileAudio className="w-5 h-5 text-green-400" />
                <span className="text-green-300 text-sm flex-1 truncate">{form.audio_url.split('/').pop()}</span>
                <button onClick={() => update('audio_url', '')} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => audioInputRef.current?.click()}
                disabled={uploading}
                className="w-full p-6 border-2 border-dashed border-amber-600/30 rounded-lg text-center hover:border-amber-500/50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                    <p className="text-amber-400/70 text-sm">Click to upload MP3, WAV, M4A, etc.</p>
                  </>
                )}
              </button>
            )}
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
          </div>

          {/* Title */}
          <div>
            <Label className="text-amber-200">Episode Title *</Label>
            <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Episode title..." className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-amber-200">Description</Label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="What's this episode about?" className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" rows={3} />
          </div>

          {/* Show Notes */}
          <div>
            <Label className="text-amber-200">Show Notes / Timestamps</Label>
            <Textarea value={form.show_notes} onChange={e => update('show_notes', e.target.value)} placeholder="00:00 - Introduction&#10;05:30 - Main Topic..." className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1 font-mono text-xs" rows={4} />
          </div>

          {/* Season / Episode Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-amber-200">Season #</Label>
              <Input type="number" min={1} value={form.season_number} onChange={e => update('season_number', e.target.value)} className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" />
            </div>
            <div>
              <Label className="text-amber-200">Episode #</Label>
              <Input type="number" min={1} value={form.episode_number} onChange={e => update('episode_number', e.target.value)} className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" />
            </div>
          </div>

          {/* Cover Art */}
          <div>
            <Label className="text-amber-200">Episode Cover Art</Label>
            <div className="flex items-center gap-3 mt-1">
              {form.cover_art_url ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <img src={form.cover_art_url} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => update('cover_art_url', '')} className="absolute top-0 right-0 bg-black/60 rounded-bl-lg p-1 text-white"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button onClick={() => coverInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-amber-600/30 rounded-lg flex items-center justify-center hover:border-amber-500/50">
                  <Image className="w-5 h-5 text-amber-400/50" />
                </button>
              )}
              <p className="text-amber-400/50 text-xs">Falls back to podcast cover if empty</p>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </div>

          {/* Guests */}
          <div>
            <Label className="text-amber-200">Guests (comma-separated)</Label>
            <Input value={form.guests} onChange={e => update('guests', e.target.value)} placeholder="John Doe, Jane Smith" className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-amber-200">Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="tech, interview, deep-dive" className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" />
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <Label className="text-amber-200">Explicit Content</Label>
            <Switch checked={form.is_explicit} onCheckedChange={v => update('is_explicit', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-amber-200">Publish Immediately</Label>
            <Switch checked={form.is_published} onCheckedChange={v => update('is_published', v)} />
          </div>

          {/* Submit */}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!form.title.trim() || !form.audio_url || saveMutation.isPending}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editEpisode ? 'Save Changes' : form.is_published ? 'Publish Episode' : 'Save as Draft'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}