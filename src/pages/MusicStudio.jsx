import React from 'react';
import { Music } from 'lucide-react';
import ComingSoonPage from '@/components/shared/ComingSoonPage';

export default function MusicStudio() {
  return (
    <ComingSoonPage
      title="Music Studio"
      icon={Music}
      description="Create, remix, and share music directly on Legion Live. Our full studio experience is coming soon!"
    />
  );
}