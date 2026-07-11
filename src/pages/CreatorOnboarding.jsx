import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";


import {
  User,
  Camera,
  DollarSign,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Gift,
  Crown,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';

import OnboardingStep from '@/components/onboarding/OnboardingStep';
import ProfileSetupStep from '@/components/onboarding/ProfileSetupStep';
import MonetizationSetupStep from '@/components/onboarding/MonetizationSetupStep';
import ModerationGuideStep from '@/components/onboarding/ModerationGuideStep';
import OnboardingComplete from '@/components/onboarding/OnboardingComplete';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'profile', title: 'Profile', icon: User },
  { id: 'monetization', title: 'Monetization', icon: DollarSign },
  { id: 'moderation', title: 'Moderation', icon: Shield },
  { id: 'complete', title: 'Complete', icon: Rocket }
];

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState({
    display_name: '',
    bio: '',
    category: '',
    avatar_url: '',
    social_links: {}
  });
  const [monetizationData, setMonetizationData] = useState({
    gifts_enabled: true,
    subscriptions_enabled: false,
    tips_enabled: true,
    tiers: [],
    gift_goal: null
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: existingCreator } = useQuery({
    queryKey: ['existing-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  // Pre-fill with existing data
  useEffect(() => {
    if (existingCreator) {
      setProfileData({
        display_name: existingCreator.display_name || user?.full_name || '',
        bio: existingCreator.bio || '',
        category: existingCreator.category || '',
        avatar_url: existingCreator.avatar_url || '',
        social_links: existingCreator.social_links || {}
      });
    } else if (user) {
      setProfileData(prev => ({
        ...prev,
        display_name: user.full_name || ''
      }));
    }
  }, [existingCreator, user]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      let creatorId = existingCreator?.id;

      // Create or update creator profile
      if (creatorId) {
        await base44.entities.Creator.update(creatorId, {
          ...profileData,
          is_verified: false
        });
      } else {
        const newCreator = await base44.entities.Creator.create({
          user_email: user.email,
          ...profileData,
          follower_count: 0,
          is_verified: false
        });
        creatorId = newCreator.id;
      }

      // Create monetization settings
      const existingMonet = await base44.entities.CreatorMonetization.filter({ 
        creator_id: creatorId 
      }, null, 1);

      if (existingMonet[0]) {
        await base44.entities.CreatorMonetization.update(existingMonet[0].id, {
          monetization_enabled: true,
          gifts_enabled: monetizationData.gifts_enabled,
          subscriptions_enabled: monetizationData.subscriptions_enabled,
          tips_enabled: monetizationData.tips_enabled,
          gift_goal: monetizationData.gift_goal
        });
      } else {
        await base44.entities.CreatorMonetization.create({
          creator_id: creatorId,
          user_email: user.email,
          monetization_enabled: true,
          gifts_enabled: monetizationData.gifts_enabled,
          subscriptions_enabled: monetizationData.subscriptions_enabled,
          tips_enabled: monetizationData.tips_enabled,
          gift_goal: monetizationData.gift_goal
        });
      }

      // Create default subscription tiers if enabled
      if (monetizationData.subscriptions_enabled && monetizationData.tiers?.length > 0) {
        for (const tier of monetizationData.tiers) {
          await base44.entities.SubscriptionTier.create({
            creator_id: creatorId,
            ...tier
          });
        }
      }

      // Mark onboarding as complete
      await base44.auth.updateMe({ onboarding_completed: true });

      return creatorId;
    },
    onSuccess: () => {
      toast.success('Welcome to Legion Live!');
      navigate(createPageUrl('Profile'));
    },
    onError: (error) => {
      toast.error('Setup failed: ' + error.message);
    }
  });

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return true;
      case 'profile':
        return profileData.display_name?.trim() && profileData.category;
      case 'monetization':
        return true;
      case 'moderation':
        return true;
      case 'complete':
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-[#050508]">
      {/* Progress Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-stone-950/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-white font-semibold">Creator Setup</span>
            </div>
            <span className="text-white/60 text-sm">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isCurrent ? 'opacity-100' : isCompleted ? 'opacity-70' : 'opacity-30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500' : isCurrent ? 'bg-amber-500' : 'bg-white/20'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Icon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-[10px] text-white/60 mt-1 hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
            {/* Welcome Step */}
            {STEPS[currentStep].id === 'welcome' && (
              <OnboardingStep key="welcome">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6"
                  >
                    <Sparkles className="w-12 h-12 text-white" />
                  </motion.div>
                  
                  <h1 className="text-3xl font-bold text-white mb-3">
                    Welcome to Legion Live!
                  </h1>
                  <p className="text-white/60 mb-8 max-w-md mx-auto">
                    Let's set up your creator profile so you can start streaming, earning, and building your community.
                  </p>

                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
                    {[
                      { icon: Camera, label: 'Go Live', desc: 'Stream to your fans' },
                      { icon: Gift, label: 'Earn', desc: 'Receive gifts & tips' },
                      { icon: Crown, label: 'Grow', desc: 'Build community' }
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="text-center p-4 bg-white/5 rounded-xl"
                      >
                        <item.icon className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-white font-medium text-sm">{item.label}</p>
                        <p className="text-white/50 text-xs">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-white/40 text-sm">
                    This will only take about 2 minutes
                  </p>
                </div>
              </OnboardingStep>
            )}

            {/* Profile Step */}
            {STEPS[currentStep].id === 'profile' && (
              <OnboardingStep key="profile">
                <ProfileSetupStep
                  data={profileData}
                  onChange={setProfileData}
                  user={user}
                />
              </OnboardingStep>
            )}

            {/* Monetization Step */}
            {STEPS[currentStep].id === 'monetization' && (
              <OnboardingStep key="monetization">
                <MonetizationSetupStep
                  data={monetizationData}
                  onChange={setMonetizationData}
                />
              </OnboardingStep>
            )}

            {/* Moderation Step */}
            {STEPS[currentStep].id === 'moderation' && (
              <OnboardingStep key="moderation">
                <ModerationGuideStep />
              </OnboardingStep>
            )}

            {/* Complete Step */}
            {STEPS[currentStep].id === 'complete' && (
              <OnboardingStep key="complete">
                <OnboardingComplete
                  profileData={profileData}
                  monetizationData={monetizationData}
                  onComplete={() => completeOnboardingMutation.mutate()}
                  isPending={completeOnboardingMutation.isPending}
                />
              </OnboardingStep>
            )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-950/90 backdrop-blur-lg border-t border-white/10 p-4">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="text-white/70"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => completeOnboardingMutation.mutate()}
              disabled={completeOnboardingMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {completeOnboardingMutation.isPending ? 'Setting up...' : 'Launch My Channel'}
              <Rocket className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}