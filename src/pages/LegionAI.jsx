import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import LegionChatBubble from '@/components/legion/LegionChatBubble';
import LegionTypingIndicator from '@/components/legion/LegionTypingIndicator';
import VoiceButton from '@/components/legion/VoiceButton';
import useVoiceInput from '@/components/legion/useVoiceInput';

const SUGGESTIONS = [
  { text: "📊 Analyze my stream performance", icon: "chart" },
  { text: "📅 Help me schedule streams this week", icon: "calendar" },
  { text: "✍️ Write a stream announcement", icon: "message" },
  { text: "🎯 Set goals for this month", icon: "target" },
  { text: "💡 Give me content ideas", icon: "idea" },
  { text: "💰 How can I earn more?", icon: "money" },
  { text: "🚀 Give me a pep talk", icon: "boost" },
  { text: "📈 Who are my top supporters?", icon: "fans" },
];

export default function LegionAI() {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('legion_chat') || '[]');
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [talkbackOn, setTalkbackOn] = useState(() => localStorage.getItem('legion_talkback') !== 'off');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60_000,
  });

  // TTS — speak Legion's reply (talkback)
  const speakReply = useCallback((text) => {
    if (!talkbackOn || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`>\-\[\]()]/g, '').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, [talkbackOn]);

  const toggleTalkback = useCallback(() => {
    setTalkbackOn(prev => {
      const next = !prev;
      localStorage.setItem('legion_talkback', next ? 'on' : 'off');
      if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      return next;
    });
  }, []);

  // Send message handler
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: 'user', content: trimmed, timestamp: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await base44.functions.invoke('legionCompanionChat', { message: trimmed });
      // Surface backend errors instead of hiding them behind a generic message
      if (res.data?.error) {
        throw new Error(res.data.detail ? `${res.data.error}: ${res.data.detail}` : res.data.error);
      }
      const reply = res.data?.reply || 'Sorry, I had trouble responding. Try again.';
      const actions = res.data?.actions || [];
      const botMsg = { role: 'assistant', content: reply, actions, timestamp: Date.now() };
      const final = [...nextMessages, botMsg];
      setMessages(final);
      sessionStorage.setItem('legion_chat', JSON.stringify(final));
      speakReply(reply);
    } catch (err) {
      console.error('Legion AI error:', err);
      const errMsg = { role: 'assistant', content: `Connection issue: ${err.message || 'try again in a moment.'}`, timestamp: Date.now() };
      const final = [...nextMessages, errMsg];
      setMessages(final);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, speakReply]);

  // Voice input
  const voice = useVoiceInput({
    onResult: (transcript) => {
      sendMessage(transcript);
    },
  });

  const handleVoiceToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Load voices for TTS
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const clearChat = () => {
    setMessages([]);
    sessionStorage.removeItem('legion_chat');
    window.speechSynthesis?.cancel();
    toast.success('Chat cleared');
  };

  const firstName = user?.full_name?.split(' ')[0] || 'Creator';

  return (
    <div className="flex flex-col h-screen bg-[#09090b] pt-14 pb-16">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-sm flex items-center gap-1.5">
                  Legion AI
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h1>
                <p className="text-white/35 text-[10px]">Your personal creator companion</p>
              </div>
            </div>
          </div>

          {messages.length > 0 && (
            <button onClick={clearChat} className="text-white/30 hover:text-red-400 transition-colors p-2">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center pt-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-1">Hey {firstName}!</h2>
            <p className="text-white/40 text-sm mb-6 max-w-xs">
              I'm Legion — your AI companion. I can analyze your streams, schedule content, craft messages, set goals, and help you grow. What do you need?
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => sendMessage(s.text)}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs hover:bg-purple-500/10 hover:border-purple-500/20 hover:text-purple-300 transition-all"
                >
                  {s.text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <LegionChatBubble key={i} message={msg} />
          ))}
        </AnimatePresence>

        {isLoading && <LegionTypingIndicator />}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#09090b]/90 backdrop-blur-sm px-4 py-3 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <VoiceButton
            isListening={voice.isListening}
            isSupported={voice.isSupported}
            onToggle={handleVoiceToggle}
            transcript={voice.transcript}
          />

          <div className="flex-1 flex items-center bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 h-11 focus-within:border-purple-500/40 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={voice.isListening ? 'Listening...' : 'Ask Legion anything...'}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
              disabled={isLoading || voice.isListening}
            />
          </div>

          <motion.button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            whileTap={{ scale: 0.9 }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-br from-purple-500 to-amber-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/[0.06] text-white/20'
            }`}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>

        {voice.error && (
          <p className="text-red-400/70 text-xs text-center mt-2">
            Voice error: {voice.error}
          </p>
        )}
      </div>
    </div>
  );
}