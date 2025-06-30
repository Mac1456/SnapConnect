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
          ...session.user,
          id: session.user.id,
          uid: session.user.id,
          email: session.user.email,
          ...profile,
        };

        console.log('🟢 SupabaseAuthStore: Setting user data in checkAuthState:', userData);
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
            ...session.user,
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email,
            ...profile,
          };

          console.log('🟢 SupabaseAuthStore: Setting user data in onAuthStateChange:', userData);
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
    console.log('🟢 SupabaseAuthStore: signIn called for:', email);
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        console.error('🟢 SupabaseAuthStore: signIn error:', error);
        
        // Provide more helpful error messages
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }
        
        set({ error: errorMessage, loading: false });
        return { success: false, error: errorMessage };
      }

      console.log('🟢 SupabaseAuthStore: signIn successful for user:', data.user.id);
      
      // Check if user profile exists, create if missing
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('🟢 SupabaseAuthStore: Creating missing profile for existing user');
          
          const username = data.user.email.split('@')[0];
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              username: username,
              display_name: username,
              created_at: new Date().toISOString(),
            });

          if (createError) {
            console.error('🟢 SupabaseAuthStore: Error creating profile:', createError);
            // Don't fail the login if profile creation fails
          } else {
            console.log('🟢 SupabaseAuthStore: Profile created for existing user');
          }
        } else if (profileError) {
          console.error('🟢 SupabaseAuthStore: Error fetching profile:', profileError);
        }
      }
      
      // Auth state change will be handled by the listener
      set({ loading: false });
      return { success: true };
      
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: signIn error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };
    }
  },

  // Complete onboarding
  completeOnboarding: async () => {
    console.log('🟢 SupabaseAuthStore: completeOnboarding called');
    const { user } = get();
    if (!user) return;

    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      });

      if (error) {
        console.error('🟢 SupabaseAuthStore: completeOnboarding error:', error);
        set({ error: error.message, loading: false });
        return;
      }

      if (data.user) {
        const updatedUser = { ...get().user, ...data.user };
        console.log('🟢 SupabaseAuthStore: Onboarding completed, updated user:', updatedUser);
        set({ user: updatedUser, loading: false });
      }
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: completeOnboarding error:', error);
      set({ error: 'An unexpected error occurred during onboarding.', loading: false });
    }
  },

  // Sign up user
  signUp: async (email, password, username) => {
    console.log('🟢 SupabaseAuthStore: signUp called for:', email, 'username:', username);
    try {
      set({ loading: true, error: null });
      
      // Check if username is already taken (ignore PGRST116 error which means no rows found)
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('🟢 SupabaseAuthStore: Error checking username:', checkError);
        // Continue with signup even if check fails
      }

      if (existingUser) {
        set({ error: 'Username is already taken. Please choose a different one.', loading: false });
        return;
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            display_name: username,
            onboarding_completed: false,
          }
        }
      });

      if (error) {
        console.error('🟢 SupabaseAuthStore: signUp error:', error);
        if (error.message.includes('User already registered')) {
          set({ error: 'This email is already registered. Please sign in instead.', loading: false });
        } else {
          set({ error: error.message, loading: false });
        }
        return;
      }

      if (data.user) {
        console.log('🟢 SupabaseAuthStore: User account created:', data.user.id);
        
        // Wait a moment for the auth session to be fully established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create user profile using secure function
        const { data: profileData, error: profileError } = await supabase
          .rpc('create_user_profile', {
            user_id: data.user.id,
            user_email: email,
            user_username: username,
            user_display_name: username  // Use username as display_name
          });

        if (profileError) {
          console.error('🟢 SupabaseAuthStore: Profile creation error:', profileError);
          set({ 
            error: profileError.message || 'Failed to create user profile',
            loading: false 
          });
          return;
        }

        console.log('🟢 SupabaseAuthStore: User profile created successfully');
        
        const finalUserData = {
          ...data.user,
          id: data.user.id,
          uid: data.user.id,
          email: data.user.email,
          username: username,
          display_name: username,
          profile_picture: null
        };

        // Update the user object with profile data
        console.log('🟢 SupabaseAuthStore: Setting final user data after signUp:', finalUserData);
        set({ 
          user: finalUserData,
          loading: false 
        });
      }
      
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: signUp error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };
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
          
          const fileName = `profiles/${user.uid || user.id}/${Date.now()}.jpg`;
          
          // Convert file URI to blob for upload
          const response = await fetch(userData.profileImage);
          const blob = await response.blob();
          
          console.log('🟢 SupabaseAuthStore: Profile image blob created, size:', blob.size);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('🟢 SupabaseAuthStore: Profile image upload error:', uploadError);
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

      const { error } = await supabase
        .from('users')
        .update({
          display_name: userData.displayName,
          bio: userData.bio,
          profile_picture: profileImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.uid || user.id);

      if (error) {
        console.error('🟢 SupabaseAuthStore: updateProfile error:', error);
        set({ error: error.message });
        return { success: false, error: error.message };
      }

      // Update local state with the new data
      const updatedUser = { 
        ...user, 
        display_name: userData.displayName,
        displayName: userData.displayName, // Keep both for compatibility
        bio: userData.bio,
        profile_picture: profileImageUrl,
        profilePicture: profileImageUrl, // Keep both for compatibility
      };
      
      set({ user: updatedUser });
      
      console.log('🟢 SupabaseAuthStore: Profile updated successfully');
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: updateProfile error:', error);
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 