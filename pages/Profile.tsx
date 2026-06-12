import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { db, updateUserPassword, auth } from '../services/mockFirebase';
import { UserRole } from '../types';
import { UserCircle, Mail, Award, BookOpen, Settings, Moon, Sun, Lock, X, Eye, EyeOff, ShieldCheck, KeyRound, CloudRain, Flower2, Stars, Skull, IdCard, Sunrise, Flame, Gem, Infinity, Landmark, RefreshCw } from 'lucide-react';

export const Profile = () => {
  const { user, syncAccount } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useUI();
  const { theme, setTheme } = useTheme();
  const [clubs, setClubs] = useState<any[]>([]);
  
  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'security' | 'account'>('appearance');

  // Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [oldestPass, setOldestPass] = useState('');
  const [recoveryNewPass, setRecoveryNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  // Recovery Flow State
  const [isRecoveryVerified, setIsRecoveryVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        if(user && user.joinedClubIds && user.joinedClubIds.length > 0) {
            const allClubs = await db.getClubs();
            setClubs(allClubs.filter(c => user.joinedClubIds.includes(c.id)));
        }
    };
    loadData();
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth.currentUser) return;
      try {
          await updateUserPassword(auth.currentUser, newPass);
          showToast("Password updated successfully.", "success");
          setNewPass('');
          setCurrentPass('');
      } catch (error: any) {
          console.error(error);
          if (error.code === 'auth/requires-recent-login') {
            showToast("Please re-login to change password.", "error");
          } else {
            showToast("Failed to update password.", "error");
          }
      }
  };

  const handleOldestPasswordRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!oldestPass) return;
      
      setIsVerifying(true);
      // Simulate verification delay for the "Oldest Password" check
      setTimeout(() => {
          setIsVerifying(false);
          setIsRecoveryVerified(true);
          showToast("Identity verified via history check.", "success");
      }, 1500);
  };

  const handleRecoveryReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth.currentUser) return;
      try {
          await updateUserPassword(auth.currentUser, recoveryNewPass);
          showToast("Password reset successfully.", "success");
          setRecoveryNewPass('');
          setOldestPass('');
          setIsRecoveryVerified(false);
          setIsSettingsOpen(false);
      } catch (error: any) {
          console.error(error);
          showToast("Failed to reset password. Please try re-logging in.", "error");
      }
  };
  
  const handleSyncAccount = async () => {
      setIsSyncing(true);
      try {
          await syncAccount();
          showToast(t('syncSuccess'), "success");
      } catch (e) {
          showToast("Sync failed.", "error");
      } finally {
          setIsSyncing(false);
      }
  };
  
  const ThemeOption = ({ id, label, icon: Icon, color }: { id: Theme, label: string, icon: any, color: string }) => (
      <button 
        onClick={() => setTheme(id)} 
        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.02] ${theme === id ? `border-${color}-500 bg-${color}-50 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
      >
          <div className="flex items-center gap-3">
              <Icon size={20} /> {label}
          </div>
          {theme === id && <div className={`w-4 h-4 rounded-full bg-${color}-500`}></div>}
      </button>
  );

  if (!user) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">{t('pleaseSignIn')}</div>;

  const canAccessLethal = user.role === UserRole.ADMIN || user.role === UserRole.OWNER || user.role === UserRole.DEV;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8 relative">
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
            title={t('settings')}
        >
            <Settings size={24} />
        </button>

        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-slate-50 dark:ring-slate-800">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <UserCircle size={64} className="text-slate-300" />}
        </div>
        <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-3">
                {user.name}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 dark:text-slate-400 mt-2">
                <Mail size={16}/>
                <span>{user.email}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
                    {user.role.replace('_', ' ')}
                </span>
                {user.grade && (
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-1 rounded-full text-sm font-bold">
                        {user.grade}
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Claimed Badges Section */}
      {user.badges && user.badges.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                  <IdCard className="text-purple-500"/> Official Badges
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.badges.map((badge, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm relative overflow-hidden group">
                           {/* Shine Effect */}
                           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000"></div>
                           
                           <img src={badge.imageUrl} alt={badge.name} className="w-12 h-12 rounded-lg object-cover shadow-sm bg-white" />
                           <div className="flex-1 min-w-0">
                               <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">
                                   {(badge.type || 'CUSTOM').replace('_', ' ')}
                               </p>
                               <p className="font-bold text-slate-800 dark:text-white truncate" title={badge.name}>{badge.name}</p>
                               <p className="text-[10px] text-slate-400">Claimed {new Date(badge.assignedAt).toLocaleDateString()}</p>
                           </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><Award className="text-yellow-500"/> {t('membershipStatus')}</h2>
            <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-50 dark:border-slate-700 pb-3">
                    <span className="text-slate-500 dark:text-slate-400">{t('clubsJoined')}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">{user.joinedClubIds?.length || 0}</span>
                </div>
                 <div className="flex justify-between text-slate-900 dark:text-slate-200">
                    <span className="text-slate-500 dark:text-slate-400">{t('clubLeader')}</span>
                    <span className="font-medium">{user.leadingClubId ? t('yes') : t('no')}</span>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><BookOpen className="text-blue-500"/> {t('myClubs')}</h2>
             {clubs.length > 0 ? (
                 <div className="space-y-3">
                     {clubs.map(c => (
                         <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                             <div className="w-10 h-10 bg-slate-200 dark:bg-slate-600 rounded-md overflow-hidden">
                                 <img src={c.imageUrl} className="w-full h-full object-cover"/>
                             </div>
                             <span className="font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                         </div>
                     ))}
                 </div>
             ) : (
                 <p className="text-slate-400 italic">{t('noClubsJoined')}</p>
             )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                          <Settings className="text-indigo-600" /> {t('settings')}
                      </h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex h-[450px]">
                      {/* Sidebar Tabs */}
                      <div className="w-1/3 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 p-4 space-y-2">
                          <button 
                            onClick={() => setSettingsTab('appearance')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${settingsTab === 'appearance' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                          >
                              {theme === 'dark' ? <Moon size={18}/> : <Sun size={18}/>} {t('appearance')}
                          </button>
                          <button 
                            onClick={() => setSettingsTab('security')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${settingsTab === 'security' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                          >
                              <Lock size={18}/> {t('security')}
                          </button>
                          <button 
                            onClick={() => setSettingsTab('account')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${settingsTab === 'account' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                          >
                              <UserCircle size={18}/> {t('account')}
                          </button>
                      </div>

                      {/* Content */}
                      <div className="w-2/3 p-6 overflow-y-auto bg-white dark:bg-slate-900">
                          {settingsTab === 'appearance' && (
                              <div className="space-y-6">
                                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t('theme')}</h3>
                                  <div className="flex flex-col gap-3">
                                      <ThemeOption id="light" label={t('lightMode')} icon={Sun} color="indigo" />
                                      <ThemeOption id="dark" label={t('darkMode')} icon={Moon} color="indigo" />
                                      <ThemeOption id="midnight" label="Midnight" icon={Stars} color="blue" />
                                      <ThemeOption id="depressed" label="Depressed" icon={CloudRain} color="gray" />
                                      <ThemeOption id="cherry" label="Cherry Blossom" icon={Flower2} color="pink" />
                                      {canAccessLethal && (
                                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                              <p className="text-xs font-bold text-red-500 uppercase mb-2">Admin Zone</p>
                                              <ThemeOption id="lethal" label="Lethal Mode" icon={Skull} color="red" />
                                              <div className="mt-4 space-y-3">
                                                  <ThemeOption id="coming-of-age" label="Coming of Age" icon={Sunrise} color="orange" />
                                                  <ThemeOption id="devils-gate" label="The Devil's Gate" icon={Flame} color="red" />
                                                  <ThemeOption id="rare-gems" label="Rare Gems" icon={Gem} color="cyan" />
                                                  <ThemeOption id="infinite-void" label="Infinite Void" icon={Infinity} color="purple" />
                                                  <ThemeOption id="malevolent-shrine" label="Malevolent Shrine" icon={Landmark} color="red" />
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}

                          {settingsTab === 'security' && (
                              <div className="space-y-8">
                                  {/* Standard Password Change */}
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                          <Lock size={18}/> {t('changePassword')}
                                      </h3>
                                      <form onSubmit={handleChangePassword} className="space-y-3">
                                        <div className="relative">
                                            <input 
                                                type={showPass ? "text" : "password"} 
                                                placeholder={t('newPassword')}
                                                className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={newPass}
                                                onChange={e => setNewPass(e.target.value)}
                                            />
                                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                                {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                            </button>
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={!newPass}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 w-full"
                                        >
                                            {t('updatePassword')}
                                        </button>
                                      </form>
                                  </div>
                              </div>
                          )}

                          {settingsTab === 'account' && (
                              <div className="space-y-6">
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                          <RefreshCw size={18}/> {t('syncData')}
                                      </h3>
                                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-4">
                                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                              {t('syncDataDesc')}
                                          </p>
                                      </div>
                                      <button 
                                          onClick={handleSyncAccount}
                                          disabled={isSyncing}
                                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                      >
                                          <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                                          {isSyncing ? "Syncing..." : t('syncData')}
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};