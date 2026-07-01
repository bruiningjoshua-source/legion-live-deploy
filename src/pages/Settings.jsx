import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getColorScheme, setColorScheme } from '@/lib/darkMode';
import { Sun, Shield, User, LogOut, Palette,
  Sparkles, Zap, Monitor, Trash2, Image, ChevronRight,
  Check, Eye, RefreshCw, HelpCircle, Lock
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import DeleteAccountModal from '@/components/settings/DeleteAccountModal';

const THEMES = [
  { id:'roman',    name:'Gold',       primary:'#f5a623', secondary:'#e63946' },
  { id:'neon',     name:'Neon',       primary:'#ec4899', secondary:'#8b5cf6' },
  { id:'ocean',    name:'Ocean',      primary:'#06b6d4', secondary:'#3b82f6' },
  { id:'fire',     name:'Fire',       primary:'#ef4444', secondary:'#f97316' },
  { id:'midnight', name:'Midnight',   primary:'#8b5cf6', secondary:'#6366f1' },
  { id:'cyber',    name:'Cyber',      primary:'#00ff88', secondary:'#00ccff' },
  { id:'forest',   name:'Forest',     primary:'#22c55e', secondary:'#10b981' },
  { id:'crimson',  name:'Crimson',    primary:'#dc2626', secondary:'#fca5a5' },
];

const BACKGROUNDS = [
  { id:'roman',   name:'Forge',       preview:'linear-gradient(135deg,#1a0800,#3d1a00,#7a0000)' },
  { id:'space',   name:'Cosmos',      preview:'linear-gradient(135deg,#000014,#050028,#0a0020)' },
  { id:'abyss',   name:'Void',        preview:'linear-gradient(135deg,#050508,#08080e,#050508)' },
  { id:'violet',  name:'Storm',       preview:'linear-gradient(135deg,#0d0020,#1a0035,#0a0015)' },
  { id:'ocean',   name:'Deep Sea',    preview:'linear-gradient(135deg,#000c1a,#001a35,#000c1a)' },
  { id:'emerald', name:'Jungle',      preview:'linear-gradient(135deg,#001a0d,#003520,#001a0d)' },
  { id:'forge',   name:'Ember',       preview:'linear-gradient(135deg,#111,#2a1a00,#1a1400)' },
  { id:'custom',  name:'Custom',      preview:'linear-gradient(135deg,#1a1a1a,#333,#1a1a1a)' },
];

const NAV = [
  { id:'appearance',   label:'Appearance',    icon:'🎨' },
  { id:'notifications',label:'Notifications', icon:'🔔' },
  { id:'privacy',      label:'Privacy',       icon:'🔒' },
  { id:'account',      label:'Account',       icon:'👤' },
];

const fade = { hidden:{ opacity:0, y:8 }, show:{ opacity:1, y:0, transition:{ duration:0.22 } } };

export default function Settings() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [colorScheme, setColorSchemeState] = useState(() => getColorScheme());

  const toggleDarkMode = (isDark) => {
    const scheme = isDark ? 'dark' : 'light';
    setColorScheme(scheme);
    setColorSchemeState(scheme);
  };
  const [activeSection, setActiveSection] = useState('appearance');

  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('legion_notifications') || '{}'); } catch { return {}; }
  });

  const [appearance, setAppearance] = useState(() => ({
    theme:         localStorage.getItem('legion_theme')          || 'roman',
    background:    localStorage.getItem('legion_background')     || 'roman',
    particles:     parseInt(localStorage.getItem('legion_particles_v') || '2', 10),
    animatedBg:    localStorage.getItem('legion_animated_bg') !== 'false',
    reducedMotion: localStorage.getItem('legion_reduced_motion') === 'true',
    customBgUrl:   localStorage.getItem('legion_custom_bg_url')  || '',
  }));

  const { data: user } = useQuery({ queryKey:['current-user'], queryFn:() => base44.auth.me() });

  const dispatch = detail => window.dispatchEvent(new CustomEvent('legion-theme-change', { detail }));

  const setTheme = id => {
    setAppearance(p => ({ ...p, theme: id }));
    localStorage.setItem('legion_theme', id);
    dispatch({ theme: id });
    toast.success(`Theme: ${THEMES.find(t => t.id === id)?.name}`);
  };

  const setBg = id => {
    setAppearance(p => ({ ...p, background: id }));
    localStorage.setItem('legion_background', id);
    dispatch({ background: id });
  };

  const setParticles = v => {
    const labels = ['off','low','medium','high'];
    setAppearance(p => ({ ...p, particles: v }));
    localStorage.setItem('legion_particles_v', String(v));
    localStorage.setItem('legion_particles', labels[v]);
    dispatch({ particles: labels[v] });
  };

  const setAnimatedBg = v => {
    setAppearance(p => ({ ...p, animatedBg: v }));
    localStorage.setItem('legion_animated_bg', String(v));
    dispatch({ animatedBg: v });
  };

  const setReducedMotion = v => {
    setAppearance(p => ({ ...p, reducedMotion: v }));
    localStorage.setItem('legion_reduced_motion', String(v));
  };

  const handleCustomBgUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target.result;
      setAppearance(p => ({ ...p, customBgUrl: url, background: 'custom' }));
      localStorage.setItem('legion_custom_bg_url', url);
      localStorage.setItem('legion_background', 'custom');
      dispatch({ customBgUrl: url, background: 'custom' });
      toast.success('Custom background applied');
    };
    reader.readAsDataURL(file);
  };

  const notifDefaults = { liveAlerts:true, giftAlerts:true, followAlerts:true, eventReminders:true };
  const particleLabel = ['Off','Low','Medium','High'][appearance.particles] || 'Medium';
  const activeTheme   = THEMES.find(t => t.id === appearance.theme) || THEMES[0];

  return (
    <div className="ll-page-enter min-h-screen bg-[#050508] pb-24">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4">
        <p className="ll-label text-white/25 mb-1">PREFERENCES</p>
        <h1 className="ll-heading text-2xl text-white">Settings</h1>
      </div>

      {/* ── Section nav ────────────────────────────────────────── */}
      <div className="px-4 mb-5">
        <div className="ll-card p-1.5 flex gap-1">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveSection(n.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeSection === n.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeSection === n.id ? '#fff' : 'rgba(255,255,255,0.35)',
              }}>
              <span className="text-base leading-none">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="px-4 space-y-4">
        <AnimatePresence mode="wait">

          {/* ── APPEARANCE ──────────────────────────────────────── */}
          {activeSection === 'appearance' && (
            <motion.div key="appearance" variants={fade} initial="hidden" animate="show" className="space-y-4">

              {/* Accent color */}
              <div className="ll-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${activeTheme.primary}22`, border: `1px solid ${activeTheme.primary}44` }}>
                    <Palette className="w-3.5 h-3.5" style={{ color: activeTheme.primary }} />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Accent Color</p>
                    <p className="text-white/35 text-xs">Active: {activeTheme.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl ll-interactive transition-all"
                      style={{
                        background: appearance.theme === t.id ? `${t.primary}18` : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${appearance.theme === t.id ? t.primary + '60' : 'rgba(255,255,255,0.07)'}`,
                      }}>
                      {/* Color swatch */}
                      <div className="w-8 h-8 rounded-full relative overflow-hidden"
                        style={{ background:`linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}>
                        {appearance.theme === t.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold"
                        style={{ color: appearance.theme === t.id ? t.primary : 'rgba(255,255,255,0.45)' }}>
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background */}
              <div className="ll-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                    <Image className="w-3.5 h-3.5 text-white/50" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">App Background</p>
                    <p className="text-white/35 text-xs">Choose your ambient style</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {BACKGROUNDS.map(bg => (
                    <button key={bg.id} onClick={() => bg.id !== 'custom' && setBg(bg.id)}
                      className="ll-interactive flex flex-col gap-1.5 rounded-xl overflow-hidden transition-all"
                      style={{ border:`1.5px solid ${appearance.background === bg.id ? 'rgba(245,166,35,0.6)' : 'rgba(255,255,255,0.07)'}` }}>
                      <div className="h-12" style={{ background: bg.preview }} />
                      <p className="text-center text-[10px] font-semibold pb-1.5"
                        style={{ color: appearance.background === bg.id ? '#f5a623' : 'rgba(255,255,255,0.4)' }}>
                        {bg.name}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Custom upload */}
                <label className="flex items-center gap-3 p-3 rounded-xl ll-interactive cursor-pointer"
                  style={{ border:'1.5px dashed rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.02)' }}>
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
                    <Image className="w-4 h-4 text-white/35" />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-medium">Upload custom image</p>
                    <p className="text-white/30 text-xs">JPG / PNG / WebP · max 5MB</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCustomBgUpload} />
                </label>

                {appearance.customBgUrl && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)' }}>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 text-xs flex-1">Custom background active</span>
                    <button onClick={() => {
                      setAppearance(p => ({ ...p, customBgUrl:'', background:'roman' }));
                      localStorage.removeItem('legion_custom_bg_url');
                      localStorage.setItem('legion_background','roman');
                      dispatch({ background:'roman', customBgUrl:'' });
                    }} className="text-white/30 hover:text-white/60 text-xs ll-interactive">Remove</button>
                  </div>
                )}
              </div>

              {/* Effects */}
              <div className="ll-card p-4 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-white font-semibold text-sm">Visual Effects</p>
                </div>

                {/* Particle slider */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm">Particle density</p>
                    <span className="ll-pill ll-pill-gold">{particleLabel}</span>
                  </div>
                  <Slider value={[appearance.particles]}
                    onValueChange={([v]) => setParticles(v)}
                    min={0} max={3} step={1}
                    className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-500 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5" />
                  <div className="flex justify-between mt-2">
                    {['Off','Low','Medium','High'].map(l => (
                      <span key={l} className="ll-label text-white/25">{l}</span>
                    ))}
                  </div>
                </div>

                <div className="ll-divider !my-0" />

                {/* Toggles */}
                {[
                  { key:'animatedBg', label:'Animated background', sub:'Floating gradient orbs', val:appearance.animatedBg, set:setAnimatedBg, icon:Zap },
                  { key:'reducedMotion', label:'Reduce motion', sub:'Minimises all animations', val:appearance.reducedMotion, set:setReducedMotion, icon:Monitor },
                ].map(({ key, label, sub, val, set, icon:Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-white/40" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-medium">{label}</p>
                        <p className="text-white/35 text-xs">{sub}</p>
                      </div>
                    </div>
                    <Switch checked={val} onCheckedChange={set} />
                  </div>
                ))}

                {/* Dark / Light mode */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">Light Mode</p>
                      <p className="text-white/35 text-xs">Switch to light colour scheme</p>
                    </div>
                  </div>
                  <Switch checked={colorScheme === 'light'} onCheckedChange={v => toggleDarkMode(!v)} />
                </div>

                <button onClick={() => { setTheme('roman'); setBg('roman'); setParticles(2); setAnimatedBg(true); setReducedMotion(false); toast.success('Reset to defaults'); }}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/55 text-xs transition-colors ll-interactive">
                  <RefreshCw className="w-3 h-3" /> Reset defaults
                </button>
              </div>
            </motion.div>
          )}

          {/* ── NOTIFICATIONS ───────────────────────────────────── */}
          {activeSection === 'notifications' && (
            <motion.div key="notifs" variants={fade} initial="hidden" animate="show">
              <div className="ll-card overflow-hidden">
                {[
                  { key:'liveAlerts',     label:'Live alerts',        sub:'When followed creators go live',   emoji:'🔴' },
                  { key:'giftAlerts',     label:'Gift notifications',  sub:'When you receive a gift',          emoji:'🎁' },
                  { key:'followAlerts',   label:'New followers',       sub:'When someone follows you',         emoji:'👥' },
                  { key:'eventReminders', label:'Event reminders',     sub:'Upcoming streams & tournaments',   emoji:'📅' },
                  { key:'messageAlerts',  label:'Direct messages',     sub:'New messages and DMs',             emoji:'💬' },
                  { key:'payoutAlerts',   label:'Payout updates',      sub:'Earnings and withdrawal status',   emoji:'💰' },
                ].map((item, i, arr) => {
                  const val = notifications[item.key] ?? notifDefaults[item.key] ?? false;
                  return (
                    <div key={item.key}
                      className="flex items-center gap-3 px-4 py-4"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div className="w-10 h-10 rounded-xl ll-card-inset flex items-center justify-center shrink-0 text-lg">
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/85 text-sm font-medium">{item.label}</p>
                        <p className="text-white/35 text-xs">{item.sub}</p>
                      </div>
                      <Switch checked={val} onCheckedChange={checked => {
                        const next = { ...notifications, [item.key]: checked };
                        setNotifications(next);
                        localStorage.setItem('legion_notifications', JSON.stringify(next));
                        toast.success(`${item.label} ${checked ? 'on' : 'off'}`);
                      }} />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── PRIVACY ─────────────────────────────────────────── */}
          {activeSection === 'privacy' && (
            <motion.div key="privacy" variants={fade} initial="hidden" animate="show" className="space-y-4">
              <div className="ll-card overflow-hidden">
                {[
                  { key:'private_profile', label:'Private profile',    sub:'Only followers see your activity',   icon:Eye },
                  { key:'hide_gifts',      label:'Hide gift history',   sub:"Don't show gifts you've sent",       icon:Shield },
                  { key:'block_chat',      label:'Block chat invites',  sub:'Only followers can message you',     icon:Lock },
                  { key:'hide_online',     label:'Hide online status',  sub:"Don't show when you're active",      icon:Monitor },
                ].map((item, i, arr) => {
                  const saved = localStorage.getItem(`legion_privacy_${item.key}`) === 'true';
                  return (
                    <div key={item.key}
                      className="flex items-center gap-3 px-4 py-4"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div className="w-10 h-10 rounded-xl ll-card-inset flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/85 text-sm font-medium">{item.label}</p>
                        <p className="text-white/35 text-xs">{item.sub}</p>
                      </div>
                      <Switch defaultChecked={saved} onCheckedChange={checked => {
                        localStorage.setItem(`legion_privacy_${item.key}`, String(checked));
                        toast.success(`${item.label} ${checked ? 'on' : 'off'}`);
                      }} />
                    </div>
                  );
                })}
              </div>

              <div className="ll-card p-4">
                <p className="ll-label text-white/25 mb-3">Legal</p>
                {[
                  { label:'Privacy Policy',     path:'PrivacyPolicy' },
                  { label:'Terms of Service',   path:'TermsOfService' },
                  { label:'Data & GDPR',        path:'DataPrivacy' },
                ].map(({ label, path }, i, arr) => (
                  <Link key={path} to={createPageUrl(path)}
                    className="flex items-center justify-between py-3 text-white/55 hover:text-white text-sm transition-colors ll-interactive"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    {label}
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNT ─────────────────────────────────────────── */}
          {activeSection === 'account' && (
            <motion.div key="account" variants={fade} initial="hidden" animate="show" className="space-y-4">
              {/* Account info */}
              <div className="ll-card p-4 space-y-3">
                <p className="ll-label text-white/25 mb-1">Account Info</p>
                {[
                  { label:'Email',     val: user?.email },
                  { label:'Name',      val: user?.full_name },
                  { label:'Role',      val: user?.role },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-white/30 text-xs mb-1">{label}</p>
                    <p className="text-white/80 text-sm ll-card-inset px-3 py-2.5">{val || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Links */}
              <div className="ll-card overflow-hidden">
                {[
                  { label:'Edit Profile', path:'Profile', icon:User },
                  { label:'Help & FAQ',   path:'HelpAndInfo', icon:HelpCircle },
                ].map(({ label, path, icon:Icon }, i, arr) => (
                  <Link key={path} to={createPageUrl(path)}
                    className="flex items-center gap-3 px-4 py-4 text-white/65 hover:text-white transition-colors ll-interactive"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div className="w-8 h-8 rounded-xl ll-card-inset flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white/35" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </Link>
                ))}
              </div>

              {/* Danger zone */}
              <div className="ll-card p-4 space-y-2.5"
                style={{ border:'1px solid rgba(230,57,70,0.2)', background:'rgba(230,57,70,0.04)' }}>
                <p className="ll-label text-red-400/60 mb-3">Danger Zone</p>
                <button onClick={() => base44.auth.logout()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ll-interactive transition-all"
                  style={{ border:'1px solid rgba(230,57,70,0.3)', color:'#ff6b78', background:'transparent' }}>
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ll-interactive transition-all"
                  style={{ border:'1px solid rgba(230,57,70,0.4)', color:'#e63946', background:'rgba(230,57,70,0.06)' }}>
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>

              <p className="text-center text-white/15 text-xs pb-2">
                © 2026 Legion Live Inc.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DeleteAccountModal open={showDeleteModal} onOpenChange={setShowDeleteModal}
        userEmail={user?.email}
        onConfirm={async () => {
          toast.success('Account deletion submitted.');
          setShowDeleteModal(false);
          await base44.auth.logout();
        }} />
    </div>
  );
}
