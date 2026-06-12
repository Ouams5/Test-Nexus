import { initializeApp, deleteApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, collection, getDocs, doc, setDoc, addDoc, updateDoc, 
  deleteDoc, query, where, onSnapshot, arrayUnion, arrayRemove, getDoc, orderBy, limit, writeBatch
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { User, UserRole, Club, Announcement, AppEvent, Project, BugReport, Notification, ChatMessage, Credit, Badge } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyB7P5rVgjwsSCgYuqS5_-I16GLKj-pSfI0",
  authDomain: "test-schoolsite.firebaseapp.com",
  projectId: "test-schoolsite",
  storageBucket: "test-schoolsite.firebasestorage.app",
  messagingSenderId: "174082705173",
  appId: "1:174082705173:web:518441dd0b17804c468b1c"
};

let app: any;
let analytics: any;
export let firestore: any;
export let auth: any;
let isFirebaseAvailable = false;

try {
  app = initializeApp(firebaseConfig);
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics not initialized:", e);
  }
  firestore = getFirestore(app);
  auth = getAuth(app);
  isFirebaseAvailable = true;
} catch (error) {
  console.error("Firebase failed to initialize. Operating in Local Standalone Mode:", error);
}

// --- Local Storage Store & Fallback Data ---
class LocalStoreClass {
  get(key: string, defaultVal: any) {
    const val = localStorage.getItem(`nexus_local_${key}`);
    if (!val) {
      this.set(key, defaultVal);
      return defaultVal;
    }
    try {
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  }
  set(key: string, val: any) {
    localStorage.setItem(`nexus_local_${key}`, JSON.stringify(val));
  }
}
const LocalStore = new LocalStoreClass();

const defaultUsers: Record<string, User> = {};

const defaultClubs: Record<string, Club> = {
  "club-1": {
    id: "club-1",
    name: "AI & Coding Club",
    description: "The official university club for artificial intelligence, machine learning, and fullstack coding projects. We learn together and build amazing apps.",
    leaderId: "system-setup-admin",
    memberIds: [],
    category: "Technology",
    logoUrl: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&q=80&w=200",
    bannerUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
    createdAt: new Date().toISOString()
  },
  "club-2": {
    id: "club-2",
    name: "Robotics Club",
    description: "Building autonomous systems, sensory feedback designs, and internet-of-things controllers.",
    leaderId: "system-setup-admin",
    memberIds: [],
    category: "Engineering",
    logoUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=200",
    bannerUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
    createdAt: new Date().toISOString()
  }
};

const defaultAnnouncements: Record<string, Announcement> = {
  "ann-1": {
    id: "ann-1",
    title: "Welcome to UniClub Nexus!",
    content: "We are thrilled to launch the new club management system. Here, you can coordinate club events, explore student projects, issue digital merit badges, and chat in real-time.",
    date: new Date().toISOString(),
    authorName: "Nexus Administration",
    authorEmail: "admin@bniyekhlef.edu",
    isImportant: true
  }
};

const defaultEvents: Record<string, AppEvent> = {
  "event-1": {
    id: "event-1",
    title: "Fullstack Web Development",
    description: "An intensive interactive workshop on React, Tailwind CSS, and Cloud storage systems.",
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    time: "14:00 - 17:00",
    location: "Hall B, Engineering Block",
    clubId: "club-1",
    creatorId: "system-setup-admin"
  }
};

const defaultProjects: Record<string, Project> = {
  "proj-1": {
    id: "proj-1",
    title: "Nexus Companion AI Assistant",
    description: "A study assistant integrated with course syllabi to test students' comprehension and summarize academic lectures in real-time.",
    clubId: "club-1",
    creatorId: "system-setup-admin",
    creatorName: "Nexus Administration",
    createdAt: new Date().toISOString(),
    likes: 5,
    likedByUserIds: [],
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=600"
  }
};

const defaultCredits: Record<string, Credit> = {
  "credit-1": {
    id: "credit-1",
    studentName: "Nexus Support Team",
    clubName: "Nexus Admin",
    description: "System Architect and Core Security Integration lead.",
    date: new Date().toISOString()
  }
};

const tryCall = async <T>(fbAction: () => Promise<T>, fallbackAction: () => Promise<T> | T): Promise<T> => {
  if (isFirebaseAvailable) {
    try {
      return await fbAction();
    } catch (e) {
      console.warn("Firebase action failed, falling back to local storage:", e);
    }
  }
  return await fallbackAction();
};

// Wrapper functions to match AuthContext expectations
export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string, remember: boolean = false) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isFirebaseAvailable && authInstance) {
        try {
            await setPersistence(authInstance, remember ? browserLocalPersistence : browserSessionPersistence);
            const userCred = await firebaseSignIn(authInstance, email, pass);
            return userCred;
        } catch (err) {
            console.warn("Firebase sign in failed, trying fallback mode", err);
            const localUsers = LocalStore.get("users", {});
            const matchedUser: any = Object.values(localUsers).find(
                (u: any) => u.email.toLowerCase() === normalizedEmail && u.plainPassword === pass
            );
            if (matchedUser) {
                localStorage.setItem("nexus_bypass_auth_uid", matchedUser.id);
                return {
                    user: {
                        uid: matchedUser.id,
                        email: matchedUser.email,
                        emailVerified: true,
                        displayName: matchedUser.name
                    }
                };
            }
            throw err;
        }
    } else {
        const localUsers = LocalStore.get("users", {});
        const matchedUser: any = Object.values(localUsers).find(
            (u: any) => u.email.toLowerCase() === normalizedEmail && u.plainPassword === pass
        );
        if (matchedUser) {
            localStorage.setItem("nexus_bypass_auth_uid", matchedUser.id);
            return {
                user: {
                    uid: matchedUser.id,
                    email: matchedUser.email,
                    emailVerified: true,
                    displayName: matchedUser.name
                }
            };
        }
        throw new Error("Incorrect email or password (Standalone mode).");
    }
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    if (isFirebaseAvailable && authInstance) {
        try {
            return await firebaseCreateUser(authInstance, email, pass);
        } catch (err) {
            console.warn("Firebase signup failed, trying local fallback", err);
        }
    }
    const uid = `local-uid-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("nexus_bypass_auth_uid", uid);
    return {
        user: {
            uid: uid,
            email: email,
            emailVerified: true,
            displayName: email.split('@')[0]
        }
    };
};

export const signOut = async (authInstance: any) => {
    localStorage.removeItem("nexus_bypass_auth_uid");
    if (isFirebaseAvailable && authInstance) {
        try {
            return await firebaseSignOut(authInstance);
        } catch (e) {
            console.warn("Firebase signout failed", e);
        }
    }
};

export const sendEmailVerification = async (user: any) => {
    if (isFirebaseAvailable && user && typeof user.sendEmailVerification === 'function') {
        try {
            return await firebaseSendEmailVerification(user);
        } catch (e) {
            console.warn("Email verification omitted in offline fallback", e);
        }
    }
};

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
    let unsubFirebase: any = null;
    if (isFirebaseAvailable && authInstance) {
        try {
            unsubFirebase = firebaseOnAuthStateChanged(authInstance, (fbUser) => {
                if (fbUser) {
                    callback(fbUser);
                } else {
                    const bypassUid = localStorage.getItem("nexus_bypass_auth_uid");
                    if (bypassUid) {
                        const localUsers = LocalStore.get("users", defaultUsers);
                        const user = localUsers[bypassUid];
                        if (user) {
                            callback({
                                uid: user.id,
                                email: user.email,
                                emailVerified: true,
                                displayName: user.name
                            });
                        } else {
                            callback(null);
                        }
                    } else {
                        callback(null);
                    }
                }
            });
        } catch (e) {
            console.warn("Firebase Auth state tracking error:", e);
        }
    }

    if (!unsubFirebase) {
        setTimeout(() => {
            const bypassUid = localStorage.getItem("nexus_bypass_auth_uid");
            if (bypassUid) {
                const localUsers = LocalStore.get("users", defaultUsers);
                const user = localUsers[bypassUid];
                if (user) {
                    callback({
                        uid: user.id,
                        email: user.email,
                        emailVerified: true,
                        displayName: user.name
                    });
                } else {
                    callback(null);
                }
            } else {
                callback(null);
            }
        }, 50);
    }

    return () => {
        if (unsubFirebase) unsubFirebase();
    };
};

export const updateUserPassword = async (user: any, newPassword: string) => {
    if (isFirebaseAvailable && user) {
        try {
            await firebaseUpdatePassword(user, newPassword);
        } catch (e) {
            console.warn("Firebase password sync skipped: ", e);
        }
    }
    try {
        const localUsers = LocalStore.get("users", defaultUsers);
        if (localUsers[user.uid]) {
            localUsers[user.uid].plainPassword = newPassword;
            LocalStore.set("users", localUsers);
        }
    } catch (e) {
        console.warn("Failed to sync local plain password", e);
    }
};

export const adminSendPasswordReset = async (email: string) => {
    if (isFirebaseAvailable) {
        try {
            return await firebaseSendPasswordResetEmail(auth, email);
        } catch (e) {
            console.warn("Firebase reset skipped:", e);
        }
    }
};

// Helper to sanitize user data (migration)
const sanitizeUser = (data: any): User => {
    let role = data.role;
    if (role === 'TEACHER') {
        role = UserRole.MEMBER;
    }
    let finalBadges: Badge[] = [];
    if (data.badges && Array.isArray(data.badges)) {
        finalBadges = data.badges;
    } else if (data.clubBadges && Array.isArray(data.clubBadges)) {
        finalBadges = data.clubBadges.map((b: any) => ({
             id: b.clubId ? `legacy-${b.clubId}` : `legacy-${Math.random()}`,
             type: 'CUSTOM',
             name: b.badgeName || b.name || 'Legacy Badge',
             imageUrl: b.badgeImageUrl || b.imageUrl || '',
             description: b.badgeDescription || b.description || '',
             assignedAt: b.claimedAt || b.assignedAt || new Date().toISOString(),
             clubId: b.clubId
        }));
    }
    finalBadges = finalBadges.map((b: any) => ({
        ...b,
        type: b.type || 'CUSTOM'
    }));

    return {
        ...data,
        role: role,
        badges: finalBadges
    } as User;
};

// Service Implementation
class FirebaseService {
  
  // --- Users ---
  async getUser(userId: string): Promise<User | null> {
    return tryCall(
      async () => {
        const docRef = doc(firestore, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return sanitizeUser(docSnap.data());
        }
        return null;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        return users[userId] || null;
      }
    );
  }

  async syncUser(userId: string): Promise<boolean> {
    return tryCall(
      async () => {
        const user = await this.getUser(userId);
        if (user) {
          await setDoc(doc(firestore, "users", userId), user);
          return true;
        }
        return false;
      },
      async () => {
        const user = await this.getUser(userId);
        if (user) {
          const users = LocalStore.get("users", defaultUsers);
          users[userId] = user;
          LocalStore.set("users", users);
          return true;
        }
        return false;
      }
    );
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return sanitizeUser(snapshot.docs[0].data());
        }
        return null;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        const target = Object.values(users).find((user: any) => user.email.toLowerCase() === email.toLowerCase());
        return (target as User) || null;
      }
    );
  }

  async createUserProfile(user: User): Promise<void> {
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "users", user.id), user);
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        users[user.id] = user;
        LocalStore.set("users", users);
      }
    );
  }

  async getAllUsers(): Promise<User[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "users"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => sanitizeUser({ id: doc.id, ...doc.data() }));
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        return Object.values(users);
      }
    );
  }
  
  async updateUserRole(adminId: string, targetUserId: string, newRole: UserRole): Promise<boolean> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", targetUserId);
        await updateDoc(userRef, { role: newRole });
        return true;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[targetUserId]) {
          users[targetUserId].role = newRole;
          LocalStore.set("users", users);
        }
        return true;
      }
    );
  }

  async updateUserIp(userId: string, ip: string): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        await updateDoc(userRef, { 
          ip: ip,
          lastLogin: new Date().toISOString()
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          users[userId].ip = ip;
          users[userId].lastLogin = new Date().toISOString();
          LocalStore.set("users", users);
        }
      }
    );
  }

  async deleteUser(userId: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "users", userId));
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        delete users[userId];
        LocalStore.set("users", users);
      }
    );
  }

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    return tryCall(
      async () => {
        const batch = writeBatch(firestore);
        userIds.forEach(id => {
          const docRef = doc(firestore, "users", id);
          batch.delete(docRef);
        });
        await batch.commit();
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        userIds.forEach(id => {
          delete users[id];
        });
        LocalStore.set("users", users);
      }
    );
  }

  async bulkUpdateUserRole(userIds: string[], newRole: UserRole): Promise<void> {
    return tryCall(
      async () => {
        const batch = writeBatch(firestore);
        userIds.forEach(id => {
          const docRef = doc(firestore, "users", id);
          batch.update(docRef, { role: newRole });
        });
        await batch.commit();
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        userIds.forEach(id => {
          if (users[id]) users[id].role = newRole;
        });
        LocalStore.set("users", users);
      }
    );
  }

  async checkIsFirstUser(): Promise<boolean> {
    return tryCall(
      async () => {
        const snapshot = await getDocs(query(collection(firestore, "users"), limit(1)));
        return snapshot.empty;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        return Object.keys(users).length === 0;
      }
    );
  }

  async bulkCreateUsers(users: {email: string, password: string, name: string, grade: string}[]): Promise<{success: number, errors: any[]}> {
    if (isFirebaseAvailable) {
      try {
        let secondaryApp;
        const appName = "SecondaryUserCreator";
        try {
          const existing = getApps().find(a => a.name === appName);
          if (existing) {
            secondaryApp = existing;
          } else {
            secondaryApp = initializeApp(firebaseConfig, appName);
          }
        } catch(e) {
          secondaryApp = initializeApp(firebaseConfig, "SecondaryUserCreator" + Date.now());
        }

        const secondaryAuth = getAuth(secondaryApp);
        const results = { success: 0, errors: [] as any[] };

        for (const u of users) {
          try {
            const cred = await firebaseCreateUser(secondaryAuth, u.email, u.password);
            const newUser: User = {
              id: cred.user.uid,
              name: u.name,
              email: u.email,
              role: UserRole.MEMBER,
              grade: u.grade,
              joinedClubIds: [],
              avatarUrl: `https://ui-avatars.com/api/?name=${u.name}&background=random`,
              ip: 'Created via Bulk Import',
              lastLogin: new Date().toISOString(),
              plainPassword: u.password,
              badges: []
            };
            await this.createUserProfile(newUser);
            results.success++;
          } catch (e: any) {
            results.errors.push({ email: u.email, error: e.code });
          }
        }
        try { await deleteApp(secondaryApp); } catch(e) {}
        return results;
      } catch (err) {
        console.warn("Bulk create failed with firebase auth, fall back to local store", err);
      }
    }

    const localUsers = LocalStore.get("users", defaultUsers);
    const results = { success: 0, errors: [] as any[] };
    for (const u of users) {
      const id = `local-uid-${Math.random().toString(36).substr(2, 9)}`;
      const newUser: User = {
        id,
        name: u.name,
        email: u.email,
        role: UserRole.MEMBER,
        grade: u.grade,
        joinedClubIds: [],
        avatarUrl: `https://ui-avatars.com/api/?name=${u.name}&background=random`,
        ip: 'Created via Bulk Import (Local)',
        lastLogin: new Date().toISOString(),
        plainPassword: u.password,
        badges: []
      };
      localUsers[id] = newUser;
      results.success++;
    }
    LocalStore.set("users", localUsers);
    return results;
  }

  // --- Badges ---
  async addBadgeToUser(userId: string, badge: Badge): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        await updateDoc(userRef, {
          badges: arrayUnion(badge)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const badges = users[userId].badges || [];
          if (!badges.some((b: any) => b.id === badge.id)) {
            badges.push(badge);
          }
          users[userId].badges = badges;
          LocalStore.set("users", users);
        }
      }
    );
  }

  async removeBadgeFromUser(userId: string, badge: Badge): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        await updateDoc(userRef, {
          badges: arrayRemove(badge)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const badges = users[userId].badges || [];
          users[userId].badges = badges.filter((b: any) => b.id !== badge.id);
          LocalStore.set("users", users);
        }
      }
    );
  }

  // --- Clubs ---
  async getClubs(): Promise<Club[]> {
    return tryCall(
      async () => {
        const snapshot = await getDocs(collection(firestore, "clubs"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      },
      () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        return Object.values(clubs);
      }
    );
  }

  async getClub(clubId: string): Promise<Club | null> {
    return tryCall(
      async () => {
        const docRef = doc(firestore, "clubs", clubId);
        const s = await getDoc(docRef);
        return s.exists() ? ({ id: s.id, ...s.data() } as Club) : null;
      },
      () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        return clubs[clubId] || null;
      }
    );
  }
  
  async createClubWithLeader(clubData: Omit<Club, 'id'>, leaderEmail: string): Promise<boolean> {
    return tryCall(
      async () => {
        const leader = await this.getUserByEmail(leaderEmail);
        if (!leader) return false;
        const clubRef = await addDoc(collection(firestore, "clubs"), {
          ...clubData,
          leaderId: leader.id,
          memberIds: [leader.id]
        });
        await updateDoc(doc(firestore, "users", leader.id), {
          role: UserRole.CLUB_LEADER,
          leadingClubId: clubRef.id,
          joinedClubIds: arrayUnion(clubRef.id)
        });
        return true;
      },
      async () => {
        const leader = await this.getUserByEmail(leaderEmail);
        if (!leader) return false;
        const clubs = LocalStore.get("clubs", defaultClubs);
        const clubId = `club-${Math.random().toString(36).substr(2, 9)}`;
        const newClub: Club = {
          id: clubId,
          ...clubData,
          leaderId: leader.id,
          memberIds: [leader.id]
        };
        clubs[clubId] = newClub;
        LocalStore.set("clubs", clubs);

        const users = LocalStore.get("users", defaultUsers);
        if (users[leader.id]) {
          users[leader.id].role = UserRole.CLUB_LEADER;
          users[leader.id].leadingClubId = clubId;
          const joined = users[leader.id].joinedClubIds || [];
          if (!joined.includes(clubId)) joined.push(clubId);
          users[leader.id].joinedClubIds = joined;
          LocalStore.set("users", users);
        }
        return true;
      }
    );
  }

  async deleteClub(clubId: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "clubs", clubId));
      },
      () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        delete clubs[clubId];
        LocalStore.set("clubs", clubs);
      }
    );
  }

  async joinClub(userId: string, clubId: string): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const clubRef = doc(firestore, "clubs", clubId);
        await updateDoc(userRef, {
          joinedClubIds: arrayUnion(clubId)
        });
        await updateDoc(clubRef, {
          memberIds: arrayUnion(userId)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const joined = users[userId].joinedClubIds || [];
          if (!joined.includes(clubId)) joined.push(clubId);
          users[userId].joinedClubIds = joined;
          LocalStore.set("users", users);
        }
        const clubs = LocalStore.get("clubs", defaultClubs);
        if (clubs[clubId]) {
          const members = clubs[clubId].memberIds || [];
          if (!members.includes(userId)) members.push(userId);
          clubs[clubId].memberIds = members;
          LocalStore.set("clubs", clubs);
        }
      }
    );
  }

  async leaveClub(userId: string, clubId: string): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const clubRef = doc(firestore, "clubs", clubId);
        try {
          await updateDoc(userRef, {
            joinedClubIds: arrayRemove(clubId)
          });
        } catch (e: any) {
          if (e.code !== 'not-found') throw e;
        }
        await updateDoc(clubRef, {
          memberIds: arrayRemove(userId)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const joined = users[userId].joinedClubIds || [];
          users[userId].joinedClubIds = joined.filter((id: string) => id !== clubId);
          LocalStore.set("users", users);
        }
        const clubs = LocalStore.get("clubs", defaultClubs);
        if (clubs[clubId]) {
          const members = clubs[clubId].memberIds || [];
          clubs[clubId].memberIds = members.filter((id: string) => id !== userId);
          LocalStore.set("clubs", clubs);
        }
      }
    );
  }

  async kickMember(leaderId: string, clubId: string, memberId: string): Promise<boolean> {
    await this.leaveClub(memberId, clubId);
    return true;
  }

  // --- Announcements ---
  async getAnnouncements(clubId?: string): Promise<Announcement[]> {
    return tryCall(
      async () => {
        let q;
        if (clubId) {
          q = query(collection(firestore, "announcements"), where("clubId", "==", clubId));
        } else {
          q = query(collection(firestore, "announcements"), orderBy("date", "desc"));
        }
        const snapshot = await getDocs(q);
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Announcement));
        announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return announcements;
      },
      () => {
        const announcements = LocalStore.get("announcements", defaultAnnouncements);
        const list = Object.values(announcements) as Announcement[];
        const filtered = clubId ? list.filter(a => a.clubId === clubId) : list;
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    );
  }

  async addAnnouncement(a: Announcement): Promise<void> {
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "announcements", a.id), a);
        await addDoc(collection(firestore, "notifications"), {
          title: a.clubId ? "New Club Announcement" : "New Global Announcement",
          message: a.title,
          date: new Date().toISOString(),
          read: false,
          type: a.isImportant ? 'alert' : 'info',
          clubId: a.clubId || null,
          announcementId: a.id
        });
      },
      () => {
        const announcements = LocalStore.get("announcements", defaultAnnouncements);
        announcements[a.id] = a;
        LocalStore.set("announcements", announcements);

        const notifications = LocalStore.get("notifications", {});
        const notifId = `notif-${Math.random().toString(36).substr(2, 9)}`;
        notifications[notifId] = {
          id: notifId,
          title: a.clubId ? "New Club Announcement" : "New Global Announcement",
          message: a.title,
          date: new Date().toISOString(),
          read: false,
          type: a.isImportant ? 'alert' : 'info',
          clubId: a.clubId || null,
          announcementId: a.id
        };
        LocalStore.set("notifications", notifications);
      }
    );
  }

  async deleteAnnouncement(id: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "announcements", id));
        const q = query(collection(firestore, "notifications"), where("announcementId", "==", id));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      },
      () => {
        const announcements = LocalStore.get("announcements", defaultAnnouncements);
        delete announcements[id];
        LocalStore.set("announcements", announcements);

        const notifications = LocalStore.get("notifications", {});
        const updated = { ...notifications };
        for (const notifId in updated) {
          if (updated[notifId].announcementId === id) {
            delete updated[notifId];
          }
        }
        LocalStore.set("notifications", updated);
      }
    );
  }

  async deleteAllAnnouncements(): Promise<void> {
    return tryCall(
      async () => {
        const snapshot = await getDocs(collection(firestore, "announcements"));
        const deletePromises = snapshot.docs.map(doc => this.deleteAnnouncement(doc.id));
        await Promise.all(deletePromises);
      },
      () => {
        LocalStore.set("announcements", {});
        LocalStore.set("notifications", {});
      }
    );
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "notifications"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification));
      },
      () => {
        const notifications = LocalStore.get("notifications", {});
        return (Object.values(notifications) as Notification[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    );
  }

  async deleteNotification(id: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "notifications", id));
      },
      () => {
        const notifications = LocalStore.get("notifications", {});
        delete notifications[id];
        LocalStore.set("notifications", notifications);
      }
    );
  }

  // --- Events ---
  async getEvents(): Promise<AppEvent[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "events"), orderBy("date", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent));
      },
      () => {
        const events = LocalStore.get("events", defaultEvents);
        return (Object.values(events) as AppEvent[]).sort((a, b) => a.date.localeCompare(b.date));
      }
    );
  }
  async addEvent(e: AppEvent): Promise<void> {
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "events", e.id), e);
      },
      () => {
        const events = LocalStore.get("events", defaultEvents);
        events[e.id] = e;
        LocalStore.set("events", events);
      }
    );
  }
  async deleteEvent(id: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "events", id));
      },
      () => {
        const events = LocalStore.get("events", defaultEvents);
        delete events[id];
        LocalStore.set("events", events);
      }
    );
  }

  // --- Projects ---
  async getProjects(clubId?: string): Promise<Project[]> {
    return tryCall(
      async () => {
        let q;
        if (clubId) {
          q = query(collection(firestore, "projects"), where("clubId", "==", clubId));
        } else {
          q = query(collection(firestore, "projects"));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        const list = Object.values(projects) as Project[];
        return clubId ? list.filter(p => p.clubId === clubId) : list;
      }
    );
  }
  async addProject(p: Project): Promise<void> {
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "projects", p.id), p);
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        projects[p.id] = p;
        LocalStore.set("projects", projects);
      }
    );
  }
  
  async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
    return tryCall(
      async () => {
        const ref = doc(firestore, "projects", projectId);
        await updateDoc(ref, data);
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        if (projects[projectId]) {
          projects[projectId] = { ...projects[projectId], ...data };
          LocalStore.set("projects", projects);
        }
      }
    );
  }

  async deleteProject(id: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "projects", id));
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        delete projects[id];
        LocalStore.set("projects", projects);
      }
    );
  }
  
  // --- Bug Reports ---
  async addBugReport(b: BugReport): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "bugs"), b);
      },
      () => {
        const bugs = LocalStore.get("bugs", {});
        const id = `bug-${Math.random().toString(36).substr(2, 9)}`;
        bugs[id] = { id, ...b };
        LocalStore.set("bugs", bugs);
      }
    );
  }

  async getBugReports(): Promise<BugReport[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "bugs"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BugReport));
      },
      () => {
        const bugs = LocalStore.get("bugs", {});
        return (Object.values(bugs) as BugReport[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }
    );
  }

  // --- Dev Chat ---
  subscribeToDevChat(callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "dev_chat"), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          callback(messages);
        });
      } catch (e) {
        console.warn("Dev chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      callback(LocalStore.get("dev_chat", []));
    }, 1000);
    callback(LocalStore.get("dev_chat", []));
    return () => clearInterval(interval);
  }

  async sendDevMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "dev_chat"), message);
      },
      () => {
        const list = LocalStore.get("dev_chat", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("dev_chat", list);
      }
    );
  }

  // --- Event Planning Chat ---
  subscribeToEventPlanningChat(callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "event_planning_chat"), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          callback(messages);
        });
      } catch (e) {
        console.warn("Event planning chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      callback(LocalStore.get("event_planning_chat", []));
    }, 1000);
    callback(LocalStore.get("event_planning_chat", []));
    return () => clearInterval(interval);
  }

  async sendEventPlanningMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "event_planning_chat"), message);
      },
      () => {
        const list = LocalStore.get("event_planning_chat", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("event_planning_chat", list);
      }
    );
  }

  // --- General Chat ---
  subscribeToGeneralChat(callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "general_chat"), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          callback(messages);
        });
      } catch (e) {
        console.warn("General chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      callback(LocalStore.get("general_chat", []));
    }, 1000);
    callback(LocalStore.get("general_chat", []));
    return () => clearInterval(interval);
  }

  async sendGeneralMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "general_chat"), message);
      },
      () => {
        const list = LocalStore.get("general_chat", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("general_chat", list);
      }
    );
  }

  // --- Club Chat ---
  subscribeToClubChat(clubId: string, callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "club_chats"), where("clubId", "==", clubId));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          callback(messages);
        });
      } catch (e) {
        console.warn("Club chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      const all = LocalStore.get("club_chats", []);
      const filtered = all.filter((m: any) => m.clubId === clubId);
      filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(filtered);
    }, 1000);
    
    const all = LocalStore.get("club_chats", []);
    const filtered = all.filter((m: any) => m.clubId === clubId);
    filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(filtered);
    return () => clearInterval(interval);
  }

  async sendClubMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "club_chats"), message);
      },
      () => {
        const list = LocalStore.get("club_chats", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("club_chats", list);
      }
    );
  }

  // --- Credits ---
  async getCredits(): Promise<Credit[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "credits"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Credit));
      },
      () => {
        const credits = LocalStore.get("credits", defaultCredits);
        return (Object.values(credits) as Credit[]).sort((a, b) => b.date.localeCompare(a.date));
      }
    );
  }

  async addCredit(credit: Credit): Promise<void> {
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "credits", credit.id), credit);
      },
      () => {
        const credits = LocalStore.get("credits", defaultCredits);
        credits[credit.id] = credit;
        LocalStore.set("credits", credits);
      }
    );
  }

  async deleteCredit(id: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "credits", id));
      },
      () => {
        const credits = LocalStore.get("credits", defaultCredits);
        delete credits[id];
        LocalStore.set("credits", credits);
      }
    );
  }

  // --- Debug: Force Password Update (Firestore only for view) ---
  async forceUpdatePlainPassword(userId: string, newPass: string): Promise<void> {
    return tryCall(
      async () => {
        const ref = doc(firestore, "users", userId);
        await updateDoc(ref, { plainPassword: newPass });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          users[userId].plainPassword = newPass;
          LocalStore.set("users", users);
        }
      }
    );
  }
}

export const db = new FirebaseService();