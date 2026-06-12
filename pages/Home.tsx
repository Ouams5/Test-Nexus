import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { UserRole, BugReport, User } from '../types';
import { 
    LayoutDashboard, Search, MessageCircle, Palette, Megaphone, Plus, X, 
    Sun, Moon, CloudRain, Flower2, Stars, Edit2, Check,
    Bug, ShieldAlert, Code2, Users, Calendar, Settings, Database, StickyNote, Move,
    Terminal, Activity, GripHorizontal, ChevronRight, Maximize2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type WidgetType = 'search' | 'themes' | 'chats' | 'announcements' | 'reports' | 'admin_panel' | 'debug_panel' | 'dev_chat';

interface WidgetItem {
    id: string;
    type: WidgetType;
    colSpan: number; // 1 to 3
    rowSpan: number; // 1 to 3
}

// --- WIDGET COMPONENTS DEFINED OUTSIDE TO PREVENT RE-RENDER/FOCUS LOSS ---

const AdminPanelWidget = ({ usersList, navigate }: { usersList: User[], navigate: any }) => {
    return (
      <div 
          onClick={() => navigate('/admin')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 h-full flex flex-col cursor-pointer overflow-hidden group relative"
      >
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900 flex justify-between items-center">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert size={16} /> Admin Panel
              </h3>
              <span className="text-[10px] bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
                  {usersList.length} Users
              </span>
          </div>
          
          <div className="flex-1 overflow-hidden p-2 relative">
              <table className="w-full text-left text-[10px]">
                  <thead>
                      <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          <th className="pb-1 pl-1 font-medium">User</th>
                          <th className="pb-1 font-medium">Role</th>
                          <th className="pb-1 font-medium text-right">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {usersList.slice(0, 5).map(u => (
                          <tr key={u.id} className="group/row">
                              <td className="py-1.5 pl-1 flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-slate-200 overflow-hidden">
                                      <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" />
                                  </div>
                                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{u.name}</span>
                              </td>
                              <td className="py-1.5 text-slate-500">{u.role === 'ADMIN' ? 'ADM' : u.role === 'MEMBER' ? 'MEM' : u.role.substring(0,3)}</td>
                              <td className="py-1.5 text-right">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto"></div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none"></div>
          </div>
      </div>
    );
};

const DebugPanelWidget = ({ navigate }: { navigate: any }) => {
    const [logs, setLogs] = useState<string[]>([]);
    useEffect(() => {
        const interval = setInterval(() => {
            const methods = ['GET', 'POST', 'PUT'];
            const paths = ['/api/user', '/auth/verify', '/db/sync', '/ws/chat'];
            const status = [200, 201, 204, 304];
            const log = `${methods[Math.floor(Math.random()*3)]} ${paths[Math.floor(Math.random()*4)]} ${status[Math.floor(Math.random()*4)]} ${Math.floor(Math.random()*100)}ms`;
            setLogs(prev => [`[${new Date().toLocaleTimeString().split(' ')[0]}] ${log}`, ...prev].slice(0, 15));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
      <div 
          onClick={() => navigate('/debug')}
          className="bg-slate-950 rounded-2xl border border-slate-800 h-full flex flex-col cursor-pointer overflow-hidden font-mono text-[10px] relative group shadow-inner shadow-black/50"
      >
          <div className="p-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-slate-400">
              <span className="flex items-center gap-1 font-bold"><Terminal size={12}/> DEBUG_CONSOLE</span>
              <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/50"></div>
              </div>
          </div>
          
          <div className="flex-1 p-3 overflow-hidden text-green-400/80 flex flex-col">
              {logs.map((l, i) => (
                  <div key={i} className="truncate hover:bg-slate-900/50 hover:text-green-300 transition-colors">
                      <span className="opacity-50 mr-2">$</span>{l}
                  </div>
              ))}
          </div>
          
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
      </div>
    );
};

const SimpleWidget = ({ title, icon: Icon, color, children, onClick }: any) => (
    <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''} transition-colors overflow-hidden`}>
        <div className={`p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 font-bold ${color}`}>
            <Icon size={16} /> {title}
        </div>
        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar relative">
            {children}
        </div>
    </div>
);

export const Home = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useUI();
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  
  // Widget State with Persistence
  const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
      try {
          const saved = localStorage.getItem(`home_widgets_v4_${user?.id}`); // Version bumped
          if (saved) return JSON.parse(saved);
      } catch (e) { console.error("Failed to load widgets", e); }
      
      // Default Layout
      return [
          { id: '1', type: 'search', colSpan: 2, rowSpan: 1 },
          { id: '2', type: 'themes', colSpan: 1, rowSpan: 1 },
          { id: '3', type: 'chats', colSpan: 1, rowSpan: 1 },
          { id: '4', type: 'announcements', colSpan: 2, rowSpan: 1 }
      ];
  });

  const [isEditing, setIsEditing] = useState(false);
  const [resizingId, setResizingId] = useState<string | null>(null);
  
  // --- Custom Smooth Drag State ---
  const [dragState, setDragState] = useState<{
      id: string;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const widgetsRef = useRef(widgets); // Ref to access current widgets in event listeners

  // Data
  const [allData, setAllData] = useState<{clubs: any[], projects: any[], announcements: any[], bugs: BugReport[]}>({ 
    clubs: [], 
    projects: [], 
    announcements: [],
    bugs: [] // Initialized correctly to prevent slice error
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{clubs: any[], projects: any[], announcements: any[]}>({ clubs: [], projects: [], announcements: [] });
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [devMessages, setDevMessages] = useState<any[]>([]);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Effects
  useEffect(() => {
    localStorage.setItem(`home_widgets_v4_${user?.id}`, JSON.stringify(widgets));
    widgetsRef.current = widgets; // Sync ref
  }, [widgets, user]);

  useEffect(() => {
      const fetchData = async () => {
          const [c, p, a, b, u] = await Promise.all([
              db.getClubs(),
              db.getProjects(),
              db.getAnnouncements(),
              (user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV) ? db.getBugReports() : Promise.resolve([]),
              (user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV) ? db.getAllUsers() : Promise.resolve([])
          ]);
          setAllData({ clubs: c, projects: p, announcements: a, bugs: b || [] });
          setUsersList(u);
          if (user) setMyClubs(c.filter(club => user.leadingClubId === club.id));
      };
      fetchData();

      if (user?.role === UserRole.DEV || user?.role === UserRole.OWNER) {
          const unsub = db.subscribeToDevChat((msgs) => setDevMessages(msgs.slice(-5)));
          return () => unsub();
      }
  }, [user]);

  // Search Logic
  useEffect(() => {
      if (!searchQuery.trim()) {
          setSearchResults({ clubs: [], projects: [], announcements: [] });
          return;
      }
      const lowerQ = searchQuery.toLowerCase();
      setSearchResults({
          clubs: allData.clubs.filter(c => c.name.toLowerCase().includes(lowerQ)),
          projects: allData.projects.filter(p => p.title.toLowerCase().includes(lowerQ)),
          announcements: allData.announcements.filter(a => a.title.toLowerCase().includes(lowerQ))
      });
  }, [searchQuery, allData]);

  // --- Widget Management ---

  const addWidget = (type: WidgetType) => {
      if (widgets.find(w => w.type === type)) {
          showToast("Widget already active", "info");
          return;
      }
      setWidgets(prev => [...prev, {
          id: Date.now().toString(),
          type,
          colSpan: 1,
          rowSpan: 1
      }]);
      showToast("Widget added", "success");
  };

  const removeWidget = (id: string) => {
      setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const cycleWidgetSize = (id: string) => {
      setWidgets(prev => prev.map(w => {
          if (w.id === id) {
              // Simple Cycle: 1x1 -> 2x1 -> 2x2 -> 1x1
              if (w.colSpan === 1 && w.rowSpan === 1) return { ...w, colSpan: 2, rowSpan: 1 };
              if (w.colSpan === 2 && w.rowSpan === 1) return { ...w, colSpan: 2, rowSpan: 2 };
              return { ...w, colSpan: 1, rowSpan: 1 };
          }
          return w;
      }));
  };

  // --- Smooth Drag Handlers ---

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
      if (!isEditing || resizingId) return;
      // Only allow left click drag
      if (e.button !== 0) return;

      const target = e.currentTarget as HTMLElement;
      // Prevent drag if clicking a button inside the widget
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;

      const rect = target.getBoundingClientRect();

      setDragState({
          id,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          width: rect.width,
          height: rect.height
      });
      setMousePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
      if (!dragState) return;

      const handleMouseMove = (e: MouseEvent) => {
          setMousePos({ x: e.clientX, y: e.clientY });

          // Detection Logic
          const elements = document.elementsFromPoint(e.clientX, e.clientY);
          // Look for any element that has data-widget-id attribute
          const widgetEl = elements.find(el => el.hasAttribute('data-widget-id'));

          if (widgetEl) {
              const targetId = widgetEl.getAttribute('data-widget-id');
              if (targetId && targetId !== dragState.id) {
                  const currentList = [...widgetsRef.current];
                  const dragIndex = currentList.findIndex(w => w.id === dragState.id);
                  const hoverIndex = currentList.findIndex(w => w.id === targetId);

                  if (dragIndex !== -1 && hoverIndex !== -1) {
                      // Swap items in the list
                      const draggedItem = currentList[dragIndex];
                      currentList.splice(dragIndex, 1);
                      currentList.splice(hoverIndex, 0, draggedItem);
                      setWidgets(currentList);
                  }
              }
          }
      };

      const handleMouseUp = () => {
          setDragState(null);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [dragState]);

  // --- Resize Handler ---
  const handleResizeStart = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent triggering drag
      setResizingId(id);
      
      const startX = e.clientX;
      const startY = e.clientY;
      const widget = widgets.find(w => w.id === id);
      if (!widget) return;
      
      const startColSpan = widget.colSpan;
      const startRowSpan = widget.rowSpan;
      const COL_STEP = 150; 
      const ROW_STEP = 150; 

      const onMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          const colChange = Math.round(deltaX / COL_STEP);
          const rowChange = Math.round(deltaY / ROW_STEP);

          const newColSpan = Math.max(1, Math.min(3, startColSpan + colChange));
          const newRowSpan = Math.max(1, Math.min(3, startRowSpan + rowChange));

          setWidgets(prev => prev.map(w => {
              if (w.id === id) {
                  return { ...w, colSpan: newColSpan, rowSpan: newRowSpan };
              }
              return w;
          }));
      };

      const onMouseUp = () => {
          setResizingId(null);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
  };

  const renderWidgetContent = (w: WidgetItem) => {
      switch(w.type) {
          case 'search': return (
              <SimpleWidget title={t('searchResults')} icon={Search} color="text-blue-500">
                  <input 
                    type="text" 
                    placeholder={t('searchEverything')}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm mb-2"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                  />
                  <div className="space-y-2">
                      {searchResults.clubs.map(c => <div key={c.id} className="text-xs font-bold truncate">{c.name}</div>)}
                      {!searchQuery && <div className="text-xs text-slate-400 text-center py-4">Type to search...</div>}
                  </div>
              </SimpleWidget>
          );
          case 'admin_panel': return <AdminPanelWidget usersList={usersList} navigate={navigate} />;
          case 'debug_panel': return <DebugPanelWidget navigate={navigate} />;
          case 'themes': return (
              <SimpleWidget title={t('quickThemes')} icon={Palette} color="text-purple-500">
                  <div className="grid grid-cols-2 gap-2">
                      {['light', 'dark', 'midnight', 'cherry'].map((th: any) => (
                          <button key={th} onClick={() => setTheme(th)} className={`text-xs p-2 rounded border ${theme === th ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200'}`}>{th}</button>
                      ))}
                  </div>
              </SimpleWidget>
          );
          case 'chats': return (
              <SimpleWidget title={t('quickChats')} icon={MessageCircle} color="text-green-500" onClick={() => navigate('/clubs')}>
                  <div className="space-y-2">
                      {allData.clubs.slice(0, 3).map(c => (
                          <div key={c.id} className="flex items-center gap-2 text-xs">
                              <img src={c.imageUrl} className="w-5 h-5 rounded" />
                              <span className="truncate">{c.name}</span>
                          </div>
                      ))}
                  </div>
              </SimpleWidget>
          );
          case 'announcements': return (
              <SimpleWidget title={t('announcements')} icon={Megaphone} color="text-orange-500">
                  <div className="space-y-2">
                      {allData.announcements.slice(0, 3).map(a => (
                          <div key={a.id} className="text-xs border-b border-slate-50 last:border-0 pb-1">
                              <div className="font-bold truncate">{a.title}</div>
                              <div className="text-slate-400 truncate">{a.content}</div>
                          </div>
                      ))}
                  </div>
              </SimpleWidget>
          );
          case 'reports': return (
              <SimpleWidget title="Reports" icon={Bug} color="text-amber-500" onClick={() => setShowReportsModal(true)}>
                  <div className="text-xs space-y-1">
                      {allData.bugs && allData.bugs.length > 0 ? allData.bugs.slice(0,3).map(b => (
                          <div key={b.id} className="flex justify-between bg-slate-50 p-1 rounded">
                              <span className="truncate flex-1">{b.title}</span>
                              <span className={`px-1 rounded ${b.status==='open'?'bg-red-100 text-red-600':'bg-green-100'}`}>{b.status}</span>
                          </div>
                      )) : <span className="text-xs text-slate-400 italic">No reports</span>}
                  </div>
              </SimpleWidget>
          );
          case 'dev_chat': return (
              <SimpleWidget title="Dev Chat" icon={Code2} color="text-purple-600" onClick={() => navigate('/chat')}>
                  <div className="space-y-1 text-xs">
                      {devMessages.map(m => (
                          <div key={m.id} className="truncate"><span className="font-bold text-purple-600">{m.senderName}:</span> {m.text}</div>
                      ))}
                  </div>
              </SimpleWidget>
          );
          default: return <SimpleWidget title={w.type} icon={Activity} />;
      }
  };

  // --- Render ---

  return (
    <div className="pb-20 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white font-display">{t('overview')}</h1>
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm ${
                    isEditing 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
            >
                {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
                {isEditing ? t('doneEditing') : t('editHome')}
            </button>
        </div>

        {/* Widget Gallery (Edit Mode) */}
        {isEditing && (
            <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                <h3 className="font-bold text-slate-500 uppercase text-xs mb-4">{t('availableWidgets')}</h3>
                <div className="flex flex-wrap gap-3">
                    {[
                        {id:'search', icon: Search, label:'Search'},
                        {id:'admin_panel', icon: ShieldAlert, label:'Admin'},
                        {id:'debug_panel', icon: Database, label:'Debug'},
                        {id:'themes', icon: Palette, label:'Themes'},
                        {id:'chats', icon: MessageCircle, label:'Chats'},
                        {id:'announcements', icon: Megaphone, label:'News'},
                        {id:'reports', icon: Bug, label:'Reports'},
                        {id:'dev_chat', icon: Code2, label:'Dev Chat'},
                    ].map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => addWidget(item.id as WidgetType)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:border-indigo-500 transition-colors shadow-sm"
                        >
                            <item.icon size={16} className="text-slate-400"/> 
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* CSS Grid Layout */}
        <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[200px]"
            style={{ gridAutoFlow: 'dense' }} // Important for packing
        >
            {widgets.map((widget, index) => (
                <div
                    key={widget.id}
                    data-widget-id={widget.id}
                    onMouseDown={(e) => handleMouseDown(e, widget.id)}
                    className={`relative group transition-all duration-200 ease-out select-none ${isEditing ? 'cursor-grab active:cursor-grabbing ring-2 ring-indigo-500/20 rounded-2xl hover:shadow-xl z-10' : ''}`}
                    style={{
                        gridColumn: `span ${widget.colSpan}`,
                        gridRow: `span ${widget.rowSpan}`,
                        opacity: dragState?.id === widget.id ? 0 : 1 // Hide original if dragging
                    }}
                >
                    {/* The Widget */}
                    <div className="h-full w-full overflow-hidden">
                        {renderWidgetContent(widget)}
                    </div>

                    {/* Edit Controls */}
                    {isEditing && (
                        <>
                            <button 
                                onClick={() => removeWidget(widget.id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:scale-110 transition-transform z-20"
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <X size={14} />
                            </button>
                            
                            {/* Resize Button for Mobile/Tablet */}
                            <button 
                                onClick={() => cycleWidgetSize(widget.id)}
                                className="absolute bottom-2 left-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md z-20 flex items-center gap-1 active:scale-95 transition-transform"
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <Maximize2 size={12}/> Size: {widget.colSpan}x{widget.rowSpan}
                            </button>
                            
                            {/* Desktop Resize Handle - Hidden on Touch devices via media query assumption (md:flex) or just keep for desktop convenience */}
                            <div 
                                onMouseDown={(e) => handleResizeStart(e, widget.id)}
                                className="hidden md:flex absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize items-end justify-end p-1 z-20 hover:bg-indigo-100/50 rounded-tl-xl transition-colors"
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-slate-400">
                                    <path d="M11 1L11 11L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </div>
                            
                            {/* Resize Indicators Overlay */}
                            <div className="absolute bottom-2 right-8 text-[10px] font-mono bg-black/70 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {widget.colSpan}x{widget.rowSpan}
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
        
        {/* Floating Drag Preview Layer */}
        {dragState && isEditing && (
            <div 
                className="fixed z-[999] pointer-events-none shadow-2xl rounded-2xl overflow-hidden ring-4 ring-indigo-500/30"
                style={{
                    left: mousePos.x - dragState.offsetX,
                    top: mousePos.y - dragState.offsetY,
                    width: dragState.width,
                    height: dragState.height,
                    opacity: 0.9,
                    transform: 'scale(1.02)'
                }}
            >
                 {renderWidgetContent(widgets.find(w => w.id === dragState.id)!)}
            </div>
        )}

        {/* Modals */}
        {showReportsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                          <Bug className="text-amber-500"/> System Bug Reports
                      </h2>
                      <button onClick={() => setShowReportsModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                          <X size={24}/>
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-0">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold sticky top-0 shadow-sm">
                              <tr>
                                  <th className="p-4">Status</th>
                                  <th className="p-4">Title</th>
                                  <th className="p-4">Description</th>
                                  <th className="p-4">Submitter</th>
                                  <th className="p-4">IP Address</th>
                                  <th className="p-4">Date</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {allData.bugs.length === 0 ? (
                                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No bugs reported.</td></tr>
                              ) : allData.bugs.map(b => (
                                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="p-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${b.status === 'open' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                              {b.status}
                                          </span>
                                      </td>
                                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{b.title}</td>
                                      <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={b.description}>{b.description}</td>
                                      <td className="p-4">
                                          <div className="flex flex-col">
                                              <span className="font-medium text-slate-700 dark:text-slate-300">{b.submitterName || 'Unknown'}</span>
                                              <span className="text-xs text-slate-400 font-mono">ID: {b.submittedBy}</span>
                                          </div>
                                      </td>
                                      <td className="p-4 font-mono text-xs text-slate-500">{b.submitterIp || 'N/A'}</td>
                                      <td className="p-4 text-slate-500">{new Date(b.createdAt).toLocaleString()}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};