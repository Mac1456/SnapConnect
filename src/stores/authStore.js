import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDB } from '../../firebase.config';

console.log('🔐 AuthStore: Initializing auth store...');

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  // Check authentication state
  checkAuthState: async () => {
    console.log('🔐 AuthStore: checkAuthState called');
    console.log('🔐 AuthStore: Setting up auth state listener...');
    
    try {
      const auth = await getFirebaseAuth();
      const db = await getFirebaseDB();
      
      return onAuthStateChanged(auth, async (user) => {
      console.log('🔐 AuthStore: Auth state changed:', user ? `User: ${user.email}` : 'No user');
      
      if (user) {
        try {
          console.log('🔐 AuthStore: Getting user data from Firestore...');
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          console.log('🔐 AuthStore: User data retrieved:', userData);
          
          const fullUserData = { 
            uid: user.uid, 
            email: user.email, 
            ...userData 
          };
          
          console.log('🔐 AuthStore: Setting user state:', fullUserData);
          set({ 
            user: fullUserData, 
            loading: false,
            error: null
          });
        } catch (error) {
          console.error('🔐 AuthStore: Error getting user data:', error);
          set({ 
            user: { uid: user.uid, email: user.email }, 
            loading: false,
            error: error.message
          });
        }
      } else {
        console.log('🔐 AuthStore: No user, setting state to null');
        set({ user: null, loading: false, error: null });
      }
    });
    } catch (error) {
      console.error('🔐 AuthStore: Error setting up auth listener:', error);
      set({ loading: false, error: error.message });
    }
  },

  // Sign in user
  signIn: async (email, password) => {
    console.log('🔐 AuthStore: signIn called for:', email);
    try {
      set({ loading: true, error: null });
      console.log('🔐 AuthStore: Attempting Firebase signIn...');
      const auth = await getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      console.log('🔐 AuthStore: signIn successful');
    } catch (error) {
      console.error('🔐 AuthStore: signIn error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Sign up user
  signUp: async (email, password, username) => {
    console.log('🔐 AuthStore: signUp called for:', email, 'username:', username);
    try {
      set({ loading: true, error: null });
      console.log('🔐 AuthStore: Creating user account...');
      const auth = await getFirebaseAuth();
      const db = await getFirebaseDB();
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('🔐 AuthStore: User account created:', user.uid);
      
      // Update the user's profile
      await updateProfile(user, {
        displayName: username,
      });

      const userData = {
        username: username,
        displayName: username,
        email: email,
        createdAt: serverTimestamp(),
        friends: [],
        snapchatScore: 0,
        profilePicture: null,
        bio: ''
      };
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('🔐 AuthStore: User document created successfully');
      
    } catch (error) {
      console.error('🔐 AuthStore: signUp error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Sign out user
  signOut: async () => {
    console.log('🔐 AuthStore: signOut called');
    try {
      const auth = await getFirebaseAuth();
      await firebaseSignOut(auth);
      console.log('🔐 AuthStore: signOut successful');
      set({ user: null });
    } catch (error) {
      console.error('🔐 AuthStore: signOut error:', error);
      set({ error: error.message });
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const { user } = get();
      if (user) {
        const db = await getFirebaseDB();
        await updateDoc(doc(db, 'users', user.uid), userData);
        set({ user: { ...user, ...userData } });
      }
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 