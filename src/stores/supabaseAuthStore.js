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
        
        // Update the user object with profile data
        set({ 
          user: {
            uid: data.user.id,
            email: data.user.email,
            username: username,
            displayName: username,  // Set displayName to username
            display_name: username, // Also set snake_case version
            profilePicture: null,
            profile_picture: null
          },
          loading: false 
        });
      }
      
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: signUp error:', error);
      set({ error: error.message, loading: false });
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

  // Mark onboarding as completed
  completeOnboarding: async () => {
    try {
      const { user } = get();
      if (!user) {
        console.error('🟢 SupabaseAuthStore: No authenticated user for onboarding completion');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('🟢 SupabaseAuthStore: Marking onboarding as completed for user:', user.id);

      const { data, error } = await supabase
        .from('users')
        .update({ 
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('🟢 SupabaseAuthStore: Error updating onboarding status:', error);
        return { success: false, error: error.message };
      }

      // Update local user state
      set({ 
        user: { 
          ...user, 
          onboarding_completed: true 
        } 
      });

      console.log('🟢 SupabaseAuthStore: Onboarding completed successfully');
      return { success: true };
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: Complete onboarding error:', error);
      return { success: false, error: error.message };
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
  clearError: () => set({ error: null })
})); 