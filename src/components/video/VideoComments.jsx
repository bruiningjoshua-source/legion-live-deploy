import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Heart,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function VideoComments({ videoId, creatorId }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['video-comments', videoId],
    queryFn: () => base44.entities.VideoComment.filter({ video_id: videoId, parent_comment_id: null }, '-created_date', 100),
    enabled: !!videoId
  });

  const { data: userLikes = [] } = useQuery({
    queryKey: ['user-comment-likes', user?.email],
    queryFn: () => base44.entities.VideoCommentLike.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.VideoComment.create({
        video_id: videoId,
        user_email: user.email,
        user_name: user.full_name,
        content
      });
      // Update video comment count
      const videos = await base44.entities.VlogVideo.filter({ id: videoId }, null, 1);
      if (videos[0]) {
        await base44.entities.VlogVideo.update(videoId, {
          comment_count: (videos[0].comment_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['video-comments']);
      setNewComment('');
      toast.success('Comment added!');
    }
  });

  const addReplyMutation = useMutation({
    mutationFn: async ({ parentId, content }) => {
      await base44.entities.VideoComment.create({
        video_id: videoId,
        user_email: user.email,
        user_name: user.full_name,
        content,
        parent_comment_id: parentId
      });
      // Update parent reply count
      const parent = comments.find(c => c.id === parentId);
      if (parent) {
        await base44.entities.VideoComment.update(parentId, {
          reply_count: (parent.reply_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['video-comments']);
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply added!');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async ({ commentId, isLike }) => {
      const existingLike = userLikes.find(l => l.comment_id === commentId);
      const comment = comments.find(c => c.id === commentId);
      
      if (existingLike) {
        if (existingLike.is_like === isLike) {
          // Remove like/dislike
          await base44.entities.VideoCommentLike.delete(existingLike.id);
          await base44.entities.VideoComment.update(commentId, {
            [isLike ? 'like_count' : 'dislike_count']: Math.max((comment[isLike ? 'like_count' : 'dislike_count'] || 1) - 1, 0)
          });
        } else {
          // Change from like to dislike or vice versa
          await base44.entities.VideoCommentLike.update(existingLike.id, { is_like: isLike });
          await base44.entities.VideoComment.update(commentId, {
            like_count: isLike ? (comment.like_count || 0) + 1 : Math.max((comment.like_count || 1) - 1, 0),
            dislike_count: isLike ? Math.max((comment.dislike_count || 1) - 1, 0) : (comment.dislike_count || 0) + 1
          });
        }
      } else {
        // New like/dislike
        await base44.entities.VideoCommentLike.create({
          comment_id: commentId,
          user_email: user.email,
          is_like: isLike
        });
        await base44.entities.VideoComment.update(commentId, {
          [isLike ? 'like_count' : 'dislike_count']: (comment[isLike ? 'like_count' : 'dislike_count'] || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['video-comments']);
      queryClient.invalidateQueries(['user-comment-likes']);
    }
  });

  const heartMutation = useMutation({
    mutationFn: async (commentId) => {
      const comment = comments.find(c => c.id === commentId);
      await base44.entities.VideoComment.update(commentId, {
        is_hearted: !comment.is_hearted
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['video-comments'])
  });

  const getUserLikeState = (commentId) => {
    const like = userLikes.find(l => l.comment_id === commentId);
    return like ? (like.is_like ? 'liked' : 'disliked') : null;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-amber-400" />
        {comments.length} Comments
      </h3>

      {/* Add Comment */}
      {user ? (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-600/30 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">👤</span>
          </div>
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="bg-stone-800/50 border-amber-600/20 text-amber-100 min-h-[60px]"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={() => addCommentMutation.mutate(newComment)}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Comment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-stone-800/30 rounded-lg p-4 text-center">
          <p className="text-amber-400/70">Sign in to comment</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        <AnimatePresence>
          {comments.map((comment, i) => {
            const likeState = getUserLikeState(comment.id);
            const isCreator = comment.user_email === creatorId;
            
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCreator ? 'bg-amber-600' : 'bg-stone-700'
                }`}>
                  {comment.user_avatar ? (
                    <img src={comment.user_avatar} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span className="text-sm">👤</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-sm ${isCreator ? 'text-amber-400' : 'text-amber-100'}`}>
                      {comment.user_name}
                    </span>
                    {isCreator && (
                      <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">Creator</span>
                    )}
                    <span className="text-amber-400/50 text-xs">
                      {comment.created_date && format(new Date(comment.created_date), 'MMM d, yyyy')}
                    </span>
                    {comment.is_pinned && (
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">📌 Pinned</span>
                    )}
                  </div>
                  <p className="text-amber-100/90 text-sm mb-2">{comment.content}</p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => user && likeMutation.mutate({ commentId: comment.id, isLike: true })}
                      className={`flex items-center gap-1 text-sm ${
                        likeState === 'liked' ? 'text-blue-400' : 'text-amber-400/60 hover:text-amber-400'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${likeState === 'liked' ? 'fill-current' : ''}`} />
                      {comment.like_count || 0}
                    </button>
                    <button
                      onClick={() => user && likeMutation.mutate({ commentId: comment.id, isLike: false })}
                      className={`flex items-center gap-1 text-sm ${
                        likeState === 'disliked' ? 'text-red-400' : 'text-amber-400/60 hover:text-amber-400'
                      }`}
                    >
                      <ThumbsDown className={`w-4 h-4 ${likeState === 'disliked' ? 'fill-current' : ''}`} />
                      {comment.dislike_count || 0}
                    </button>
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="text-sm text-amber-400/60 hover:text-amber-400"
                    >
                      Reply
                    </button>
                    {comment.is_hearted && (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <Heart className="w-4 h-4 fill-current" />
                        by creator
                      </span>
                    )}
                    {user?.email === creatorId && (
                      <button
                        onClick={() => heartMutation.mutate(comment.id)}
                        className="text-sm text-amber-400/60 hover:text-red-400"
                      >
                        {comment.is_hearted ? 'Remove ❤️' : '❤️ Heart'}
                      </button>
                    )}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 flex gap-2"
                    >
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        className="bg-stone-800/50 border-amber-600/20 text-amber-100 text-sm min-h-[40px]"
                      />
                      <Button
                        onClick={() => addReplyMutation.mutate({ parentId: comment.id, content: replyText })}
                        disabled={!replyText.trim()}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        Reply
                      </Button>
                    </motion.div>
                  )}

                  {/* Show Replies Button */}
                  {comment.reply_count > 0 && (
                    <button
                      onClick={() => setExpandedReplies({ ...expandedReplies, [comment.id]: !expandedReplies[comment.id] })}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                    >
                      {expandedReplies[comment.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                    </button>
                  )}

                  {/* Replies (would need separate query) */}
                  {expandedReplies[comment.id] && (
                    <CommentReplies parentId={comment.id} creatorId={creatorId} user={user} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CommentReplies({ parentId, creatorId, user }) {
  const { data: replies = [] } = useQuery({
    queryKey: ['comment-replies', parentId],
    queryFn: () => base44.entities.VideoComment.filter({ parent_comment_id: parentId }, 'created_date', 50),
    enabled: !!parentId
  });

  return (
    <div className="mt-3 ml-4 pl-4 border-l-2 border-amber-600/20 space-y-3">
      {replies.map(reply => {
        const isCreator = reply.user_email === creatorId;
        return (
          <div key={reply.id} className="flex gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isCreator ? 'bg-amber-600' : 'bg-stone-700'
            }`}>
              <span className="text-xs">👤</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-semibold text-xs ${isCreator ? 'text-amber-400' : 'text-amber-100'}`}>
                  {reply.user_name}
                </span>
                {isCreator && (
                  <span className="text-xs bg-amber-600/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">Creator</span>
                )}
              </div>
              <p className="text-amber-100/90 text-sm">{reply.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}