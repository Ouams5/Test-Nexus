import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { translateAnnouncement } from '../services/ai';
import { Club, User, Project, Announcement, UserRole, Badge } from '../types';
import { UserMinus, Plus, CheckCircle, Clock, Trash2, Loader2, Languages, IdCard, QrCode } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ClubPanel = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { canManageClub, user, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const { showToast, confirm } = useUI();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [activeTab, setActiveTab] = useState<'members' | 'announcements' | 'projects' | 'badge'>('members');
  const [showProjModal, setShowProjModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [newProj, setNewProj] = useState({ title: '', desc: '', logo: '', status: 'In Progress' as const });
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '', autoTranslate: false });

  useEffect(() => {
    loadAllData();
  }, [clubId]);

  const loadAllData = async () => {
    if (clubId) {
        const allClubs = await db.getClubs();
        const foundClub = allClubs.find(c => c.id === clubId);
        setClub(foundClub || null);
        
        if (foundClub && foundClub.memberIds) {
            const allUsers = await db.getAllUsers();
            setMembers(allUsers.filter(u => foundClub.memberIds.includes(u.id)));
        }

        const clubProjects = await db.getProjects(clubId);
        setProjects(clubProjects);

        const clubAnnouncements = await db.getAnnouncements(clubId);
        setAnnouncements(clubAnnouncements);
    }
  };

  if (!clubId || !canManageClub(clubId)) {
    return <div className="text-center p-10 text-red-500">Access Denied: You do not have permission to manage this club.</div>;
  }

  if (!club) return <div>Loading...</div>;

  const handleKick = async (member: User) => {
    if (member.role === UserRole.OWNER) {
        showToast("You cannot kick an Owner from the club.", "error");
        return;
    }

    const confirmed = await confirm({
        title: "Kick Member",
        message: `Are you sure you want to kick ${member.name}?`,
        confirmText: "Kick",
        type: "warning"
    });

    if (confirmed) {
        if (user && await db.kickMember(user.id, club.id, member.id)) {
            setMembers(prev => prev.filter(m => m.id !== member.id));
            showToast("Member kicked successfully.", "success");
        } else {
            showToast("Failed to kick member.", "error");
        }
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        await db.addProject({
            id: Date.now().toString(),
            title: newProj.title,
            description: newProj.desc,
            imageUrl: newProj.logo || `https://ui-avatars.com/api/?name=${newProj.title}&background=random`,
            status: newProj.status,
            contributors: [club.name],
            clubId: club.id
        });
        setShowProjModal(false);
        setNewProj({ title: '', desc: '', logo: '', status: 'In Progress' });
        showToast("Project created!", "success");
        loadAllData();
      } catch (e) {
          console.error(e);
          showToast("Failed to create project", "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        let translations = undefined;
        if (newAnnounce.autoTranslate) {
            translations = await translateAnnouncement(newAnnounce.title, newAnnounce.content);
        }

        const announcementData: any = {
            id: Date.now().toString(),
            title: newAnnounce.title,
            content: newAnnounce.content,
            date: new Date().toISOString(),
            isImportant: true,
            authorName: user?.name || 'Club Leader',
            clubId: club.id,
            clubName: club.name
        };

        if (translations) {
            announcementData.translations = translations;
        }

        await db.addAnnouncement(announcementData);
        setShowAnnounceModal(false);
        setNewAnnounce({ title: '', content: '', autoTranslate: false });
        showToast("Announcement posted!", "success");
        loadAllData();
      } catch (e) {
          console.error(e);
          showToast("Failed to post announcement", "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDeleteProject = async (id: string) => {
      const confirmed = await confirm({
          title: "Delete Project",
          message: "Delete this project?",
          type: "danger"
      });
      if(confirmed) {
          await db.deleteProject(id);
          showToast("Project deleted.", "success");
          loadAllData();
      }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      const confirmed = await confirm({
          title: "Delete Announcement",
          message: "Delete this announcement?",
          type: "danger"
      });
      if(confirmed) {
          await db.deleteAnnouncement(id);
          showToast("Announcement deleted.", "success");
          loadAllData();
      }
  };

  const toggleProjectStatus = async (p: Project) => {
      const newStatus = p.status === 'Done' ? 'In Progress' : 'Done';
      await db.updateProject(p.id, { status: newStatus });
      loadAllData();
  };

  const handleClaimBadge = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const badge: Badge = {
            id: `club-leader-${club.id}-${user.id}`,
            clubId: club.id,
            type: 'CLUB_LEADER',
            name: club.badgeName || `${club.name} Leader`,
            imageUrl: club.badgeImageUrl || club.imageUrl,
            description: club.badgeDescription || "Official Leadership Verification",
            assignedAt: new Date().toISOString()
        };
        await db.addBadgeToUser(user.id, badge);
        await refreshUser();
        showToast("Official Club Badge Claimed!", "success");
    } catch (e) {
        console.error(e);
        showToast("Failed to claim badge.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const hasClaimedBadge = user?.badges?.some(b => b.clubId === club.id && b.type === 'CLUB_LEADER');

  const displayBadgeName = club.badgeName || `${club.name} Leader`;
  const displayBadgeImage = club.badgeImageUrl || club.imageUrl;
  const displayBadgeDesc = club.badgeDescription || "Official Leadership Verification";

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
                <span className="material-symbols-rounded text-purple-600 text-3xl">settings_account_box</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-800 font-display">{club.name} Dashboard</h1>
                <p className="text-slate-500">Manage members, projects, and announcements</p>
            </div>
        </div>
        
        <div className="flex gap-4 mt-8 border-b border-slate-100 overflow-x-auto">
            <button onClick={() => setActiveTab('members')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'members' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Members</button>
            <button onClick={() => setActiveTab('announcements')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Announcements</button>
            <button onClick={() => setActiveTab('projects')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'projects' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Projects</button>
            <button onClick={() => setActiveTab('badge')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'badge' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Club Badge</button>
        </div>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold flex items-center gap-2 font-display text-slate-700">
                    <span className="material-symbols-rounded text-indigo-500">group</span>
                    Members Directory
                </h2>
                <span className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{members.length} Active</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {members.map(member => (
                            <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">{member.name}</td>
                                <td className="p-4 text-slate-500">{member.email}</td>
                                <td className="p-4">
                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 font-medium">{member.role}</span>
                                </td>
                                <td className="p-4 text-right">
                                    {member.id !== user?.id && member.role !== UserRole.OWNER && (
                                        <button 
                                            onClick={() => handleKick(member)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition-colors"
                                        >
                                            <UserMinus size={16}/> Kick
                                        </button>
                                    )}
                                    {member.role === UserRole.OWNER && (
                                        <span className="text-xs text-slate-400 italic flex items-center justify-end gap-1">
                                            <span className="material-symbols-rounded text-sm">lock</span> Protected
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No members yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'announcements' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800 font-display">Club Announcements</h2>
                 <button onClick={() => setShowAnnounceModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm font-medium">
                     <Plus size={18} /> New Post
                 </button>
             </div>
             {announcements.length === 0 ? <p className="text-slate-500 text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed">No announcements posted.</p> : announcements.map(a => {
                 const hasTranslation = a.translations && a.translations[language];
                 const displayTitle = hasTranslation ? a.translations[language]!.title : a.title;
                 const displayContent = hasTranslation ? a.translations[language]!.content : a.content;
                 
                 return (
                 <div key={a.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all">
                     <button 
                        onClick={() => handleDeleteAnnouncement(a.id)} 
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-2 bg-white/80 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm"
                        title="Delete Announcement"
                     >
                        <Trash2 size={18}/>
                     </button>
                     <div className="flex justify-between mb-3 pr-8">
                         <h3 className="font-bold text-lg flex items-center gap-2 font-display text-slate-800">
                             {displayTitle}
                             {hasTranslation && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal border border-blue-100" title="Translated automatically">
                                    <Languages size={10} /> Translated
                                </span>
                            )}
                         </h3>
                         <span className="text-xs text-slate-400 font-medium">{new Date(a.date).toLocaleDateString()}</span>
                     </div>
                     <div className="text-slate-600 markdown-body text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                     </div>
                 </div>
                 );
             })}
          </div>
      )}

      {activeTab === 'projects' && (
           <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800 font-display">Club Projects</h2>
                 <button onClick={() => setShowProjModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm font-medium">
                     <Plus size={18} /> New Project
                 </button>
             </div>
             <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {projects.length === 0 ? <p className="col-span-2 text-slate-500 text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed">No projects started.</p> : projects.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 relative group hover:shadow-md transition-all">
                        <button 
                            onClick={() => handleDeleteProject(p.id)} 
                            className="absolute top-2 right-2 text-white bg-black/50 hover:bg-red-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-10"
                            title="Delete Project"
                        >
                            <Trash2 size={14}/>
                        </button>
                        <img src={p.imageUrl} className="w-16 h-16 rounded-lg object-cover bg-slate-100 border border-slate-100 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 font-display mb-1 truncate">{p.title}</h3>
                            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.description}</p>
                            <button 
                                onClick={() => toggleProjectStatus(p)}
                                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit transition-colors border ${
                                    p.status === 'Done' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}>
                                {p.status === 'Done' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                {p.status || 'In Progress'}
                            </button>
                        </div>
                    </div>
                ))}
             </div>
           </div>
      )}

      {activeTab === 'badge' && (
          <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                          <IdCard className="text-indigo-600"/> Official Club Badge
                      </h2>
                      <p className="text-slate-600 text-sm mb-6">
                          As the leader of <span className="font-bold">{club.name}</span>, you can claim your official digital badge. 
                          This badge verifies your leadership status.
                      </p>
                      
                      {hasClaimedBadge ? (
                           <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800">
                               <CheckCircle size={24} className="text-green-600" />
                               <div>
                                   <p className="font-bold text-sm">Badge Claimed!</p>
                                   <p className="text-xs opacity-80">This badge is now visible on your profile.</p>
                               </div>
                           </div>
                      ) : (
                          <button 
                            onClick={handleClaimBadge}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                          >
                              {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                              Claim My Badge
                          </button>
                      )}
                  </div>
              </div>

              {/* Badge Preview */}
              <div className="flex justify-center">
                  <div className="w-[320px] h-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden relative border border-slate-200 flex flex-col items-center">
                      {/* Lanyard Hole */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-200 rounded-full z-20"></div>
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full z-30"></div>

                      {/* Header Pattern */}
                      <div className="w-full h-32 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
                           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[length:10px_10px]"></div>
                           <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent"></div>
                      </div>

                      {/* Avatar */}
                      <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg -mt-14 z-10 bg-slate-100 overflow-hidden">
                          {user?.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <Plus size={40} className="text-slate-400 m-auto mt-8"/>}
                      </div>

                      {/* Content */}
                      <div className="text-center mt-4 px-6 flex-1 flex flex-col items-center w-full">
                          <h3 className="text-xl font-bold text-slate-800 font-display mb-1">{user?.name}</h3>
                          <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4">Club Leader</p>
                          
                          <div className="w-full h-px bg-slate-100 mb-4"></div>
                          
                          <div className="flex items-center gap-3 mb-6 bg-slate-50 p-2 rounded-xl pr-4 border border-slate-100">
                               <img src={displayBadgeImage} className="w-10 h-10 rounded-lg object-cover bg-white shadow-sm" />
                               <div className="text-left">
                                   <p className="text-xs text-slate-400 font-bold uppercase">Badge</p>
                                   <p className="text-sm font-bold text-slate-800 line-clamp-1">{displayBadgeName}</p>
                               </div>
                          </div>
                          
                          <div className="text-xs text-slate-500 px-4 italic mb-6">
                              {displayBadgeDesc}
                          </div>

                          <div className="mt-auto mb-8">
                               <QrCode size={64} className="text-slate-800 mx-auto opacity-80" />
                               <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase tracking-widest">Authorized Personnel</p>
                          </div>
                      </div>
                      
                      {/* Holographic Overlay for Claimed State */}
                      {hasClaimedBadge && (
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-50 mix-blend-overlay"></div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Modals omitted for brevity as they are unchanged */}
      {showAnnounceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold mb-4 font-display">Post Announcement</h2>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <input className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Title" value={newAnnounce.title} onChange={e => setNewAnnounce({...newAnnounce, title: e.target.value})} required/>
                    <div>
                        <textarea className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans" rows={4} placeholder="Message to members... (Markdown supported)" value={newAnnounce.content} onChange={e => setNewAnnounce({...newAnnounce, content: e.target.value})} required/>
                        <p className="text-xs text-slate-400 mt-1 text-right">Markdown is supported</p>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <input 
                        type="checkbox" 
                        id="trans" 
                        checked={newAnnounce.autoTranslate} 
                        onChange={e => setNewAnnounce({...newAnnounce, autoTranslate: e.target.checked})} 
                        className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="trans" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            Auto-translate <Languages size={14} className="text-blue-500"/>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowAnnounceModal(false)} className="text-slate-600 px-4 py-2 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 font-bold shadow-md shadow-indigo-200"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                            {isSubmitting ? (newAnnounce.autoTranslate ? 'Translating...' : 'Post') : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
      
      {/* Project Modal also unchanged... */}
       {showProjModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold mb-4 font-display">Start New Project</h2>
                <form onSubmit={handleCreateProject} className="space-y-4">
                    <input className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Project Name" value={newProj.title} onChange={e => setNewProj({...newProj, title: e.target.value})} required/>
                    <input className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Logo URL (Optional)" value={newProj.logo} onChange={e => setNewProj({...newProj, logo: e.target.value})}/>
                    <textarea className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans" rows={3} placeholder="Description" value={newProj.desc} onChange={e => setNewProj({...newProj, desc: e.target.value})} required/>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Initial Status</label>
                        <div className="relative">
                            <select className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none bg-white" value={newProj.status} onChange={e => setNewProj({...newProj, status: e.target.value as any})}>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowProjModal(false)} className="text-slate-600 px-4 py-2 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 font-bold shadow-md shadow-indigo-200"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
};