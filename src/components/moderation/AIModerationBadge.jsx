import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Eye } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_CONFIG = {
  active: {
    icon: ShieldCheck,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    label: 'AI Moderation Active',
    pulse: true
  },
  warning: {
    icon: ShieldAlert,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    label: 'Content Flagged',
    pulse: false
  },
  reviewing: {
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    label: 'Under Review',
    pulse: true
  },
  violation: {
    icon: ShieldX,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    label: 'Violation Detected',
    pulse: false
  },
  inactive: {
    icon: Shield,
    color: 'text-white/40',
    bg: 'bg-white/10',
    label: 'Moderation Inactive',
    pulse: false
  }
};

export default function AIModerationBadge({ 
  status = 'active', 
  alertCount = 0,
  size = 'default',
  showLabel = false
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const Icon = config.icon;
  
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            className={`${sizeClasses[size]} rounded-full ${config.bg} flex items-center justify-center relative cursor-pointer`}
            whileHover={{ scale: 1.1 }}
          >
            {config.pulse && (
              <motion.div
                className={`absolute inset-0 rounded-full ${config.bg}`}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <Icon className={`${iconSizes[size]} ${config.color} relative z-10`} />
            
            {alertCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              </div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-stone-900 border-white/10">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="text-white text-sm">{config.label}</span>
          </div>
          {alertCount > 0 && (
            <p className="text-white/60 text-xs mt-1">{alertCount} alert(s) pending review</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ModerationStatusBar({ stats }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-stone-900/80 backdrop-blur-sm rounded-full">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span className="text-green-300 text-xs font-medium">
          {stats?.approved || 0} approved
        </span>
      </div>
      <div className="w-px h-4 bg-white/10" />
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-yellow-400" />
        <span className="text-yellow-300 text-xs font-medium">
          {stats?.flagged || 0} flagged
        </span>
      </div>
      <div className="w-px h-4 bg-white/10" />
      <div className="flex items-center gap-2">
        <ShieldX className="w-4 h-4 text-red-400" />
        <span className="text-red-300 text-xs font-medium">
          {stats?.removed || 0} removed
        </span>
      </div>
    </div>
  );
}