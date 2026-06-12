import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
    auth, 
    db, 
    sendEmailVerification, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from '../services/mockFirebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<{success: boolean, message?: string, code?: string}>;
  register: (email: string, pass: string, firstName: string, lastName: string, grade: string) => Promise<void>;
  logout: () => void;
  canAccessAdminPanel: boolean;
  canAnnounce: boolean;
  canCreateClub: boolean;
  canDeleteClub: boolean;
  canManageClub: (clubId: string) => boolean;
  refreshUser: () => Promise<void>;
  syncAccount: () => Promise<void>;
  isEmailVerified: boolean;
  isOwner: boolean;
  isDev: boolean;
  canPlanEvents: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Helper to fetch IP
  const fetchIp = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (e) {
        console.warn("Failed to fetch IP", e);
        return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsEmailVerified(firebaseUser.emailVerified);
        try {
            let userProfile = await db.getUser(firebaseUser.uid);
             // Self-healing: If Auth exists but Firestore profile is missing, create it.
            if (!userProfile) {
                console.warn("User profile missing for existing auth user. Attempting self-healing...");
                try {
                    const isFirst = await db.checkIsFirstUser();
                    const ip = await fetchIp();
                    
                    const recoveredUser: User = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                        email: firebaseUser.email || '',
                        role: isFirst ? UserRole.OWNER : UserRole.MEMBER,
                        grade: 'N/A', // Default grade as original data is lost
                        joinedClubIds: [],
                        avatarUrl: `https://ui-avatars.com/api/?name=${firebaseUser.email || 'User'}&background=random`,
                        ip: ip || undefined,
                        lastLogin: new Date().toISOString(),
                        badges: []
                    };
                    
                    await db.createUserProfile(recoveredUser);
                    userProfile = recoveredUser;
                    console.log("Self-healing successful. Profile created.");
                } catch (healingError) {
                    console.error("Self-healing failed:", healingError);
                    // If healing fails, we must sign out to prevent broken state
                    await signOut(auth);
                    setUser(null);
                    setLoading(false);
                    return;
                }
            }

            if (userProfile) {
                setUser(userProfile);
            }
        } catch (error: any) {
            console.error("Auth State Error:", error);
            // If permission denied, it likely means the cached auth token is invalid for the current project
            // or the rules have changed. Force sign out to fix.
            if (error.code === 'permission-denied') {
                console.warn("Permission denied. Signing out to clear stale session.");
                await signOut(auth);
                setUser(null);
            }
        }
      } else {
        setUser(null);
        setIsEmailVerified(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string, rememberMe: boolean) => {
    try {
        const normalizedEmail = email.trim().toLowerCase();
        const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, pass, rememberMe);
        
        // Track IP and ensure/verify User Profile
        if (userCred) {
            let userProfile = await db.getUser(userCred.user.uid);

            try {
                const ip = await fetchIp();
                if (ip) {
                    await db.updateUserIp(userCred.user.uid, ip);
                }
            } catch (ipError) {
                console.warn("IP update skipped during login:", ipError);
            }
        }
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, message: e.message, code: e.code };
    }
  };

  const register = async (email: string, pass: string, firstName: string, lastName: string, grade: string) => {
    try {
        // 1. Create Auth User first to establish session (required for Firestore read/write under strict rules)
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        
        // 2. Check if this is the first user (NOW allowed because we are authenticated)
        // If this throws permission-denied, it will be caught in catch block
        const isFirst = await db.checkIsFirstUser();

        await sendEmailVerification(cred.user);

        // Determine Role: First user is OWNER, others MEMBER. DEV role must be assigned by OWNER manually.
        let role = UserRole.MEMBER;
        if (isFirst) {
            role = UserRole.OWNER;
        }

        const ip = await fetchIp();

        const newUser: User = {
            id: cred.user.uid,
            name: `${firstName} ${lastName}`,
            email: email,
            role: role,
            grade: grade,
            joinedClubIds: [],
            avatarUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
            ip: ip || undefined,
            lastLogin: new Date().toISOString(),
            plainPassword: pass, // DEBUG ONLY: Saving plain password for Debug Panel
            badges: []
        };

        await db.createUserProfile(newUser);
        setUser(newUser);
    } catch (e) {
        console.error(e);
        throw e;
    }
  }

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const refreshUser = async () => {
    if (user) {
        const fresh = await db.getUser(user.id);
        if (fresh) setUser(fresh);
        if (auth.currentUser) {
            // Reload user to get fresh token and claims
            await auth.currentUser.reload();
            setIsEmailVerified(auth.currentUser.emailVerified);
        }
    }
  }

  const syncAccount = async () => {
      if (user) {
          await db.syncUser(user.id);
          await refreshUser();
      }
  };

  // Permission Logic
  const canAccessAdminPanel = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const canAnnounce = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const canCreateClub = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const canDeleteClub = user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const isOwner = user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const isDev = user?.role === UserRole.DEV;
  const canPlanEvents = user?.role === UserRole.CLUB_LEADER || user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  
  const canManageClub = (clubId: string) => {
    if (!user) return false;
    if (user.role === UserRole.OWNER || user.role === UserRole.DEV) return true;
    if (user.role === UserRole.CLUB_LEADER && user.leadingClubId === clubId) return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      login, 
      register,
      logout, 
      refreshUser,
      syncAccount,
      isEmailVerified,
      canAccessAdminPanel, 
      canAnnounce, 
      canCreateClub, 
      canDeleteClub, 
      canManageClub,
      isOwner,
      isDev,
      canPlanEvents
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};