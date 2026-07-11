import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, MessageSquare, ArrowBigUp, ArrowBigDown, Eye, Pin, Lock, Trash2, Send, Reply, Share2, Link2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function ForumPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [sortReplies, setSortReplies] = useState('best');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: post, isLoading } = useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async () => {
      const posts = await base44.entities.ForumPost.filter({ id: postId }, null, 1);
      return posts[0] || null;
    },
    enabled: !!postId,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['forum-replies', postId],
    queryFn: () => base44.entities.ForumReply.filter({ post_id: postId }, 'created_date', 200),
    enabled: !!postId,
  });

  const { data: category } = useQuery({
    queryKey: ['forum-category', post?.category_id],
    queryFn: async () => {
      const cats = await base44.entities.ForumCategory.filter({ id: post.category_id }, null, 1);
      return cats[0] || null;
    },
    enabled: !!post?.category_id,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['forum-creators'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000,
  });

  const creatorMap = useMemo(() => creators.reduce((acc, c) => { acc[c.user_email] = c; return acc; }, {}), [creators]);

  // Track view
  useEffect(() => {
    if (post && postId) {
      base44.entities.ForumPost.update(postId, { view_count: (post.view_count || 0) + 1 });
    }
  }, [postId]);

  const addReplyMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ForumReply.create(data);
      await base44.entities.ForumPost.update(postId, {
        reply_count: (post?.reply_count || 0) + 1,
        last_reply_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply posted!');
    },
  });

  const votePostMutation = useMutation({
    mutationFn: ({ field }) => base44.entities.ForumPost.update(postId, { [field]: (post?.[field] || 0) + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-post', postId] }),
  });

  const likeReplyMutation = useMutation({
    mutationFn: (replyId) => {
      const r = replies.find(r => r.id === replyId);
      return base44.entities.ForumReply.update(replyId, { like_count: (r?.like_count || 0) + 1 });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-replies', postId] }),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId) => {
      await base44.entities.ForumReply.delete(replyId);
      await base44.entities.ForumPost.update(postId, { reply_count: Math.max(0, (post?.reply_count || 1) - 1) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', postId] });
      toast.success('Reply deleted');
    },
  });

  const handleSubmitReply = () => {
    if (!replyContent.trim() || !user) return;
    addReplyMutation.mutate({
      post_id: postId,
      author_email: user.email,
      content: replyContent.trim(),
      parent_reply_id: replyingTo,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Post Not Found</h1>
          <Link to={createPageUrl('CommunityForums')}>
            <button className="bg-amber-500 text-black font-bold text-sm px-5 py-2 rounded-full">Back to Senate</button>
          </Link>
        </div>
      </div>
    );
  }

  const author = creatorMap[post.author_email];
  const score = (post.like_count || 0) - (post.downvote_count || 0);
  const topLevelReplies = replies.filter(r => !r.parent_reply_id);
  const nestedReplies = replies.reduce((acc, r) => {
    if (r.parent_reply_id) {
      if (!acc[r.parent_reply_id]) acc[r.parent_reply_id] = [];
      acc[r.parent_reply_id].push(r);
    }
    return acc;
  }, {});

  // Sort replies
  const sortedTopLevel = [...topLevelReplies].sort((a, b) => {
    if (sortReplies === 'new') return new Date(b.created_date) - new Date(a.created_date);
    return (b.like_count || 0) - (a.like_count || 0); // best
  });

  const ReplyItem = ({ reply, depth = 0 }) => {
    const replyAuthor = creatorMap[reply.author_email];
    const childReplies = nestedReplies[reply.id] || [];
    const isOwn = user?.email === reply.author_email || user?.role === 'admin';

    return (
      <div className={depth > 0 ? 'ml-6 border-l border-white/[0.06] pl-4' : ''}>
        <div className="py-3">
          {/* Author line */}
          <div className="flex items-center gap-1.5 text-[11px] mb-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-[9px] text-white font-bold">
              {(replyAuthor?.display_name || reply.author_email)?.[0]?.toUpperCase()}
            </div>
            <span className="text-white/70 font-semibold">
              {replyAuthor?.display_name || reply.author_email?.split('@')[0]}
            </span>
            <span className="text-white/25">•</span>
            <span className="text-white/30">
              {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
            </span>
          </div>

          {/* Content */}
          <p className="text-white/80 text-sm whitespace-pre-wrap mb-2">{reply.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-3 text-[11px]">
            <button
              onClick={() => user && likeReplyMutation.mutate(reply.id)}
              className="flex items-center gap-1 text-white/30 hover:text-amber-400 transition-colors"
            >
              <ArrowBigUp className="w-4 h-4" />
              {reply.like_count || 0}
            </button>
            {depth === 0 && user && !post.is_locked && (
              <button
                onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => deleteReplyMutation.mutate(reply.id)}
                className="flex items-center gap-1 text-white/30 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>

          {/* Inline reply input */}
          {replyingTo === reply.id && (
            <div className="mt-3 flex gap-2">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none resize-none"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-black font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                  className="text-white/40 text-xs px-3 py-1 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nested */}
        {childReplies.map(child => (
          <ReplyItem key={child.id} reply={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#0a0a0f]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-4">
        {/* Back */}
        <Link to={createPageUrl('CommunityForums')}>
          <button className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Senate
          </button>
        </Link>

        {/* Post card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden mb-4">
          <div className="flex">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-0.5 px-3 py-4 bg-white/[0.01]">
              <button
                onClick={() => user && votePostMutation.mutate({ field: 'like_count' })}
                className="p-1 rounded hover:bg-amber-500/20 text-white/30 hover:text-amber-400 transition-colors"
              >
                <ArrowBigUp className="w-6 h-6" />
              </button>
              <span className={`text-sm font-bold ${score > 0 ? 'text-amber-400' : score < 0 ? 'text-amber-400' : 'text-white/40'}`}>
                {score}
              </span>
              <button
                onClick={() => user && votePostMutation.mutate({ field: 'downvote_count' })}
                className="p-1 rounded hover:bg-amber-500/15 text-white/30 hover:text-amber-400 transition-colors"
              >
                <ArrowBigDown className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 py-3 pr-4">
              {/* Meta */}
              <div className="flex items-center gap-1.5 text-[11px] text-white/40 mb-2 flex-wrap">
                {category && <span className="text-amber-400 font-semibold">s/{category.name}</span>}
                <span>•</span>
                <span>Posted by u/{author?.display_name || post.author_email?.split('@')[0]}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
                {post.is_pinned && <Pin className="w-3 h-3 text-green-400 ml-1" />}
                {post.is_locked && <Lock className="w-3 h-3 text-red-400 ml-1" />}
              </div>

              {/* Title */}
              <h1 className="text-xl font-bold text-white mb-3">{post.title}</h1>

              {/* Image */}
              {post.post_type === 'image' && post.image_url && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img src={post.image_url} alt="" className="w-full rounded-lg" />
                </div>
              )}

              {/* Link */}
              {post.post_type === 'link' && post.link_url && (
                <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-amber-400 text-sm mb-3 hover:underline">
                  <Link2 className="w-4 h-4" />
                  {post.link_url}
                </a>
              )}

              {/* Body */}
              {post.content && (
                <div className="text-white/70 text-sm whitespace-pre-wrap mb-4 leading-relaxed">
                  {post.content}
                </div>
              )}

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="flex gap-1.5 mb-3">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-4 pt-2 border-t border-white/[0.06]">
                <span className="flex items-center gap-1 text-white/40 text-xs">
                  <MessageSquare className="w-4 h-4" />
                  {post.reply_count || 0} Comments
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied');
                  }}
                  className="flex items-center gap-1 text-white/40 text-xs hover:text-white/60 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <span className="flex items-center gap-1 text-white/40 text-xs">
                  <Eye className="w-4 h-4" />
                  {post.view_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reply input */}
        {user && !post.is_locked && !replyingTo && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 mb-4">
            <p className="text-white/30 text-xs mb-2">Comment as <span className="text-amber-400">{user.full_name || user.email?.split('@')[0]}</span></p>
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="What are your thoughts?"
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-amber-500/40 resize-none mb-2"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || addReplyMutation.isPending}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-black font-bold text-xs px-4 py-2 rounded-full transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {addReplyMutation.isPending ? 'Posting…' : 'Comment'}
              </button>
            </div>
          </div>
        )}

        {post.is_locked && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-center">
            <Lock className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-white/50 text-xs">This post is locked.</p>
          </div>
        )}

        {/* Sort replies */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-white/40 text-xs">Sort by:</span>
          {['best', 'new'].map(s => (
            <button
              key={s}
              onClick={() => setSortReplies(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                sortReplies === s ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/60'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Replies */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04] px-4">
          {sortedTopLevel.length > 0 ? (
            sortedTopLevel.map(reply => <ReplyItem key={reply.id} reply={reply} />)
          ) : (
            <div className="py-12 text-center">
              <MessageSquare className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-xs">No comments yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}