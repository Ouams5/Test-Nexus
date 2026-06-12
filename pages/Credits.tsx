import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { Credit } from '../types';
import { Heart, Plus, Trash2, User } from 'lucide-react';

export const Credits = () => {
    const { user, isOwner, isDev } = useAuth();
    const { t } = useLanguage();
    const { showToast, confirm } = useUI();
    const [credits, setCredits] = useState<Credit[]>([]);
    const [showModal, setShowModal] = useState(false);
    
    // Form
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [message, setMessage] = useState('');

    const loadCredits = async () => {
        const data = await db.getCredits();
        setCredits(data);
    };

    useEffect(() => {
        loadCredits();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!user) return;

        await db.addCredit({
            id: Date.now().toString(),
            name,
            role,
            message,
            addedBy: user.name,
            date: new Date().toISOString()
        });

        setShowModal(false);
        setName('');
        setRole('');
        setMessage('');
        showToast("Credit added!", "success");
        loadCredits();
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Credit",
            message: "Remove this credit?",
            type: "danger"
        });

        if(confirmed) {
            await db.deleteCredit(id);
            showToast("Credit removed.", "success");
            loadCredits();
        }
    };

    const canAdd = isOwner || isDev;

    return (
        <div className="space-y-8">
            <div className="text-center py-10">
                <div className="inline-block p-4 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 mb-4">
                    <Heart size={48} fill="currentColor" className="animate-pulse" />
                </div>
                <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2 font-display">{t('credits')}</h1>
                <p className="text-slate-500 dark:text-slate-400">Honoring the people who built and contributed to UniClub Nexus.</p>
                
                {canAdd && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="mt-6 bg-slate-900 dark:bg-slate-700 text-white px-6 py-2 rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                    >
                        <Plus size={18}/> {t('addCredit')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {credits.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative group">
                        {canAdd && (
                            <button 
                                onClick={() => handleDelete(c.id)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{c.name}</h3>
                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-3">{c.role}</p>
                                <p className="text-slate-600 dark:text-slate-400 italic leading-relaxed">"{c.message}"</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">{t('addCredit')}</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <input 
                                className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('contributorName')}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                            <input 
                                className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('contributorRole')}
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                required
                            />
                            <textarea 
                                className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-32"
                                placeholder={t('thanksMessage')}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                required
                            />
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">{t('cancel')}</button>
                                <button type="submit" className="bg-slate-900 dark:bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:opacity-90">{t('create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};