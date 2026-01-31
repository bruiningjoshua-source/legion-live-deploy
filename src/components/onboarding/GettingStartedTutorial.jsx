import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Radio,
  Wallet,
  Users,
  Gift,
  Gamepad2,
  Heart,
  Check,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumButton from '@/components/shared/PremiumButton';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Legion Live! 🛡️',
    description: 'Your new home for live streaming, gaming, and community. Let\'s show you around!',
    icon: Sparkles,
    color: 'amber'
  },
  {
    id: 'explore',
    title: 'Discover Content',
    description: 'Browse live streams, videos, and creators. Use the Explore page or Gaming Hub to find what you love.',
    icon: Radio,
    color: 'red',
    action: { label: 'Go to Explore', path: 'Explore' }
  },
  {
    id: 'wallet',
    title: 'Your Wallet',
    description: 'Denarii is our currency for gifts and tips. You started with 500 free Denarii to get going!',
    icon: Wallet,
    color: 'emerald',
    action: { label: 'View Wallet', path: 'Wallet' }
  },
  {
    id: 'follow',
    title: 'Follow Creators',
    description: 'Follow your favorite streamers to get notified when they go live and see their content first.',
    icon: Heart,
    color: 'pink',
    action: { label: 'Find Creators', path: 'Explore' }
  },
  {
    id: 'gifts',
    title: 'Send Gifts',
    description: 'Support creators by sending gifts during streams. They\'ll see your name on screen!',
    icon: Gift,
    color: 'purple'
  },
  {
    id: 'golive',
    title: 'Go Live Yourself!',
    description: 'Ready to stream? Hit "Go Live" to start broadcasting to the world.',
    icon: Radio,
    color: 'red',
    action: { label: 'Start Streaming', path: 'GoLive' }
  }
];

export default function GettingStartedTutorial({ onComplete, onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-gradient-to-b from-[#1a1a1f] to-[#0f0f12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <motion.div
            className={`h-full bg-gradient-to-r from-${step.color}-500 to-${step.color}-400`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-white/50 text-sm">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-white/40 hover:text-white text-sm"
          >
            Skip tutorial
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-${step.color}-500/20 to-${step.color}-600/20 border border-${step.color}-500/30 flex items-center justify-center`}
              >
                <StepIcon className={`w-10 h-10 text-${step.color}-400`} />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
              <p className="text-white/60 leading-relaxed">{step.description}</p>

              {step.action && (
                <Link to={createPageUrl(step.action.path)} onClick={onComplete}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`mt-6 px-6 py-2.5 rounded-xl bg-${step.color}-500/20 border border-${step.color}-500/30 text-${step.color}-300 font-medium`}
                  >
                    {step.action.label} →
                  </motion.button>
                </Link>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? `bg-${step.color}-400` : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className={`flex items-center gap-1 font-medium text-${step.color}-400 hover:text-${step.color}-300`}
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? (
              <>
                <Check className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}