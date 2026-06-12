import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { ChatMessage, UserRole } from '../types';
import { Send, MapPin, Shield, Crown, Code2, Users, GraduationCap } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const EventPlanningChat = () => {
  const { user, canPlanEvents } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canPlanEvents) return;

    const unsubscribe = db.subscribeToEventPlanningChat((msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [canPlanEvents]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user || !canPlanEvents) {
    return <Navigate to="/" />;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await db.sendEventPlanningMessage({
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

  const getRoleIcon = (role: UserRole, msgSenderName: string) => {
      // Logic for teacher detection in historical messages depends on Role, but new design separates it.
      // Since messages store senderRole, we might miss the teacher icon for older messages if we only look at role.
      // However, for simplicity, we display role icons. 
      // To properly show Teacher icon here, we would need to store accountType in ChatMessage.
      // For now, we rely on standard roles.
      // If a user is a Teacher Account but has ADMIN role, show Shield.
      // To strictly show Teacher cap, I'll check a custom logic or just rely on roles.
      // Given the requirement "Teacher should not be a role", I will trust role icons here.
      
      switch(role) {
          case UserRole.OWNER: return <Crown size={12} className="text-yellow-500" />;
          case UserRole.DEV: return <Code2 size={12} className="text-purple-500" />;
          case UserRole.ADMIN: return <Shield size={12} className="text-red-500" />;
          case UserRole.CLUB_LEADER: return <Users size={12} className="text-blue-500" />;
          default: return null;
      }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-700 rounded-lg">
                <MapPin size={24} className="text-indigo-200" />
            </div>
            <div>
                <h1 className="font-bold text-lg">Event Planning</h1>
                <p className="text-xs text-indigo-200">Coordination channel for Leaders & Admins</p>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 mt-1">
                        {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {msg.senderName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-xs font-bold text-slate-600">{msg.senderName}</span>
                             {getRoleIcon(msg.senderRole, msg.senderName)}
                        </div>
                        <div className={`px-4 py-2 rounded-2xl text-sm ${
                            isMe 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">
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
        <form onSubmit={handleSend} className="flex gap-2">
            <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Discuss event locations and details..."
                className="flex-1 p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Send size={20} />
            </button>
        </form>
      </div>
    </div>
  );
};