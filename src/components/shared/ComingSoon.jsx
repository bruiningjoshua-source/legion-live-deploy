import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function ComingSoon({ 
  title = 'Coming Soon',
  emoji = '🚀',
  description = 'This feature is under development.',
  eta = 'Soon',
  suggestedPath = 'Home',
  suggestedLabel = 'Back to Home',
  features = []
}) {
  return (
    <div className="ll-page-enter min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',bounce:0.4}}>
        <div className="text-6xl mb-4">{emoji}</div>
      </motion.div>

      <div className="mb-1">
        <span className="ll-pill ll-pill-gold">ETA: {eta}</span>
      </div>

      <h1 className="ll-heading text-2xl text-white mt-3 mb-2">{title}</h1>
      <p className="text-white/40 text-sm max-w-xs leading-relaxed mb-6">{description}</p>

      {features.length > 0 && (
        <div className="ll-card p-4 w-full max-w-xs mb-6 text-left">
          <p className="ll-label text-white/25 mb-3">What's coming</p>
          <div className="space-y-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
                <span className="text-white/55 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link to={createPageUrl(suggestedPath)}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl ll-interactive font-semibold text-sm"
        style={{background:'linear-gradient(135deg,#f5a623,#e6891e)',color:'#000'}}>
        {suggestedLabel} <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
