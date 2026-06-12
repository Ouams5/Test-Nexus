import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { translateAnnouncement } from '../services/ai';
import { Announcement } from '../types';
import { Plus, X, Trash2, Megaphone, Loader2, Eraser, Languages, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Announcements = () => {
  const { canAnnounce, user, isOwner } = useAuth();
  const { t, language } = useLanguage();
  const { showToast, confirm } = useUI();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
      const data = await db.getAnnouncements();
      setAnnouncements(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
        let translations = undefined;
        
        if (autoTranslate) {
            translations = await translateAnnouncement(title, content);
        }

        const announcementData: any = {
            id: Date.now().toString(),
            title,
            content,
            isImportant,
            authorName: user.name,
            date: new Date().toISOString()
        };

        if (translations) {
            announcementData.translations = translations;
        }

        await db.addAnnouncement(announcementData);
        
        setShowModal(false);
        setTitle('');
        setContent('');
        setIsImportant(false);
        setAutoTranslate(false);
        showToast("Announcement posted!", "success");
        loadData();
    } catch (error) {
        console.error("Failed to create announcement:", error);
        showToast("Failed to post announcement.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const confirmed = await confirm({
          title: "Delete Announcement",
          message: t('deleteAnnouncementConfirm'),
          type: "danger",
          confirmText: "Delete"
      });

      if (confirmed) {
          await db.deleteAnnouncement(id);
          showToast("Announcement deleted.", "success");
          loadData();
      }
  };

  const handleClearAll = async () => {
    const confirmed = await confirm({
        title: "Clear All Announcements",
        message: t('clearAllConfirm'),
        type: "danger",
        confirmText: "DELETE ALL"
    });

    if (confirmed) {
        await db.deleteAllAnnouncements();
        showToast("All announcements deleted.", "success");
        loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 font-display">{t('announcements')}</h1>
        <div className="flex gap-2">
            {isOwner && announcements.length > 0 && (
                <button 
                    onClick={handleClearAll}
                    className="text-red-600 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                    title={t('clearAll')}
                >
                    <Eraser size={18} /> {t('clearAll')}
                </button>
            )}
            {canAnnounce && (
            <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors font-medium shadow-md shadow-indigo-200"
            >
                <Plus size={18} /> {t('newAnnouncement')}
            </button>
            )}
        </div>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? <p className="text-slate-500 italic">{t('noAnnouncements')}</p> : announcements.map((a) => {
          // Determine content based on current language
          const hasTranslation = a.translations && a.translations[language];
          const displayTitle = hasTranslation ? a.translations[language]!.title : a.title;
          const displayContent = hasTranslation ? a.translations[language]!.content : a.content;
          
          return (
            <div key={a.id} className={`p-6 bg-white rounded-xl shadow-sm border-l-4 relative group transition-all hover:shadow-md ${a.isImportant ? 'border-l-red-500' : 'border-l-indigo-500'}`}>
                {canAnnounce && (
                    <button 
                        type="button"
                        onClick={(e) => handleDelete(a.id, e)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10 p-2 cursor-pointer bg-white/50 hover:bg-white rounded-full"
                        title="Delete Announcement"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
                <div className="flex justify-between items-start mb-3 pr-12">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 flex-wrap font-display">
                            {displayTitle}
                            {a.clubName && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal border border-orange-200">
                                    <Megaphone size={10} /> {a.clubName}
                                </span>
                            )}
                            {hasTranslation && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal border border-blue-100" title="Translated automatically">
                                    <Languages size={10} /> Translated
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {t('postedBy')} <span className="font-medium text-slate-700">{a.authorName}</span> on {new Date(a.date).toLocaleDateString()}
                        </p>
                    </div>
                    {a.isImportant && <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap border border-red-100 flex items-center gap-1">
                        <span className="material-symbols-rounded text-sm">priority_high</span>
                        {t('urgent')}
                    </span>}
                </div>
                
                {/* Markdown Content */}
                <div className="text-slate-600 markdown-body text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {displayContent}
                    </ReactMarkdown>
                </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h2 className="text-2xl font-bold mb-4 font-display">{t('createAnnouncement')}</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('title')}</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required
                  placeholder="Important Update..."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-700">{t('content')}</label>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <span className="material-symbols-rounded text-sm">markdown</span>
                        Markdown Supported
                    </span>
                </div>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  required
                  rows={5}
                  placeholder="Write your announcement here. You can use **bold**, *italics*, and lists."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-sans" 
                />
              </div>

              <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                    <input 
                    type="checkbox" 
                    id="imp" 
                    checked={isImportant} 
                    onChange={e => setIsImportant(e.target.checked)} 
                    className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="imp" className="text-sm font-medium text-slate-700">{t('markImportant')}</label>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                    type="checkbox" 
                    id="trans" 
                    checked={autoTranslate} 
                    onChange={e => setAutoTranslate(e.target.checked)} 
                    className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="trans" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        Auto-translate to user's language 
                    </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">{t('cancel')}</button>
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-bold shadow-md shadow-indigo-100"
                >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                    {isSubmitting ? (autoTranslate ? 'Translating...' : t('posting')) : t('post')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};