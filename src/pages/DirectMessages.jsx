/**
 * DirectMessages — Private creator DM system with channel-filtered inbox.
 * 8 channel headers: general, games, marketplace, brand_partnerships,
 * amphitheatre, pods, music, senate
 * Real-time via Supabase Realtime. Notifications fire for new messages.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseCore';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Search, ChevronLeft, SquarePen, Mail } from 'lucide-react';
import { toast } from 'sonner';

const CHANNELS = [
  { id:'general',            label:'General',           emoji:'💬', color:'#94a3b8' },
  { id:'games',              label:'Gaming',             emoji:'🎮', color:'#3b82f6' },
  { id:'marketplace',        label:'Marketplace',        emoji:'🛍️', color:'#10b981' },
  { id:'brand_partnerships', label:'Brand Partnerships', emoji:'💼', color:'#f5a623' },
  { id:'pods',               label:'Podcasts',           emoji:'🎙️', color:'#ec4899' },
  { id:'music',              label:'Music',              emoji:'🎵', color:'#8b5cf6' },
  { id:'senate',             label:'Senate',             emoji:'⚔️', color:'#f59e0b' },
];

export default function DirectMessages() {
  const [activeChannel, setActiveChannel] = useState('general');
  const [selectedConvo, setSelectedConvo] = useState(null); // {email, name, avatar}
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages]           = useState([]);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [draft, setDraft]                 = useState('');
  const [search, setSearch]               = useState('');
  const [unread, setUnread]               = useState({});
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  const { data: user } = useQuery({ queryKey:['current-user'], queryFn:()=>base44.auth.me() });

  // ── Load conversations for active channel ──────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user?.email) return;
    try {
      const { data } = await supabase
        .from('direct_messages')
        .select('sender_email, recipient_email, message, body, created_at, is_read, channel')
        .or(`sender_email.eq.${user.email},recipient_email.eq.${user.email}`)
        .eq('channel', activeChannel)
        .order('created_at', { ascending: false });

      if (!data) return;
      // Build unique conversations
      const map = {};
      data.forEach(msg => {
        const other = msg.sender_email === user.email ? msg.recipient_email : msg.sender_email;
        if (!map[other]) {
          map[other] = { email: other, name: other.split('@')[0], lastMessage: msg.message || msg.body || '', lastAt: msg.created_at, unread: 0 };
        }
        if (msg.recipient_email === user.email && !msg.is_read) map[other].unread++;
      });
      setConversations(Object.values(map).sort((a,b) => new Date(b.lastAt) - new Date(a.lastAt)));
    } catch (e) { console.error('[DM] load conversations:', e); }
  }, [user?.email, activeChannel]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages for selected conversation ────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!user?.email || !selectedConvo) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('channel', activeChannel)
      .or(`and(sender_email.eq.${user.email},recipient_email.eq.${selectedConvo.email}),and(sender_email.eq.${selectedConvo.email},recipient_email.eq.${user.email})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    // Mark as read
    await supabase.from('direct_messages')
      .update({ is_read: true })
      .eq('recipient_email', user.email)
      .eq('sender_email', selectedConvo.email)
      .eq('channel', activeChannel)
      .eq('is_read', false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
  }, [user?.email, selectedConvo, activeChannel]);

  useEffect(() => { if (selectedConvo) loadMessages(); }, [loadMessages, selectedConvo]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.email) return;
    const channel = supabase
      .channel(`dm_${user.email}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `recipient_email=eq.${user.email}`,
      }, payload => {
        const msg = payload.new;
        if (msg.channel === activeChannel && selectedConvo?.email === msg.sender_email) {
          setMessages(m => [...m, msg]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
        } else {
          // Update unread count
          setUnread(u => ({ ...u, [msg.channel]: (u[msg.channel] || 0) + 1 }));
          toast(`💬 New message in ${CHANNELS.find(c=>c.id===msg.channel)?.label || msg.channel}`, { duration: 3000 });
        }
        loadConversations();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.email, activeChannel, selectedConvo, loadConversations]);

  const sendMessage = async () => {
    if (!draft.trim() || !selectedConvo || !user?.email) return;
    const msg = { sender_email: user.email, recipient_email: selectedConvo.email, message: draft.trim(), channel: activeChannel, is_read: false };
    setDraft('');
    // Optimistic
    setMessages(m => [...m, { ...msg, id: 'pending-' + Date.now(), created_at: new Date().toISOString() }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
    try {
      await supabase.from('direct_messages').insert(msg);
    } catch (e) { toast.error('Failed to send'); }
  };

  const ch = CHANNELS.find(c => c.id === activeChannel);
  const filtered = conversations.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="ll-page-enter min-h-screen bg-[#050508] flex pb-16">

      {/* ── Sidebar / Inbox list (mobile-first, clean layout) ── */}
      <div className={`${selectedConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 md:border-r border-white/8 bg-[#050508]`}>

        {/* Stories row — quick-access avatars */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            {/* Your Story */}
            <button className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-amber-500/40 bg-white/[0.02]">
                <span className="text-2xl text-amber-400/70">+</span>
              </div>
              <span className="text-[11px] text-white/50">Your Story</span>
            </button>
            {/* Channel shortcuts as "stories" */}
            {CHANNELS.slice(0, 6).map(c => (
              <button key={c.id} onClick={() => { setActiveChannel(c.id); setSelectedConvo(null); }}
                className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: `${c.color}18`,
                    border: `2px solid ${activeChannel === c.id ? c.color : c.color + '40'}`,
                  }}>
                  {c.emoji}
                </div>
                <span className="text-[11px] max-w-[64px] truncate"
                  style={{ color: activeChannel === c.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity card */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white/90 font-bold text-sm tracking-wide">Activity</h2>
          </div>
          <div className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(200,135,26,0.12), rgba(138,90,14,0.06))', border: '1px solid rgba(200,135,26,0.2)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#c8871a,#8a5a0e)' }}>
              <span className="text-lg">⚔️</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">Welcome to Legion Live</p>
              <p className="text-white/50 text-xs truncate">Message creators, join the ranks 👋</p>
            </div>
          </div>
        </div>

        {/* Messages header: search + compose */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Messages</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setSearchOpen(s => !s)} className="w-9 h-9 rounded-full flex items-center justify-center ll-interactive">
              <Search className="w-4 h-4 text-white/60" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center ll-interactive">
              <SquarePen className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Search (collapsible) */}
        {searchOpen && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus
                placeholder="Search messages…" className="ll-input py-2.5 pl-9 text-sm w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Conversation list / empty state */}
        <div className="flex-1 overflow-y-auto px-4 pt-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mail className="w-9 h-9 text-white/25" />
              </div>
              <p className="text-white font-semibold text-lg">Your inbox is quiet</p>
              <p className="text-white/40 text-sm mt-1">Go start a new conversation.</p>
              <button className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm ll-interactive"
                style={{ border: '1px solid rgba(200,135,26,0.35)', color: '#e8dcc8' }}>
                <SquarePen className="w-4 h-4" /> New message
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(convo => (
                <button key={convo.email} onClick={() => setSelectedConvo(convo)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl ll-interactive text-left transition-all"
                  style={{
                    background: selectedConvo?.email === convo.email ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold"
                    style={{ background:`${ch?.color}22`, color: ch?.color }}>
                    {convo.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-semibold truncate">{convo.name}</p>
                    <p className="text-white/40 text-xs truncate">{convo.lastMessage}</p>
                  </div>
                  {convo.unread > 0 && (
                    <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0"
                      style={{ background: ch?.color, color:'#000' }}>{convo.unread}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main: Conversation ── */}
      <div className={`${!selectedConvo ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-6xl mb-4">{ch?.emoji}</p>
            <p className="ll-heading text-white text-xl">{ch?.label}</p>
            <p className="text-white/35 text-sm mt-2">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Convo header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8 bg-[#070710] sticky top-0 z-10">
              <button onClick={() => setSelectedConvo(null)} className="md:hidden ll-interactive mr-1">
                <ChevronLeft className="w-5 h-5 text-white/50" />
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
                style={{ background:`${ch?.color}22`, color: ch?.color }}>
                {selectedConvo.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{selectedConvo.name}</p>
                <p className="text-white/30 text-xs flex items-center gap-1">
                  <span>{ch?.emoji}</span> {ch?.label}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => {
                const isMe = msg.sender_email === user?.email;
                return (
                  <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm`}
                      style={{
                        background: isMe ? `${ch?.color}25` : 'rgba(255,255,255,0.07)',
                        border: isMe ? `1px solid ${ch?.color}40` : '1px solid rgba(255,255,255,0.08)',
                        borderBottomRightRadius: isMe ? 4 : undefined,
                        borderBottomLeftRadius: !isMe ? 4 : undefined,
                        color: 'rgba(255,255,255,0.9)',
                      }}>
                      {msg.message || msg.body || ''}
                      <p className="text-[10px] mt-1 opacity-40">
                        {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/8 bg-[#070710]">
              <div className="flex items-center gap-2">
                <input ref={inputRef} value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Message in ${ch?.label}…`}
                  className="ll-input py-2.5 text-sm flex-1" />
                <button onClick={sendMessage} disabled={!draft.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center ll-interactive disabled:opacity-30 transition-all"
                  style={{ background:`${ch?.color}22`, border:`1px solid ${ch?.color}40` }}>
                  <Send className="w-4 h-4" style={{ color: ch?.color }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
