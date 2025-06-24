import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase.config';

export const useSnapStore = create((set, get) => ({
  snaps: [],
  chats: [],
  stories: [],
  loading: false,
  error: null,

  // Send a snap
  sendSnap: async (recipientId, mediaUri, mediaType, caption = '', timer = 3) => {
    try {
      set({ loading: true, error: null });
      const { user } = get();
      
      // Upload media to Firebase Storage
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      const fileName = `snaps/${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Create snap document
      const snapData = {
        senderId: user.uid,
        senderUsername: user.username,
        recipientId,
        mediaUrl: downloadURL,
        mediaType,
        caption,
        timer,
        createdAt: serverTimestamp(),
        opened: false,
        openedAt: null
      };

      await addDoc(collection(db, 'snaps'), snapData);
      set({ loading: false });
      
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Send story
  sendStory: async (mediaUri, mediaType, caption = '') => {
    try {
      set({ loading: true, error: null });
      const { user } = get();
      
      // Upload media to Firebase Storage
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      const fileName = `stories/${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Create story document
      const storyData = {
        userId: user.uid,
        username: user.username,
        displayName: user.displayName,
        mediaUrl: downloadURL,
        mediaType,
        caption,
        createdAt: serverTimestamp(),
        views: [],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      await addDoc(collection(db, 'stories'), storyData);
      set({ loading: false });
      
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Listen to received snaps
  listenToSnaps: (userId) => {
    const q = query(
      collection(db, 'snaps'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const snaps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ snaps });
    });
  },

  // Listen to stories from friends
  listenToStories: (friendIds) => {
    if (friendIds.length === 0) {
      set({ stories: [] });
      return () => {};
    }

    const q = query(
      collection(db, 'stories'),
      where('userId', 'in', friendIds),
      where('expiresAt', '>', new Date()),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const stories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ stories });
    });
  },

  // Mark snap as opened
  markSnapOpened: async (snapId) => {
    try {
      await updateDoc(doc(db, 'snaps', snapId), {
        opened: true,
        openedAt: serverTimestamp()
      });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // View story
  viewStory: async (storyId, userId) => {
    try {
      await updateDoc(doc(db, 'stories', storyId), {
        views: arrayUnion(userId)
      });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 