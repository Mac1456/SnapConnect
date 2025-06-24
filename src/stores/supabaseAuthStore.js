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
        email,
        password,
      });

      if (error) {
        console.error('🟢 SupabaseAuthStore: signIn error:', error);
        set({ error: error.message, loading: false });
        return;
      }

      console.log('🟢 SupabaseAuthStore: signIn successful');
      
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
          const { error: createError } = await supabase.rpc('create_user_profile', {
            user_id: data.user.id,
            username: data.user.email.split('@')[0], // Use email prefix as username
            display_name: data.user.email.split('@')[0],
            email: data.user.email,
          });

          if (createError) {
            console.error('🟢 SupabaseAuthStore: Error creating profile:', createError);
          } else {
            console.log('🟢 SupabaseAuthStore: Profile created for existing user');
          }
        }
      }
      
      // Auth state change will be handled by the listener
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: signIn error:', error);
      set({ error: error.message, loading: false });
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

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const { user } = get();
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            display_name: userData.displayName,
            bio: userData.bio,
            profile_picture: userData.profileImage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.uid);

        if (error) {
          console.error('🟢 SupabaseAuthStore: updateProfile error:', error);
          set({ error: error.message });
          return;
        }

        // Update local state
        set({ 
          user: { 
            ...user, 
            display_name: userData.displayName,
            bio: userData.bio,
            profile_picture: userData.profileImage,
          } 
        });
        
        console.log('🟢 SupabaseAuthStore: Profile updated successfully');
      }
    } catch (error) {
      console.error('🟢 SupabaseAuthStore: updateProfile error:', error);
      set({ error: error.message });
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 