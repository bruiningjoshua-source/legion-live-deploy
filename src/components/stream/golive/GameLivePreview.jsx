import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, HelpCircle } from 'lucide-react';

export default function GameLivePreview({ selectedGame, deviceMode, onSelectGame }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      {selectedGame ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">{selectedGame.icon || '🎮'}</span>
          </div>
          <p className="text-white font-bold text-sm mb-1">{selectedGame.title}</p>
          <button
            onClick={onSelectGame}
            className="text-cyan-400 text-xs font-medium"
          >
            Change game →
          </button>
        </motion.div>
      ) : (
        <div className="text-center">
          {deviceMode === 'mobile' ? (
            <>
              <p className="text-white/50 text-sm mb-2">After the live starts, viewers will see the screen of your phone.</p>
              <button onClick={onSelectGame} className="text-cyan-400 text-xs font-semibold mt-4">
                Select a game →
              </button>
            </>
          ) : (
            <>
              {/* PC mode — QR scanner placeholder */}
              <div className="w-48 h-48 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(168,85,247,0.1))',
                }}>
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Monitor className="w-10 h-10 text-white/20" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-white/40 text-xs">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Scan QR code of Legion LIVE Connector →</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}