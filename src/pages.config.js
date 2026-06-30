import React, { lazy, Suspense } from 'react';
/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   const Settings = lazy(() => import('./pages/Settings'));
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   const Home = lazy(() => import('./pages/Home'));
 *   const Settings = lazy(() => import('./pages/Settings'));
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
const Achievements = lazy(() => import('./pages/Achievements'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const AffiliateGoLive = lazy(() => import('./pages/AffiliateGoLive'));
const AffiliateHub = lazy(() => import('./pages/AffiliateHub'));
const AffiliateMarketplace = lazy(() => import('./pages/AffiliateMarketplace'));
const AffiliateMarketplaceExplore = lazy(() => import('./pages/AffiliateMarketplaceExplore'));
const AffiliateMarketplaceLive = lazy(() => import('./pages/AffiliateMarketplaceLive'));
const AmbassadorProgram = lazy(() => import('./pages/AmbassadorProgram'));
const BrandCampaigns = lazy(() => import('./pages/BrandCampaigns'));
const BrandDashboard = lazy(() => import('./pages/BrandDashboard'));
const ChannelAnalytics = lazy(() => import('./pages/ChannelAnalytics'));
const Clips = lazy(() => import('./pages/Clips'));
const CollabMatching = lazy(() => import('./pages/CollabMatching'));
const CollaborationHub = lazy(() => import('./pages/CollaborationHub'));
const CommunityForums = lazy(() => import('./pages/CommunityForums'));
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines'));
const ContentModerationAdmin = lazy(() => import('./pages/ContentModerationAdmin'));
const CreatorAnalytics = lazy(() => import('./pages/CreatorAnalytics'));
const CreatorCommunity = lazy(() => import('./pages/CreatorCommunity'));
const CreatorMonetization = lazy(() => import('./pages/CreatorMonetization'));
const CreatorOnboarding = lazy(() => import('./pages/CreatorOnboarding'));
const CreatorPayouts = lazy(() => import('./pages/CreatorPayouts'));
const CreatorProfile = lazy(() => import('./pages/CreatorProfile'));
const CreatorStudio = lazy(() => import('./pages/CreatorStudio'));
const CreatorSuccessProgram = lazy(() => import('./pages/CreatorSuccessProgram'));
const CustomizeTheme = lazy(() => import('./pages/CustomizeTheme'));
const DataPrivacy = lazy(() => import('./pages/DataPrivacy'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Events = lazy(() => import('./pages/Events'));
const ExclusiveContentManager = lazy(() => import('./pages/ExclusiveContentManager'));
const Explore = lazy(() => import('./pages/Explore'));
const FanClubs = lazy(() => import('./pages/FanClubs'));
const Following = lazy(() => import('./pages/Following'));
const ForumPost = lazy(() => import('./pages/ForumPost'));
const GamesExpo = lazy(() => import('./pages/GamesExpo'));
const GamingHub = lazy(() => import('./pages/GamingHub'));
const GamingSetup = lazy(() => import('./pages/GamingSetup'));
const GoLive = lazy(() => import('./pages/GoLive'));
const HelpAndInfo = lazy(() => import('./pages/HelpAndInfo'));
const Highlights = lazy(() => import('./pages/Highlights'));
const Home = lazy(() => import('./pages/Home'));
const ImportYouTubeLibrary = lazy(() => import('./pages/ImportYouTubeLibrary'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const MusicStudio = lazy(() => import('./pages/MusicStudio'));
const PPVEvents = lazy(() => import('./pages/PPVEvents'));
const PayoutRouting = lazy(() => import('./pages/PayoutRouting'));
const PlatformAdminAnalytics = lazy(() => import('./pages/PlatformAdminAnalytics'));
const PlatformAnalytics = lazy(() => import('./pages/PlatformAnalytics'));
const PlatformStatus = lazy(() => import('./pages/PlatformStatus'));
const PlaylistView = lazy(() => import('./pages/PlaylistView'));
const Playlists = lazy(() => import('./pages/Playlists'));
const PodcastStudio = lazy(() => import('./pages/PodcastStudio'));
const Podcasts = lazy(() => import('./pages/Podcasts'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const ProductionReadiness = lazy(() => import('./pages/ProductionReadiness'));
const Profile = lazy(() => import('./pages/Profile'));
const Quests = lazy(() => import('./pages/Quests'));
const Settings = lazy(() => import('./pages/Settings'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const TheAmphitheatre = lazy(() => import('./pages/TheAmphitheatre'));
const UpcomingStreams = lazy(() => import('./pages/UpcomingStreams'));
const VideoEditor = lazy(() => import('./pages/VideoEditor'));
const VideoUpload = lazy(() => import('./pages/VideoUpload'));
const Videos = lazy(() => import('./pages/Videos'));
const VlogStudio = lazy(() => import('./pages/VlogStudio'));
const Wallet = lazy(() => import('./pages/Wallet'));
const WatchAffiliateVideo = lazy(() => import('./pages/WatchAffiliateVideo'));
const WatchMarketplaceLive = lazy(() => import('./pages/WatchMarketplaceLive'));
const WatchHistory = lazy(() => import('./pages/WatchHistory'));
const WatchLater = lazy(() => import('./pages/WatchLater'));
const WatchParties = lazy(() => import('./pages/WatchParties'));
const WatchPartyRoom = lazy(() => import('./pages/WatchPartyRoom'));
const WatchStream = lazy(() => import('./pages/WatchStream'));
const WatchVideo = lazy(() => import('./pages/WatchVideo'));
const CreatorPayoutForecast = lazy(() => import('./pages/CreatorPayoutForecast'));
const EarningsDashboard = lazy(() => import('./pages/EarningsDashboard'));
const LegionSpaces = lazy(() => import('./pages/LegionSpaces'));
const LegionAI = lazy(() => import('./pages/LegionAI'));
const LiveSplatFilters = lazy(() => import('./pages/LiveSplatFilters'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "Achievements": Achievements,
    "AdminDashboard": AdminDashboard,
    "AffiliateDashboard": AffiliateDashboard,
    "AffiliateGoLive": AffiliateGoLive,
    "AffiliateHub": AffiliateHub,
    "AffiliateMarketplace": AffiliateMarketplace,
    "AffiliateMarketplaceExplore": AffiliateMarketplaceExplore,
    "AffiliateMarketplaceLive": AffiliateMarketplaceLive,
    "AmbassadorProgram": AmbassadorProgram,
    "BrandCampaigns": BrandCampaigns,
    "BrandDashboard": BrandDashboard,
    "ChannelAnalytics": ChannelAnalytics,
    "Clips": Clips,
    "CollabMatching": CollabMatching,
    "CollaborationHub": CollaborationHub,
    "CommunityForums": CommunityForums,
    "CommunityGuidelines": CommunityGuidelines,
    "ContentModerationAdmin": ContentModerationAdmin,
    "CreatorAnalytics": CreatorAnalytics,
    "CreatorCommunity": CreatorCommunity,
    "CreatorMonetization": CreatorMonetization,
    "CreatorOnboarding": CreatorOnboarding,
    "CreatorPayouts": CreatorPayouts,
    "CreatorProfile": CreatorProfile,
    "CreatorStudio": CreatorStudio,
    "CreatorSuccessProgram": CreatorSuccessProgram,
    "CustomizeTheme": CustomizeTheme,
    "DataPrivacy": DataPrivacy,
    "EventDetails": EventDetails,
    "Events": Events,
    "ExclusiveContentManager": ExclusiveContentManager,
    "Explore": Explore,
    "FanClubs": FanClubs,
    "Following": Following,
    "ForumPost": ForumPost,
    "GamesExpo": GamesExpo,
    "GamingHub": GamingHub,
    "GamingSetup": GamingSetup,
    "GoLive": GoLive,
    "HelpAndInfo": HelpAndInfo,
    "Highlights": Highlights,
    "Home": Home,
    "ImportYouTubeLibrary": ImportYouTubeLibrary,
    "Leaderboard": Leaderboard,
    "MusicStudio": MusicStudio,
    "PPVEvents": PPVEvents,
    "PayoutRouting": PayoutRouting,
    "PlatformAdminAnalytics": PlatformAdminAnalytics,
    "PlatformAnalytics": PlatformAnalytics,
    "PlatformStatus": PlatformStatus,
    "PlaylistView": PlaylistView,
    "Playlists": Playlists,
    "PodcastStudio": PodcastStudio,
    "Podcasts": Podcasts,
    "PrivacyPolicy": PrivacyPolicy,
    "ProductionReadiness": ProductionReadiness,
    "Profile": Profile,
    "Quests": Quests,
    "Settings": Settings,
    "TermsOfService": TermsOfService,
    "TheAmphitheatre": TheAmphitheatre,
    "UpcomingStreams": UpcomingStreams,
    "VideoEditor": VideoEditor,
    "VideoUpload": VideoUpload,
    "Videos": Videos,
    "VlogStudio": VlogStudio,
    "Wallet": Wallet,
    "WatchAffiliateVideo": WatchAffiliateVideo,
    "WatchMarketplaceLive": WatchMarketplaceLive,
    "WatchHistory": WatchHistory,
    "WatchLater": WatchLater,
    "WatchParties": WatchParties,
    "WatchPartyRoom": WatchPartyRoom,
    "WatchStream": WatchStream,
    "WatchVideo": WatchVideo,
    "CreatorPayoutForecast": CreatorPayoutForecast,
    "EarningsDashboard": EarningsDashboard,
    "LegionSpaces": LegionSpaces,
    "LegionAI": LegionAI,
    "LiveSplatFilters": LiveSplatFilters,
    "NotFound": lazy(() => import('./pages/NotFound')),
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
