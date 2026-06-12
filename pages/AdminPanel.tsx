import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { User, UserRole, Badge, BadgeType } from '../types';
import { 
    ShieldAlert, RefreshCw, UserMinus, Code2, Trash2, CheckSquare, Square, Globe, 
    Database, Search, Key, Eye, EyeOff, Terminal, X, Award, Plus, LayoutList, UploadCloud, Loader2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const AdminPanel = () => {
  const { canAccessAdminPanel, user, refreshUser, isOwner, isDev } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useUI();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'users' | 'inspector'>('users');

  // Shared Data
  const [users, setUsers] = useState<User[]>([]);

  // --- User Management State ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<UserRole | ''>('');

  // --- Inspector/Debug State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newDebugPass, setNewDebugPass] = useState('');
  
  // Bulk Import State
  const [isSeeding, setIsSeeding] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Badge State
  const [newBadgeType, setNewBadgeType] = useState<BadgeType>('MENTIONED');
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeImage, setNewBadgeImage] = useState('');
  
  const loadUsers = async () => {
      const data = await db.getAllUsers();
      setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Update Badge Defaults
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

  if (!canAccessAdminPanel) {
    return <Navigate to="/" />;
  }

  // --- Helpers ---
  const canManageUser = (targetUser: User): boolean => {
      if (!user) return false;
      if (user.role === UserRole.OWNER || user.role === UserRole.DEV) return true;
      // Admins can manage Members and Club Leaders, but not other Admins/Owners/Devs
      if (user.role === UserRole.ADMIN) {
          return targetUser.role === UserRole.MEMBER || targetUser.role === UserRole.CLUB_LEADER;
      }
      return false;
  };

  const canViewSensitiveData = (targetUser: User): boolean => {
      if (!user) return false;
      // Owner and Dev see everything
      if (user.role === UserRole.OWNER || user.role === UserRole.DEV) return true;
      
      // Admin Check: Cannot see data of superior roles (Owner/Dev) or equal roles (Admin)
      if (user.role === UserRole.ADMIN) {
          if (targetUser.role === UserRole.OWNER || targetUser.role === UserRole.DEV || targetUser.role === UserRole.ADMIN) {
              return false;
          }
          return true;
      }
      return false;
  };

  // --- Handlers: User Management ---
  const handleRoleChange = async (targetId: string, newRole: UserRole) => {
    if (!user) return;
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser || !canManageUser(targetUser)) {
        showToast("Permission Denied.", "error");
        return;
    }

    const success = await db.updateUserRole(user.id, targetId, newRole);
    if (success) {
        showToast("User role updated.", "success");
        loadUsers();
        refreshUser();
    }
  };

  const handleKickUser = async (targetUser: User) => {
    if (!user || !canManageUser(targetUser)) {
        showToast("Permission Denied.", "error");
        return;
    }
    
    const confirmed = await confirm({
        title: "Kick User",
        message: `Are you sure you want to kick ${targetUser.name}? This will remove their account access immediately.`,
        confirmText: "Kick",
        type: "danger"
    });

    if (confirmed) {
        await db.deleteUser(targetUser.id);
        showToast("User kicked successfully.", "success");
        loadUsers();
    }
  };

  // --- Handlers: Bulk Actions ---
  const toggleSelectAll = () => {
      if (selectedIds.size === users.length) {
          setSelectedIds(new Set());
      } else {
          // Do not select self
          const allIds = users.filter(u => u.id !== user?.id).map(u => u.id);
          setSelectedIds(new Set(allIds));
      }
  };

  const toggleSelect = (id: string) => {
      if (id === user?.id) return; // Cannot select self
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      
      const confirmed = await confirm({
          title: "Bulk Delete",
          message: `Are you sure you want to delete ${selectedIds.size} users? This is irreversible.`,
          confirmText: "Delete All",
          type: "danger"
      });

      if (confirmed) {
          // Filter out users that the current admin cannot manage
          const idsToDelete = (Array.from(selectedIds) as string[]).filter(id => {
              const u = users.find(user => user.id === id);
              return u && canManageUser(u);
          });

          if (idsToDelete.length !== selectedIds.size) {
              showToast("Some users skipped due to permissions.", "warning");
          }

          if (idsToDelete.length > 0) {
            await db.bulkDeleteUsers(idsToDelete);
            setSelectedIds(new Set());
            showToast("Selected users deleted.", "success");
            loadUsers();
          }
      }
  };

  const handleBulkRoleUpdate = async () => {
      if (!bulkRole || selectedIds.size === 0) return;
      
      const idsToUpdate = (Array.from(selectedIds) as string[]).filter(id => {
          const u = users.find(user => user.id === id);
          return u && canManageUser(u);
      });

      if (idsToUpdate.length > 0) {
          await db.bulkUpdateUserRole(idsToUpdate, bulkRole);
          setSelectedIds(new Set());
          setBulkRole('');
          showToast("Bulk role update successful.", "success");
          loadUsers();
      }
  };

  // --- Handlers: Inspector/Debug ---
  const refreshSelectedUser = async (id: string) => {
      loadUsers();
      const freshUser = await db.getUser(id);
      if (freshUser) setSelectedUser(freshUser);
  };

  const handleForceResetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser || !newDebugPass) return;
      
      if (!canViewSensitiveData(selectedUser)) {
          showToast("Permission Denied: Cannot modify superior user.", "error");
          return;
      }

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

  const handleGiveBadge = async () => {
      if (!selectedUser) return;
      // Admins can give badges, but let's restrict OWNER badges to Owners
      if (newBadgeType === 'OWNER' && user?.role !== UserRole.OWNER && user?.role !== UserRole.DEV) {
          showToast("Only Owners can grant Owner badges.", "error");
          return;
      }
      
      const badge: Badge = {
          id: `badge-${Date.now()}`,
          type: newBadgeType,
          name: newBadgeName,
          imageUrl: newBadgeImage,
          description: `Awarded via Admin Panel`,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImportFile(e.target.files[0]);
      }
  };

  const handleBulkSeed = async () => {
      if (!importFile) return;

      setIsSeeding(true);
      try {
          const text = await importFile.text();
          let json: any;
          try {
            json = JSON.parse(text);
          } catch (e) {
            showToast("Invalid JSON file.", "error");
            setIsSeeding(false);
            return;
          }
          
          let rawUsers: any[] = [];

          // Support structure: { "group_name": [ { ... }, ... ], ... }
          if (typeof json === 'object' && json !== null) {
              if (Array.isArray(json)) {
                  rawUsers = json;
              } else {
                  // Iterate over all keys (like "trans_commun_students") and collect arrays
                  Object.keys(json).forEach(key => {
                      const val = json[key];
                      if (Array.isArray(val)) {
                          rawUsers = [...rawUsers, ...val];
                      }
                  });
              }
          }

          const usersToCreate = rawUsers.map((u: any) => {
              // Infer grade from name or email
              let grade = "Unknown";
              const str = (u.email || '') + (u.name || '');
              const lower = str.toLowerCase();
              
              if (lower.includes('tc') || lower.includes('commun') || lower.includes('trans')) grade = "TC";
              else if (lower.includes('1bac') || lower.includes('b1')) grade = "1 Bac";
              else if (lower.includes('2bac') || lower.includes('b2')) grade = "2 Bac";

              return {
                  email: u.email,
                  password: u.password,
                  name: u.name || u.email?.split('@')[0] || 'Student',
                  grade: grade
              };
          }).filter(u => u.email && u.password); // Simple validation

          if (usersToCreate.length === 0) {
              showToast("No valid users found in JSON.", "error");
              setIsSeeding(false);
              return;
          }

          const confirmed = await confirm({
              title: "Import Accounts",
              message: `Found ${usersToCreate.length} accounts in file. Proceed with creation? Duplicate emails will be skipped.`,
              confirmText: "Import",
              type: "info"
          });

          if (!confirmed) {
              setIsSeeding(false);
              return;
          }

          const result = await db.bulkCreateUsers(usersToCreate);
          showToast(`Imported: ${result.success}. Errors: ${result.errors.length}.`, result.errors.length > 0 ? "warning" : "success");
          
          if (result.errors.length > 0) {
              console.warn("Import errors:", result.errors);
          }

          loadUsers();
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';

      } catch (e) {
          console.error(e);
          showToast("Failed to process file. Check JSON format.", "error");
      } finally {
          setIsSeeding(false);
      }
  };

  const filteredInspectorUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative pb-20 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('adminPanel')}</h1>
        <div className="flex gap-2">
            <button onClick={() => { loadUsers(); showToast("Refreshed", "info"); }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                <RefreshCw size={18} /> {t('refresh')}
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <LayoutList size={16} /> User Management
          </button>
          <button 
            onClick={() => setActiveTab('inspector')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'inspector' ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <Database size={16} /> System Inspector
          </button>
      </div>

      {/* --- TAB 1: USER MANAGEMENT --- */}
      {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('userManagement')}</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{users.length} {t('user')}s</span>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-100 dark:border-slate-700 sticky top-0">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                                    {selectedIds.size > 0 && selectedIds.size === users.length ? <CheckSquare size={20}/> : <Square size={20}/>}
                                </button>
                            </th>
                            <th className="p-4">{t('user')}</th>
                            <th className="p-4">{t('grade')}</th>
                            <th className="p-4">{t('role')}</th>
                            <th className="p-4">{t('lastLoginIp')}</th>
                            <th className="p-4 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {users.map(u => {
                            const isSelf = u.id === user?.id;
                            const isSelectable = !isSelf;
                            const hasPermission = canManageUser(u);

                            return (
                                <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => toggleSelect(u.id)} 
                                            disabled={!isSelectable}
                                            className={`${selectedIds.has(u.id) ? 'text-blue-600' : 'text-slate-300'} ${isSelectable ? 'hover:text-blue-500' : 'opacity-20 cursor-not-allowed'}`}
                                        >
                                            {selectedIds.has(u.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                                <img src={u.avatarUrl} className="w-full h-full object-cover"/>
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                    {u.name}
                                                    {u.role === UserRole.DEV && (
                                                        <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                                            <Code2 size={10} /> DEV
                                                        </span>
                                                    )}
                                                    {u.role === UserRole.OWNER && (
                                                        <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold">OWNER</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{u.grade || 'N/A'}</td>
                                    <td className="p-4">
                                        <select 
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                            className={`p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-slate-200 ${!hasPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={!hasPermission}
                                        >
                                            <option value={UserRole.MEMBER}>Member</option>
                                            <option value={UserRole.CLUB_LEADER}>Club Leader</option>
                                            <option value={UserRole.ADMIN}>Admin</option>
                                            <option value={UserRole.DEV}>Dev Team</option>
                                            {user?.role === UserRole.OWNER && <option value={UserRole.OWNER}>Owner</option>}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                                            <span className="flex items-center gap-1"><Globe size={12}/> {u.ip || 'Unknown IP'}</span>
                                            <span>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {hasPermission && (
                                            <button 
                                                onClick={() => handleKickUser(u)}
                                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                                                title="Kick User"
                                            >
                                                <UserMinus size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5">
                    <span className="font-bold">{selectedIds.size} {t('selected')}</span>
                    
                    <div className="h-6 w-px bg-slate-600"></div>

                    <div className="flex items-center gap-2">
                        <select 
                            value={bulkRole} 
                            onChange={e => setBulkRole(e.target.value as UserRole)}
                            className="bg-slate-700 text-white border-none rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">{t('setRole')}</option>
                            <option value={UserRole.MEMBER}>Member</option>
                            <option value={UserRole.CLUB_LEADER}>Club Leader</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                            <option value={UserRole.DEV}>Dev Team</option>
                        </select>
                        <button 
                            onClick={handleBulkRoleUpdate}
                            disabled={!bulkRole}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            {t('apply')}
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-600"></div>

                    <button 
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={16}/> {t('deleteAll')}
                    </button>
                    
                    <button 
                        onClick={() => setSelectedIds(new Set())}
                        className="ml-2 text-slate-400 hover:text-white"
                    >
                        {t('cancel')}
                    </button>
                </div>
            )}
          </div>
      )}

      {/* --- TAB 2: INSPECTOR --- */}
      {activeTab === 'inspector' && (
           <div className="flex flex-1 gap-6 overflow-hidden h-full min-h-[500px]">
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
                        {filteredInspectorUsers.map(u => (
                            <div 
                                key={u.id}
                                onClick={() => { setSelectedUser(u); setShowPassword(false); }}
                                className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${selectedUser?.id === u.id ? 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-l-purple-500' : ''}`}
                            >
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{u.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                                <span className="inline-block mt-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{u.role}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inspector Detail */}
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
                                    {canViewSensitiveData(selectedUser) && (
                                        <button 
                                            onClick={() => setShowResetModal(true)}
                                            className="bg-red-600/20 text-red-400 border border-red-600/50 px-4 py-2 rounded hover:bg-red-600/30 transition-colors flex items-center gap-2 text-xs font-bold"
                                        >
                                            <ShieldAlert size={14}/> Force Change
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                                {/* Password Section */}
                                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase flex items-center gap-2">
                                        <Key size={12}/> Active Password
                                    </p>
                                    <div className="flex items-center gap-4">
                                        {canViewSensitiveData(selectedUser) ? (
                                            <>
                                                <code className={`px-2 py-1 rounded ${showPassword ? 'text-green-400 bg-green-900/20' : 'text-slate-600 bg-slate-800'}`}>
                                                    {showPassword ? (selectedUser.plainPassword || 'N/A') : "••••••••••••"}
                                                </code>
                                                <button onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-white">
                                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-red-500 text-xs">
                                                <ShieldAlert size={14} />
                                                <span>Restricted: Superior Role</span>
                                            </div>
                                        )}
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
                            {/* Empty State / Prompt */}
                            <Search size={48} className="mb-4 opacity-20"/>
                            <p className="mb-6">Select a user to inspect</p>
                            
                            {/* FILE UPLOAD SEEDER - Only for Owners/Devs */}
                            {(user?.role === UserRole.OWNER || user?.role === UserRole.DEV) && (
                                <div className="mt-6 w-full max-w-sm">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".json"
                                        className="hidden"
                                    />
                                    
                                    {!importFile ? (
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-6 py-8 rounded-xl flex flex-col items-center justify-center gap-3 transition-all border-dashed"
                                        >
                                            <UploadCloud size={32} className="text-blue-500 opacity-80"/>
                                            <div className="text-center">
                                                <span className="font-bold block">Import Accounts via JSON</span>
                                                <span className="text-[10px] text-slate-500">Format: JSON arrays (e.g. "students": [...])</span>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-sm font-mono text-blue-300 truncate max-w-[200px]">{importFile.name}</span>
                                                <button onClick={() => { setImportFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-slate-500 hover:text-white">
                                                    <X size={16}/>
                                                </button>
                                            </div>
                                            <button 
                                                onClick={handleBulkSeed}
                                                disabled={isSeeding}
                                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                                            >
                                                {isSeeding ? <Loader2 className="animate-spin" size={18}/> : <UploadCloud size={18}/>}
                                                {isSeeding ? 'Importing...' : 'Start Import'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
           </div>
      )}

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