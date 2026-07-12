/**
 * PageThemeBackground — maps page groups to themed Roman-era backdrops.
 * Generic pages (home/explore/community) cycle between a day and night image
 * based on the user's local time. Messages get Mercury (messenger god); wallet/
 * finance pages get the Roman treasury. Sits behind content with a scrim.
 */
import React from 'react';

// Is it currently "night" for the viewer? (roughly 7pm–6am)
function isNight() {
  const h = new Date().getHours();
  return h >= 19 || h < 6;
}

const DAY = '/backgrounds/camp-day.webp';
const NIGHT = '/backgrounds/camp-night-forest.webp';

// Static per-group backdrops
const STATIC_BACKGROUNDS = {
  AffiliateMarketplace: '/backgrounds/roman-marketplace.jpg',
  AffiliateHub: '/backgrounds/roman-marketplace.jpg',
  AffiliateMarketplaceExplore: '/backgrounds/roman-marketplace.jpg',
  AffiliateMarketplaceLive: '/backgrounds/roman-marketplace.jpg',
  Marketplace: '/backgrounds/roman-marketplace.jpg',
  Shop: '/backgrounds/roman-marketplace.jpg',
  BrandCampaigns: '/backgrounds/roman-marketplace.jpg',

  TheAmphitheatre: '/backgrounds/greek-theater.webp',
  Podcasts: '/backgrounds/greek-theater.webp',
  PodcastStudio: '/backgrounds/greek-theater.webp',
  MusicStudio: '/backgrounds/greek-theater.webp',
  Sounds: '/backgrounds/greek-theater.webp',

  GamingHub: '/backgrounds/colosseum-gaming.jpg',
  GamesExpo: '/backgrounds/colosseum-gaming.jpg',
  GamingSetup: '/backgrounds/colosseum-gaming.jpg',
  Quests: '/backgrounds/colosseum-gaming.jpg',
  Leaderboard: '/backgrounds/colosseum-gaming.jpg',

  // Messages / DMs — Mercury, messenger of the gods
  DirectMessages: '/backgrounds/mercury-messages.webp',
  Messages: '/backgrounds/mercury-messages.webp',
  Inbox: '/backgrounds/mercury-messages.webp',

  // Wallet / finances — Roman treasury
  Wallet: '/backgrounds/treasury-wallet.webp',
  Earnings: '/backgrounds/treasury-wallet.webp',
  EarningsDashboard: '/backgrounds/treasury-wallet.webp',
  CreatorPayouts: '/backgrounds/treasury-wallet.webp',
  CreatorPayoutSettings: '/backgrounds/treasury-wallet.webp',
  PayoutRouting: '/backgrounds/treasury-wallet.webp',
};

// Generic pages that cycle day/night
const DAYNIGHT_PAGES = new Set([
  'Home', 'Explore', 'Discover', 'Following', 'CommunityForums', 'CreatorCommunity',
]);

export function resolvePageBackground(pageName) {
  if (DAYNIGHT_PAGES.has(pageName)) return isNight() ? NIGHT : DAY;
  return STATIC_BACKGROUNDS[pageName] || null;
}

export default function PageThemeBackground({ pageName }) {
  const bg = resolvePageBackground(pageName);
  if (!bg) return null;

  return (
    <div className="fixed inset-0 -z-30 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(5,5,8,0.82) 0%, rgba(5,5,8,0.88) 55%, rgba(5,5,8,0.95) 100%)',
      }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(200,135,26,0.10), transparent 60%)' }} />
    </div>
  );
}

export const PAGE_BACKGROUNDS = new Proxy(STATIC_BACKGROUNDS, {
  get(target, prop) {
    if (typeof prop === 'string' && DAYNIGHT_PAGES.has(prop)) return DAY;
    return target[prop];
  },
  has(target, prop) {
    return (typeof prop === 'string' && DAYNIGHT_PAGES.has(prop)) || prop in target;
  },
});
