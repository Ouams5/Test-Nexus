import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/mockFirebase';
import { ChatMessage, UserRole } from '../types';
import { Send, Hash, MessageCircle, Code2, Shield, Crown } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const GeneralChat = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = db.subscribeToGeneralChat((msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) {
    return <Navigate to="/" />;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await db.sendGeneralMessage({
        text: newMessage,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatarUrl,
        senderRole: user.role,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const getRoleBadge = (role: UserRole) => {
      switch(role) {
          case UserRole.OWNER: return <span title="Owner"><Crown size={12} className="text-yellow-600" /></span>;
          case UserRole.DEV: return <span title="Developer"><Code2 size={12} className="text-purple-600" /></span>;
          case UserRole.ADMIN: return <span title="Admin"><Shield size={12} className="text-red-600" /></span>;
          default: return null;
      }
  };

  const handleUserClick = async (targetUserId: string, targetName: string) => {
      if (theme === 'lethal') {
          try {
              const targetUser = await db.getUser(targetUserId);
              if (targetUser) {
                  // Using browser alert for raw "lethal" feel, or could use toast
                  alert(`[LETHAL ADMIN]\nUser: ${targetName}\nIP: ${targetUser.ip || 'Hidden'}\nID: ${targetUser.id}`);
              }
          } catch (e) {
              console.error(e);
          }
      }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
                <Hash size={24} className="text-blue-600" />
            </div>
            <div>
                <h1 className="font-bold text-lg text-slate-800">General Chat</h1>
                <p className="text-xs text-slate-500">Public channel for all students</p>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
        {messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
                    <div 
                        onClick={() => handleUserClick(msg.senderId, msg.senderName)}
                        className={`w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 mt-1 border border-slate-200 shadow-sm ${theme === 'lethal' ? 'cursor-crosshair hover:ring-2 hover:ring-red-500' : ''}`}
                    >
                        {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {msg.senderName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className={`flex flex-col max-w-[80%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                             <span 
                                onClick={() => handleUserClick(msg.senderId, msg.senderName)}
                                className={`text-xs font-bold text-slate-700 ${theme === 'lethal' ? 'cursor-crosshair hover:text-red-500' : ''}`}
                             >
                                {msg.senderName}
                             </span>
                             {getRoleBadge(msg.senderRole)}
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm markdown-body ${
                            isMe 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </div>
            );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex gap-3">
            <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all text-sm font-medium"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="p-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-200"
            >
                <Send size={20} />
            </button>
        </form>
      </div>
    </div>
  );
};