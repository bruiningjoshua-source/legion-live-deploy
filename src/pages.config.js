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
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};