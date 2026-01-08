import CreatorProfile from './pages/CreatorProfile';
import EventDetails from './pages/EventDetails';
import Events from './pages/Events';
import Explore from './pages/Explore';
import GoLive from './pages/GoLive';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Wallet from './pages/Wallet';
import WatchStream from './pages/WatchStream';
import CustomizeTheme from './pages/CustomizeTheme';
import AffiliateDashboard from './pages/AffiliateDashboard';
import PodcastStudio from './pages/PodcastStudio';
import VlogStudio from './pages/VlogStudio';
import GamingSetup from './pages/GamingSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CreatorProfile": CreatorProfile,
    "EventDetails": EventDetails,
    "Events": Events,
    "Explore": Explore,
    "GoLive": GoLive,
    "Home": Home,
    "Profile": Profile,
    "Settings": Settings,
    "Wallet": Wallet,
    "WatchStream": WatchStream,
    "CustomizeTheme": CustomizeTheme,
    "AffiliateDashboard": AffiliateDashboard,
    "PodcastStudio": PodcastStudio,
    "VlogStudio": VlogStudio,
    "GamingSetup": GamingSetup,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};