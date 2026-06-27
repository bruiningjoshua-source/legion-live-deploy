/**
 * CreatorOnboarding — 3-question modal shown once on first login.
 * Routes users to the right Hub based on their creator type.
 * VTubers → MoCap setup, Brands → Marketplace, Gamers → Gaming Hub, etc.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

const CREATOR_TYPES = [
  { id:'streamer',   emoji:'📡', label:'Live Streamer',    sub:'Entertainment, talk shows, IRL',   path:'GoLive'          },
  { id:'vtuber',     emoji:'🤖', label:'VTuber / Avatar',  sub:'Stream as an animated character',  path:'GoLive', extra:'mocap' },
  { id:'gamer',      emoji:'🎮', label:'Gamer',             sub:'Game streams and tournaments',      path:'GamesExpo'       },
  { id:'musician',   emoji:'🎵', label:'Musician / DJ',    sub:'Live music and production',         path:'MusicStudio'     },
  { id:'brand',      emoji:'💼', label:'Brand / Business',  sub:'Sell products via live commerce',   path:'AffiliateHub'    },
  { id:'influencer', emoji:'✨', label:'Influencer',        sub:'Build your audience and earn',      path:'Profile'         },
];

const GOALS = [
  { id:'earn',    emoji:'💰', label:'Earn money',         sub:'Gifts, tips, fan clubs, brand deals' },
  { id:'grow',    emoji:'📈', label:'Grow my audience',   sub:'Followers, clips, discoverability'   },
  { id:'connect', emoji:'🤝', label:'Connect with fans',  sub:'PK battles, challenges, community'   },
  { id:'create',  emoji:'🎨', label:'Create content',     sub:'Music, gaming, VTubing, streams'     },
];

const steps = [
  { id:'type',    question:'What kind of creator are you?',   options: CREATOR_TYPES },
  { id:'goal',    question:'What\'s your main goal?',         options: GOALS         },
];

export default function CreatorOnboarding({ user, onComplete }) {
  const navigate = useNavigate();
  const [step, setStep]         = useState(0);
  const [answers, setAnswers]   = useState({});
  const [animDir, setAnimDir]   = useState(1);

  const current = steps[step];
  const isLast  = step === steps.length - 1;

  const select = async (optionId) => {
    const next = { ...answers, [current.id]: optionId };
    setAnswers(next);

    if (!isLast) {
      setAnimDir(1);
      setStep(s => s + 1);
      return;
    }

    // Save onboarding data
    try {
      const type     = next.type || 'streamer';
      const typeData = CREATOR_TYPES.find(t => t.id === type);
      await base44.entities.Creator.update(user?.id, {
        creator_type: type,
        onboarding_completed: true,
        category: type === 'gamer' ? 'gaming' : type === 'musician' ? 'music' : type === 'brand' ? 'business' : 'entertainment',
      }).catch(() => {});
      await base44.entities.Profile.update(user?.id, { onboarding_completed: true }).catch(() => {});
    } catch (_) {}

    onComplete(next);

    // Route to the right place
    const type = next.type || 'streamer';
    const typeData = CREATOR_TYPES.find(t => t.id === type);
    if (typeData?.extra === 'mocap') {
      navigate(createPageUrl('GoLive') + '?mocap=1');
    } else {
      navigate(createPageUrl(typeData?.path || 'Home'));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{y:'100%'}} animate={{y:0}} transition={{type:'spring',damping:30,stiffness:300}}
        className="w-full max-w-lg bg-[#0a0a14] rounded-t-3xl border-t border-white/10 overflow-hidden"
        style={{maxHeight:'92vh'}}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex gap-1.5">
              {steps.map((_,i)=>(
                <div key={i} className="h-1 rounded-full transition-all"
                  style={{
                    width: i === step ? 24 : 8,
                    background: i <= step ? '#f5a623' : 'rgba(255,255,255,0.15)',
                  }} />
              ))}
            </div>
            <button onClick={()=>onComplete(answers)}
              className="text-white/25 text-xs hover:text-white/50 transition-colors ll-interactive">
              Skip
            </button>
          </div>

          <div className="mt-4">
            <p className="ll-label text-amber-500/70 mb-1">STEP {step + 1} OF {steps.length}</p>
            <AnimatePresence mode="wait">
              <motion.h2 key={step}
                initial={{opacity:0,x:animDir*20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-animDir*20}}
                transition={{duration:0.2}}
                className="ll-heading text-2xl text-white">{current.question}</motion.h2>
            </AnimatePresence>
          </div>
        </div>

        {/* Options */}
        <div className="px-4 pb-8 overflow-y-auto" style={{maxHeight:'calc(92vh - 140px)'}}>
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{opacity:0,x:animDir*30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-animDir*30}}
              transition={{duration:0.22}}
              className="grid grid-cols-2 gap-3">
              {current.options.map((opt, i) => (
                <motion.button key={opt.id}
                  initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
                  transition={{delay:i*0.04}}
                  onClick={()=>select(opt.id)}
                  className="p-4 rounded-2xl text-left ll-interactive transition-all active:scale-[0.97]"
                  style={{
                    background: answers[current.id]===opt.id ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
                    border:`1.5px solid ${answers[current.id]===opt.id ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: answers[current.id]===opt.id ? '0 0 20px rgba(245,166,35,0.15)' : 'none',
                  }}>
                  <div className="text-3xl mb-2 leading-none">{opt.emoji}</div>
                  <p className="text-white font-bold text-sm leading-tight">{opt.label}</p>
                  <p className="text-white/35 text-[11px] mt-1 leading-snug">{opt.sub}</p>
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
