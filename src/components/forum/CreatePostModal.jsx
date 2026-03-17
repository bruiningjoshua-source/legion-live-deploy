import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Type, Image, Link2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const POST_TYPES = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'link', label: 'Link', icon: Link2 },
];

export default function CreatePostModal({ isOpen, onClose, categories = [], user }) {
  const [postType, setPostType] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [tags, setTags] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title required');
      if (!categoryId) throw new Error('Select a senate');
      return base44.entities.ForumPost.create({
        category_id: categoryId,
        author_email: user.email,
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        image_url: postType === 'image' ? imageUrl : undefined,
        link_url: postType === 'link' ? linkUrl : undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast.success('Post created!');
      onClose();
      setTitle(''); setContent(''); setCategoryId(''); setImageUrl(''); setLinkUrl(''); setTags('');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          onClick={e => e.stopPropagation()}
          className="bg-[#1a1a1f] border border-white/[0.1] rounded-xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h2 className="text-white font-bold text-sm">Create a Post</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Category select */}
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
            >
              <option value="">Choose a Senate…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} s/{c.name}</option>
              ))}
            </select>

            {/* Post type tabs */}
            <div className="flex border border-white/[0.08] rounded-lg overflow-hidden">
              {POST_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setPostType(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                      postType === t.id
                        ? 'bg-white/[0.08] text-white border-b-2 border-amber-400'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
              maxLength={300}
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-amber-500/50"
            />

            {/* Content */}
            {postType === 'text' && (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Text (optional)"
                rows={5}
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-amber-500/50 resize-none"
              />
            )}

            {postType === 'image' && (
              <div>
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="" className="w-full rounded-lg max-h-48 object-cover" />
                    <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-black/70 rounded-full p-1 text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full border-2 border-dashed border-white/[0.1] rounded-lg py-8 text-center cursor-pointer hover:border-amber-500/30 transition-colors">
                    <Image className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-xs">Click to upload an image</p>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Caption (optional)"
                  rows={2}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none mt-2 resize-none"
                />
              </div>
            )}

            {postType === 'link' && (
              <>
                <input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="URL"
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-amber-500/50"
                />
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none resize-none"
                />
              </>
            )}

            {/* Tags */}
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-xs placeholder:text-white/30 outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/[0.06]">
            <button onClick={onClose} className="px-4 py-2 text-white/50 text-xs font-semibold rounded-full hover:bg-white/[0.05] transition-colors">
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !categoryId || createMutation.isPending}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-black font-bold text-xs px-5 py-2 rounded-full transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {createMutation.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}