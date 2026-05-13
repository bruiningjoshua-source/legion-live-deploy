import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';

export default function ComingSoonPage({ title, icon: Icon, description }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center relative px-6">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-5 left-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-xs"
      >
        <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          {Icon ? <Icon className="w-10 h-10 text-amber-400" /> : <Clock className="w-10 h-10 text-amber-400" />}
        </div>

        <h1 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          {title || 'Coming Soon'}
        </h1>

        <p className="text-white/50 text-sm mb-6">
          {description || 'This feature is currently under development. Stay tuned!'}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 text-xs font-semibold">Coming Soon</span>
        </div>
      </motion.div>
    </div>
  );
}