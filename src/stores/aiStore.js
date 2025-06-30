import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';
import { useSupabaseFriendStore } from './supabaseFriendStore';

export const useAIStore = create((set, get) => ({
  activitySuggestions: [],
  groupDetailsSuggestions: { groupName: '', groupInterests: [] },
  groupMemberRecommendations: [],
  userInterests: [],
  loading: false,
  error: null,

  // Clear AI recommendations
  clearGroupRecommendations: () => {
    console.log('🤖 AIStore: Clearing group recommendations');
    set({ 
      groupDetailsSuggestions: { groupName: '', groupInterests: [] },
      groupMemberRecommendations: [],
      error: null 
    });
  },

  // Force refresh AI recommendations (clears cache and generates new ones)
  refreshGroupRecommendations: () => {
    console.log('🤖 AIStore: Force refreshing group recommendations');
    set({ 
      groupDetailsSuggestions: { groupName: '', groupInterests: [] },
      groupMemberRecommendations: [],
      error: null,
      loading: false
    });
  },

  // Generate AI activity suggestions using RAG
  generateActivitySuggestions: async (context = '', mood = 'fun', activityType = 'hangout', friendIds = []) => {
    try {
      console.log('🤖 AIStore: Generating activity suggestions with context:', { context, mood, activityType, friendIds });
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) {
        console.warn('🤖 AIStore: User not authenticated, using fallback activities');
        const fallbackActivities = get().getFallbackActivities(mood, activityType);
        set({ 
          activitySuggestions: fallbackActivities,
          loading: false,
          error: 'User not authenticated'
        });
        return fallbackActivities;
      }

      console.log('🤖 AIStore: Calling activity-generator Edge Function...');
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('activity-generator', {
        body: {
          userId,
          friendIds,
          context,
          mood,
          activityType
        }
      });

      if (error) {
        console.error('🤖 AIStore: Error from activity generator Edge Function:', error);
        console.error('🤖 AIStore: Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a function not found error
        if (error.message?.includes('Function not found') || error.message?.includes('404')) {
          console.warn('🤖 AIStore: Activity generator function not deployed, using fallback activities');
        } else if (error.message?.includes('OPENAI_API_KEY')) {
          console.warn('🤖 AIStore: OpenAI API key not configured, using fallback activities');
        }
        
        throw error;
      }

      if (!data || !data.activities || data.activities.length === 0) {
        console.warn('🤖 AIStore: No activities returned from Edge Function, using fallback');
        throw new Error('No activities generated');
      }

      // Clean the activities in case the Edge Function didn't clean them properly
      let cleanedActivities = data.activities;
      if (Array.isArray(data.activities)) {
        cleanedActivities = data.activities.map(activity => {
          if (typeof activity === 'string') {
            // Clean any remaining numbered prefixes
            return activity
              .replace(/^\d+[\.\)\-\:]?\s*/, '')
              .replace(/^[\-\*\+]\s*/, '')
              .replace(/^["']|["']$/g, '')
              .trim();
          }
          return activity;
        }).filter(activity => activity && activity.length > 0);
      }

      console.log('🤖 AIStore: Successfully generated clean activities:', cleanedActivities);
      set({ 
        activitySuggestions: cleanedActivities,
        loading: false,
        error: null
      });

      return cleanedActivities;

    } catch (error) {
      console.error('🤖 AIStore: Error generating activities:', error);
      console.error('🤖 AIStore: Full error object:', JSON.stringify(error, null, 2));
      
      // Always provide fallback activities based on mood and activityType
      const fallbackActivities = get().getFallbackActivities(mood, activityType);
      
      console.log('🤖 AIStore: Using fallback activities:', fallbackActivities);
      
      set({ 
        activitySuggestions: fallbackActivities,
        error: `AI service unavailable: ${error.message}`,
        loading: false 
      });

      return fallbackActivities;
    }
  },



  // Get AI-powered suggestions for group name and interests
  getGroupDetailsRecommendations: async (memberIds, forceRefresh = false) => {
    if (!memberIds || memberIds.length === 0) return;
    
    // If forceRefresh is true, clear previous suggestions first
    if (forceRefresh) {
      get().refreshGroupRecommendations();
    }
    
    try {
      console.log('🤖 AIStore: Getting group detail recommendations for members:', memberIds, 'forceRefresh:', forceRefresh);
      set({ loading: true, error: null });

      const { data, error } = await supabase.functions.invoke('group-details-recommender', {
        body: { memberIds, forceRefresh },
      });

      if (error) throw error;

      if (data && data.success) {
        console.log('🤖 AIStore: Successfully got AI group detail suggestions:', data.suggestions);
        set({ groupDetailsSuggestions: data.suggestions, loading: false });
        return data.suggestions;
      } else {
        throw new Error(data?.error || 'Failed to get group detail suggestions.');
      }
    } catch (error) {
      console.error('🤖 AIStore: Error getting group detail recommendations:', error);
      
      // Enhanced fallback with variety
      const fallbackSuggestions = get().getFallbackGroupDetailsSuggestions(memberIds, forceRefresh);
      
      console.log('🤖 AIStore: Using fallback group detail suggestions:', fallbackSuggestions);
      set({ 
        groupDetailsSuggestions: fallbackSuggestions, 
        error: `AI suggestions unavailable: ${error.message}`, 
        loading: false 
      });
      
      return fallbackSuggestions;
    }
  },

  // Get AI-powered recommendations for group members
  getGroupMemberRecommendations: async (groupName, groupInterests, friendIds, forceRefresh = false) => {
    console.log('🤖 AIStore: === GROUP MEMBER RECOMMENDATIONS START ===');
    console.log('🤖 AIStore: Input parameters:', {
      groupName: groupName || 'undefined',
      groupInterests: groupInterests || [],
      friendIdsCount: friendIds?.length || 0,
      forceRefresh
    });
    
    // Check user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('🤖 AIStore: 🔐 Authentication check:', {
      hasSession: !!session,
      sessionError: sessionError,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });
    
    if (!session) {
      console.log('🤖 AIStore: ❌ No active session found');
      return [];
    }
    
    if (!groupName && (!groupInterests || groupInterests.length === 0)) {
      console.log('🤖 AIStore: ❌ Missing required parameters - need groupName or groupInterests');
      return [];
    }
    
    // Get friends from the friend store
    const { friends } = useSupabaseFriendStore.getState();
    console.log('🤖 AIStore: 👥 Friends available:', friends?.length || 0);
    
    if (!friends || friends.length === 0) {
      console.log('🤖 AIStore: ❌ No friends available');
      return [];
    }
    
    // If forceRefresh is true, clear previous recommendations first
    if (forceRefresh) {
      console.log('🤖 AIStore: 🔄 Force refresh requested - clearing previous recommendations');
      set({ groupMemberRecommendations: [], error: null });
    }
    
    try {
      console.log('🤖 AIStore: 📡 Calling edge function group-member-recommender...');
      
      const requestBody = { 
        groupName: groupName || '', 
        groupInterests: groupInterests || [], 
        friendIds: friendIds || [], 
        forceRefresh 
      };
      console.log('🤖 AIStore: 📤 Request body:', requestBody);
      console.log('🤖 AIStore: 📤 Request body details:', {
        groupName: requestBody.groupName,
        groupInterestsCount: requestBody.groupInterests.length,
        groupInterestsArray: requestBody.groupInterests,
        friendIdsCount: requestBody.friendIds.length,
        friendIdsArray: requestBody.friendIds,
        forceRefresh: requestBody.forceRefresh
      });

      let data, error;
      try {
        console.log('🤖 AIStore: 🚀 About to invoke edge function...');
        
        // Get the current session to pass auth headers
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🤖 AIStore: 🔐 Session for edge function call:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          sessionError: sessionError,
          userId: session?.user?.id
        });
        
        if (!session?.access_token) {
          console.log('🤖 AIStore: ❌ No access token available for edge function call');
          throw new Error('No authentication token available');
        }
        
        // Call the edge function with explicit auth headers
        console.log('🤖 AIStore: 📡 Calling edge function with auth headers...');
        const response = await supabase.functions.invoke('group-member-recommender', {
          body: requestBody,
        });
        
        console.log('🤖 AIStore: 🚀 Edge function invocation completed');
        console.log('🤖 AIStore: 📥 Response status:', response.status);
        console.log('🤖 AIStore: 📥 Response headers:', response.headers);
        console.log('🤖 AIStore: 📥 Raw Supabase response:', response);
        console.log('🤖 AIStore: 📥 Data type:', typeof response.data);
        console.log('🤖 AIStore: 📥 Error type:', typeof response.error);
        console.log('🤖 AIStore: 📥 Error details:', response.error);

        // Extract error response body if available
        if (response.error && response.error.context) {
          console.log('🤖 AIStore: 📥 Error status:', response.error.context.status);
          console.log('🤖 AIStore: 📥 Error statusText:', response.error.context.statusText);
          console.log('🤖 AIStore: 📥 Error headers:', response.error.context.headers);
          
          // Try to read the response body
          if (response.error.context._bodyInit) {
            try {
              // Clone the response to read the body
              const responseClone = response.error.context.clone();
              const errorBody = await responseClone.text();
              console.log('🤖 AIStore: 📥 Error response body:', errorBody);
            } catch (bodyError) {
              console.log('🤖 AIStore: ❌ Failed to read error body:', bodyError);
            }
          }
        }
        
        data = response.data;
        error = response.error;
      } catch (invokeError) {
        console.log('🤖 AIStore: ❌ Edge function invocation threw exception:', invokeError);
        console.log('🤖 AIStore: ❌ Exception name:', invokeError.name);
        console.log('🤖 AIStore: ❌ Exception message:', invokeError.message);
        console.log('🤖 AIStore: ❌ Exception stack:', invokeError.stack);
        console.log('🤖 AIStore: ❌ Exception details:', JSON.stringify(invokeError, null, 2));
        throw invokeError;
      }

      if (error) {
        console.log('🤖 AIStore: ❌ Edge Function error:', error);
        console.log('🤖 AIStore: ❌ Error name:', error?.name);
        console.log('🤖 AIStore: ❌ Error message:', error?.message);
        console.log('🤖 AIStore: ❌ Error stack:', error?.stack);
        console.log('🤖 AIStore: ❌ Error context:', error?.context);
        console.log('🤖 AIStore: ❌ Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('🤖 AIStore: 📥 Edge function response data:', data);
      console.log('🤖 AIStore: 📥 Response success field:', data?.success);
      console.log('🤖 AIStore: 📥 Response message field:', data?.message);
      console.log('🤖 AIStore: 📥 Response recommendations field:', data?.recommendations);
      console.log('🤖 AIStore: 📥 Full response JSON:', JSON.stringify(data, null, 2));

      if (data && data.success) {
        // Log any message from the AI service
        if (data.message) {
          console.log('🤖 AIStore: 💬 AI service message:', data.message);
        }

        // Process the response
        if (data.success && data.recommendations && data.recommendations.length > 0) {
          console.log('🤖 AIStore: ✅ Edge function successful, processing recommendations...');
          console.log('🤖 AIStore: 📊 Raw recommendations:', data.recommendations);
          
          // Map the recommendations to our friends list
          const recommendedFriends = data.recommendations
            .map(rec => {
              const friend = friends.find(f => f.id === rec.user_id);
              if (friend) {
                return {
                  ...friend,
                  similarity: rec.compatibility_score || rec.total_similarity || 0.7,
                  reason: rec.reason || 'AI recommended based on compatibility'
                };
              }
              return null;
            })
            .filter(Boolean)
            .slice(0, 5);
          
          console.log('🤖 AIStore: 🎯 Final recommended friends:', recommendedFriends.map(f => f.display_name));
          
          // If AI returned no recommendations, use fallback
          if (recommendedFriends.length === 0) {
            console.log('🤖 AIStore: ⚠️ No AI recommendations found, using fallback');
            const fallbackRecommendations = get().getFallbackMemberRecommendations(
              groupName, 
              groupInterests, 
              friends, 
              [] // Don't exclude anyone for member recommendations - let user choose
            );
            
            console.log('🤖 AIStore: 🔄 Fallback recommendations:', fallbackRecommendations.map(f => f.display_name));
            
            set({ 
              groupMemberRecommendations: fallbackRecommendations, 
              error: data.message || 'Using smart recommendations - AI will improve as more content is added',
              loading: false 
            });
            return fallbackRecommendations;
          } else {
            // Success with AI recommendations
            const successMessage = data.message.includes('AI recommendations generated') 
              ? 'AI recommendations based on user compatibility'
              : data.message;
            
            set({ 
              groupMemberRecommendations: recommendedFriends, 
              error: null,
              loading: false,
              lastRecommendationSource: 'ai'
            });
            
            console.log('🤖 AIStore: ✅ AI recommendations successful:', successMessage);
            return recommendedFriends;
          }
        } else {
          // No recommendations from AI, use fallback
          console.log('🤖 AIStore: ⚠️ No recommendations from edge function, using fallback');
          const fallbackRecommendations = get().getFallbackMemberRecommendations(
            groupName, 
            groupInterests, 
            friends, 
            [] // Don't exclude anyone for member recommendations - let user choose
          );
          
          console.log('🤖 AIStore: 🔄 Fallback recommendations:', fallbackRecommendations.map(f => f.display_name));
          
          set({ 
            groupMemberRecommendations: fallbackRecommendations, 
            error: data.message || 'Using smart recommendations - AI will improve as more content is added',
            loading: false,
            lastRecommendationSource: 'fallback'
          });
          return fallbackRecommendations;
        }
      } else if (data && data.success === false) {
        // Edge function explicitly returned success: false
        console.log('🤖 AIStore: ⚠️ Edge function returned success: false, using fallback');
        console.log('🤖 AIStore: ⚠️ Edge function message:', data.message);
        
        const fallbackRecommendations = get().getFallbackMemberRecommendations(
          groupName, 
          groupInterests, 
          friends, 
          [] // Don't exclude anyone for member recommendations - let user choose
        );
        
        console.log('🤖 AIStore: 🔄 Fallback recommendations:', fallbackRecommendations.map(f => f.display_name));
        
        set({ 
          groupMemberRecommendations: fallbackRecommendations, 
          error: data.message || 'AI recommendations temporarily unavailable',
          loading: false,
          lastRecommendationSource: 'fallback'
        });
        
        console.log('🤖 AIStore: === GROUP MEMBER RECOMMENDATIONS END (FALLBACK) ===');
        return fallbackRecommendations;
      } else {
        console.error('🤖 AIStore: ❌ Edge function returned unexpected response format:', data);
        throw new Error(data?.error || data?.message || 'Failed to get group member recommendations from AI service.');
      }
    } catch (error) {
      console.error('🤖 AIStore: ❌ Error in getGroupMemberRecommendations:', error);
      console.error('🤖 AIStore: ❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Fallback: provide simple recommendations based on available friends
      console.log('🤖 AIStore: 🔄 Initiating fallback recommendations...');
      const { friends } = useSupabaseFriendStore.getState();
      console.log('🤖 AIStore: 👥 Friends available for fallback:', friends?.length || 0);
      
      if (!friends || friends.length === 0) {
        console.error('🤖 AIStore: ❌ No friends available for fallback recommendations');
        set({ 
          groupMemberRecommendations: [], 
          error: `No friends available: ${error.message}`, 
          loading: false 
        });
        return [];
      }
      
      const fallbackRecommendations = get().getFallbackMemberRecommendations(
        groupName, 
        groupInterests, 
        friends, 
        [] // Don't exclude anyone for member recommendations - let user choose
      );
      
      console.log('🤖 AIStore: 🔄 Fallback recommendations generated:', fallbackRecommendations.map(f => f.display_name));
      set({ 
        groupMemberRecommendations: fallbackRecommendations, 
        error: `AI recommendations unavailable: ${error.message}`, 
        loading: false 
      });
      
      console.log('🤖 AIStore: === GROUP MEMBER RECOMMENDATIONS END (FALLBACK) ===');
      return fallbackRecommendations;
    } finally {
      console.log('🤖 AIStore: === GROUP MEMBER RECOMMENDATIONS END ===');
    }
  },

  // Fallback member recommendations when AI is unavailable
  getFallbackMemberRecommendations: (groupName, groupInterests, allFriends, excludedIds = []) => {
    console.log('🤖 AIStore: === FALLBACK MEMBER RECOMMENDATIONS START ===');
    console.log('🤖 AIStore: Fallback input:', {
      groupName: groupName || 'undefined',
      groupInterests: groupInterests || [],
      allFriendsCount: allFriends?.length || 0,
      excludedIdsCount: excludedIds?.length || 0,
      excludedIds: excludedIds
    });
    
    if (!allFriends || allFriends.length === 0) {
      console.log('🤖 AIStore: ❌ No friends available for fallback');
      return [];
    }
    
    // Filter out already selected friends (but NOT the current user - they should be in the group)
    const { user } = useSupabaseAuthStore.getState();
    const currentUserId = user?.id || user?.uid;
    
    const availableFriends = allFriends.filter(friend => {
      const isExcluded = excludedIds.includes(friend.id);
      const isValid = friend.id && (friend.display_name || friend.username);
      
      if (!isValid) {
        console.warn('🤖 AIStore: ⚠️ Invalid friend data:', friend);
        return false;
      }
      
      // Don't exclude current user - they can be part of the group
      // Only exclude friends that are explicitly in excludedIds
      const shouldInclude = !isExcluded;
      
      if (!shouldInclude) {
        console.log('🤖 AIStore: 🚫 Excluding friend:', friend.display_name || friend.username, 'reason: already selected');
      }
      
      return shouldInclude;
    });
    
    console.log('🤖 AIStore: 👥 Available friends for fallback:', availableFriends.length);
    console.log('🤖 AIStore: 👥 Available friend names:', availableFriends.map(f => f.display_name || f.username));
    
    if (availableFriends.length === 0) {
      console.log('🤖 AIStore: ❌ No available friends after filtering');
      return [];
    }
    
    // Strategy 1: If we have group interests, try to match friends based on username/display name
    if (groupInterests && groupInterests.length > 0) {
      console.log('🤖 AIStore: 🔍 Trying to match friends based on interests:', groupInterests);
      const interestKeywords = groupInterests.map(interest => interest.toLowerCase());
      const matchedFriends = availableFriends.filter(friend => {
        const friendText = `${friend.username || ''} ${friend.display_name || ''}`.toLowerCase();
        const hasMatch = interestKeywords.some(keyword => 
          friendText.includes(keyword) || keyword.includes(friendText.split(' ')[0])
        );
        if (hasMatch) {
          console.log('🤖 AIStore: ✅ Interest match found:', friend.display_name || friend.username, 'for keywords:', interestKeywords);
        }
        return hasMatch;
      });
      
      if (matchedFriends.length > 0) {
        const result = matchedFriends.slice(0, 3).map(friend => ({ ...friend, similarity: 0.8 }));
        console.log('🤖 AIStore: 🎯 Interest-based recommendations:', result.map(f => f.display_name || f.username));
        return result;
      }
    }
    
    // Strategy 2: If group name contains keywords, try to match
    if (groupName && groupName.trim()) {
      console.log('🤖 AIStore: 🔍 Trying to match friends based on group name:', groupName);
      const nameKeywords = groupName.toLowerCase().split(/[\s\-_]+/).filter(word => word.length > 2);
      console.log('🤖 AIStore: 🔍 Name keywords:', nameKeywords);
      
      if (nameKeywords.length > 0) {
        const matchedFriends = availableFriends.filter(friend => {
          const friendText = `${friend.username || ''} ${friend.display_name || ''}`.toLowerCase();
          const hasMatch = nameKeywords.some(keyword => 
            friendText.includes(keyword) || keyword.includes(friendText.split(' ')[0])
          );
          if (hasMatch) {
            console.log('🤖 AIStore: ✅ Name match found:', friend.display_name || friend.username, 'for keywords:', nameKeywords);
          }
          return hasMatch;
        });
        
        if (matchedFriends.length > 0) {
          const result = matchedFriends.slice(0, 3).map(friend => ({ ...friend, similarity: 0.7 }));
          console.log('🤖 AIStore: 🎯 Name-based recommendations:', result.map(f => f.display_name || f.username));
          return result;
        }
      }
    }
    
    // Strategy 3: Smart fallback - prefer friends with more complete profiles or recent activity
    console.log('🤖 AIStore: 🧠 Using smart fallback recommendations');
    const scoredFriends = availableFriends.map(friend => {
      let score = 0.4; // Base score (lowered to be more inclusive)
      
      // Bonus for having profile picture
      if (friend.profile_picture) score += 0.15;
      
      // Bonus for having both username and display name
      if (friend.username && friend.display_name && friend.username !== friend.display_name) score += 0.1;
      
      // Bonus for longer display names (more likely to be real names)
      if (friend.display_name && friend.display_name.length > 5) score += 0.1;
      
      // Bonus for having email (more complete profile)
      if (friend.email) score += 0.05;
      
      // Small random factor for variety (increased for more diversity)
      score += Math.random() * 0.3;
      
      return { ...friend, similarity: score };
    });
    
    // Sort by score and take top friends (increased to up to 4 friends)
    const sortedFriends = scoredFriends.sort((a, b) => b.similarity - a.similarity);
    const result = sortedFriends.slice(0, Math.min(4, availableFriends.length));
    
    console.log('🤖 AIStore: 🎯 Smart fallback recommendations:', result.map(f => ({ 
      name: f.display_name || f.username, 
      similarity: f.similarity.toFixed(2) 
    })));
    console.log('🤖 AIStore: === FALLBACK MEMBER RECOMMENDATIONS END ===');
    return result;
  },

  // Fallback group details suggestions when AI is unavailable
  getFallbackGroupDetailsSuggestions: (memberIds, forceRefresh = false) => {
    console.log('🤖 AIStore: Generating fallback group details suggestions');
    
    // Different sets of suggestions for variety
    const groupNameSets = [
      // Set 1: Fun & Social
      ['Squad Goals', 'The Dream Team', 'Awesome Crew', 'Fun Gang', 'Best Friends'],
      // Set 2: Activity-based
      ['Adventure Squad', 'Chat Champions', 'Social Circle', 'The Hangout', 'Connection Hub'],
      // Set 3: Creative & Unique
      ['The Collective', 'Inner Circle', 'Vibe Tribe', 'Good Times Gang', 'Unity Squad'],
      // Set 4: Simple & Clean
      ['Friends Forever', 'The Group', 'Our Circle', 'Together', 'The Team']
    ];

    const interestSets = [
      // Set 1: Entertainment
      ['movies', 'music', 'gaming', 'streaming', 'podcasts'],
      // Set 2: Activities  
      ['travel', 'food', 'photography', 'fitness', 'outdoor adventures'],
      // Set 3: Social
      ['parties', 'events', 'meetups', 'celebrations', 'hangouts'],
      // Set 4: Creative
      ['art', 'creativity', 'DIY projects', 'crafts', 'design'],
      // Set 5: Learning
      ['books', 'learning', 'discussions', 'news', 'technology']
    ];

    // Use time-based or random selection for variety
    const now = new Date();
    const seed = forceRefresh ? now.getTime() : Math.floor(now.getTime() / (1000 * 60 * 60)); // Change every hour unless forced
    const nameSetIndex = seed % groupNameSets.length;
    const interestSetIndex = (seed + 1) % interestSets.length;
    
    const selectedNames = groupNameSets[nameSetIndex];
    const selectedInterests = interestSets[interestSetIndex];
    
    // Pick a random name and 3-4 random interests
    const randomName = selectedNames[Math.floor(Math.random() * selectedNames.length)];
    const shuffledInterests = [...selectedInterests].sort(() => 0.5 - Math.random());
    const randomInterests = shuffledInterests.slice(0, 3 + Math.floor(Math.random() * 2)); // 3-4 interests

    return {
      groupName: randomName,
      groupInterests: randomInterests
    };
  },

  // Store user feedback on AI suggestions
  submitFeedback: async (contentType, generatedContent, selectedOption, rating) => {
    try {
      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) return;

      await supabase
        .from('ai_generated_content')
        .update({
          selected_option: selectedOption,
          feedback_rating: rating,
          used_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('generated_content', JSON.stringify(generatedContent));

      console.log('🤖 AIStore: Feedback submitted:', { selectedOption, rating });

    } catch (error) {
      console.error('🤖 AIStore: Error submitting feedback:', error);
    }
  },

  // Learn from user interactions to improve suggestions
  learnFromInteraction: async (contentType, content, context = {}) => {
    try {
      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) return;

      // Generate embedding for the content to improve future suggestions
      const { error } = await supabase.functions.invoke('embedding-generator', {
        body: {
          userId,
          content,
          contentType,
          metadata: context
        }
      });

      if (error) {
        console.error('🤖 AIStore: Error generating embedding:', error);
      }

    } catch (error) {
      console.error('🤖 AIStore: Error learning from interaction:', error);
    }
  },

  // Update user interests based on activity
  updateUserInterests: async (interests) => {
    try {
      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) return;

      for (const interest of interests) {
        await supabase.rpc('update_user_interest', {
          user_uuid: userId,
          category: interest.category,
          value: interest.value,
          confidence: interest.confidence || 0.5,
          source_type: interest.source || 'explicit'
        });
      }

      console.log('🤖 AIStore: Updated user interests:', interests);

    } catch (error) {
      console.error('🤖 AIStore: Error updating interests:', error);
    }
  },

  // Helper function to create activity suggestions
  createActivitySuggestions: async (userInterests, friendInterests, recentActivities, context) => {
    const suggestions = [];
    
    // Analyze common interests
    const commonInterests = get().findCommonInterests(userInterests, friendInterests);
    
    // Generate suggestions based on interests
    for (const interest of commonInterests.slice(0, 3)) {
      const suggestion = get().getSuggestionForInterest(interest);
      if (suggestion) suggestions.push(suggestion);
    }

    // Add seasonal/contextual suggestions
    const seasonalSuggestions = get().getSeasonalSuggestions();
    suggestions.push(...seasonalSuggestions.slice(0, 2));

    // Add variety with fallback suggestions
    const fallbackSuggestions = [
      '🎬 Movie marathon with snacks',
      '🍕 Food tour of local spots',
      '🎮 Tournament night',
      '📸 Sunset photo session',
      '☕ Cozy cafe hopping'
    ];

    // Fill remaining spots with fallbacks
    while (suggestions.length < 5) {
      const randomSuggestion = fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)];
      if (!suggestions.includes(randomSuggestion)) {
        suggestions.push(randomSuggestion);
      }
    }

    return suggestions;
  },

  // Helper function to find common interests
  findCommonInterests: (userInterests, friendInterests) => {
    const userInterestSet = new Set(userInterests?.map(i => i.interest_value) || []);
    const commonInterests = [];

    friendInterests?.forEach(friendInterest => {
      if (userInterestSet.has(friendInterest.interest_value)) {
        commonInterests.push(friendInterest);
      }
    });

    return commonInterests;
  },

  // Helper function to get suggestions for specific interests
  getSuggestionForInterest: (interest) => {
    const interestMap = {
      'photography': '📸 Photo walk in the city',
      'music': '🎵 Concert or music festival',
      'food': '🍴 Cooking class together',
      'travel': '🚗 Weekend road trip',
      'sports': '⚽ Play some sports together',
      'gaming': '🎮 Gaming tournament night',
      'movies': '🎬 Cinema or movie night',
      'art': '🎨 Art gallery or painting class',
      'nature': '🌿 Hiking or park visit',
      'fitness': '💪 Workout session together'
    };

    return interestMap[interest.interest_value] || null;
  },

  // Helper function to get seasonal suggestions
  getSeasonalSuggestions: () => {
    const month = new Date().getMonth();
    
    if (month >= 11 || month <= 1) { // Winter
      return ['❄️ Winter activities together', '🔥 Cozy indoor hangout'];
    } else if (month >= 2 && month <= 4) { // Spring
      return ['🌸 Spring outdoor activities', '🌱 Garden or nature walk'];
    } else if (month >= 5 && month <= 7) { // Summer
      return ['☀️ Beach or pool day', '🌭 BBQ or picnic'];
    } else { // Fall
      return ['🍂 Fall foliage trip', '🎃 Seasonal activities'];
    }
  },

  // Helper function to clean and parse AI-generated captions
  cleanAndParseCaptions: (rawText) => {
    if (!rawText || typeof rawText !== 'string') return [];
    
    // Split by newlines and clean each line
    const lines = rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const captions = [];
    
    for (const line of lines) {
      // Remove numbered prefixes (e.g., "1.", "2)", "- ", etc.)
      let cleaned = line
        .replace(/^\d+[\.\)\-\:]?\s*/, '') // Remove "1. ", "2) ", "3- ", "4: ", etc.
        .replace(/^[\-\*\+]\s*/, '') // Remove "- ", "* ", "+ "
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .trim();
      
      // Skip if the line is too short or looks like a header/instruction
      if (cleaned.length < 5 || 
          cleaned.toLowerCase().includes('caption') ||
          cleaned.toLowerCase().includes('option') ||
          cleaned.toLowerCase().includes('here are') ||
          cleaned.toLowerCase().includes('suggestions')) {
        continue;
      }
      
      // Only add if it's a valid caption and we don't have too many
      if (cleaned.length > 0 && captions.length < 3) {
        captions.push(cleaned);
      }
    }
    
    return captions;
  },

  // Helper function to get fallback activities
  getFallbackActivities: (mood, activityType) => {
    const activitySets = {
      fun: {
        hangout: [
          '🎮 Gaming tournament at someone\'s place',
          '🍿 Movie marathon with snacks galore',
          '🎲 Board game night with prizes',
          '🎤 Karaoke session (home or venue)',
          '🏓 Ping pong or pool competition',
          '🎨 DIY craft project together',
          '🧩 Puzzle challenge while chatting',
          '🎪 Themed costume hangout'
        ],
        adventure: [
          '🥾 Hiking trail exploration',
          '🚴 Bike ride to new neighborhoods',
          '🏖️ Beach day with activities',
          '🎢 Amusement park adventure',
          '🧗 Rock climbing or bouldering',
          '🏕️ Camping under the stars',
          '🛶 Kayaking or paddleboarding',
          '🗺️ Geocaching treasure hunt'
        ],
        creative: [
          '🎨 Paint and sip session',
          '📷 Photo scavenger hunt',
          '🎭 Improv or acting games',
          '🎵 Write and record a song',
          '📝 Collaborative storytelling',
          '🍳 Cooking challenge competition',
          '🎪 Plan and film a comedy sketch',
          '🧵 Learn a new craft together'
        ],
        food: [
          '🍕 Pizza making from scratch',
          '🌮 Taco bar with all fixings',
          '🍰 Baking competition',
          '🍜 Ramen crawl adventure',
          '🧁 Cupcake decorating party',
          '🥘 International cuisine night',
          '🍦 Ice cream sundae bar',
          '🥞 Brunch potluck gathering'
        ],
        entertainment: [
          '🎬 Film festival marathon',
          '🎮 Video game tournament',
          '🎭 Comedy show or open mic',
          '🎵 Concert or live music',
          '🎪 Escape room challenge',
          '🎳 Bowling with silly rules',
          '🎯 Mini golf competition',
          '🎨 Paint night at a studio'
        ]
      },
      casual: {
        hangout: [
          '☕ Coffee shop hopping',
          '📚 Bookstore browsing session',
          '🛍️ Thrift store treasure hunt',
          '🌳 Picnic in the park',
          '🚶 Neighborhood walk and talk',
          '🧘 Meditation or yoga session',
          '🎧 Podcast listening party',
          '🌅 Sunrise or sunset watching'
        ],
        adventure: [
          '🚲 Easy bike ride around town',
          '🌿 Nature walk and photography',
          '🏞️ Visit a local park or garden',
          '🦆 Feed ducks at the pond',
          '🏛️ Museum or gallery visit',
          '🌉 Bridge or scenic overlook visit',
          '🚗 Scenic drive with good music',
          '🎪 Local farmers market exploration'
        ],
        creative: [
          '📖 Start a book club',
          '✍️ Journal writing session',
          '🎨 Sketch in the park',
          '📱 Create TikToks together',
          '🧩 Work on a jigsaw puzzle',
          '🎵 Learn ukulele basics',
          '📝 Write letters to future selves',
          '🌱 Start a small garden project'
        ],
        food: [
          '🥗 Healthy meal prep session',
          '🍵 Tea tasting afternoon',
          '🥪 Sandwich making competition',
          '🍓 Smoothie bowl creation',
          '🧀 Cheese and wine tasting',
          '🍪 Simple cookie baking',
          '🥤 Homemade lemonade stand',
          '🍇 Fruit picking adventure'
        ],
        entertainment: [
          '📺 Binge-watch a new series',
          '🎵 Create collaborative playlists',
          '📰 Current events discussion',
          '🎲 Card games afternoon',
          '📱 Learn new phone apps together',
          '🎨 Adult coloring books session',
          '📻 Listen to old radio shows',
          '🎪 Watch street performances'
        ]
      },
      exciting: {
        hangout: [
          '🎢 Theme park day trip',
          '🏎️ Go-kart racing competition',
          '🎯 Laser tag battle',
          '🧗 Indoor rock climbing',
          '🎪 Trampoline park session',
          '🏹 Archery lessons',
          '🎮 VR gaming experience',
          '🎭 Murder mystery dinner'
        ],
        adventure: [
          '🪂 Skydiving or bungee jumping',
          '🏄 Surfing lessons',
          '🧗 Outdoor rock climbing',
          '🚁 Helicopter tour',
          '🏔️ Mountain hiking challenge',
          '🚤 Jet ski rental',
          '🎿 Skiing or snowboarding',
          '🏕️ Wilderness survival challenge'
        ],
        creative: [
          '🎭 Flash mob planning',
          '🎬 Action movie recreation',
          '🎪 Circus skills workshop',
          '🎨 Graffiti art class (legal)',
          '🎵 Battle of the bands setup',
          '📹 Extreme sports filming',
          '🎭 Stunt choreography class',
          '🎪 Fire safety performance art'
        ],
        food: [
          '🌶️ Spicy food challenge',
          '⏰ Speed cooking competition',
          '🍳 Iron Chef style battle',
          '🔥 BBQ competition',
          '🥘 Exotic cuisine adventure',
          '🍜 Ramen challenge',
          '🎂 Extreme cake decorating',
          '🍕 Pizza eating contest'
        ],
        entertainment: [
          '🎢 Roller coaster marathon',
          '🎮 Gaming tournament with stakes',
          '🎪 Extreme escape rooms',
          '🎭 Improv competition',
          '🎵 Karaoke battle royale',
          '🏆 Sports tournament',
          '🎯 Competitive mini golf',
          '🎪 Circus performance class'
        ]
      },
      nostalgic: {
        hangout: [
          '📼 90s/2000s throwback party',
          '🎮 Retro gaming session',
          '📱 Look through old photos',
          '🎵 Childhood music playlist',
          '🍭 Candy from your youth',
          '📺 Watch childhood movies',
          '🎲 Classic board games',
          '📝 Memory sharing circle'
        ],
        adventure: [
          '🏫 Visit your old school',
          '🏞️ Return to childhood hangouts',
          '🎪 County fair or carnival',
          '🎨 Recreate childhood photos',
          '🚲 Bike to old favorite spots',
          '🏖️ Beach day like old times',
          '🎢 Amusement park nostalgia',
          '🌳 Tree house building'
        ],
        creative: [
          '📖 Create a friendship scrapbook',
          '🎬 Film a "then vs now" video',
          '✍️ Write letters to past selves',
          '🎨 Recreate childhood artwork',
          '📱 Make a time capsule',
          '🎵 Record old favorite songs',
          '📷 Photo recreation project',
          '🎭 Reenact favorite memories'
        ],
        food: [
          '🧁 Bake childhood favorites',
          '🍕 Order from old favorite spots',
          '🥪 Pack lunch like school days',
          '🍦 Ice cream truck hunt',
          '🍪 Grandma\'s recipe cooking',
          '🥤 Make old favorite drinks',
          '🍰 Birthday cake from scratch',
          '🍬 Candy making session'
        ],
        entertainment: [
          '📺 Watch old TV shows',
          '🎵 Listen to high school playlists',
          '🎮 Play childhood video games',
          '📚 Read old favorite books',
          '🎭 Act out favorite movie scenes',
          '🎪 Visit childhood entertainment venues',
          '📱 Look at old social media',
          '🎲 Play games from the past'
        ]
      },
      celebration: {
        hangout: [
          '🎉 Achievement celebration party',
          '🏆 Success story sharing',
          '🥂 Toast with fancy drinks',
          '🎊 Confetti and decorations',
          '🎁 Gift exchange celebration',
          '📸 Victory photo shoot',
          '🎵 Dance party celebration',
          '🎪 Themed celebration party'
        ],
        adventure: [
          '🎢 Victory lap at amusement park',
          '🏔️ Celebratory hike with views',
          '🚁 Helicopter celebration tour',
          '🏖️ Beach celebration day',
          '🎿 Celebration ski trip',
          '🚤 Boat party celebration',
          '🎪 Adventure park celebration',
          '🏕️ Celebration camping trip'
        ],
        creative: [
          '🎬 Create a celebration video',
          '🎨 Paint a victory mural',
          '🎵 Write a celebration song',
          '📝 Create achievement certificates',
          '🎭 Plan a celebration performance',
          '📷 Professional photo shoot',
          '🎪 Design celebration decorations',
          '🎨 Make celebration artwork'
        ],
        food: [
          '🍾 Champagne and appetizers',
          '🎂 Custom celebration cake',
          '🥘 Fancy dinner preparation',
          '🍕 Victory pizza party',
          '🧁 Celebration cupcake decorating',
          '🥂 Wine and cheese celebration',
          '🍦 Ice cream sundae bar',
          '🍰 Dessert making marathon'
        ],
        entertainment: [
          '🎭 Celebration show or concert',
          '🎪 Party games and activities',
          '🎵 Karaoke celebration',
          '🎮 Tournament with prizes',
          '🎬 Movie night with favorites',
          '🎯 Celebration mini golf',
          '🎳 Victory bowling session',
          '🎨 Paint and celebrate night'
        ]
      }
    };

    const moodActivities = activitySets[mood] || activitySets.fun;
    const typeActivities = moodActivities[activityType] || moodActivities.hangout;
    
    // Return 3 random activities from the available options
    const shuffled = [...typeActivities].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  },

  // Clear generated content
  clearGeneratedContent: () => {
    set({ 
      activitySuggestions: [],
      error: null 
    });
  }
})); 