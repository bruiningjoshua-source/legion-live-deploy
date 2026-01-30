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
import AdminDashboard from './pages/AdminDashboard';
import AffiliateDashboard from './pages/AffiliateDashboard';
import AffiliateGoLive from './pages/AffiliateGoLive';
import AffiliateHub from './pages/AffiliateHub';
import AmbassadorProgram from './pages/AmbassadorProgram';
import BrandCampaigns from './pages/BrandCampaigns';
import BrandDashboard from './pages/BrandDashboard';
import ChannelAnalytics from './pages/ChannelAnalytics';
import CollaborationHub from './pages/CollaborationHub';
import CommunityForums from './pages/CommunityForums';
import ContentModerationAdmin from './pages/ContentModerationAdmin';
import CreatorMonetization from './pages/CreatorMonetization';
import CreatorOnboarding from './pages/CreatorOnboarding';
import CreatorProfile from './pages/CreatorProfile';
import CreatorStudio from './pages/CreatorStudio';
import CustomizeTheme from './pages/CustomizeTheme';
import EventDetails from './pages/EventDetails';
import Events from './pages/Events';
import ExclusiveContentManager from './pages/ExclusiveContentManager';
import Explore from './pages/Explore';
import Following from './pages/Following';
import ForumPost from './pages/ForumPost';
import GamingSetup from './pages/GamingSetup';
import GoLive from './pages/GoLive';
import Home from './pages/Home';
import ImportYouTubeLibrary from './pages/ImportYouTubeLibrary';
import Leaderboard from './pages/Leaderboard';
import MusicStudio from './pages/MusicStudio';
import PlatformAdminAnalytics from './pages/PlatformAdminAnalytics';
import PlatformAnalytics from './pages/PlatformAnalytics';
import PodcastStudio from './pages/PodcastStudio';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import TheAmphitheatre from './pages/TheAmphitheatre';
import TheGamingHub from './pages/TheGamingHub';
import VideoEditor from './pages/VideoEditor';
import VideoUpload from './pages/VideoUpload';
import Videos from './pages/Videos';
import VlogStudio from './pages/VlogStudio';
import Wallet from './pages/Wallet';
import WatchAffiliateVideo from './pages/WatchAffiliateVideo';
import WatchStream from './pages/WatchStream';
import WatchVideo from './pages/WatchVideo';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CommunityGuidelines from './pages/CommunityGuidelines';
import DataPrivacy from './pages/DataPrivacy';
import CreatorAnalytics from './pages/CreatorAnalytics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AffiliateDashboard": AffiliateDashboard,
    "AffiliateGoLive": AffiliateGoLive,
    "AffiliateHub": AffiliateHub,
    "AmbassadorProgram": AmbassadorProgram,
    "BrandCampaigns": BrandCampaigns,
    "BrandDashboard": BrandDashboard,
    "ChannelAnalytics": ChannelAnalytics,
    "CollaborationHub": CollaborationHub,
    "CommunityForums": CommunityForums,
    "ContentModerationAdmin": ContentModerationAdmin,
    "CreatorMonetization": CreatorMonetization,
    "CreatorOnboarding": CreatorOnboarding,
    "CreatorProfile": CreatorProfile,
    "CreatorStudio": CreatorStudio,
    "CustomizeTheme": CustomizeTheme,
    "EventDetails": EventDetails,
    "Events": Events,
    "ExclusiveContentManager": ExclusiveContentManager,
    "Explore": Explore,
    "Following": Following,
    "ForumPost": ForumPost,
    "GamingSetup": GamingSetup,
    "GoLive": GoLive,
    "Home": Home,
    "ImportYouTubeLibrary": ImportYouTubeLibrary,
    "Leaderboard": Leaderboard,
    "MusicStudio": MusicStudio,
    "PlatformAdminAnalytics": PlatformAdminAnalytics,
    "PlatformAnalytics": PlatformAnalytics,
    "PodcastStudio": PodcastStudio,
    "Profile": Profile,
    "Settings": Settings,
    "TheAmphitheatre": TheAmphitheatre,
    "TheGamingHub": TheGamingHub,
    "VideoEditor": VideoEditor,
    "VideoUpload": VideoUpload,
    "Videos": Videos,
    "VlogStudio": VlogStudio,
    "Wallet": Wallet,
    "WatchAffiliateVideo": WatchAffiliateVideo,
    "WatchStream": WatchStream,
    "WatchVideo": WatchVideo,
    "TermsOfService": TermsOfService,
    "PrivacyPolicy": PrivacyPolicy,
    "CommunityGuidelines": CommunityGuidelines,
    "DataPrivacy": DataPrivacy,
    "CreatorAnalytics": CreatorAnalytics,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};