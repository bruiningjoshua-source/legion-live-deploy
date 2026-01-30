import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Palette, Sparkles, Moon, Sun, Zap } from 'lucide-react';

const THEMES = [
  { id: 'roman', name: 'Roman Gold', colors: ['#d97706', '#f59e0b', '#fbbf24'], icon: '🏛️' },
  { id: 'neon', name: 'Neon Nights', colors: ['#ec4899', '#8b5cf6', '#06b6d4'], icon: '💜' },
  { id: 'ocean', name: 'Ocean Blue', colors: ['#0ea5e9', '#06b6d4', '#22d3ee'], icon: '🌊' },
  { id: 'fire', name: 'Fire Red', colors: ['#ef4444', '#f97316', '#eab308'], icon: '🔥' },
  { id: 'forest', name: 'Forest Green', colors: ['#22c55e', '#10b981', '#14b8a6'], icon: '🌲' },
  { id: 'midnight', name: 'Midnight Purple', colors: ['#6366f1', '#8b5cf6', '#a855f7'], icon: '🌙' },
];

const PARTICLE_MODES = [
  { id: 'off', name: 'Off', icon: '🚫' },
  { id: 'low', name: 'Subtle', icon: '✨' },
  { id: 'medium', name: 'Normal', icon: '🌟' },
  { id: 'high', name: 'Intense', icon: '💫' },
];

export default function ThemeCustomizer({ 
  currentTheme = 'roman',
  onThemeChange,
  particleIntensity = 'medium',
  onParticleChange,
  animatedBg = true,
  onAnimatedBgChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [particles, setParticles] = useState(particleIntensity);
  const [animated, setAnimated] = useState(animatedBg);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    onThemeChange?.(themeId);
    
    // Save to localStorage
    localStorage.setItem('legion_theme', themeId);
  };

  const handleParticleChange = (mode) => {
    setParticles(mode);
    onParticleChange?.(mode);
    localStorage.setItem('legion_particles', mode);
  };

  const handleAnimatedChange = (enabled) => {
    setAnimated(enabled);
    onAnimatedBgChange?.(enabled);
    localStorage.setItem('legion_animated_bg', enabled.toString());
  };

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('legion_theme');
    const savedParticles = localStorage.getItem('legion_particles');
    const savedAnimated = localStorage.getItem('legion_animated_bg');
    
    if (savedTheme) setSelectedTheme(savedTheme);
    if (savedParticles) setParticles(savedParticles);
    if (savedAnimated !== null) setAnimated(savedAnimated === 'true');
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors shadow-lg"
        >
          <Palette className="w-5 h-5" />
        </motion.button>
      </SheetTrigger>
      
      <SheetContent className="bg-stone-950/95 backdrop-blur-xl border-white/10">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Customize Theme
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Theme Selection */}
          <div>
            <p className="text-white/60 text-sm mb-3">Color Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => (
                <motion.button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`relative p-4 rounded-xl border transition-all ${
                    selectedTheme === theme.id
                      ? 'border-white/50 ring-2 ring-white/20'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Color preview */}
                  <div className="flex gap-1 mb-2">
                    {theme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{theme.icon}</span>
                    <span className="text-white text-sm">{theme.name}</span>
                  </div>
                  
                  {selectedTheme === theme.id && (
                    <motion.div
                      layoutId="theme-check"
                      className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-white text-xs">✓</span>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Particle Effects */}
          <div>
            <p className="text-white/60 text-sm mb-3">Particle Effects</p>
            <div className="grid grid-cols-4 gap-2">
              {PARTICLE_MODES.map((mode) => (
                <motion.button
                  key={mode.id}
                  onClick={() => handleParticleChange(mode.id)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    particles === mode.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-lg block mb-1">{mode.icon}</span>
                  <span className="text-xs">{mode.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Animated Background Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-white text-sm">Animated Background</p>
                <p className="text-white/50 text-xs">Floating gradient orbs</p>
              </div>
            </div>
            <Switch
              checked={animated}
              onCheckedChange={handleAnimatedChange}
            />
          </div>

          {/* Preview */}
          <div className="relative h-32 rounded-xl overflow-hidden">
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${THEMES.find(t => t.id === selectedTheme)?.colors[0]}20, ${THEMES.find(t => t.id === selectedTheme)?.colors[1]}20, ${THEMES.find(t => t.id === selectedTheme)?.colors[2]}20)`
              }}
            />
            {animated && (
              <>
                <motion.div
                  className="absolute w-20 h-20 rounded-full blur-xl opacity-40"
                  style={{ background: THEMES.find(t => t.id === selectedTheme)?.colors[0] }}
                  animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                  className="absolute w-16 h-16 rounded-full blur-xl opacity-30"
                  style={{ background: THEMES.find(t => t.id === selectedTheme)?.colors[1], right: 0 }}
                  animate={{ x: [0, -60, 0], y: [20, 60, 20] }}
                  transition={{ duration: 5, repeat: Infinity }}
                />
              </>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/70 text-sm">Preview</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}