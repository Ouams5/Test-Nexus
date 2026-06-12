import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { Club, UserRole } from '../types';
import { Plus, Trash2, LogIn, LogOut, EyeOff, Palette, Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Clubs = () => {
  const { canCreateClub, canDeleteClub, user, refreshUser, isDev } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useUI();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Club Fields
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubLogo, setNewClubLogo] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [isHiddenClub, setIsHiddenClub] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'midnight' | 'depressed' | 'cherry' | 'lethal'>('light');
  
  // Leader Badge Fields
  const [badgeName, setBadgeName] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeImage, setBadgeImage] = useState('');

  const [loading, setLoading] = useState(false);

  const loadClubs = async () => {
    const data = await db.getClubs();
    setClubs(data);
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    // Call new method with leader email
    const success = await db.createClubWithLeader({
        name: newClubName,
        description: newClubDesc,
        imageUrl: newClubLogo || `https://ui-avatars.com/api/?name=${newClubName}&background=random&size=400`,
        memberIds: [], // Will be handled by service
        leaderId: '', // Will be handled by service
        isHidden: isHiddenClub,
        theme: selectedTheme,
        
        // Leader Badge
        badgeName: badgeName || `${newClubName} Leader`,
        badgeDescription: badgeDesc || `Official leadership badge for ${newClubName}`,
        badgeImageUrl: badgeImage || newClubLogo || `https://ui-avatars.com/api/?name=${newClubName}&background=random&size=400`,
    }, leaderEmail);

    setLoading(false);
    if (success) {
        showToast("Club created successfully!", "success");
        setShowModal(false);
        setNewClubName('');
        setNewClubDesc('');
        setNewClubLogo('');
        setLeaderEmail('');
        
        setBadgeName('');
        setBadgeDesc('');
        setBadgeImage('');
        
        setIsHiddenClub(false);
        setSelectedTheme('light');
        loadClubs();
    } else {
        showToast("Failed to create club. Check if leader email is correct.", "error");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
        title: "Delete Club",
        message: "Are you sure you want to delete this club? This action is irreversible.",
        type: "danger",
        confirmText: "Delete"
    });

    if (confirmed) {
        await db.deleteClub(id);
        showToast("Club deleted.", "success");
        loadClubs();
    }
  };

  const handleJoin = async (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(user) {
        await db.joinClub(user.id, clubId);
        await refreshUser();
        showToast("You joined the club!", "success");
        loadClubs();
    }
  }

  const handleLeave = async (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
        title: "Leave Club",
        message: "Are you sure you want to leave this club?",
        confirmText: "Leave",
        type: "warning"
    });

    if(confirmed && user) {
        await db.leaveClub(user.id, clubId);
        await refreshUser();
        showToast("You left the club.", "info");
        loadClubs();
    }
  }

  const handleCardClick = (clubId: string) => {
    navigate(`/clubs/${clubId}`);
  };

  // Filter clubs based on visibility rules
  const filteredClubs = clubs.filter(club => {
    const normalizeName = club.name.toLowerCase().trim();
    
    // Hardcoded dev check (Legacy)
    if (normalizeName === 'dev team' || normalizeName === 'dev club') {
        return isDev;
    }

    // Hidden Club Logic
    if (club.isHidden) {
        // Visible if user is Admin, Owner, Dev OR is a member of the club
        const isPrivileged = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
        const isMember = user?.joinedClubIds?.includes(club.id);
        
        if (!isPrivileged && !isMember) {
            return false;
        }
    }

    return true;
  });

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">{t('studentClubs')}</h1>
        {canCreateClub && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} /> {t('registerClub')}
          </button>
        )}
      </div>

      {filteredClubs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">{t('noClubs')}</div>
      ) : (
        /* Fluid Grid Layout */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
            {filteredClubs.map(club => {
                const isMember = user?.joinedClubIds?.includes(club.id);
                return (
                    <div 
                        key={club.id} 
                        onClick={() => handleCardClick(club.id)}
                        className={`bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 flex flex-col cursor-pointer hover:shadow-md transition-shadow ${club.isHidden ? 'ring-2 ring-slate-400 border-slate-400' : ''}`}
                    >
                        <div className="h-48 overflow-hidden bg-slate-200 relative group">
                            <img src={club.imageUrl} alt={club.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            {club.isHidden && (
                                <div className="absolute top-2 right-2 bg-slate-800/80 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                    <EyeOff size={12} /> Hidden
                                </div>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{club.name}</h3>
                            <p className="text-slate-500 mb-4 flex-1 line-clamp-3">{club.description}</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-xs font-medium text-slate-400">{club.memberIds?.length || 0} {t('members')}</span>
                                
                                <div className="flex gap-2">
                                    {isMember ? (
                                        <button onClick={(e) => handleLeave(club.id, e)} className="flex items-center gap-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-lg">
                                            <LogOut size={14}/> {t('leave')}
                                        </button>
                                    ) : (
                                        <button onClick={(e) => handleJoin(club.id, e)} className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded-lg">
                                            {t('join')}
                                        </button>
                                    )}

                                    {canDeleteClub && (
                                        <button onClick={(e) => handleDelete(club.id, e)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 h-[80vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold mb-4">{t('registerNewClub')}</h2>
            <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-2">Club Details</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('clubName')}</label>
                        <input className="w-full p-2 border rounded-lg" value={newClubName} onChange={e => setNewClubName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('clubDesc')}</label>
                        <textarea className="w-full p-2 border rounded-lg" rows={3} value={newClubDesc} onChange={e => setNewClubDesc(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('logoUrl')}</label>
                        <input className="w-full p-2 border rounded-lg" value={newClubLogo} onChange={e => setNewClubLogo(e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">{t('leaderEmail')}</label>
                         <input 
                            type="email"
                            className="w-full p-2 border rounded-lg" 
                            value={leaderEmail} 
                            onChange={e => setLeaderEmail(e.target.value)} 
                            placeholder="student@bniyekhlef.edu"
                            required 
                         />
                         <p className="text-xs text-slate-500 mt-1">{t('leaderEmailHint')}</p>
                    </div>
                </div>

                {/* Leader Badge */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                        <Award size={16} /> Leader Badge Customization
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Badge Name</label>
                        <input className="w-full p-2 border rounded-lg" value={badgeName} onChange={e => setBadgeName(e.target.value)} placeholder={newClubName ? `${newClubName} Leader` : 'Club Leader'} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Badge Description</label>
                        <input className="w-full p-2 border rounded-lg" value={badgeDesc} onChange={e => setBadgeDesc(e.target.value)} placeholder="Official leadership verification..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Badge Image URL</label>
                        <input className="w-full p-2 border rounded-lg" value={badgeImage} onChange={e => setBadgeImage(e.target.value)} placeholder="Leave empty to use Club Logo" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-2">Appearance & Visibility</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Palette size={16}/> Club Theme</label>
                        <select 
                            value={selectedTheme} 
                            onChange={e => setSelectedTheme(e.target.value as any)}
                            className="w-full p-2 border rounded-lg bg-white"
                        >
                            <option value="light">Light (Default)</option>
                            <option value="dark">Dark</option>
                            <option value="midnight">Midnight</option>
                            <option value="depressed">Depressed</option>
                            <option value="cherry">Cherry</option>
                            <option value="lethal">Lethal</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="hiddenClub"
                            checked={isHiddenClub}
                            onChange={e => setIsHiddenClub(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="hiddenClub" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <EyeOff size={16} className="text-slate-500" />
                            Hidden Club (Admins only)
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500">{t('cancel')}</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">{t('create')}</button>
                </div>
            </form>
          </div>
          </div>
      )}
    </div>
  );
};