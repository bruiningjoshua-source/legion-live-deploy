import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ViewerWallet({ denariiBalance = 0, asBalance = 0 }) {
  const totalAs = (denariiBalance * 100) + asBalance;
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2"
    >
      <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-full px-3 py-1.5 flex items-center gap-2">
        <span className="text-amber-300 text-lg">🪙</span>
        <span className="text-white text-sm font-bold">{denariiBalance}</span>
        {asBalance > 0 && (
          <span className="text-amber-400/70 text-xs">+{asBalance} As</span>
        )}
      </div>
      
      <Link to={createPageUrl('Wallet')}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-7 h-7 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-white" />
        </motion.button>
      </Link>
    </motion.div>
  );
}