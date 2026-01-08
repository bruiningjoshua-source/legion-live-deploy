import Home from './pages/Home';
import Explore from './pages/Explore';
import Wallet from './pages/Wallet';
import WatchStream from './pages/WatchStream';
import GoLive from './pages/GoLive';
import Events from './pages/Events';
import Profile from './pages/Profile';
import CreatorProfile from './pages/CreatorProfile';
import Settings from './pages/Settings';


export const PAGES = {
    "Home": Home,
    "Explore": Explore,
    "Wallet": Wallet,
    "WatchStream": WatchStream,
    "GoLive": GoLive,
    "Events": Events,
    "Profile": Profile,
    "CreatorProfile": CreatorProfile,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};