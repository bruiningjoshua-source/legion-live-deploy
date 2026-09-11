import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Edit, 
  Camera, 
  Crown, 
  Link as LinkIcon,
  ImagePlus,
  MapPin,
  Send,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';

const categories = [
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'talk_show', label: 'Talk Show' },
  { value: 'dance', label: 'Dance' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'education', label: 'Education' },
  { value: 'art', label: 'Art' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'other', label: 'Other' }
];

export default function Profile() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [postBody, setPostBody] = useState('');
  const [postVisibility, setPostVisibility] = useState('public');
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: creator, isLoading } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: pastStreams = [] } = useQuery({
    queryKey: ['my-past-streams', creator?.id],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creator.id, status: 'ended' }, '-created_date', 20),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: myVideos = [] } = useQuery({
    queryKey: ['my-videos', creator?.id],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['my-followers', creator?.id],
    queryFn: () => base44.entities.Follow.filter({ following_creator_id: creator.id }, '-created_date', 100),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: profilePosts = [] } = useQuery({
    queryKey: ['profile-posts', creator?.id],
    queryFn: () => base44.entities.ProfilePost.filter({ creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id,
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (creator) {
        return base44.entities.Creator.update(creator.id, data);
      } else {
        return base44.entities.Creator.create({
          user_email: user.email,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-creator'] });
      setIsEditing(false);
      toast.success('Profile updated');
    }
  });

  const handleEdit = () => {
    setEditData({
      display_name: creator?.display_name || user?.full_name || '',
      bio: creator?.bio || '',
      category: creator?.category || '',
      social_links: creator?.social_links || {},
      location_label: creator?.location_label || '',
      location_visible: creator?.location_visible || false
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image'); return; }
    setUploadingAvatar(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (!result?.file_url) throw new Error('No URL returned');
      updateMutation.mutate({ avatar_url: result.file_url });
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image'); return; }
    setUploadingBanner(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (!result?.file_url) throw new Error('No URL returned');
      updateMutation.mutate({ banner_url: result.file_url });
      toast.success('Banner updated');
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter(file => file.type.startsWith('image/'));
    const availableSlots = 6 - (creator?.gallery_urls?.length || 0);
    if (!files.length) return;
    if (availableSlots <= 0) { toast.error('Your profile gallery can contain up to 6 photos.'); return; }
    setUploadingGallery(true);
    try {
      const uploads = await Promise.all(files.slice(0, availableSlots).map(file => base44.integrations.Core.UploadFile({ file })));
      const gallery_urls = [...(creator?.gallery_urls || []), ...uploads.map(upload => upload.file_url)];
      await updateMutation.mutateAsync({ gallery_urls });
      toast.success(`${uploads.length} photo${uploads.length === 1 ? '' : 's'} added to your gallery.`);
    } catch (err) {
      toast.error(`Gallery upload failed: ${err.message}`);
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const createPostMutation = useMutation({
    mutationFn: () => base44.entities.ProfilePost.create({ creator_id: creator.id, body: postBody.trim(), visibility: postVisibility }),
    onSuccess: () => {
      setPostBody('');
      queryClient.invalidateQueries({ queryKey: ['profile-posts', creator?.id] });
      toast.success('Post published');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id) => base44.entities.ProfilePost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-posts', creator?.id] }),
  });

  return (
    <div className="ll-page-enter min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* ── Profile Header ── */}
        <div className="ll-card overflow-hidden mb-5">
          {/* Banner */}
          <div className="h-32 relative overflow-hidden bg-[#24211b]">
            {creator?.banner_url && <img src={creator.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-black/35" />
            {/* Edit button */}
            <button onClick={handleEdit}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ll-interactive bg-[#171719] border border-white/[0.15] text-white hover:bg-[#222225]">
              <Edit className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="px-4 pb-5 -mt-10 relative">
            {/* Avatar */}
            <div className="flex items-end justify-between mb-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-lg overflow-hidden border-4 border-[#171719] bg-[#323237]"
                  style={{ boxShadow:'0 0 0 1px rgba(255,255,255,0.15)' }}>
                  {creator?.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                      {(creator?.display_name || user?.full_name || 'L').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ll-interactive"
                  style={{ background:'#f5a623' }}>
                  <Camera className="w-3.5 h-3.5 text-black" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              {creator?.is_verified && <span className="mb-1 text-xs font-semibold text-amber-300">Verified creator</span>}
            </div>

            {/* Name + info */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="ll-heading text-xl text-white">{creator?.display_name || user?.full_name || 'Legionnaire'}</h1>
                {creator?.is_verified && <Crown className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-white/40 text-xs capitalize mb-1.5">{creator?.category?.replace('_',' ') || 'Content Creator'}</p>
              {creator?.bio && <p className="text-white/60 text-sm leading-relaxed">{creator.bio}</p>}
              {creator?.location_visible && creator?.location_label && (
                <p className="mt-2 flex items-center gap-1.5 text-white/45 text-xs"><MapPin className="w-3.5 h-3.5" />{creator.location_label}</p>
              )}
              {creator?.social_links && Object.values(creator.social_links).some(Boolean) && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {Object.entries(creator.social_links).filter(([,v]) => v).map(([platform, value]) => (
                    <a key={platform} href={value.startsWith('http') ? value : `https://${value}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-amber-400/60 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors">
                      <LinkIcon className="w-3 h-3" /> {platform}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Public profile summary */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: formatCount(creator?.follower_count), label:'Followers' },
                { val: myVideos.length,                      label:'Videos' },
                { val: pastStreams.length,                   label:'Streams' },
              ].map(stat => (
                <div key={stat.label} className="ll-card-inset text-center py-3 px-1">
                  <p className="ll-heading text-base text-white">{stat.val}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="ll-card mb-5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="ll-section-title">Profile gallery</h2>
              <p className="text-white/40 text-xs mt-1">Share up to 6 photos that represent your work and community.</p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/[0.06]">
              <ImagePlus className="w-4 h-4" /> {uploadingGallery ? 'Uploading' : 'Add photos'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploadingGallery} />
            </label>
          </div>
          {(creator?.gallery_urls || []).length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {creator.gallery_urls.map((url, index) => <img key={url} src={url} alt={`Profile gallery image ${index + 1}`} className="aspect-square w-full rounded-md object-cover" />)}
            </div>
          ) : <p className="py-5 text-sm text-white/35">Add photos to give your profile a more complete public identity.</p>}
        </section>

        <section className="ll-card mb-5 p-4">
          <h2 className="ll-section-title">Updates</h2>
          <div className="mt-3 rounded-lg border border-white/[0.10] bg-[#101011] p-3">
            <textarea value={postBody} onChange={event => setPostBody(event.target.value)} maxLength={2000} rows={3} placeholder="Share an update with your audience" className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3">
              <select value={postVisibility} onChange={event => setPostVisibility(event.target.value)} className="bg-[#171719] text-xs text-white/70 outline-none">
                <option value="public">Public</option>
                <option value="followers">Followers</option>
                <option value="subscribers">Subscribers</option>
              </select>
              <button onClick={() => createPostMutation.mutate()} disabled={!postBody.trim() || createPostMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#e1a33a] px-3 py-2 text-xs font-bold text-black disabled:opacity-40">
                <Send className="w-3.5 h-3.5" /> Post
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {profilePosts.map(post => <article key={post.id} className="rounded-lg border border-white/[0.08] bg-[#101011] p-3">
              <div className="flex items-center justify-between gap-3"><p className="text-xs text-white/35">{new Date(post.created_date).toLocaleDateString()}</p><button onClick={() => deletePostMutation.mutate(post.id)} aria-label="Delete post" title="Delete post" className="text-white/35 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{post.body}</p>
            </article>)}
            {!profilePosts.length && <p className="py-4 text-sm text-white/35">Your updates will appear here.</p>}
          </div>
        </section>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="bg-[#131316]/98 backdrop-blur-2xl border-white/[0.1] max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <Label className="text-white/70">Display Name</Label>
                <Input
                  value={editData.display_name || ''}
                  onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Category</Label>
                <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131316]/98 backdrop-blur-2xl border-white/[0.1]">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-white">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Bio</Label>
                <Textarea
                  value={editData.bio || ''}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  maxLength={200}
                />
              </div>
              <div>
                <Label className="text-white/70">Location</Label>
                <Input
                  value={editData.location_label || ''}
                  onChange={(e) => setEditData({ ...editData, location_label: e.target.value })}
                  placeholder="City, region, or country"
                  className="bg-white/5 border-white/10 text-white"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={Boolean(editData.location_visible)}
                    onChange={(e) => setEditData({ ...editData, location_visible: e.target.checked })}
                    className="h-4 w-4 accent-amber-500"
                  />
                  Show this location publicly on my profile
                </label>
              </div>
              
              {/* Social Links */}
              <div className="space-y-3">
                <Label className="text-white/70">Social Links</Label>
                {[
                  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourchannel' },
                  { key: 'tiktok', label: 'TikTok', placeholder: '@username' },
                  { key: 'instagram', label: 'Instagram', placeholder: '@username' },
                  { key: 'twitter', label: 'X / Twitter', placeholder: '@username' },
                ].map(link => (
                  <div key={link.key}>
                    <span className="text-white/40 text-xs">{link.label}</span>
                    <Input
                      value={editData.social_links?.[link.key] || ''}
                      onChange={(e) => setEditData({ 
                        ...editData, 
                        social_links: { ...editData.social_links, [link.key]: e.target.value } 
                      })}
                      placeholder={link.placeholder}
                      className="bg-white/5 border-white/10 text-white mt-1"
                    />
                  </div>
                ))}
              </div>
              
              <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}