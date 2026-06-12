import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../services/mockFirebase';
import { Notification } from '../types';
import { 
  Bell, Menu, X, ChevronDown, 
  // Cherry Icons
  Heart, Star, CalendarHeart, Users, MessageCircleHeart, Sparkles, User, Settings2,
  // Standard/Lethal Icons
  LayoutDashboard, Rocket, Megaphone, Calendar, Users as UsersLucide, MessageSquare, Bug, UserCircle, Terminal, ShieldAlert, BadgeDollarSign
} from 'lucide-react';

export const Layout = ({ children }: React.PropsWithChildren<{}>) => {
  const { user, logout, isDev, isOwner, canPlanEvents } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { theme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
        if (!user) return;
        const allNotifs = await db.getNotifications();
        const filtered = allNotifs.filter(n => {
            if (!n.clubId) return true;
            return user.joinedClubIds.includes(n.clubId);
        });
        setNotifications(filtered);
    };
    fetchNotifs();
  }, [user, location]);

  const handleDismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Dynamic Icon Renderer
  const getIcon = (base: string) => {
      const isCherry = theme === 'cherry';
      
      switch(base) {
          case 'home': return isCherry ? <Heart size={22} /> : <LayoutDashboard size={22} />;
          case 'projects': return isCherry ? <Star size={22} /> : <Rocket size={22} />;
          case 'announcements': return isCherry ? <Sparkles size={22} /> : <Megaphone size={22} />;
          case 'events': return isCherry ? <CalendarHeart size={22} /> : <Calendar size={22} />;
          case 'clubs': return isCherry ? <Users size={22} /> : <UsersLucide size={22} />;
          case 'chat': return isCherry ? <MessageCircleHeart size={22} /> : <MessageSquare size={22} />;
          case 'reports': return isCherry ? <Bug size={22} /> : <Bug size={22} />;
          case 'profile': return isCherry ? <User size={22} /> : <UserCircle size={22} />;
          case 'admin': return <ShieldAlert size={22} />;
          case 'dev': return <Terminal size={22} />;
          case 'debug': return <BadgeDollarSign size={22} />; // Using badge as debug placeholder
          default: return <Heart size={22} />;
      }
  };

  const NavItem = ({ to, iconKey, label }: { to: string, iconKey: string, label: string }) => {
    const isActive = location.pathname === to;
    const isLethal = theme === 'lethal';
    const isCherry = theme === 'cherry';

    let activeClass = 'text-blue-700 bg-blue-50/80 dark:bg-blue-900/40 dark:text-blue-400';
    if (isLethal) activeClass = 'text-red-500 bg-red-900/20 border-l-2 border-red-500';
    if (isCherry) activeClass = 'text-pink-600 bg-pink-50 font-bold';

    return (
      <Link 
        to={to} 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-4 px-6 py-3.5 transition-all duration-200 relative group ${
          isActive 
            ? activeClass
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        {isActive && !isLethal && !isCherry && (
          <div className={`absolute top-0 bottom-0 w-1 bg-blue-600 ${isRTL ? 'right-0 rounded-l-md' : 'left-0 rounded-r-md'}`} />
        )}
        <span className={`${isActive ? (isLethal ? 'text-red-500' : (isCherry ? 'text-pink-500' : 'text-blue-600 dark:text-blue-400')) : ''}`}>
            {getIcon(iconKey)}
        </span>
        <span className={`font-medium text-[15px] ${isActive ? 'font-semibold' : ''}`}>{label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
        {/* Logo Section */}
        <div className="p-8 pb-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${theme === 'lethal' ? 'bg-red-900 shadow-red-900/50' : (theme === 'cherry' ? 'bg-pink-400 shadow-pink-200' : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-200/50')}`}>
              {theme === 'lethal' ? <ShieldAlert size={20}/> : (theme === 'cherry' ? <Heart size={20} fill="white"/> : <span className="material-symbols-rounded text-xl">school</span>)}
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight font-display tracking-tight">BNI Yekhlef</h1>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t('studentPortal')}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 py-2">
          <NavItem to="/" iconKey="home" label={t('dashboard')} />
          <NavItem to="/projects" iconKey="projects" label={t('projects')} />
          <NavItem to="/announcements" iconKey="announcements" label={t('announcements')} />
          <NavItem to="/events" iconKey="events" label={t('events')} />
          <NavItem to="/clubs" iconKey="clubs" label={t('clubs')} />
          {/* General Chat Removed */}
          <NavItem to="/bugs" iconKey="reports" label={t('reports')} />
          <NavItem to="/profile" iconKey="profile" label={t('profile')} />
          
          {canPlanEvents && (
             <NavItem to="/event-planning" iconKey="events" label={t('eventPlanning')} />
          )}

          {(isDev || isOwner) && (
             <NavItem to="/chat" iconKey="dev" label={t('devChat')} />
          )}
          
          {user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'DEV' ? (
             <NavItem to="/admin" iconKey="admin" label={t('adminPanel')} />
          ) : null}

          <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2">
             <NavItem to="/credits" iconKey="home" label={t('credits')} />
          </div>

        </nav>

        {/* Bottom User Section */}
        <div className="p-5 mt-auto">
          <div className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-3 border border-slate-100 dark:border-slate-700 mb-4 flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base text-white overflow-hidden shadow-sm ${user ? (theme === 'cherry' ? 'bg-pink-400' : 'bg-indigo-600') : 'bg-slate-300'}`}>
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="av" className="w-full h-full object-cover" /> : <User size={20} />}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate font-display">{user ? user.name : t('guestUser')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user ? user.role.toLowerCase().replace('_', ' ') : t('notSignedIn')}</p>
             </div>
          </div>
          
          {user ? (
            <button 
              onClick={logout}
              className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <span className="material-symbols-rounded text-xl text-slate-400 group-hover:text-red-500 transition-colors">logout</span>
              <span className="text-sm">{t('logout')}</span>
            </button>
          ) : (
             <Link 
              to="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-xl">login</span>
              <span className="text-sm">{t('login')}</span>
            </Link>
          )}
        </div>
    </>
  );

  return (
    <div className="flex h-screen font-sans text-slate-600 dark:text-slate-300 selection:bg-blue-100 selection:text-blue-900" style={{ background: 'var(--bg-main)' }}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside className={`
        fixed md:static inset-y-0 z-50 w-[280px] bg-white dark:bg-slate-900 border-r border-l border-slate-200/60 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-sm
        ${isMobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
        ${isRTL ? 'right-0 md:border-l md:border-r-0' : 'left-0 md:border-r'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: 'var(--bg-main)' }}>
        {/* Top Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            
            <div className="hidden md:flex items-center w-full max-w-md">
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="relative">
                <button 
                    onClick={() => setShowLangMenu(!showLangMenu)} 
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-full transition-colors border border-slate-200 dark:border-slate-700"
                >
                    <span className="material-symbols-rounded text-lg text-blue-600 dark:text-blue-400">language</span>
                    <span className="uppercase">{language}</span>
                    <ChevronDown size={12} className="opacity-50" />
                </button>
                {showLangMenu && (
                    <div className={`absolute top-full mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isRTL ? 'left-0' : 'right-0'}`}>
                        <button onClick={() => {setLanguage('en'); setShowLangMenu(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium dark:text-slate-300">English</button>
                        <button onClick={() => {setLanguage('fr'); setShowLangMenu(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium dark:text-slate-300">Français</button>
                        <button onClick={() => {setLanguage('ar'); setShowLangMenu(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium font-arabic dark:text-slate-300">العربية</button>
                    </div>
                )}
            </div>

            <div className="relative">
                <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors">
                    <Bell size={24} />
                    {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                {showNotifPanel && (
                    <div className={`absolute top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200 ${isRTL ? 'left-0' : 'right-0'}`}>
                        <div className="p-4 border-b border-slate-50 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <span>Notifications</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                    <Bell size={32} className="opacity-20" />
                                    No new notifications
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className="p-4 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm relative group transition-colors">
                                        <button 
                                            onClick={(e) => handleDismissNotification(n.id, e)}
                                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            title="Dismiss"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 pr-6 mb-1">{n.title}</div>
                                        <div className="text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium uppercase tracking-wide">{new Date(n.date).toLocaleDateString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>

            {user ? (
               <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">{t('welcome').split(' ')[0]}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 font-display">{user.name.split(' ')[0]}</p>
               </div> 
            ) : (
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">{t('welcome').split(' ')[0]}</p>
                  <p className="text-sm font-medium text-slate-400">{t('pleaseSignIn')}</p>
               </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-[clamp(1rem,3vw,2rem)] scroll-smooth">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};