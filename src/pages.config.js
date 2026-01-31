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
 *   import Settings from './pages/Settings';
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
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
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
import Achievements from './pages/Achievements';
import AdminDashboard from './pages/AdminDashboard';
import AffiliateDashboard from './pages/AffiliateDashboard';
import AffiliateGoLive from './pages/AffiliateGoLive';
import AffiliateHub from './pages/AffiliateHub';
import AmbassadorProgram from './pages/AmbassadorProgram';
import BrandCampaigns from './pages/BrandCampaigns';
import BrandDashboard from './pages/BrandDashboard';
import ChannelAnalytics from './pages/ChannelAnalytics';
import Clips from './pages/Clips';
import CollaborationHub from './pages/CollaborationHub';
import CommunityForums from './pages/CommunityForums';
import CommunityGuidelines from './pages/CommunityGuidelines';
import ContentModerationAdmin from './pages/ContentModerationAdmin';
import CreatorAnalytics from './pages/CreatorAnalytics';
import CreatorMonetization from './pages/CreatorMonetization';
import CreatorOnboarding from './pages/CreatorOnboarding';
import CreatorProfile from './pages/CreatorProfile';
import CreatorStudio from './pages/CreatorStudio';
import CreatorSuccessProgram from './pages/CreatorSuccessProgram';
import CustomizeTheme from './pages/CustomizeTheme';
import DataPrivacy from './pages/DataPrivacy';
import EventDetails from './pages/EventDetails';
import Events from './pages/Events';
import ExclusiveContentManager from './pages/ExclusiveContentManager';
import Explore from './pages/Explore';
import Following from './pages/Following';
import ForumPost from './pages/ForumPost';
import GoLive from './pages/GoLive';
import Home from './pages/Home';
import ImportYouTubeLibrary from './pages/ImportYouTubeLibrary';
import Leaderboard from './pages/Leaderboard';
import MusicStudio from './pages/MusicStudio';
import PlatformAdminAnalytics from './pages/PlatformAdminAnalytics';
import PlatformAnalytics from './pages/PlatformAnalytics';
import PlaylistView from './pages/PlaylistView';
import Playlists from './pages/Playlists';
import PodcastStudio from './pages/PodcastStudio';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import TermsOfService from './pages/TermsOfService';
import TheAmphitheatre from './pages/TheAmphitheatre';
import TheGamingHub from './pages/TheGamingHub';
import UpcomingStreams from './pages/UpcomingStreams';
import VideoEditor from './pages/VideoEditor';
import VideoUpload from './pages/VideoUpload';
import Videos from './pages/Videos';
import VlogStudio from './pages/VlogStudio';
import Wallet from './pages/Wallet';
import WatchAffiliateVideo from './pages/WatchAffiliateVideo';
import WatchHistory from './pages/WatchHistory';
import WatchLater from './pages/WatchLater';
import WatchStream from './pages/WatchStream';
import WatchVideo from './pages/WatchVideo';
import AffiliateMarketplace from './pages/AffiliateMarketplace';
import GamingSetup from './pages/GamingSetup';
import Quests from './pages/Quests';
import WatchParties from './pages/WatchParties';
import PPVEvents from './pages/PPVEvents';
import FanClubs from './pages/FanClubs';
import CollabMatching from './pages/CollabMatching';
import CreatorCommunity from './pages/CreatorCommunity';
import Highlights from './pages/Highlights';
import HelpAndInfo from './pages/HelpAndInfo';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Achievements": Achievements,
    "AdminDashboard": AdminDashboard,
    "AffiliateDashboard": AffiliateDashboard,
    "AffiliateGoLive": AffiliateGoLive,
    "AffiliateHub": AffiliateHub,
    "AmbassadorProgram": AmbassadorProgram,
    "BrandCampaigns": BrandCampaigns,
    "BrandDashboard": BrandDashboard,
    "ChannelAnalytics": ChannelAnalytics,
    "Clips": Clips,
    "CollaborationHub": CollaborationHub,
    "CommunityForums": CommunityForums,
    "CommunityGuidelines": CommunityGuidelines,
    "ContentModerationAdmin": ContentModerationAdmin,
    "CreatorAnalytics": CreatorAnalytics,
    "CreatorMonetization": CreatorMonetization,
    "CreatorOnboarding": CreatorOnboarding,
    "CreatorProfile": CreatorProfile,
    "CreatorStudio": CreatorStudio,
    "CreatorSuccessProgram": CreatorSuccessProgram,
    "CustomizeTheme": CustomizeTheme,
    "DataPrivacy": DataPrivacy,
    "EventDetails": EventDetails,
    "Events": Events,
    "ExclusiveContentManager": ExclusiveContentManager,
    "Explore": Explore,
    "Following": Following,
    "ForumPost": ForumPost,
    "GoLive": GoLive,
    "Home": Home,
    "ImportYouTubeLibrary": ImportYouTubeLibrary,
    "Leaderboard": Leaderboard,
    "MusicStudio": MusicStudio,
    "PlatformAdminAnalytics": PlatformAdminAnalytics,
    "PlatformAnalytics": PlatformAnalytics,
    "PlaylistView": PlaylistView,
    "Playlists": Playlists,
    "PodcastStudio": PodcastStudio,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "Settings": Settings,
    "TermsOfService": TermsOfService,
    "TheAmphitheatre": TheAmphitheatre,
    "TheGamingHub": TheGamingHub,
    "UpcomingStreams": UpcomingStreams,
    "VideoEditor": VideoEditor,
    "VideoUpload": VideoUpload,
    "Videos": Videos,
    "VlogStudio": VlogStudio,
    "Wallet": Wallet,
    "WatchAffiliateVideo": WatchAffiliateVideo,
    "WatchHistory": WatchHistory,
    "WatchLater": WatchLater,
    "WatchStream": WatchStream,
    "WatchVideo": WatchVideo,
    "AffiliateMarketplace": AffiliateMarketplace,
    "GamingSetup": GamingSetup,
    "Quests": Quests,
    "WatchParties": WatchParties,
    "PPVEvents": PPVEvents,
    "FanClubs": FanClubs,
    "CollabMatching": CollabMatching,
    "CreatorCommunity": CreatorCommunity,
    "Highlights": Highlights,
    "HelpAndInfo": HelpAndInfo,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};