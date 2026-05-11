import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Lightbulb } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function OnboardingTooltip({ 
  title, 
  content, 
  tips = [],
  children,
  side = 'right'
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <button className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30 transition-colors">
            <HelpCircle className="w-3 h-3 text-amber-400" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        className="w-72 bg-stone-900 border-amber-500/30 p-4"
      >
        <div className="flex items-start gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <h4 className="text-white font-medium text-sm">{title}</h4>
        </div>
        <p className="text-white/70 text-xs mb-3">{content}</p>
        
        {tips.length > 0 && (
          <div className="space-y-1.5">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-amber-400">•</span>
                <span className="text-white/60">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function OnboardingBanner({ title, content, icon: Icon = Lightbulb, variant = 'info' }) {
  const variants = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    tip: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    warning: 'bg-orange-500/10 border-orange-500/30 text-orange-300'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 p-4 rounded-xl border ${variants[variant]}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs opacity-80 mt-0.5">{content}</p>
      </div>
    </motion.div>
  );
}