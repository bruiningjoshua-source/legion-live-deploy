import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Reply,
  MoreHorizontal,
  Flag,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function VideoCommentSystem({ videoId, creatorId }) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['video-comments', videoId],
    queryFn: () => base44.entities.VideoComment.filter({ video_id: videoId }, '-created_date', 100),
    enabled: !!videoId
  });

  const { data: commentLikes = [] } = useQuery({
    queryKey: ['comment-likes', user?.email],
    queryFn: () => base44.entities.VideoCommentLike.filter({ user_email: user.email }, null, 500),
    enabled: !!user?.email
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['comment-creators'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.user_email] = c;
    return acc;
  }, {});

  const likeMap = commentLikes.reduce((acc, l) => {
    acc[l.comment_id] = l.is_like;
    return acc;
  }, {});

  // Organize comments into threads
  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {});

  const addCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.VideoComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['video-comments', videoId]);
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
      toast.success('Comment posted!');
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, isLike }) => {
      const existing = commentLikes.find(l => l.comment_id === commentId);
      if (existing) {
        if (existing.is_like === isLike) {
          await base44.entities.VideoCommentLike.delete(existing.id);
        } else {
          await base44.entities.VideoCommentLike.update(existing.id, { is_like: isLike });
        }
      } else {
        await base44.entities.VideoCommentLike.create({
          comment_id: commentId,
          user_email: user.email,
          is_like: isLike
        });
      }
      // Update comment like/dislike count
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        const delta = existing ? (existing.is_like === isLike ? -1 : (isLike ? 2 : -2)) : 1;
        await base44.entities.VideoComment.update(commentId, {
          like_count: Math.max(0, (comment.like_count || 0) + (isLike ? delta : 0)),
          dislike_count: Math.max(0, (comment.dislike_count || 0) + (!isLike ? delta : 0))
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['video-comments', videoId]);
      queryClient.invalidateQueries(['comment-likes']);
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.VideoComment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['video-comments', videoId]);
      toast.success('Comment deleted');
    }
  });

  const handleSubmitComment = () => {
    if (!newComment.trim() || !user) return;
    addCommentMutation.mutate({
      video_id: videoId,
      user_email: user.email,
      content: newComment.trim()
    });
  };

  const handleSubmitReply = (parentId) => {
    if (!replyContent.trim() || !user) return;
    addCommentMutation.mutate({
      video_id: videoId,
      user_email: user.email,
      content: replyContent.trim(),
      parent_comment_id: parentId
    });
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const CommentItem = ({ comment, isReply = false }) => {
    const author = creatorMap[comment.user_email];
    const replies = repliesMap[comment.id] || [];
    const isExpanded = expandedReplies[comment.id];
    const isCreator = comment.user_email === creatorMap[creatorId]?.user_email;
    const userLiked = likeMap[comment.id];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isReply ? 'ml-12 mt-3' : 'mb-6'}`}
      >
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={author?.avatar_url} />
            <AvatarFallback className="bg-amber-600 text-white">
              {comment.user_email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-100 font-semibold text-sm">
                {author?.display_name || comment.user_email?.split('@')[0]}
              </span>
              {isCreator && (
                <Badge className="bg-amber-600 text-white text-xs px-1.5 py-0">Creator</Badge>
              )}
              <span className="text-amber-400/50 text-xs">
                {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
              </span>
            </div>

            <p className="text-amber-100/90 text-sm whitespace-pre-wrap mb-2">{comment.content}</p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => user && likeCommentMutation.mutate({ commentId: comment.id, isLike: true })}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  userLiked === true ? 'text-green-400' : 'text-amber-400/60 hover:text-green-400'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                {comment.like_count || 0}
              </button>

              <button
                onClick={() => user && likeCommentMutation.mutate({ commentId: comment.id, isLike: false })}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  userLiked === false ? 'text-red-400' : 'text-amber-400/60 hover:text-red-400'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                {comment.dislike_count || 0}
              </button>

              {!isReply && user && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-300"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
              )}

              {(user?.email === comment.user_email || user?.role === 'admin') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-amber-400/60 hover:text-amber-300">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-stone-900 border-amber-600/30">
                    <DropdownMenuItem
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
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
            {replyingTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-stone-800 border-amber-600/20 text-amber-100 text-sm min-h-[60px]"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={() => handleSubmitReply(comment.id)}
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

            {/* Replies */}
            {!isReply && replies.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {replies.map(reply => (
                        <CommentItem key={reply.id} comment={reply} isReply />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-stone-800/30 rounded-xl p-6 border border-amber-600/20">
      <h3 className="text-amber-100 font-semibold text-lg mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-amber-400" />
        {comments.length} Comments
      </h3>

      {/* New Comment Input */}
      {user ? (
        <div className="flex gap-3 mb-6">
          <Avatar className="w-10 h-10">
            <AvatarImage src={creatorMap[user.email]?.avatar_url} />
            <AvatarFallback className="bg-amber-600 text-white">
              {user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="bg-stone-800 border-amber-600/20 text-amber-100 min-h-[80px] mb-2"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setNewComment('')}
                className="text-amber-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!newComment.trim() || addCommentMutation.isPending}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-amber-400/60 text-center py-4 mb-4">Sign in to comment</p>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : topLevelComments.length > 0 ? (
        <div>
          {topLevelComments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-amber-400/30 mx-auto mb-2" />
          <p className="text-amber-400/60">No comments yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}