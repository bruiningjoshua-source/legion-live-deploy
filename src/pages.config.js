import AffiliateDashboard from './pages/AffiliateDashboard';
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
import VlogStudio from './pages/VlogStudio';
import Wallet from './pages/Wallet';
import WatchStream from './pages/WatchStream';
import BrandDashboard from './pages/BrandDashboard';
import BrandCampaigns from './pages/BrandCampaigns';
import Videos from './pages/Videos';
import WatchVideo from './pages/WatchVideo';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AffiliateDashboard": AffiliateDashboard,
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
    "VlogStudio": VlogStudio,
    "Wallet": Wallet,
    "WatchStream": WatchStream,
    "BrandDashboard": BrandDashboard,
    "BrandCampaigns": BrandCampaigns,
    "Videos": Videos,
    "WatchVideo": WatchVideo,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};