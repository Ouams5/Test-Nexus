import React, { useState, useEffect, useRef } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { ChatMessage, Club, UserRole } from '../types';
import { Send, Users, ArrowLeft, Shield, Crown, Code2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ClubChat = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClub = async () => {
        if (!clubId) return;
        const c = await db.getClub(clubId);
        setClub(c);
        setLoading(false);
    };
    fetchClub();
  }, [clubId]);

  useEffect(() => {
    if (!user || !clubId) return;
    const unsubscribe = db.subscribeToClubChat(clubId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user, clubId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!user || !clubId) return <Navigate to="/" />;

  // Permission Check
  const isMember = user.joinedClubIds.includes(clubId);
  const isPrivileged = user.role === UserRole.ADMIN || user.role === UserRole.OWNER || user.role === UserRole.DEV;
  
  if (!isMember && !isPrivileged) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4">
                  <Shield size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
              <p className="text-slate-500 mt-2">You must be a member of this club to join the chat.</p>
              <Link to="/clubs" className="mt-6 text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2">
                  <ArrowLeft size={18} /> Back to Clubs
              </Link>
          </div>
      );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await db.sendClubMessage({
        text: newMessage,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatarUrl,
        senderRole: user.role,
        createdAt: new Date().toISOString(),
        clubId: clubId
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
          case UserRole.CLUB_LEADER: return <span title="Leader"><Shield size={12} className="text-indigo-600" /></span>;
          default: return null;
      }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans" data-theme={club?.theme || 'light'}>
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
             <Link to={`/clubs/${clubId}`} className="text-slate-400 hover:text-slate-600 transition-colors">
                 <ArrowLeft size={20} />
             </Link>
            <div className="p-2 bg-indigo-100 rounded-lg">
                {club?.imageUrl ? <img src={club.imageUrl} className="w-6 h-6 rounded object-cover" /> : <Users size={24} className="text-indigo-600" />}
            </div>
            <div>
                <h1 className="font-bold text-lg text-slate-800">{club?.name || 'Club'} Chat</h1>
                <p className="text-xs text-slate-500">Members only channel</p>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
        {messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
                    <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 mt-1 border border-slate-200 shadow-sm">
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
                             <span className="text-xs font-bold text-slate-700">{msg.senderName}</span>
                             {getRoleBadge(msg.senderRole)}
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm markdown-body ${
                            isMe 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
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
                placeholder={`Message ${club?.name}...`}
                className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all text-sm font-medium"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="p-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
            >
                <Send size={20} />
            </button>
        </form>
      </div>
    </div>
  );
};