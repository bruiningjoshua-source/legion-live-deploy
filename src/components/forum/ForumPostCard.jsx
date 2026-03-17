import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, Bookmark, Pin, Lock, Image, Link2, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const postTypeIcons = {
  image: Image,
  link: Link2,
  poll: BarChart3,
};

export default function ForumPostCard({ post, category, author, onUpvote, onDownvote, compact = false }) {
  const score = (post.like_count || 0) - (post.downvote_count || 0);
  const TypeIcon = postTypeIcons[post.post_type];
  const timeAgo = post.created_date
    ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true })
    : 'just now';

  return (
    <div className="group flex bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-none first:rounded-t-xl last:rounded-b-xl transition-all">
      {/* Vote column */}
      <div className="flex flex-col items-center gap-0.5 px-2 py-3 bg-white/[0.01]">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpvote?.(post.id); }}
          className="p-0.5 rounded hover:bg-amber-500/20 text-white/30 hover:text-amber-400 transition-colors"
        >
          <ArrowBigUp className="w-5 h-5" />
        </button>
        <span className={`text-xs font-bold ${score > 0 ? 'text-amber-400' : score < 0 ? 'text-blue-400' : 'text-white/40'}`}>
          {score}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDownvote?.(post.id); }}
          className="p-0.5 rounded hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-colors"
        >
          <ArrowBigDown className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <Link to={createPageUrl('ForumPost') + `?id=${post.id}`} className="flex-1 min-w-0 py-2 pr-3">
        {/* Meta line */}
        <div className="flex items-center gap-1.5 text-[11px] text-white/40 mb-1 flex-wrap">
          {category && (
            <span className="text-amber-400 font-semibold hover:underline">
              s/{category.name}
            </span>
          )}
          <span>•</span>
          <span>Posted by u/{author?.display_name || post.author_email?.split('@')[0]}</span>
          <span>•</span>
          <span>{timeAgo}</span>
          {post.is_pinned && <Pin className="w-3 h-3 text-green-400 ml-1" />}
          {post.is_locked && <Lock className="w-3 h-3 text-red-400 ml-1" />}
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-sm leading-snug mb-1 group-hover:text-amber-50 transition-colors flex items-center gap-1.5">
          {TypeIcon && <TypeIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
          {post.title}
        </h3>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex gap-1 mb-1.5">
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Image preview */}
        {post.post_type === 'image' && post.image_url && !compact && (
          <div className="mt-1 mb-2 max-h-64 overflow-hidden rounded-lg">
            <img src={post.image_url} alt="" className="w-full object-cover rounded-lg" />
          </div>
        )}

        {/* Link preview */}
        {post.post_type === 'link' && post.link_url && (
          <div className="mt-1 mb-2 flex items-center gap-1.5 text-xs text-blue-400 truncate">
            <Link2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{post.link_url}</span>
          </div>
        )}

        {/* Text snippet */}
        {post.post_type === 'text' && post.content && !compact && (
          <p className="text-white/40 text-xs line-clamp-2 mb-1.5">{post.content}</p>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-4 mt-1.5">
          <span className="flex items-center gap-1 text-white/30 text-[11px] hover:bg-white/[0.05] px-2 py-1 rounded-sm transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
            {post.reply_count || 0} Comments
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(window.location.origin + createPageUrl('ForumPost') + `?id=${post.id}`); }}
            className="flex items-center gap-1 text-white/30 text-[11px] hover:bg-white/[0.05] px-2 py-1 rounded-sm transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <span className="flex items-center gap-1 text-white/30 text-[11px] hover:bg-white/[0.05] px-2 py-1 rounded-sm transition-colors">
            <Bookmark className="w-3.5 h-3.5" />
            Save
          </span>
        </div>
      </Link>
    </div>
  );
}