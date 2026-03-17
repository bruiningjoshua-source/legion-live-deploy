import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Bell, Shield, User, LogOut,
  AlertTriangle, Palette, Sparkles, Zap, Monitor, Trash2,
  Image, ChevronRight, Check, Sun, Moon, Layers, Eye,
  Sliders, RefreshCw, HelpCircle, FileText, Lock
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import DeleteAccountModal from '@/components/settings/DeleteAccountModal';

const THEMES = [
  { id: 'roman',    name: 'Roman Gold',   colors: ['#d97706','#f59e0b','#fbbf24'], icon: '🏛️', desc: 'Classic amber & gold' },
  { id: 'neon',     name: 'Neon Nights',  colors: ['#ec4899','#8b5cf6','#06b6d4'], icon: '💜', desc: 'Purple & pink fusion' },
  { id: 'ocean',    name: 'Ocean Blue',   colors: ['#0ea5e9','#06b6d4','#22d3ee'], icon: '🌊', desc: 'Cool aqua tones' },
  { id: 'fire',     name: 'Fire Red',     colors: ['#ef4444','#f97316','#eab308'], icon: '🔥', desc: 'Warm red & orange' },
  { id: 'midnight', name: 'Midnight',     colors: ['#6366f1','#8b5cf6','#a855f7'], icon: '🌙', desc: 'Deep indigo vibes' },
  { id: 'cyber',    name: 'Cyberpunk',    colors: ['#00ff88','#00ccff','#ff00aa'], icon: '🤖', desc: 'Neon green & cyan' },
  { id: 'forest',   name: 'Forest',       colors: ['#22c55e','#16a34a','#4ade80'], icon: '🌲', desc: 'Natural greens' },
  { id: 'crimson',  name: 'Crimson War',  colors: ['#dc2626','#991b1b','#fca5a5'], icon: '⚔️', desc: 'Battle-red intensity' },
];

const BACKGROUNDS = [
  { id: 'roman',    name: 'Roman Colosseum', desc: 'Warm gold & crimson', preview: 'linear-gradient(135deg,#3d1a00,#7a0000,#1a0800)' },
  { id: 'space',    name: 'Deep Space',      desc: 'Dark cosmos', preview: 'linear-gradient(135deg,#000014,#0a0020,#020014)' },
  { id: 'forge',    name: 'Iron Forge',      desc: 'Dark steel & ember', preview: 'linear-gradient(135deg,#111,#2a1a00,#1a1400)' },
  { id: 'abyss',    name: 'Abyss',           desc: 'Pure dark depth', preview: 'linear-gradient(135deg,#050508,#0a0a10,#050508)' },
  { id: 'violet',   name: 'Violet Storm',    desc: 'Deep purple energy', preview: 'linear-gradient(135deg,#0d0020,#1a0035,#0a0015)' },
  { id: 'ocean',    name: 'Ocean Depths',    desc: 'Deep sea dark blue', preview: 'linear-gradient(135deg,#000c1a,#001a35,#000c1a)' },
  { id: 'emerald',  name: 'Emerald Jungle',  desc: 'Dark green canopy', preview: 'linear-gradient(135deg,#001a0d,#003520,#001a0d)' },
  { id: 'custom',   name: 'Custom Upload',   desc: 'Your own image', preview: 'linear-gradient(135deg,#1a1a1a,#333,#1a1a1a)' },
];

const BG_GRADIENTS = {
  roman:    { top: '#3d1a00/60', mid: '#7a0000/30', glow: '#c8800020' },
  space:    { top: '#000014/70', mid: '#0a0020/40', glow: '#4444ff15' },
  forge:    { top: '#1a1100/60', mid: '#2a1a00/35', glow: '#ff660015' },
  abyss:    { top: '#050508/80', mid: '#0a0a10/50', glow: '#ffffff08' },
  violet:   { top: '#1a0035/60', mid: '#0d0020/40', glow: '#7c3aed20' },
  ocean:    { top: '#001a35/60', mid: '#000c1a/40', glow: '#0ea5e920' },
  emerald:  { top: '#003520/60', mid: '#001a0d/40', glow: '#10b98120' },
  custom:   { top: '#0a0a0a/60', mid: '#050505/40', glow: '#ffffff08' },
};

export default function Settings() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeSection, setActiveSection] = useState('appearance');

  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('legion_notifications') || '{}'); } catch { return {}; }
  });
  const notifDefaults = { liveAlerts: true, giftAlerts: true, followAlerts: true, eventReminders: true };

  const [appearance, setAppearance] = useState(() => ({
    theme:      localStorage.getItem('legion_theme')      || 'roman',
    background: localStorage.getItem('legion_background') || 'roman',
    particles:  localStorage.getItem('legion_particles')  || 'medium',
    animatedBg: localStorage.getItem('legion_animated_bg') !== 'false',
    reducedMotion: localStorage.getItem('legion_reduced_motion') === 'true',
    customBgUrl: localStorage.getItem('legion_custom_bg_url') || '',
  }));

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const dispatch = (detail) => {
    window.dispatchEvent(new CustomEvent('legion-theme-change', { detail }));
  };

  const setTheme = (id) => {
    setAppearance(p => ({ ...p, theme: id }));
    localStorage.setItem('legion_theme', id);
    dispatch({ theme: id });
    toast.success(`Theme: ${THEMES.find(t => t.id === id)?.name}`);
  };

  const setBg = (id) => {
    setAppearance(p => ({ ...p, background: id }));
    localStorage.setItem('legion_background', id);
    dispatch({ background: id });
    toast.success(`Background: ${BACKGROUNDS.find(b => b.id === id)?.name}`);
  };

  const setParticles = (val) => {
    const modes = ['off', 'low', 'medium', 'high'];
    const mode = modes[val];
    setAppearance(p => ({ ...p, particles: mode }));
    localStorage.setItem('legion_particles', mode);
    dispatch({ particles: mode });
  };

  const setAnimatedBg = (v) => {
    setAppearance(p => ({ ...p, animatedBg: v }));
    localStorage.setItem('legion_animated_bg', v.toString());
    dispatch({ animatedBg: v });
  };

  const setReducedMotion = (v) => {
    setAppearance(p => ({ ...p, reducedMotion: v }));
    localStorage.setItem('legion_reduced_motion', v.toString());
  };

  const handleCustomBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setAppearance(p => ({ ...p, customBgUrl: res.file_url, background: 'custom' }));
      localStorage.setItem('legion_custom_bg_url', res.file_url);
      localStorage.setItem('legion_background', 'custom');
      dispatch({ background: 'custom', customBgUrl: res.file_url });
      toast.success('Custom background applied!');
    } catch {
      toast.error('Upload failed. Try again.');
    }
  };

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <div className="min-h-screen pt-20 pb-24 bg-[#09090b]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-amber-500/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-amber-400" /> Settings
          </h1>
          <p className="text-white/40 text-sm">Customize your Legion Live experience</p>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 bg-white/[0.04] p-1 rounded-2xl mb-6 border border-white/[0.06] overflow-x-auto scrollbar-hide">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeSection === s.id ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/45 hover:text-white'
              }`}
            >
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── Appearance ── */}
        {activeSection === 'appearance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Color Theme */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" /> Color Theme
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      appearance.theme === theme.id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-white/[0.08] hover:border-white/20 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      {theme.colors.map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-sm">{theme.icon}</span>
                      <span className="text-white/80 text-xs font-medium">{theme.name}</span>
                    </div>
                    <p className="text-white/30 text-[10px]">{theme.desc}</p>
                    {appearance.theme === theme.id && <Check className="w-3 h-3 text-amber-400 mt-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Image className="w-4 h-4 text-violet-400" /> App Background
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {BACKGROUNDS.map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => bg.id !== 'custom' ? setBg(bg.id) : null}
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      appearance.background === bg.id
                        ? 'border-amber-500'
                        : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <div className="h-14 w-full" style={{ background: bg.preview }} />
                    <div className="py-1.5 px-2 bg-white/[0.03] text-left">
                      <p className="text-white/75 text-[10px] font-medium">{bg.name}</p>
                      <p className="text-white/30 text-[9px]">{bg.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {/* Custom upload */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/[0.15] hover:border-amber-500/40 cursor-pointer transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <Image className="w-4 h-4 text-white/40 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm font-medium">Upload Custom Background</p>
                  <p className="text-white/30 text-xs">JPG, PNG, WebP · max 5MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleCustomBgUpload} />
              </label>
              {appearance.customBgUrl && (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs">Custom background active</span>
                  <button
                    onClick={() => { setAppearance(p => ({ ...p, customBgUrl: '', background: 'roman' })); localStorage.removeItem('legion_custom_bg_url'); localStorage.setItem('legion_background', 'roman'); }}
                    className="ml-auto text-white/30 hover:text-white/60 text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Particle & Motion */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 space-y-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" /> Visual Effects
              </h3>

              {/* Particles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-white/80 text-sm font-medium">Particle Effects</span>
                  </div>
                  <span className="text-amber-400 text-xs capitalize font-semibold">{appearance.particles}</span>
                </div>
                <Slider
                  value={[['off','low','medium','high'].indexOf(appearance.particles)]}
                  onValueChange={([v]) => setParticles(v)}
                  min={0} max={3} step={1}
                  className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-500"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1.5">
                  {['Off','Low','Medium','High'].map(l => <span key={l}>{l}</span>)}
                </div>
              </div>

              <Separator className="bg-white/[0.06]" />

              {/* Animated bg */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-white/80 text-sm font-medium">Animated Background</p>
                    <p className="text-white/35 text-xs">Floating gradient orbs</p>
                  </div>
                </div>
                <Switch checked={appearance.animatedBg} onCheckedChange={setAnimatedBg} />
              </div>

              <Separator className="bg-white/[0.06]" />

              {/* Reduced motion */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-white/80 text-sm font-medium">Reduced Motion</p>
                    <p className="text-white/35 text-xs">Minimize all animations</p>
                  </div>
                </div>
                <Switch checked={appearance.reducedMotion} onCheckedChange={setReducedMotion} />
              </div>

              {/* Reset */}
              <button
                onClick={() => {
                  setTheme('roman'); setBg('roman'); setParticles(2); setAnimatedBg(true);
                  toast.success('Appearance reset to defaults');
                }}
                className="flex items-center gap-2 text-white/35 hover:text-white/60 text-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset to defaults
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Notifications ── */}
        {activeSection === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
              {[
                { key: 'liveAlerts',      title: 'Live Alerts',         desc: 'Notify when followed creators go live',    icon: '🔴' },
                { key: 'giftAlerts',      title: 'Gift Notifications',  desc: 'Alerts when you receive gifts',            icon: '🎁' },
                { key: 'followAlerts',    title: 'New Followers',       desc: 'Notify of new followers',                  icon: '👥' },
                { key: 'eventReminders',  title: 'Event Reminders',     desc: 'Upcoming streams and tournaments',          icon: '📅' },
                { key: 'messageAlerts',   title: 'Direct Messages',     desc: 'New messages and DMs',                     icon: '💬' },
                { key: 'payoutAlerts',    title: 'Payout Updates',      desc: 'Earnings and withdrawal status',           icon: '💰' },
              ].map((item, i, arr) => {
                const val = notifications[item.key] ?? notifDefaults[item.key] ?? false;
                return (
                  <div key={item.key} className={`flex items-center gap-3 px-4 py-4 ${i < arr.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                    <span className="text-xl w-8 text-center">{item.icon}</span>
                    <div className="flex-1">
                      <p className="text-white/85 text-sm font-medium">{item.title}</p>
                      <p className="text-white/40 text-xs">{item.desc}</p>
                    </div>
                    <Switch
                      checked={val}
                      onCheckedChange={(checked) => {
                        const next = { ...notifications, [item.key]: checked };
                        setNotifications(next);
                        localStorage.setItem('legion_notifications', JSON.stringify(next));
                        toast.success(`${item.title} ${checked ? 'on' : 'off'}`);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Privacy ── */}
        {activeSection === 'privacy' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
              {[
                { key: 'private_profile', title: 'Private Profile',      desc: 'Only approved followers see your activity', icon: Eye },
                { key: 'hide_gifts',      title: 'Hide Gift History',    desc: "Don't show gifts you've sent publicly",      icon: Shield },
                { key: 'block_chat',      title: 'Block Chat Invites',   desc: 'Only followers can message you',             icon: Lock },
                { key: 'hide_online',     title: 'Hide Online Status',   desc: "Don't show when you're active",              icon: Monitor },
              ].map((item, i, arr) => {
                const saved = localStorage.getItem(`legion_privacy_${item.key}`) === 'true';
                return (
                  <div key={item.key} className={`flex items-center gap-3 px-4 py-4 ${i < arr.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/85 text-sm font-medium">{item.title}</p>
                      <p className="text-white/40 text-xs">{item.desc}</p>
                    </div>
                    <Switch
                      defaultChecked={saved}
                      onCheckedChange={(checked) => {
                        localStorage.setItem(`legion_privacy_${item.key}`, checked.toString());
                        toast.success(`${item.title} ${checked ? 'enabled' : 'disabled'}`);
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Legal links */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-2">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">Legal</h3>
              {[
                { label: 'Privacy Policy', path: 'PrivacyPolicy' },
                { label: 'Terms of Service', path: 'TermsOfService' },
                { label: 'Data Privacy (GDPR)', path: 'DataPrivacy' },
              ].map(({ label, path }) => (
                <Link key={path} to={createPageUrl(path)} className="flex items-center justify-between py-2 text-white/60 hover:text-white text-sm transition-colors group">
                  {label}
                  <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-amber-400 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Account ── */}
        {activeSection === 'account' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" /> Account Info
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-white/40 text-xs mb-1">Email</p>
                  <p className="text-white/80 text-sm bg-white/[0.04] px-3 py-2.5 rounded-xl border border-white/[0.06]">{user?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Full Name</p>
                  <p className="text-white/80 text-sm bg-white/[0.04] px-3 py-2.5 rounded-xl border border-white/[0.06]">{user?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Role</p>
                  <p className="text-white/80 text-sm bg-white/[0.04] px-3 py-2.5 rounded-xl border border-white/[0.06] capitalize">{user?.role || 'user'}</p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-1">
              {[
                { label: 'Edit Profile', path: 'Profile', icon: User },
                { label: 'Help & FAQ', path: 'HelpAndInfo', icon: HelpCircle },
              ].map(({ label, path, icon: Icon }) => (
                <Link key={path} to={createPageUrl(path)} className="flex items-center justify-between py-3 text-white/65 hover:text-white text-sm transition-colors group border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-white/30" />{label}</div>
                  <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-amber-400" />
                </Link>
              ))}
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl bg-red-900/15 border border-red-500/20 p-5">
              <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => base44.auth.logout()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-600/40 text-red-500 hover:bg-red-900/30 text-sm font-semibold transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
            </div>

            <p className="text-center text-white/20 text-xs pb-4">
              © 2026 Legion Live Inc. · Built by Legion Software Smiths
            </p>
          </motion.div>
        )}
      </div>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        userEmail={user?.email}
        onConfirm={async () => {
          toast.success('Account deletion submitted. Your data will be removed within 24 hours.');
          setShowDeleteModal(false);
          await base44.auth.logout();
        }}
      />
    </div>
  );
}