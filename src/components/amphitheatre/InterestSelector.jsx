import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { X, Check, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const INTEREST_CATEGORIES = [
  {
    name: 'Entertainment',
    interests: ['Comedy', 'Drama', 'Movies', 'TV Shows', 'Anime', 'Animation', 'Podcasts', 'ASMR']
  },
  {
    name: 'Gaming',
    interests: ['PC Gaming', 'Console Gaming', 'Mobile Gaming', 'Esports', 'Game Reviews', 'Let\'s Play', 'Speedruns', 'Indie Games']
  },
  {
    name: 'Music',
    interests: ['Rock', 'Pop', 'Hip-Hop', 'EDM', 'Jazz', 'Classical', 'Metal', 'Indie', 'Covers', 'Music Production']
  },
  {
    name: 'Lifestyle',
    interests: ['Vlogs', 'Travel', 'Food', 'Fashion', 'Beauty', 'Fitness', 'Health', 'Wellness', 'Home Decor', 'DIY']
  },
  {
    name: 'Learning',
    interests: ['Education', 'Tutorials', 'Science', 'Technology', 'History', 'Business', 'Finance', 'Coding', 'Languages']
  },
  {
    name: 'Sports',
    interests: ['Football', 'Basketball', 'Soccer', 'MMA', 'Boxing', 'Extreme Sports', 'Motorsports', 'Fitness']
  },
  {
    name: 'Creative',
    interests: ['Art', 'Photography', 'Design', 'Crafts', 'Music Production', 'Video Editing', 'Writing', 'Animation']
  },
  {
    name: 'Other',
    interests: ['News', 'Pets', 'Cars', 'Nature', 'Wildlife', 'Documentary', 'Unboxing', 'Reviews']
  }
];

const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap(cat => cat.interests);

export default function InterestSelector({ userInterests, onClose, onSave }) {
  const [selectedInterests, setSelectedInterests] = useState(
    userInterests?.interests || []
  );

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (userInterests?.id) {
        return base44.entities.UserInterest.update(userInterests.id, {
          interests: selectedInterests
        });
      } else {
        return base44.entities.UserInterest.create({
          user_email: user.email,
          interests: selectedInterests
        });
      }
    },
    onSuccess: () => {
      toast.success('Interests saved! Your feed will be personalized.');
      onSave();
    },
    onError: () => {
      toast.error('Failed to save interests');
    }
  });

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else if (selectedInterests.length < 20) {
      setSelectedInterests([...selectedInterests, interest]);
    } else {
      toast.error('Maximum 20 interests allowed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-stone-900 border border-amber-600/30 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-amber-600/20 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Choose Your Interests
            </h2>
            <p className="text-amber-400/70 text-sm mt-1">
              Select up to 20 interests to personalize your feed
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-amber-400">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {INTEREST_CATEGORIES.map(category => (
            <div key={category.name} className="mb-6">
              <h3 className="text-amber-200 font-semibold mb-3">{category.name}</h3>
              <div className="flex flex-wrap gap-2">
                {category.interests.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      selectedInterests.includes(interest)
                        ? 'bg-red-600 text-white ring-2 ring-red-400'
                        : 'bg-stone-800/50 text-amber-300 hover:bg-stone-700/50'
                    }`}
                  >
                    {selectedInterests.includes(interest) && (
                      <Check className="w-3 h-3 inline mr-1" />
                    )}
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-amber-600/20 flex items-center justify-between bg-stone-900/90">
          <div className="text-amber-400/70 text-sm">
            {selectedInterests.length}/20 selected
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-amber-600/30 text-amber-300">
              Cancel
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Interests'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}