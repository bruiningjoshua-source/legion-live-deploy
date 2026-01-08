import AffiliateDashboard from './pages/AffiliateDashboard';
import BrandCampaigns from './pages/BrandCampaigns';
import BrandDashboard from './pages/BrandDashboard';
import CreatorMonetization from './pages/CreatorMonetization';
import CreatorProfile from './pages/CreatorProfile';
import CustomizeTheme from './pages/CustomizeTheme';
import EventDetails from './pages/EventDetails';
import Events from './pages/Events';
import Explore from './pages/Explore';
import GamingSetup from './pages/GamingSetup';
import GoLive from './pages/GoLive';
import Home from './pages/Home';
import PodcastStudio from './pages/PodcastStudio';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Videos from './pages/Videos';
import VlogStudio from './pages/VlogStudio';
import Wallet from './pages/Wallet';
import WatchStream from './pages/WatchStream';
import WatchVideo from './pages/WatchVideo';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AffiliateDashboard": AffiliateDashboard,
    "BrandCampaigns": BrandCampaigns,
    "BrandDashboard": BrandDashboard,
    "CreatorMonetization": CreatorMonetization,
    "CreatorProfile": CreatorProfile,
    "CustomizeTheme": CustomizeTheme,
    "EventDetails": EventDetails,
    "Events": Events,
    "Explore": Explore,
    "GamingSetup": GamingSetup,
    "GoLive": GoLive,
    "Home": Home,
    "PodcastStudio": PodcastStudio,
    "Profile": Profile,
    "Settings": Settings,
    "Videos": Videos,
    "VlogStudio": VlogStudio,
    "Wallet": Wallet,
    "WatchStream": WatchStream,
    "WatchVideo": WatchVideo,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};