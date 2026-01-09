import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MessageCircle,
  ThumbsUp,
  Eye,
  Pin,
  Lock,
  MoreHorizontal,
  Trash2,
  Flag,
  Send,
  Reply
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function ForumPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: post, isLoading } = useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async () => {
      const posts = await base44.entities.ForumPost.filter({ id: postId }, null, 1);
      return posts[0] || null;
    },
    enabled: !!postId
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['forum-replies', postId],
    queryFn: () => base44.entities.ForumReply.filter({ post_id: postId }, 'created_date', 200),
    enabled: !!postId
  });

  const { data: category } = useQuery({
    queryKey: ['forum-category', post?.category_id],
    queryFn: async () => {
      const cats = await base44.entities.ForumCategory.filter({ id: post.category_id }, null, 1);
      return cats[0] || null;
    },
    enabled: !!post?.category_id
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['forum-creators'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.user_email] = c;
    return acc;
  }, {});

  // Track view
  useEffect(() => {
    if (post && postId) {
      base44.entities.ForumPost.update(postId, {
        view_count: (post.view_count || 0) + 1
      });
    }
  }, [postId]);

  const addReplyMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ForumReply.create(data);
      await base44.entities.ForumPost.update(postId, {
        reply_count: (post?.reply_count || 0) + 1,
        last_reply_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-replies', postId]);
      queryClient.invalidateQueries(['forum-post', postId]);
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply posted!');
    }
  });

  const likePostMutation = useMutation({
    mutationFn: () => base44.entities.ForumPost.update(postId, {
      like_count: (post?.like_count || 0) + 1
    }),
    onSuccess: () => queryClient.invalidateQueries(['forum-post', postId])
  });

  const likeReplyMutation = useMutation({
    mutationFn: (replyId) => {
      const reply = replies.find(r => r.id === replyId);
      return base44.entities.ForumReply.update(replyId, {
        like_count: (reply?.like_count || 0) + 1
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['forum-replies', postId])
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId) => {
      await base44.entities.ForumReply.delete(replyId);
      await base44.entities.ForumPost.update(postId, {
        reply_count: Math.max(0, (post?.reply_count || 1) - 1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-replies', postId]);
      toast.success('Reply deleted');
    }
  });

  const handleSubmitReply = () => {
    if (!replyContent.trim() || !user) return;
    addReplyMutation.mutate({
      post_id: postId,
      author_email: user.email,
      content: replyContent.trim(),
      parent_reply_id: replyingTo
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pt-20 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-stone-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Post Not Found</h1>
          <Link to={createPageUrl('CommunityForums')}>
            <Button className="bg-amber-600 hover:bg-amber-700">Back to Forums</Button>
          </Link>
        </div>
      </div>
    );
  }

  const author = creatorMap[post.author_email];
  const topLevelReplies = replies.filter(r => !r.parent_reply_id);
  const nestedReplies = replies.reduce((acc, r) => {
    if (r.parent_reply_id) {
      if (!acc[r.parent_reply_id]) acc[r.parent_reply_id] = [];
      acc[r.parent_reply_id].push(r);
    }
    return acc;
  }, {});

  const ReplyItem = ({ reply, isNested = false }) => {
    const replyAuthor = creatorMap[reply.author_email];
    const childReplies = nestedReplies[reply.id] || [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={isNested ? 'ml-12 mt-4' : 'mb-6'}
      >
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={replyAuthor?.avatar_url} />
            <AvatarFallback className="bg-amber-600 text-white">
              {reply.author_email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="bg-stone-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-100 font-semibold text-sm">
                  {replyAuthor?.display_name || reply.author_email?.split('@')[0]}
                </span>
                <span className="text-amber-400/50 text-xs">
                  {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                </span>
              </div>
              <p className="text-amber-100/90 text-sm whitespace-pre-wrap">{reply.content}</p>
            </div>

            <div className="flex items-center gap-4 mt-2 ml-2">
              <button
                onClick={() => user && likeReplyMutation.mutate(reply.id)}
                className="flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-300"
              >
                <ThumbsUp className="w-4 h-4" />
                {reply.like_count || 0}
              </button>

              {!isNested && user && !post.is_locked && (
                <button
                  onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                  className="flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-300"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
              )}

              {(user?.email === reply.author_email || user?.role === 'admin') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-amber-400/60 hover:text-amber-300">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-stone-900 border-amber-600/30">
                    <DropdownMenuItem
                      onClick={() => deleteReplyMutation.mutate(reply.id)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Reply Input */}
            {replyingTo === reply.id && (
              <div className="mt-3 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-stone-800 border-amber-600/20 text-amber-100 text-sm min-h-[60px]"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleSubmitReply}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={!replyContent.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                    size="sm"
                    variant="ghost"
                    className="text-amber-400"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Nested Replies */}
            {childReplies.length > 0 && (
              <div className="mt-4">
                {childReplies.map(childReply => (
                  <ReplyItem key={childReply.id} reply={childReply} isNested />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link to={createPageUrl('CommunityForums')}>
          <Button variant="ghost" className="text-amber-400 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forums
          </Button>
        </Link>

        {/* Post */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={author?.avatar_url} />
                <AvatarFallback className="bg-amber-600 text-white">
                  {post.author_email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {post.is_pinned && <Pin className="w-4 h-4 text-amber-400" />}
                  {post.is_locked && <Lock className="w-4 h-4 text-red-400" />}
                  <h1 className="text-2xl font-bold text-amber-100">{post.title}</h1>
                </div>

                <div className="flex items-center gap-3 text-sm text-amber-400/60">
                  <span>{author?.display_name || post.author_email?.split('@')[0]}</span>
                  {category && (
                    <Badge className="bg-stone-700/50 text-amber-300">
                      {category.icon} {category.name}
                    </Badge>
                  )}
                  <span>{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <div className="prose prose-invert max-w-none mb-6">
              <p className="text-amber-100/90 whitespace-pre-wrap">{post.content}</p>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-amber-600/20">
              <button
                onClick={() => user && likePostMutation.mutate()}
                className="flex items-center gap-2 text-amber-400/70 hover:text-amber-300 transition-colors"
              >
                <ThumbsUp className="w-5 h-5" />
                <span>{post.like_count || 0} likes</span>
              </button>
              <span className="flex items-center gap-2 text-amber-400/60">
                <Eye className="w-5 h-5" />
                {post.view_count || 0} views
              </span>
              <span className="flex items-center gap-2 text-amber-400/60">
                <MessageCircle className="w-5 h-5" />
                {post.reply_count || 0} replies
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Reply Input */}
        {user && !post.is_locked ? (
          <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={creatorMap[user.email]?.avatar_url} />
                  <AvatarFallback className="bg-amber-600 text-white">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={replyingTo ? '' : replyContent}
                    onChange={(e) => !replyingTo && setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="bg-stone-800 border-amber-600/20 text-amber-100 min-h-[80px] mb-2"
                    disabled={!!replyingTo}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitReply}
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={!replyContent.trim() || !!replyingTo || addReplyMutation.isPending}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : post.is_locked ? (
          <Card className="bg-stone-800/30 border-red-600/20 mb-8">
            <CardContent className="p-4 text-center">
              <Lock className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-amber-400/70">This post is locked and cannot receive new replies.</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Replies */}
        <div>
          <h2 className="text-xl font-bold text-amber-100 mb-6 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-400" />
            {replies.length} Replies
          </h2>

          {topLevelReplies.length > 0 ? (
            <AnimatePresence>
              {topLevelReplies.map(reply => (
                <ReplyItem key={reply.id} reply={reply} />
              ))}
            </AnimatePresence>
          ) : (
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardContent className="py-12 text-center">
                <MessageCircle className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                <p className="text-amber-400/60">No replies yet. Be the first to respond!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}