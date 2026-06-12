import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

interface UIContextType {
    showToast: (message: string, type?: ToastType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: React.PropsWithChildren<{}>) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    // --- Toast Logic ---
    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // --- Confirm Logic ---
    const confirm = (options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                options,
                resolve: (val) => {
                    setConfirmState(null);
                    resolve(val);
                }
            });
        });
    };

    return (
        <UIContext.Provider value={{ showToast, confirm }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        className={`pointer-events-auto min-w-[300px] max-w-sm bg-white rounded-xl shadow-lg border p-4 flex items-start gap-3 animate-in slide-in-from-right-5 fade-in duration-300 ${
                            toast.type === 'error' ? 'border-red-100 bg-red-50/50' : 
                            toast.type === 'success' ? 'border-green-100 bg-green-50/50' : 
                            'border-slate-100 bg-white'
                        }`}
                    >
                        {toast.type === 'success' && <CheckCircle size={20} className="text-green-500 mt-0.5 shrink-0" />}
                        {toast.type === 'error' && <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />}
                        {toast.type === 'info' && <Info size={20} className="text-blue-500 mt-0.5 shrink-0" />}
                        {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />}
                        
                        <div className="flex-1 text-sm font-medium text-slate-700 leading-snug pt-0.5">
                            {toast.message}
                        </div>
                        <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmState && (
                <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="mb-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                                confirmState.options.type === 'danger' ? 'bg-red-100 text-red-600' :
                                confirmState.options.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                'bg-blue-100 text-blue-600'
                            }`}>
                                {confirmState.options.type === 'danger' ? <AlertCircle size={24} /> : 
                                 confirmState.options.type === 'warning' ? <AlertTriangle size={24} /> :
                                 <Info size={24} />}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                {confirmState.options.title || 'Are you sure?'}
                            </h3>
                            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                                {confirmState.options.message}
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => confirmState.resolve(false)}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                {confirmState.options.cancelText || 'Cancel'}
                            </button>
                            <button 
                                onClick={() => confirmState.resolve(true)}
                                className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm transition-transform active:scale-95 ${
                                    confirmState.options.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                                    'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {confirmState.options.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};