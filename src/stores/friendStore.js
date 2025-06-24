import { create } from 'zustand';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export const useFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: [],
  loading: false,
  error: null,

  // Search users by username
  searchUsers: async (searchTerm) => {
    try {
      set({ loading: true, error: null });
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchTerm),
        where('username', '<=', searchTerm + '\uf8ff')
      );
      
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      set({ loading: false });
      return users;
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Send friend request
  sendFriendRequest: async (targetUserId, currentUser) => {
    try {
      set({ loading: true, error: null });
      
      // Add to current user's sent requests
      await updateDoc(doc(db, 'users', currentUser.uid), {
        sentFriendRequests: arrayUnion(targetUserId)
      });

      // Add to target user's received requests
      await updateDoc(doc(db, 'users', targetUserId), {
        friendRequests: arrayUnion({
          userId: currentUser.uid,
          username: currentUser.username,
          displayName: currentUser.displayName,
          sentAt: new Date()
        })
      });

      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requesterId, currentUserId) => {
    try {
      set({ loading: true, error: null });
      
      // Add to both users' friends list
      await updateDoc(doc(db, 'users', currentUserId), {
        friends: arrayUnion(requesterId),
        friendRequests: arrayRemove(requesterId)
      });

      await updateDoc(doc(db, 'users', requesterId), {
        friends: arrayUnion(currentUserId),
        sentFriendRequests: arrayRemove(currentUserId)
      });

      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Reject friend request
  rejectFriendRequest: async (requesterId, currentUserId) => {
    try {
      set({ loading: true, error: null });
      
      await updateDoc(doc(db, 'users', currentUserId), {
        friendRequests: arrayRemove(requesterId)
      });

      await updateDoc(doc(db, 'users', requesterId), {
        sentFriendRequests: arrayRemove(currentUserId)
      });

      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Get friends list
  getFriends: async (friendIds) => {
    try {
      if (!friendIds || friendIds.length === 0) {
        set({ friends: [] });
        return;
      }

      const q = query(
        collection(db, 'users'),
        where('__name__', 'in', friendIds)
      );
      
      const snapshot = await getDocs(q);
      const friends = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      set({ friends });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Listen to friend requests
  listenToFriendRequests: (userId) => {
    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        set({ friendRequests: data.friendRequests || [] });
      }
    });
  },

  // Clear error
  clearError: () => set({ error: null })
})); 