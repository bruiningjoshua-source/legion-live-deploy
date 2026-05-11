import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sword, Plus } from 'lucide-react';

export default function ForumSidebar({ categories = [], stats = {} }) {
  return (
    <div className="space-y-3 w-72 flex-shrink-0">
      {/* About Community */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-red-600 px-4 py-3 flex items-center gap-2">
          <Sword className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">About The Senate</span>
        </div>
        <div className="p-4">
          <p className="text-white/50 text-xs mb-4">
            The official community forum for Legion Live. Discuss streams, share clips, trade strategies, and connect with fellow legionnaires.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-white font-bold text-lg">{stats.members || '—'}</p>
              <p className="text-white/40 text-[10px]">Members</p>
            </div>
            <div>
              <p className="text-green-400 font-bold text-lg">{stats.online || '—'}</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-white/40 text-[10px]">Online</p>
              </div>
            </div>
          </div>
          <p className="text-white/30 text-[10px] mb-3">Created Jan 1, 2026</p>
          <Link to={createPageUrl('ForumPost')}>
            <button className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs py-2 rounded-full transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Create Post
            </button>
          </Link>
        </div>
      </div>

      {/* Senates (Categories = subreddits) */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
        <p className="text-white/50 text-[10px] font-semibold tracking-widest uppercase mb-3">Senates</p>
        <div className="space-y-0.5">
          {categories.map(cat => (
            <button
              key={cat.id || cat.name}
              className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{cat.icon || '📌'}</span>
                <span className="text-white/70 text-xs group-hover:text-white transition-colors">s/{cat.name}</span>
              </div>
              <span className="text-white/25 text-[10px]">{cat.post_count || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
        <p className="text-white/50 text-[10px] font-semibold tracking-widest uppercase mb-3">Senate Rules</p>
        <ol className="space-y-2 text-white/50 text-xs">
          <li className="flex gap-2"><span className="text-amber-400 font-bold">1.</span> Be respectful to all legionnaires</li>
          <li className="flex gap-2"><span className="text-amber-400 font-bold">2.</span> No spam or self-promotion</li>
          <li className="flex gap-2"><span className="text-amber-400 font-bold">3.</span> Use appropriate flairs/tags</li>
          <li className="flex gap-2"><span className="text-amber-400 font-bold">4.</span> No NSFW content outside marked areas</li>
          <li className="flex gap-2"><span className="text-amber-400 font-bold">5.</span> No doxxing or harassment</li>
        </ol>
      </div>
    </div>
  );
}