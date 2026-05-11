import React, { useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Upload,
  Instagram,
  Youtube,
  Twitter
} from 'lucide-react';
import OnboardingTooltip, { OnboardingBanner } from './OnboardingTooltip';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'talk_show', label: 'Talk Show', icon: '🎙️' },
  { value: 'dance', label: 'Dance', icon: '💃' },
  { value: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'outdoor', label: 'Outdoor', icon: '🏕️' },
  { value: 'hunting', label: 'Hunting', icon: '🦌' },
  { value: 'firearms', label: 'Firearms', icon: '🎯' },
  { value: 'survival', label: 'Survival', icon: '🏔️' },
  { value: 'other', label: 'Other', icon: '✨' }
];

export default function ProfileSetupStep({ data, onChange, user }) {
  const fileInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      onChange({ ...data, avatar_url: result.file_url });
      toast.success('Photo uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const updateSocialLink = (platform, value) => {
    onChange({
      ...data,
      social_links: { ...data.social_links, [platform]: value }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Profile</h2>
        <p className="text-white/60">This is how viewers will discover and recognize you</p>
      </div>

      <OnboardingBanner
        title="Pro Tip"
        content="Creators with complete profiles get 3x more followers on average!"
        variant="tip"
      />

      {/* Avatar Upload */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-28 h-28 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-colors overflow-hidden"
          >
            {data.avatar_url ? (
              <img src={data.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Camera className="w-8 h-8 text-white/40 mx-auto mb-1" />
                <span className="text-white/40 text-xs">Add Photo</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <OnboardingTooltip
            title="Profile Photo"
            content="Use a clear, high-quality photo of yourself. This builds trust with your audience."
            tips={['Use good lighting', 'Show your face clearly', 'Avoid busy backgrounds']}
          >
            <button className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
              <Upload className="w-3.5 h-3.5 text-white" />
            </button>
          </OnboardingTooltip>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-white">Display Name *</Label>
          <OnboardingTooltip
            title="Display Name"
            content="This is the name viewers will see. Make it memorable and easy to pronounce."
            tips={['Keep it short (under 20 characters)', 'Make it unique', 'Avoid special characters']}
          />
        </div>
        <Input
          value={data.display_name}
          onChange={(e) => onChange({ ...data, display_name: e.target.value })}
          placeholder="Your creator name..."
          className="bg-white/10 border-white/20 text-white"
          maxLength={30}
        />
        <p className="text-white/40 text-xs text-right">{data.display_name?.length || 0}/30</p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-white">Content Category *</Label>
          <OnboardingTooltip
            title="Category"
            content="Choose the category that best describes your content. This helps viewers find you."
            tips={['Pick your primary content type', 'You can change this later', 'Be specific if possible']}
          />
        </div>
        <Select value={data.category} onValueChange={(v) => onChange({ ...data, category: v })}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Select your category" />
          </SelectTrigger>
          <SelectContent className="bg-stone-900 border-white/20">
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value} className="text-white">
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-white">Bio</Label>
          <OnboardingTooltip
            title="Bio"
            content="Tell viewers what makes you unique. What can they expect from your streams?"
            tips={['Mention your streaming schedule', 'Highlight your personality', 'Include a call-to-action']}
          />
        </div>
        <Textarea
          value={data.bio}
          onChange={(e) => onChange({ ...data, bio: e.target.value })}
          placeholder="Tell viewers about yourself..."
          className="bg-white/10 border-white/20 text-white min-h-[100px]"
          maxLength={300}
        />
        <p className="text-white/40 text-xs text-right">{data.bio?.length || 0}/300</p>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-white">Social Links</Label>
          <OnboardingTooltip
            title="Social Links"
            content="Connect your other platforms to help viewers find you everywhere."
            tips={['Cross-promote your content', 'Build a larger audience', 'Optional but recommended']}
          />
        </div>
        
        <div className="space-y-2">
          {[
            { platform: 'instagram', icon: Instagram, placeholder: '@username' },
            { platform: 'youtube', icon: Youtube, placeholder: 'Channel URL' },
            { platform: 'twitter', icon: Twitter, placeholder: '@handle' },
          ].map(({ platform, icon: Icon, placeholder }) => (
            <div key={platform} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white/60" />
              </div>
              <Input
                value={data.social_links?.[platform] || ''}
                onChange={(e) => updateSocialLink(platform, e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-white/10 border-white/20 text-white"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}