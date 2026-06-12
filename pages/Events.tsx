import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { AppEvent } from '../types';
import { Plus, Calendar as CalIcon, MapPin, Trash2 } from 'lucide-react';

export const Events = () => {
  const { canAnnounce, user, isOwner } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useUI();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', location: '', date: '' });

  const loadData = async () => {
      const data = await db.getEvents();
      setEvents(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addEvent({
        id: Date.now().toString(),
        ...formData,
        organizer: user?.name || 'Admin'
    });
    setShowModal(false);
    setFormData({ title: '', description: '', location: '', date: '' });
    showToast("Event created successfully!", "success");
    loadData();
  };

  const handleDelete = async (id: string) => {
      const confirmed = await confirm({
          title: "Delete Event",
          message: "Are you sure you want to delete this event?",
          type: "danger"
      });

      if (confirmed) {
          await db.deleteEvent(id);
          showToast("Event deleted.", "success");
          loadData();
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">{t('upcomingEvents')}</h1>
        {canAnnounce && (
          <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
            <Plus size={18} /> {t('addEvent')}
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {events.length === 0 ? <p className="text-slate-500">{t('noEvents')}</p> : events.map(ev => (
            <div key={ev.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap sm:flex-nowrap gap-6 items-start relative group">
                {isOwner && (
                    <button 
                        onClick={() => handleDelete(ev.id)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
                <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center min-w-[100px] w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center">
                    <span className="block text-3xl font-bold">{new Date(ev.date).getDate()}</span>
                    <span className="block text-sm uppercase font-bold">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                </div>
                <div className="flex-1 pr-8 min-w-[200px]">
                    <h3 className="text-xl font-bold text-slate-800">{ev.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mt-1 mb-3">
                        <span className="flex items-center gap-1"><CalIcon size={14}/> {new Date(ev.date).toLocaleTimeString()}</span>
                        <span className="flex items-center gap-1"><MapPin size={14}/> {ev.location}</span>
                    </div>
                    <p className="text-slate-600">{ev.description}</p>
                </div>
            </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <h2 className="text-2xl font-bold mb-4">{t('createEvent')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input className="w-full p-2 border rounded" placeholder={t('eventTitle')} required onChange={e => setFormData({...formData, title: e.target.value})} />
                    <textarea className="w-full p-2 border rounded" placeholder={t('description')} required onChange={e => setFormData({...formData, description: e.target.value})} />
                    <input className="w-full p-2 border rounded" placeholder={t('location')} required onChange={e => setFormData({...formData, location: e.target.value})} />
                    <input type="datetime-local" className="w-full p-2 border rounded" required onChange={e => setFormData({...formData, date: e.target.value})} />
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">{t('create')}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};