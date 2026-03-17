import React from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, Loader2, Image, FileCheck } from 'lucide-react';

const STAGES = [
  { key: 'uploading', label: 'Uploading file…', icon: Upload, threshold: 0 },
  { key: 'thumbnail', label: 'Generating thumbnail…', icon: Image, threshold: 50 },
  { key: 'processing', label: 'Processing metadata…', icon: FileCheck, threshold: 75 },
  { key: 'done', label: 'Complete!', icon: CheckCircle, threshold: 100 },
];

export default function UploadProgressBar({ progress = 0, isUploading = false }) {
  if (!isUploading) return null;

  const currentStage = [...STAGES].reverse().find(s => progress >= s.threshold) || STAGES[0];
  const Icon = currentStage.icon;
  const isDone = progress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        {isDone ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
        )}
        <span className={`text-sm font-medium ${isDone ? 'text-green-300' : 'text-white'}`}>
          {currentStage.label}
        </span>
        <span className="ml-auto text-xs text-white/40 font-mono">{Math.round(progress)}%</span>
      </div>

      {/* Progress track */}
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isDone ? 'bg-green-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Stage dots */}
      <div className="flex items-center justify-between mt-2">
        {STAGES.slice(0, -1).map((stage) => {
          const StageIcon = stage.icon;
          const active = progress >= stage.threshold;
          return (
            <div key={stage.key} className="flex items-center gap-1">
              <StageIcon className={`w-3 h-3 ${active ? 'text-amber-400' : 'text-white/15'}`} />
              <span className={`text-[10px] ${active ? 'text-white/50' : 'text-white/15'}`}>{stage.label.replace('…', '')}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}