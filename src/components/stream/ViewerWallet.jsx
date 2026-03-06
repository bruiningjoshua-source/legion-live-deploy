import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function ViewerWallet({ denariiBalance = 0, asBalance = 0, userEmail }) {
  const [balance, setBalance] = useState(denariiBalance);

  useEffect(() => {
    if (!userEmail) return;
    const unsubscribe = base44.entities.Wallet.subscribe((event) => {
      if (event.data.user_email === userEmail) {
        setBalance(event.data.denarii_balance || 0);
      }
    });
    return unsubscribe;
  }, [userEmail]);

  useEffect(() => { setBalance(denariiBalance); }, [denariiBalance]);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1.5"
    >
      <div className="bg-black/60 backdrop-blur-md border border-amber-500/20 rounded-full px-2.5 py-1 flex items-center gap-1.5">
        <span className="text-sm">🪙</span>
        <span className="text-white text-xs font-bold">{balance.toLocaleString()}</span>
      </div>
      <Link to={createPageUrl('Wallet')}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
        >
          <Plus className="w-3 h-3 text-white" />
        </motion.button>
      </Link>
    </motion.div>
  );
}