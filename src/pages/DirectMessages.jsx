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
import { Send, Search, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const CHANNELS = [
  { id:'general',            label:'General',           emoji:'💬', color:'#94a3b8' },
  { id:'games',              label:'Gaming',             emoji:'🎮', color:'#3b82f6' },
  { id:'marketplace',        label:'Marketplace',        emoji:'🛍️', color:'#10b981' },
  { id:'brand_partnerships', label:'Brand Partnerships', emoji:'💼', color:'#f5a623' },
  { id:'amphitheatre',       label:'Amphitheatre',       emoji:'📡', color:'#ef4444' },
  { id:'pods',               label:'Podcasts',           emoji:'🎙️', color:'#ec4899' },
  { id:'music',              label:'Music',              emoji:'🎵', color:'#8b5cf6' },
  { id:'senate',             label:'Senate',             emoji:'⚔️', color:'#f59e0b' },
];

export default function DirectMessages() {
  const [activeChannel, setActiveChannel] = useState('general');
  const [selectedConvo, setSelectedConvo] = useState(null); // {email, name, avatar}
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages]           = useState([]);
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
        .select('sender_email, receiver_email, content, created_at, read, channel')
        .or(`sender_email.eq.${user.email},receiver_email.eq.${user.email}`)
        .eq('channel', activeChannel)
        .order('created_at', { ascending: false });

      if (!data) return;
      // Build unique conversations
      const map = {};
      data.forEach(msg => {
        const other = msg.sender_email === user.email ? msg.receiver_email : msg.sender_email;
        if (!map[other]) {
          map[other] = { email: other, name: other.split('@')[0], lastMessage: msg.content, lastAt: msg.created_at, unread: 0 };
        }
        if (msg.receiver_email === user.email && !msg.read) map[other].unread++;
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
      .or(`and(sender_email.eq.${user.email},receiver_email.eq.${selectedConvo.email}),and(sender_email.eq.${selectedConvo.email},receiver_email.eq.${user.email})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    // Mark as read
    await supabase.from('direct_messages')
      .update({ read: true })
      .eq('receiver_email', user.email)
      .eq('sender_email', selectedConvo.email)
      .eq('channel', activeChannel)
      .eq('read', false);
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
        filter: `receiver_email=eq.${user.email}`,
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
    const msg = { sender_email: user.email, receiver_email: selectedConvo.email, content: draft.trim(), channel: activeChannel, read: false };
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

      {/* ── Sidebar: Channel list ── */}
      <div className={`${selectedConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-white/8 bg-[#070710]`}>
        {/* Channel tabs */}
        <div className="p-3 border-b border-white/8">
          <p className="ll-label text-white/25 mb-2 px-1">CHANNELS</p>
          <div className="space-y-0.5">
            {CHANNELS.map(c => (
              <button key={c.id} onClick={() => { setActiveChannel(c.id); setSelectedConvo(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl ll-interactive text-left transition-all"
                style={{
                  background: activeChannel === c.id ? `${c.color}15` : 'transparent',
                  border: activeChannel === c.id ? `1px solid ${c.color}30` : '1px solid transparent',
                }}>
                <span className="text-base leading-none">{c.emoji}</span>
                <span className="text-sm font-medium flex-1"
                  style={{ color: activeChannel === c.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>{c.label}</span>
                {(unread[c.id] || 0) > 0 && (
                  <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: c.color, color: '#000' }}>{unread[c.id]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search + conversation list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search messages…" className="ll-input py-2 pl-9 text-sm" />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">{ch?.emoji}</p>
              <p className="text-white/30 text-sm">No conversations yet</p>
              <p className="text-white/20 text-xs mt-1">in {ch?.label}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(convo => (
                <button key={convo.email} onClick={() => setSelectedConvo(convo)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl ll-interactive text-left transition-all"
                  style={{
                    background: selectedConvo?.email === convo.email ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedConvo?.email === convo.email ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
                  }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ background:`${ch?.color}22`, color: ch?.color }}>
                    {convo.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-semibold truncate">{convo.name}</p>
                    <p className="text-white/30 text-xs truncate">{convo.lastMessage}</p>
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
                      {msg.content}
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
