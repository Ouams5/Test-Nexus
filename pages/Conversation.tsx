import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { ChatMessage, UserRole } from '../types';
import { Send, MessageSquareCode, ShieldAlert, Code2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Conversation = () => {
  const { user, isDev, isOwner } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Permission check inside effect not ideal for redirects, handled by render
    if (!user || (!isDev && !isOwner)) return;

    const unsubscribe = db.subscribeToDevChat((msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user, isDev, isOwner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user || (!isDev && !isOwner)) {
    return <Navigate to="/" />;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await db.sendDevMessage({
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

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
                <span className="material-symbols-rounded text-blue-400">terminal</span>
            </div>
            <div>
                <h1 className="font-bold text-lg font-display">Dev & Owner Channel</h1>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Encrypted • Real-time
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
            {isOwner && <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-600/30">OWNER ACCESS</span>}
            {isDev && <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded border border-purple-600/30">DEV ACCESS</span>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
                    <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 mt-1 ring-2 ring-white shadow-sm">
                        {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {msg.senderName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                             <span className="text-xs font-bold text-slate-600">{msg.senderName}</span>
                             {msg.senderRole === UserRole.OWNER && <span className="material-symbols-rounded text-[14px] text-blue-600">shield</span>}
                             {msg.senderRole === UserRole.DEV && <span className="material-symbols-rounded text-[14px] text-purple-600">code</span>}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm markdown-body ${
                            isMe 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                        }`}>
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // Custom styling for code blocks inside chat
                                    code(props) {
                                        const {children, className, node, ...rest} = props
                                        return <code {...rest} className={`${className} ${isMe ? 'bg-blue-700/50 text-white' : 'bg-slate-100 text-pink-500'} px-1 py-0.5 rounded font-mono text-xs`}>{children}</code>
                                    }
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
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
                placeholder="Type a message... (Markdown supported)"
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