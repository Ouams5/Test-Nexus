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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Use Real Firestore
export const firestore = getFirestore(app);
// Use Real Auth
export const auth = getAuth(app);

// Wrapper functions to match AuthContext expectations
export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string, remember: boolean = false) => {
    await setPersistence(authInstance, remember ? browserLocalPersistence : browserSessionPersistence);
    return await firebaseSignIn(authInstance, email, pass);
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    return await firebaseCreateUser(authInstance, email, pass);
};

export const signOut = async (authInstance: any) => {
    return await firebaseSignOut(authInstance);
};

export const sendEmailVerification = async (user: any) => {
    return await firebaseSendEmailVerification(user);
};

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
    return firebaseOnAuthStateChanged(authInstance, callback);
};

export const updateUserPassword = async (user: any, newPassword: string) => {
    await firebaseUpdatePassword(user, newPassword);
    // Also update the plain password in Firestore for the debug panel
    try {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { plainPassword: newPassword });
    } catch (e) {
        console.warn("Failed to sync plain password", e);
    }
};

export const adminSendPasswordReset = async (email: string) => {
    return await firebaseSendPasswordResetEmail(auth, email);
};

// Helper to sanitize user data (migration)
const sanitizeUser = (data: any): User => {
    let role = data.role;

    // Migrate old TEACHER role to MEMBER if it still exists in DB
    if (role === 'TEACHER') {
        role = UserRole.MEMBER;
    }

    // Robust migration for badges
    let finalBadges: Badge[] = [];
    
    // Prefer the new 'badges' array
    if (data.badges && Array.isArray(data.badges)) {
        finalBadges = data.badges;
    } 
    // Fallback to migrating old 'clubBadges' if 'badges' is empty/missing
    else if (data.clubBadges && Array.isArray(data.clubBadges)) {
        finalBadges = data.clubBadges.map((b: any) => ({
             id: b.clubId ? `legacy-${b.clubId}` : `legacy-${Math.random()}`,
             type: 'CUSTOM', // Assign default type for legacy badges
             name: b.badgeName || b.name || 'Legacy Badge',
             imageUrl: b.badgeImageUrl || b.imageUrl || '',
             description: b.badgeDescription || b.description || '',
             assignedAt: b.claimedAt || b.assignedAt || new Date().toISOString(),
             clubId: b.clubId
        }));
    }

    // Defensive: Ensure every badge has a type property
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
    try {
      const docRef = doc(firestore, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return sanitizeUser(docSnap.data());
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching user:", error);
      if (error.code === 'permission-denied') {
          // If permission denied, it might be due to rules or auth state.
          // We rethrow so the caller knows something is wrong.
          throw error;
      }
      return null;
    }
  }

  async syncUser(userId: string): Promise<boolean> {
      try {
          const user = await this.getUser(userId);
          if (user) {
              // Write back the sanitized (migrated) user data to Firestore
              // This ensures new fields like 'badges' are persisted if they were generated during read
              await setDoc(doc(firestore, "users", userId), user);
              return true;
          }
          return false;
      } catch (e) {
          console.error("Sync user failed", e);
          return false;
      }
  }

  async getUserByEmail(email: string): Promise<User | null> {
      try {
        const q = query(collection(firestore, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return sanitizeUser(snapshot.docs[0].data());
        }
        return null;
      } catch (error: any) {
        console.error("Error fetching user by email:", error);
        if (error.code === 'permission-denied') {
            throw error;
        }
        return null;
      }
  }

  async createUserProfile(user: User): Promise<void> {
    await setDoc(doc(firestore, "users", user.id), user);
  }

  async getAllUsers(): Promise<User[]> {
    try {
        const q = query(collection(firestore, "users"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => sanitizeUser({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error getting all users:", error);
        return [];
    }
  }
  
  async updateUserRole(adminId: string, targetUserId: string, newRole: UserRole): Promise<boolean> {
    const userRef = doc(firestore, "users", targetUserId);
    await updateDoc(userRef, { role: newRole });
    return true;
  }

  async updateUserIp(userId: string, ip: string): Promise<void> {
    const userRef = doc(firestore, "users", userId);
    try {
        await updateDoc(userRef, { 
            ip: ip,
            lastLogin: new Date().toISOString()
        });
    } catch (error: any) {
        // If the document doesn't exist (e.g. failed registration), we skip IP update
        // instead of crashing the login flow.
        if (error.code === 'not-found') {
            console.warn(`User document ${userId} missing. Skipping IP update.`);
            return;
        }
        throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(firestore, "users", userId));
  }

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    const batch = writeBatch(firestore);
    userIds.forEach(id => {
        const docRef = doc(firestore, "users", id);
        batch.delete(docRef);
    });
    await batch.commit();
  }

  async bulkUpdateUserRole(userIds: string[], newRole: UserRole): Promise<void> {
    const batch = writeBatch(firestore);
    userIds.forEach(id => {
        const docRef = doc(firestore, "users", id);
        batch.update(docRef, { role: newRole });
    });
    await batch.commit();
  }

  async checkIsFirstUser(): Promise<boolean> {
    // Optimization: Limit to 1 document to check existence without fetching all users
    try {
        const snapshot = await getDocs(query(collection(firestore, "users"), limit(1)));
        return snapshot.empty;
    } catch (error) {
        // If permission denied, likely rules issue or stale auth. 
        // We throw so register can catch or UI can react.
        console.error("CheckFirstUser failed:", error);
        throw error;
    }
  }

  async bulkCreateUsers(users: {email: string, password: string, name: string, grade: string}[]): Promise<{success: number, errors: any[]}> {
      // We use a secondary app instance to create users without logging out the current admin
      let secondaryApp;
      const appName = "SecondaryUserCreator";
      
      try {
          // Check if app named 'SecondaryUserCreator' exists, if so use it, else create
          const existing = getApps().find(a => a.name === appName);
          if (existing) {
              secondaryApp = existing;
          } else {
              secondaryApp = initializeApp(firebaseConfig, appName);
          }
      } catch(e) {
          // Fallback if something goes wrong with named apps
          secondaryApp = initializeApp(firebaseConfig, "SecondaryUserCreator" + Date.now());
      }

      const secondaryAuth = getAuth(secondaryApp);
      const results = { success: 0, errors: [] as any[] };

      for (const u of users) {
          try {
              // 1. Create in Auth (this will trigger email verification if configured, but we skip that for bulk)
              const cred = await firebaseCreateUser(secondaryAuth, u.email, u.password);
              
              // 2. Create Profile in Main Firestore (using the primary app's connection)
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
                  plainPassword: u.password, // Storing for debug/admin view
                  badges: []
              };
              
              await this.createUserProfile(newUser);
              results.success++;
          } catch (e: any) {
              console.error(`Failed to create ${u.email}`, e);
              results.errors.push({ email: u.email, error: e.code });
          }
      }
      
      // Cleanup: Delete the secondary app instance to free resources
      try { await deleteApp(secondaryApp); } catch(e) { console.warn("Failed to delete secondary app", e); }
      
      return results;
  }

  // --- Badges ---
  async addBadgeToUser(userId: string, badge: Badge): Promise<void> {
      const userRef = doc(firestore, "users", userId);
      await updateDoc(userRef, {
          badges: arrayUnion(badge)
      });
  }

  async removeBadgeFromUser(userId: string, badge: Badge): Promise<void> {
      const userRef = doc(firestore, "users", userId);
      await updateDoc(userRef, {
          badges: arrayRemove(badge)
      });
  }

  // --- Clubs ---
  async getClubs(): Promise<Club[]> {
    try {
        const snapshot = await getDocs(collection(firestore, "clubs"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
    } catch (error) {
        console.error("Error getting clubs", error);
        return [];
    }
  }

  async getClub(clubId: string): Promise<Club | null> {
      try {
        const docRef = doc(firestore, "clubs", clubId);
        const s = await getDoc(docRef);
        return s.exists() ? ({ id: s.id, ...s.data() } as Club) : null;
      } catch (error) {
        console.error("Error getting club:", error);
        return null;
      }
  }
  
  async createClubWithLeader(clubData: Omit<Club, 'id'>, leaderEmail: string): Promise<boolean> {
      try {
        // 1. Find User
        const leader = await this.getUserByEmail(leaderEmail);
        if (!leader) return false;

        // 2. Create Club
        const clubRef = await addDoc(collection(firestore, "clubs"), {
            ...clubData,
            leaderId: leader.id,
            memberIds: [leader.id] // Leader is automatically a member
        });

        // 3. Update User Role
        await updateDoc(doc(firestore, "users", leader.id), {
            role: UserRole.CLUB_LEADER,
            leadingClubId: clubRef.id,
            joinedClubIds: arrayUnion(clubRef.id)
        });

        // Note: Leader badge claiming is now done manually or via separate logic, not auto-claimed here to allow customization.
        
        return true;
      } catch (error) {
        console.error("Error creating club with leader:", error);
        return false;
      }
  }

  async deleteClub(clubId: string): Promise<void> {
    await deleteDoc(doc(firestore, "clubs", clubId));
  }

  async joinClub(userId: string, clubId: string): Promise<void> {
    const userRef = doc(firestore, "users", userId);
    const clubRef = doc(firestore, "clubs", clubId);

    await updateDoc(userRef, {
      joinedClubIds: arrayUnion(clubId)
    });
    await updateDoc(clubRef, {
      memberIds: arrayUnion(userId)
    });
  }

  async leaveClub(userId: string, clubId: string): Promise<void> {
    const userRef = doc(firestore, "users", userId);
    const clubRef = doc(firestore, "clubs", clubId);

    try {
        await updateDoc(userRef, {
            joinedClubIds: arrayRemove(clubId)
        });
    } catch (e: any) {
         if (e.code !== 'not-found') throw e;
         console.warn("User doc not found during leaveClub cleanup");
    }

    await updateDoc(clubRef, {
        memberIds: arrayRemove(userId)
    });
  }

  async kickMember(leaderId: string, clubId: string, memberId: string): Promise<boolean> {
    // In real app, verify leaderId via security rules or check here
    await this.leaveClub(memberId, clubId);
    return true;
  }

  // --- Announcements ---
  async getAnnouncements(clubId?: string): Promise<Announcement[]> {
    try {
        let q;
        if (clubId) {
            q = query(collection(firestore, "announcements"), where("clubId", "==", clubId));
        } else {
            q = query(collection(firestore, "announcements"), orderBy("date", "desc"));
        }
        const snapshot = await getDocs(q);
        // Fix spread error by casting doc.data() to any
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Announcement));
        announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return announcements;
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return [];
    }
  }

  async addAnnouncement(a: Announcement): Promise<void> {
    await setDoc(doc(firestore, "announcements", a.id), a);
    
    // Create notification
    await addDoc(collection(firestore, "notifications"), {
      title: a.clubId ? "New Club Announcement" : "New Global Announcement",
      message: a.title,
      date: new Date().toISOString(),
      read: false,
      type: a.isImportant ? 'alert' : 'info',
      clubId: a.clubId || null, // Store clubId to filter notifications later
      announcementId: a.id // Store announcement ID to enable deletion later
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    // 1. Delete the announcement document
    await deleteDoc(doc(firestore, "announcements", id));

    // 2. Find and delete associated notifications
    try {
      const q = query(collection(firestore, "notifications"), where("announcementId", "==", id));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting associated notification:", error);
    }
  }

  async deleteAllAnnouncements(): Promise<void> {
    const snapshot = await getDocs(collection(firestore, "announcements"));
    // Use deleteAnnouncement to ensure notifications are also cleaned up
    const deletePromises = snapshot.docs.map(doc => this.deleteAnnouncement(doc.id));
    await Promise.all(deletePromises);
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
      const q = query(collection(firestore, "notifications"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      // Fix spread error by casting doc.data() to any
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification));
  }

  async deleteNotification(id: string): Promise<void> {
    await deleteDoc(doc(firestore, "notifications", id));
  }

  // --- Events ---
  async getEvents(): Promise<AppEvent[]> {
    const q = query(collection(firestore, "events"), orderBy("date", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent));
  }
  async addEvent(e: AppEvent): Promise<void> { 
      await setDoc(doc(firestore, "events", e.id), e); 
  }
  async deleteEvent(id: string): Promise<void> {
      await deleteDoc(doc(firestore, "events", id));
  }

  // --- Projects ---
  async getProjects(clubId?: string): Promise<Project[]> {
    try {
        let q;
        if (clubId) {
            q = query(collection(firestore, "projects"), where("clubId", "==", clubId));
        } else {
            q = query(collection(firestore, "projects"));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
  }
  async addProject(p: Project): Promise<void> { 
      await setDoc(doc(firestore, "projects", p.id), p); 
  }
  
  async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
      const ref = doc(firestore, "projects", projectId);
      await updateDoc(ref, data);
  }

  async deleteProject(id: string): Promise<void> {
      await deleteDoc(doc(firestore, "projects", id));
  }
  
  // --- Bug Reports ---
  async addBugReport(b: BugReport): Promise<void> { 
    await addDoc(collection(firestore, "bugs"), b);
  }

  async getBugReports(): Promise<BugReport[]> {
      const q = query(collection(firestore, "bugs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BugReport));
  }

  // --- Dev Chat ---
  subscribeToDevChat(callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(collection(firestore, "dev_chat"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
    });
  }

  async sendDevMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    await addDoc(collection(firestore, "dev_chat"), message);
  }

  // --- Event Planning Chat ---
  subscribeToEventPlanningChat(callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(collection(firestore, "event_planning_chat"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
    });
  }

  async sendEventPlanningMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    await addDoc(collection(firestore, "event_planning_chat"), message);
  }

  // --- General Chat ---
  subscribeToGeneralChat(callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(collection(firestore, "general_chat"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
    });
  }

  async sendGeneralMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    await addDoc(collection(firestore, "general_chat"), message);
  }

  // --- Club Chat ---
  subscribeToClubChat(clubId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(
        collection(firestore, "club_chats"), 
        where("clubId", "==", clubId)
    );
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(messages);
    });
  }

  async sendClubMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    await addDoc(collection(firestore, "club_chats"), message);
  }

  // --- Credits ---
  async getCredits(): Promise<Credit[]> {
      const q = query(collection(firestore, "credits"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Credit));
  }

  async addCredit(credit: Credit): Promise<void> {
      await setDoc(doc(firestore, "credits", credit.id), credit);
  }

  async deleteCredit(id: string): Promise<void> {
      await deleteDoc(doc(firestore, "credits", id));
  }

  // --- Debug: Force Password Update (Firestore only for view) ---
  async forceUpdatePlainPassword(userId: string, newPass: string): Promise<void> {
      const ref = doc(firestore, "users", userId);
      await updateDoc(ref, { plainPassword: newPass });
  }
}

export const db = new FirebaseService();