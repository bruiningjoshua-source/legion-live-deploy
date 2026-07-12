/**
 * PageThemeBackground — maps page groups to themed background imagery.
 * Sits behind page content (below the app's own layers) with a scrim so
 * text stays legible. Only shows when the user hasn't set a custom wallpaper.
 */
import React from 'react';

// Map each page (from createPageUrl names) to a themed backdrop.
const PAGE_BACKGROUNDS = {
  // Marketplace / shop / affiliate — Roman market street
  AffiliateMarketplace: '/backgrounds/roman-marketplace.jpg',
  AffiliateHub: '/backgrounds/roman-marketplace.jpg',
  AffiliateMarketplaceExplore: '/backgrounds/roman-marketplace.jpg',
  AffiliateMarketplaceLive: '/backgrounds/roman-marketplace.jpg',
  Marketplace: '/backgrounds/roman-marketplace.jpg',
  Shop: '/backgrounds/roman-marketplace.jpg',
  BrandCampaigns: '/backgrounds/roman-marketplace.jpg',

  // General / home / explore / community — legion camp (day)
  Home: '/backgrounds/camp-day.webp',
  Explore: '/backgrounds/camp-day.webp',
  Discover: '/backgrounds/camp-night.jpg',
  Following: '/backgrounds/camp-day.webp',
  CommunityForums: '/backgrounds/camp-night.jpg',
  TheAmphitheatre: '/backgrounds/greek-theater.webp',

  // Amphitheatre / podcasts / music — Greek theater
  Podcasts: '/backgrounds/greek-theater.webp',
  PodcastStudio: '/backgrounds/greek-theater.webp',
  MusicStudio: '/backgrounds/greek-theater.webp',
  Sounds: '/backgrounds/greek-theater.webp',

  // Gaming — colosseum
  GamingHub: '/backgrounds/colosseum-gaming.jpg',
  GamesExpo: '/backgrounds/colosseum-gaming.jpg',
  GamingSetup: '/backgrounds/colosseum-gaming.jpg',
  Quests: '/backgrounds/colosseum-gaming.jpg',
  Leaderboard: '/backgrounds/colosseum-gaming.jpg',
};

export default function PageThemeBackground({ pageName }) {
  const bg = PAGE_BACKGROUNDS[pageName];
  if (!bg) return null;

  return (
    <div className="fixed inset-0 -z-30 pointer-events-none" aria-hidden="true">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
      />
      {/* Scrim: dark + bronze wash so the art reads but text stays legible */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(5,5,8,0.82) 0%, rgba(5,5,8,0.88) 55%, rgba(5,5,8,0.95) 100%)',
      }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(200,135,26,0.10), transparent 60%)' }} />
    </div>
  );
}

export { PAGE_BACKGROUNDS };
