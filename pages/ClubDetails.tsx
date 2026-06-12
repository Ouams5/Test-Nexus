import React, { useEffect, useState, useRef } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { db } from '../services/mockFirebase';
import { Club, Announcement, Project, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { ArrowLeft, Megaphone, FolderGit2, CheckCircle, Clock, Lock, Languages, MessageCircle } from 'lucide-react';

export const ClubDetails = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { user, isDev } = useAuth();
  const { t, language } = useLanguage();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Store the user's original theme to restore it later
  const originalThemeRef = useRef<Theme | null>(null);

  useEffect(() => {
    // Save original theme on mount
    originalThemeRef.current = localStorage.getItem('theme') as Theme || 'light';
    
    return () => {
        // Restore on unmount
        if (originalThemeRef.current) {
            setTheme(originalThemeRef.current);
        }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
          if (!clubId) return;
          setLoading(true);
          const clubData = await db.getClub(clubId);
          setClub(clubData);

          // Apply club theme if it exists
          if (clubData?.theme) {
              setTheme(clubData.theme);
          }

          if (clubData) {
            // Fetch club specific announcements and projects
            const [allAnnounce, allProjects] = await Promise.all([
                 db.getAnnouncements(clubId),
                 db.getProjects(clubId)
            ]);
            setAnnouncements(allAnnounce);
            setProjects(allProjects);
          }
      } catch (err) {
          console.error("Failed to load club details:", err);
          setError("Failed to load club information.");
      } finally {
          setLoading(false);
      }
    };
    fetchData();
  }, [clubId]);

  if (loading) return <div className="p-10 text-center">Loading Club Details...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
  if (!club) return <div className="p-10 text-center text-red-500">Club not found.</div>;

  // Access Control for Dev Club
  const normalizeName = club.name.toLowerCase().trim();
  if ((normalizeName === 'dev team' || normalizeName === 'dev club') && !isDev) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Restricted Access</h2>
            <p className="text-slate-500 max-w-md mx-auto">
                This club is restricted to members of the Development Team. 
                If you believe you should have access, please contact the administrator.
            </p>
            <Link to="/clubs" className="mt-6 inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                <ArrowLeft size={16} className="mr-2" /> Return to Clubs
            </Link>
        </div>
      );
  }

  const isMember = user?.joinedClubIds?.includes(club.id);
  const isPrivileged = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const canAccessChat = isMember || isPrivileged;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Back Button */}
      <Link to="/clubs" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium">
        <ArrowLeft size={18} /> Back to Clubs
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="h-48 bg-slate-100 relative">
            <img src={club.imageUrl} className="w-full h-full object-cover opacity-50 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="relative px-8 pb-8 -mt-16 flex flex-wrap items-end gap-6">
            <div className="w-32 h-32 bg-white rounded-xl shadow-lg p-1 shrink-0">
                <img src={club.imageUrl} className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="flex-1 text-white md:text-slate-900 mb-2 min-w-[200px]">
                <h1 className="text-4xl font-bold">{club.name}</h1>
                <p className="opacity-90 md:text-slate-500 font-medium mt-1">{club.description}</p>
            </div>
            
            <div className="flex gap-2 mb-4 w-full md:w-auto">
                {/* Chat Button */}
                {canAccessChat && (
                    <button 
                        onClick={() => navigate(`/clubs/${club.id}/chat`)}
                        className="flex-1 md:flex-initial justify-center bg-white/90 text-indigo-600 hover:bg-white border border-transparent px-6 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all"
                    >
                        <MessageCircle size={18} /> {t('openChat')}
                    </button>
                )}

                {/* Manage Button */}
                {user?.leadingClubId === club.id && (
                    <Link to={`/club-panel/${club.id}`} className="flex-1 md:flex-initial text-center bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">
                        Manage Club
                    </Link>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,450px),1fr))] gap-8">
        {/* Announcements Section */}
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Megaphone className="text-orange-500" /> Leader Announcements
            </h2>
            {announcements.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                    No announcements yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map(a => {
                        const hasTranslation = a.translations && a.translations[language];
                        const displayTitle = hasTranslation ? a.translations[language]!.title : a.title;
                        const displayContent = hasTranslation ? a.translations[language]!.content : a.content;
                        
                        return (
                        <div key={a.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {displayTitle}
                                {hasTranslation && (
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal" title="Translated automatically">
                                        <Languages size={10} /> Translated
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 mb-3">Posted by {a.authorName} on {new Date(a.date).toLocaleDateString()}</p>
                            <p className="text-slate-600 whitespace-pre-wrap">{displayContent}</p>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Projects Section */}
        <div className="space-y-6">
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FolderGit2 className="text-blue-500" /> Club Projects
            </h2>
            {projects.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                    No active projects.
                </div>
            ) : (
                <div className="grid gap-4">
                    {projects.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                             <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={p.imageUrl} className="w-full h-full object-cover" />
                             </div>
                             <div className="flex-1">
                                <h3 className="font-bold text-slate-800">{p.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-1">{p.description}</p>
                             </div>
                             <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                 p.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                             }`}>
                                 {p.status === 'Done' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                 {p.status || 'In Progress'}
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};