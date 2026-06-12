import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password, rememberMe);
    setIsLoading(false);
    
    if (result.success) {
        navigate('/');
    } else {
        const code = result.code || '';
        const msg = result.message || '';
        
        if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
            setError('Incorrect email or password.');
        } else if (code === 'auth/too-many-requests') {
            setError('Too many failed attempts. Please try again later.');
        } else if (code === 'auth/network-request-failed') {
            setError('Network error. Please check your connection.');
        } else if (msg.includes('auth/invalid-credential')) {
            // Fallback string check
            setError('Incorrect email or password.');
        } else {
            setError('Login failed. Please check your credentials.');
        }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F3F4F6]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-center border-b border-slate-100">
            <h1 className="text-2xl font-bold text-[#1e3a8a]">{t('welcome')}</h1>
        </div>

        <div className="px-8 pb-8 pt-6">
            <form onSubmit={handleLogin} className="space-y-6">
                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium">{error}</div>}
                
                <div className="space-y-1">
                    <label className="block text-[#1e3a8a] font-bold text-base">{t('email')}</label>
                    <input 
                        type="email"
                        placeholder="student@bniyekhlef.edu"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300"
                    />
                </div>

                <div className="space-y-1">
                    <label className="block text-[#1e3a8a] font-bold text-base">{t('password')}</label>
                    <input 
                        type="password"
                        placeholder="........"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300 tracking-widest"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="remember" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember" className="text-slate-600 text-sm">{t('rememberMe')}</label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button 
                        type="button" 
                        className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-[#1e3a8a] font-semibold text-sm hover:bg-slate-50 transition-colors"
                    >
                        {t('forgotPassword')}
                    </button>
                </div>
                
                <div className="w-full h-px bg-slate-100 my-4"></div>

                <div className="pt-2">
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-8 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors shadow-lg shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="animate-spin" size={18} />}
                        {t('login')}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};