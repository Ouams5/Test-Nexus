import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { User, Badge, BadgeType } from '../types';
import { Bug, Search, Key, ShieldAlert, Eye, EyeOff, Database, Terminal, X, RefreshCw, Award, Plus, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const DebugPanel = () => {
    const { isDev, isOwner } = useAuth();
    const { t } = useLanguage();
    const { showToast, confirm } = useUI();
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    
    // Force Reset State
    const [showResetModal, setShowResetModal] = useState(false);
    const [newDebugPass, setNewDebugPass] = useState('');

    // Badge State
    const [newBadgeType, setNewBadgeType] = useState<BadgeType>('MENTIONED');
    const [newBadgeName, setNewBadgeName] = useState('');
    const [newBadgeImage, setNewBadgeImage] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    // Set defaults when badge type changes
    useEffect(() => {
        switch(newBadgeType) {
            case 'OWNER':
                setNewBadgeName('System Owner');
                setNewBadgeImage('https://ui-avatars.com/api/?name=OWNER&background=F59E0B&color=fff&size=128');
                break;
            case 'ADMIN':
                setNewBadgeName('System Administrator');
                setNewBadgeImage('https://ui-avatars.com/api/?name=ADMIN&background=DC2626&color=fff&size=128');
                break;
            case 'DEV':
                setNewBadgeName('Lead Developer');
                setNewBadgeImage('https://ui-avatars.com/api/?name=DEV&background=7C3AED&color=fff&size=128');
                break;
            case 'MENTIONED':
                setNewBadgeName('Honorable Mention');
                setNewBadgeImage('https://ui-avatars.com/api/?name=HM&background=3B82F6&color=fff&size=128');
                break;
            default:
                setNewBadgeName('Custom Badge');
                setNewBadgeImage('');
        }
    }, [newBadgeType]);

    const loadUsers = async () => {
        const data = await db.getAllUsers();
        setUsers(data);
    };

    if (!isDev && !isOwner) {
        return <Navigate to="/" />;
    }

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleForceResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !newDebugPass) return;

        try {
            await db.forceUpdatePlainPassword(selectedUser.id, newDebugPass);
            showToast(`Visual Record Updated to "${newDebugPass}"`, "success");
            setShowResetModal(false);
            setNewDebugPass('');
            refreshSelectedUser(selectedUser.id);
        } catch (e) {
            console.error(e);
            showToast("Failed to force reset.", "error");
        }
    };

    const refreshSelectedUser = async (id: string) => {
        loadUsers();
        const freshUser = await db.getUser(id);
        if (freshUser) setSelectedUser(freshUser);
    };

    const handleGiveBadge = async () => {
        if (!selectedUser) return;
        
        const badge: Badge = {
            id: `badge-${Date.now()}`,
            type: newBadgeType,
            name: newBadgeName,
            imageUrl: newBadgeImage,
            description: `Awarded via Debug Panel`,
            assignedAt: new Date().toISOString()
        };

        try {
            await db.addBadgeToUser(selectedUser.id, badge);
            showToast("Badge granted!", "success");
            refreshSelectedUser(selectedUser.id);
        } catch (e) {
            console.error(e);
            showToast("Failed to grant badge", "error");
        }
    };

    const handleRemoveBadge = async (badge: Badge) => {
        if (!selectedUser) return;
        try {
            await db.removeBadgeFromUser(selectedUser.id, badge);
            showToast("Badge removed", "success");
            refreshSelectedUser(selectedUser.id);
        } catch (e) {
            console.error(e);
            showToast("Failed to remove badge", "error");
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
            <div className="flex items-center gap-3 text-slate-800 dark:text-white">
                <div className="p-2 bg-slate-900 rounded-lg text-white">
                    <Bug size={24} />
                </div>
                <h1 className="text-2xl font-bold font-mono">{t('debugPanel')}</h1>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* User List */}
                <div className="w-1/3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm dark:text-white"
                                placeholder="Search User..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredUsers.map(u => (
                            <div 
                                key={u.id}
                                onClick={() => { setSelectedUser(u); setShowPassword(false); }}
                                className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${selectedUser?.id === u.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500' : ''}`}
                            >
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{u.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                                <span className="inline-block mt-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{u.role}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inspector */}
                <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 p-6 flex flex-col text-slate-300 font-mono overflow-hidden">
                    {selectedUser ? (
                        <>
                            <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                        <Database size={18} className="text-blue-400"/> {t('inspectUser')}
                                    </h2>
                                    <p className="text-xs text-slate-500">ID: {selectedUser.id}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowResetModal(true)}
                                        className="bg-red-600/20 text-red-400 border border-red-600/50 px-4 py-2 rounded hover:bg-red-600/30 transition-colors flex items-center gap-2 text-xs font-bold"
                                    >
                                        <ShieldAlert size={14}/> Force Change
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                                {/* Password Section */}
                                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase flex items-center gap-2">
                                        <Key size={12}/> Active Password
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <code className={`px-2 py-1 rounded ${showPassword ? 'text-green-400 bg-green-900/20' : 'text-slate-600 bg-slate-800'}`}>
                                            {showPassword ? (selectedUser.plainPassword || 'N/A') : "••••••••••••"}
                                        </code>
                                        <button onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-white">
                                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                    </div>
                                </div>

                                {/* Badge Management */}
                                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                                    <p className="text-xs font-bold text-slate-500 mb-4 uppercase flex items-center gap-2">
                                        <Award size={12}/> Badge Management
                                    </p>
                                    
                                    {/* Existing Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {selectedUser.badges?.map(b => (
                                            <div key={b.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                                                <img src={b.imageUrl} className="w-6 h-6 rounded bg-black" alt="" />
                                                <div className="text-xs">
                                                    <div className="text-white font-bold">{b.name}</div>
                                                    <div className="text-[10px] text-slate-500">{b.type}</div>
                                                </div>
                                                <button onClick={() => handleRemoveBadge(b)} className="text-slate-500 hover:text-red-500">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {(!selectedUser.badges || selectedUser.badges.length === 0) && (
                                            <span className="text-xs text-slate-600 italic">No badges assigned.</span>
                                        )}
                                    </div>

                                    {/* Add Badge Form */}
                                    <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            <select 
                                                className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none flex-1"
                                                value={newBadgeType}
                                                onChange={e => setNewBadgeType(e.target.value as BadgeType)}
                                            >
                                                <option value="MENTIONED">Mentioned</option>
                                                <option value="OWNER">Owner</option>
                                                <option value="ADMIN">Admin</option>
                                                <option value="DEV">Developer</option>
                                                <option value="CUSTOM">Custom</option>
                                            </select>
                                            <input 
                                                className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none flex-[2]"
                                                placeholder="Badge Name"
                                                value={newBadgeName}
                                                onChange={e => setNewBadgeName(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none flex-1"
                                                placeholder="Image URL"
                                                value={newBadgeImage}
                                                onChange={e => setNewBadgeImage(e.target.value)}
                                            />
                                            <button 
                                                onClick={handleGiveBadge}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                                            >
                                                <Plus size={12}/> Give
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Raw JSON Data */}
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">{t('rawUserData')}</p>
                                    <pre className="text-xs bg-slate-950 p-4 rounded border border-slate-800 overflow-x-auto text-blue-300">
                                        {JSON.stringify(selectedUser, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                            <Search size={48} className="mb-4 opacity-20"/>
                            <p>Select a user to inspect</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Force Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Terminal className="text-red-500" /> Force Password Change
                            </h2>
                            <button onClick={() => setShowResetModal(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <p className="text-slate-400 text-sm mb-4">
                            Directly override the stored password record for <span className="text-white font-bold">{selectedUser?.email}</span>. 
                        </p>

                        <form onSubmit={handleForceResetSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-red-500 font-mono"
                                    value={newDebugPass}
                                    onChange={e => setNewDebugPass(e.target.value)}
                                    placeholder="Enter new password..."
                                    required
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Update Record
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};