import { create } from 'zustand';
import { supabase } from '../../supabase.config';

console.log('🟢 SupabaseAuthStore: Initializing auth store...');

export const useSupabaseAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  // Check authentication state
  checkAuthState: async () => {
    console.log('🟢 SupabaseAuthStore: checkAuthState called');
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('🟢 SupabaseAuthStore: Error getting session:', error);
        set({ user: null, loading: false, error: error.message });
        return;
      }

      if (session?.user) {
        console.log('🟢 SupabaseAuthStore: Found existing session for:', session.user.email);
        // Get user profile data
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('🟢 SupabaseAuthStore: Error fetching profile:', profileError);
        }

        const userData = {
          uid: session.user.id,
          email: session.user.email,
          ...profile,
        };

        set({ user: userData, loading: false, error: null });
      } else {
        console.log('🟢 SupabaseAuthStore: No active session');
        set({ user: null, loading: false, error: null });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🟢 SupabaseAuthStore: Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Get user profile data
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('🟢 SupabaseAuthStore: Error fetching profile:', profileError);
          }

          const userData = {
            uid: session.user.id,
            email: session.user.email,
            ...profile,
          };

          set({ user: userData, loading: false, error: null });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, loading: false, error: null });
        }
      });

    } catch (error) {
      console.error('🟢 SupabaseAuthStore: Error in checkAuthState:', error);
      set({ user: null, loading: false, error: error.message });
    }
  },

  // Sign in user
  signIn: async (email, password) => {
    try {
      console.log('🟢 SupabaseAuthStore: signIn called for:', email);
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (__DEV__) {
          console.error('🟢 SupabaseAuthStore: signIn error:', error.message);
        }
        set({ error: error.message, loading: false });
        return null;
      }

      console.log('🟢 SupabaseAuthStore: signIn successful:', data.user?.id);
      set({ loading: false });
      return data.user;
    } catch (error) {
      if (__DEV__) {
        console.error('🟢 SupabaseAuthStore: signIn catch error:', error.message);
      }
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Sign up user
  signUp: async (email, password, username, displayName) => {
    try {
      console.log('🟢 SupabaseAuthStore: signUp called for:', email, 'with username:', username);
      set({ loading: true, error: null });

      // First, check if username exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        set({ error: 'Username already exists', loading: false });
        return null;
      }

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (error) {
        console.error('🟢 SupabaseAuthStore: signUp error:', error);
        set({ error: error.message, loading: false });
        return null;
      }

      if (data.user) {
        console.log('🟢 SupabaseAuthStore: Auth user created:', data.user.id);
        
        // Create user profile
        const profileData = {
          id: data.user.id,
          email: email.trim(),
          username: username.toLowerCase(),
          display_name: displayName || username,
          profile_picture: null,
          bio: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase
          .from('users')
          .insert(profileData);

        if (profileError) {
          console.error('🟢 SupabaseAuthStore: Profile creation error:', profileError);
          set({ error: 'Failed to create user profile', loading: false });
          return null;
        }

        console.log('🟢 SupabaseAuthStore: User account created:', data.user.id);
        set({ loading: false });
        return data.user;
      }

      set({ loading: false });
      return null;
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: signUp error:', error);
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Sign out user
  signOut: async () => {
    console.log('🟢 SupabaseAuthStore: signOut called');
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('🟢 SupabaseAuthStore: signOut error:', error);
        set({ error: error.message });
        return;
      }

      console.log('🟢 SupabaseAuthStore: signOut successful');
      set({ user: null, error: null });
      
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: signOut error:', error);
      set({ error: error.message });
    }
  },

  // Complete onboarding
  completeOnboarding: async () => {
    try {
      const { user } = get();
      console.log('🟢 SupabaseAuthStore: Marking onboarding as completed for user:', user?.uid);
      
      if (!user?.uid) {
        console.error('🟢 SupabaseAuthStore: No user found for onboarding completion');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user.uid);

      if (error) {
        console.error('🟢 SupabaseAuthStore: Error updating onboarding status:', error);
        throw error;
      }

      // Update local state
      set((state) => ({
        user: {
          ...state.user,
          onboarding_completed: true
        }
      }));

      console.log('🟢 SupabaseAuthStore: Onboarding marked as completed');
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: completeOnboarding error:', error);
      set({ error: error.message });
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const { user } = get();
      if (!user) {
        console.error('🟢 SupabaseAuthStore: No authenticated user for profile update');
        set({ error: 'User not authenticated' });
        return { success: false, error: 'User not authenticated' };
      }

      console.log('🟢 SupabaseAuthStore: Updating profile with data:', userData);

      let profileImageUrl = userData.profileImage;

      // If profileImage is a local URI, upload it to Supabase storage
      if (userData.profileImage && userData.profileImage.startsWith('file://')) {
        try {
          console.log('🟢 SupabaseAuthStore: Uploading profile image to storage');
          console.log('🟢 SupabaseAuthStore: Original file URI:', userData.profileImage);
          
          const fileName = `profiles/${user.uid || user.id}/${Date.now()}.jpg`;
          console.log('🟢 SupabaseAuthStore: Target file name:', fileName);
          
          // Read file as base64 for React Native
          const response = await fetch(userData.profileImage);
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          console.log('🟢 SupabaseAuthStore: File converted to Uint8Array, size:', uint8Array.length);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, uint8Array, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('🟢 SupabaseAuthStore: Profile image upload error:', uploadError);
            console.error('🟢 SupabaseAuthStore: Upload error details:', JSON.stringify(uploadError, null, 2));
            throw uploadError;
          }

          console.log('🟢 SupabaseAuthStore: Profile image upload successful:', uploadData);

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(fileName);

          profileImageUrl = publicUrl;
          console.log('🟢 SupabaseAuthStore: Profile image public URL:', profileImageUrl);
        } catch (uploadError) {
          console.error('🟢 SupabaseAuthStore: Failed to upload profile image:', uploadError);
          return { success: false, error: 'Failed to upload profile image' };
        }
      }

      const updateData = {
        display_name: userData.displayName,
        bio: userData.bio,
        updated_at: new Date().toISOString(),
      };

      // Only update profile_picture if we have a new one
      if (profileImageUrl) {
        updateData.profile_picture = profileImageUrl;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.uid || user.id);

      if (error) {
        console.error('🟢 SupabaseAuthStore: updateProfile error:', error);
        set({ error: error.message });
        return { success: false, error: error.message };
      }

      // Fetch the updated user data from the database to ensure we have the latest
      const { data: updatedUserData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.uid || user.id)
        .single();

      if (fetchError) {
        console.error('🟢 SupabaseAuthStore: Error fetching updated user data:', fetchError);
        // Still update local state with what we have
        const updatedUser = { 
          ...user, 
          display_name: userData.displayName,
          displayName: userData.displayName, // Keep both for compatibility
          bio: userData.bio,
          profile_picture: profileImageUrl || user.profile_picture,
          profilePicture: profileImageUrl || user.profilePicture, // Keep both for compatibility
        };
        
        set({ user: updatedUser });
        return { success: true, user: updatedUser };
      }

      // Update local state with fresh data from database
      const updatedUser = { 
        ...user, 
        ...updatedUserData,
        uid: user.uid || user.id, // Preserve uid field
        displayName: updatedUserData.display_name, // Keep both for compatibility
        profilePicture: updatedUserData.profile_picture, // Keep both for compatibility
      };
      
      set({ user: updatedUser });
      
      console.log('🟢 SupabaseAuthStore: Profile updated successfully with fresh data');
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: updateProfile error:', error);
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Initialize auth listener
  initialize: () => {
    console.log('🟢 SupabaseAuthStore: Initializing auth listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🟢 SupabaseAuthStore: Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🟢 SupabaseAuthStore: User signed in:', session.user.id);
        
        try {
          // Fetch user profile from database
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            if (__DEV__) {
              console.error('🟢 SupabaseAuthStore: Error fetching profile:', error.message);
            }
            // Set basic user data from auth session
            set({
              user: {
                uid: session.user.id,
                id: session.user.id,
                email: session.user.email,
                username: session.user.email?.split('@')[0] || 'user',
                display_name: session.user.email?.split('@')[0] || 'user',
                profile_picture: null
              },
              loading: false,
              isAuthenticated: true
            });
          } else {
            console.log('🟢 SupabaseAuthStore: Profile fetched successfully:', profile);
            // Set user data with profile
            set({
              user: {
                uid: profile.id,
                id: profile.id,
                email: profile.email,
                username: profile.username,
                display_name: profile.display_name,
                profile_picture: profile.profile_picture,
                bio: profile.bio,
                onboarding_completed: profile.onboarding_completed
              },
              loading: false,
              isAuthenticated: true
            });
          }
        } catch (error) {
          if (__DEV__) {
            console.error('🟢 SupabaseAuthStore: Error in auth state change:', error.message);
          }
          set({
            user: {
              uid: session.user.id,
              id: session.user.id,
              email: session.user.email,
              username: session.user.email?.split('@')[0] || 'user',
              display_name: session.user.email?.split('@')[0] || 'user',
              profile_picture: null
            },
            loading: false,
            isAuthenticated: true
          });
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🟢 SupabaseAuthStore: User signed out');
        set({
          user: null,
          loading: false,
          isAuthenticated: false,
          error: null
        });
      } else {
        console.log('🟢 SupabaseAuthStore: Auth event:', event);
        set({ loading: false });
      }
    });

    return subscription;
  }
})); 