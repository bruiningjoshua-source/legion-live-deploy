import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Home,
  Compass,
  Gamepad2,
  Radio,
  Wallet,
  User,
  LogOut,
  Settings,
  Trophy,
  Bell,
  Shield,
  Video,
  Film,
  Users,
  ShoppingBag,
  Megaphone,
  BarChart3,
  Swords,
  Music,
  Upload,
  DollarSign,
  Heart,
  MessageSquare,
  Clock,
  History,
  Scissors,
  Calendar,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '@/components/social/NotificationBell';

export default function Navbar({ user, wallet, onOpenShieldMenu }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Main navigation - 4 platforms
  const mainNavLinks = [
    { name: 'Home', path: createPageUrl('Home'), icon: Home },
    { name: 'Live Streams', path: createPageUrl('Explore'), icon: Radio },
    { name: 'Videos', path: createPageUrl('TheAmphitheatre'), icon: Film },
    { name: 'Gaming Hub', path: createPageUrl('TheGamingHub'), icon: Gamepad2 },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo + Shield Menu Toggle */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenShieldMenu}
            className="text-2xl hover:scale-110 transition-transform cursor-pointer"
            title="Open Shield Menu"
          >
            🛡️
          </button>
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <span className="font-bold text-amber-100 text-lg hidden sm:inline">Legion Live</span>
          </Link>
        </div>

        {/* Desktop Nav - Main Platforms */}
        <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full p-1">
          {mainNavLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive(link.path)
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Wallet Display */}
          {wallet && (
            <Link to={createPageUrl('Wallet')}>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 hover:bg-white/15 transition-all"
              >
                <span className="text-lg">🪙</span>
                <span className="text-white font-semibold text-sm">{(wallet.denarii_balance || 0).toLocaleString()}</span>
              </motion.div>
            </Link>
          )}

          {/* Go Live Button */}
          {user && (
            <Link to={createPageUrl('GoLive')}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="hidden sm:flex bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2 rounded-full px-5 font-medium shadow-lg shadow-red-500/20">
                  <Radio className="w-4 h-4" />
                  Go Live
                </Button>
              </motion.div>
            </Link>
          )}

          {/* Notifications */}
          {user && <NotificationBell user={user} />}

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-stone-900 border-amber-600/20">
                <div className="px-3 py-2 border-b border-amber-600/20">
                  <p className="text-amber-100 font-semibold">{user.full_name}</p>
                  <p className="text-amber-400/60 text-xs">{user.email}</p>
                </div>
                
                {/* Profile & Account */}
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Wallet')} className="cursor-pointer">
                    <Wallet className="w-4 h-4 mr-2" />
                    Vault (Wallet)
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-amber-600/20" />

                {/* Live Streaming Platform */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Radio className="w-4 h-4 mr-2 text-red-400" />
                    Live Streaming
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-stone-900 border-amber-600/20">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('GoLive')} className="cursor-pointer">
                        <Radio className="w-4 h-4 mr-2" />
                        Go Live (Solo/PK/Group)
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Explore')} className="cursor-pointer">
                        <Compass className="w-4 h-4 mr-2" />
                        Browse Live Streams
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Leaderboard')} className="cursor-pointer">
                        <Trophy className="w-4 h-4 mr-2" />
                        Leaderboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Following')} className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2" />
                        Following
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Video Platform (Amphitheatre) */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Film className="w-4 h-4 mr-2 text-blue-400" />
                    Video Platform
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-stone-900 border-amber-600/20">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('TheAmphitheatre')} className="cursor-pointer">
                        <Film className="w-4 h-4 mr-2" />
                        Browse Videos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('VideoUpload')} className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Video
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('CreatorStudio')} className="cursor-pointer">
                        <Video className="w-4 h-4 mr-2" />
                        Creator Studio
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('ChannelAnalytics')} className="cursor-pointer">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('WatchLater')} className="cursor-pointer">
                        <Clock className="w-4 h-4 mr-2" />
                        Watch Later
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('WatchHistory')} className="cursor-pointer">
                        <History className="w-4 h-4 mr-2" />
                        History
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Clips')} className="cursor-pointer">
                        <Scissors className="w-4 h-4 mr-2" />
                        Clips
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Community */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Users className="w-4 h-4 mr-2 text-cyan-400" />
                    Community
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-stone-900 border-amber-600/20">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('CommunityForums')} className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Forums
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('UpcomingStreams')} className="cursor-pointer">
                        <Calendar className="w-4 h-4 mr-2" />
                        Upcoming Streams
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Achievements')} className="cursor-pointer">
                        <Award className="w-4 h-4 mr-2" />
                        Achievements
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Gaming Hub */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Gamepad2 className="w-4 h-4 mr-2 text-purple-400" />
                    Gaming Hub
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-stone-900 border-amber-600/20">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('TheGamingHub')} className="cursor-pointer">
                        <Gamepad2 className="w-4 h-4 mr-2" />
                        Gaming Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('GamingSetup')} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Stream Setup (OBS/Streamlabs)
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Affiliate Hub */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <ShoppingBag className="w-4 h-4 mr-2 text-green-400" />
                    Affiliate Hub
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-stone-900 border-amber-600/20">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('AffiliateHub')} className="cursor-pointer">
                        <Megaphone className="w-4 h-4 mr-2" />
                        Affiliate Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('AffiliateGoLive')} className="cursor-pointer">
                        <Radio className="w-4 h-4 mr-2" />
                        Go Live (Affiliate)
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="bg-amber-600/20" />

                {/* Monetization */}
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('CreatorMonetization')} className="cursor-pointer">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Monetization
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('ExclusiveContentManager')} className="cursor-pointer">
                    <Film className="w-4 h-4 mr-2" />
                    Exclusive Content
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Settings')} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                {/* Admin Section */}
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="bg-amber-600/20" />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer text-amber-400">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-stone-900 border-amber-600/20">
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AdminDashboard')} className="cursor-pointer">
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ContentModerationAdmin')} className="cursor-pointer">
                            Content Moderation
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('PlatformAdminAnalytics')} className="cursor-pointer">
                            Platform Analytics
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('BrandDashboard')} className="cursor-pointer">
                            Brand Campaigns
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                <DropdownMenuSeparator className="bg-amber-600/20" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-white text-black hover:bg-white/90 rounded-full px-5 font-medium"
            >
              Sign In
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-amber-300 hover:bg-amber-800/20 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden bg-stone-900 border-t border-amber-600/20"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
              {mainNavLinks.map(link => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(link.path)
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-300 hover:bg-amber-800/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                );
              })}
              <Link
                to={createPageUrl('AffiliateHub')}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-300 hover:bg-green-800/20"
              >
                <ShoppingBag className="w-5 h-5" />
                Affiliate Hub
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}