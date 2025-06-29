import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';
import { useSupabaseFriendStore } from './supabaseFriendStore';

export const useAIStore = create((set, get) => ({
  generatedCaptions: [],
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

  // Generate AI captions using RAG
  generateCaptions: async (mediaType, context = '', mood = 'fun', friendIds = []) => {
    try {
      console.log('🤖 AIStore: Generating captions with context:', { mediaType, context, mood, friendIds });
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) {
        console.warn('🤖 AIStore: User not authenticated, using fallback captions');
        const fallbackCaptions = get().getFallbackCaptions(mediaType, mood);
        set({ 
          generatedCaptions: fallbackCaptions,
          loading: false,
          error: 'User not authenticated'
        });
        return fallbackCaptions;
      }

      console.log('🤖 AIStore: Calling caption-generator Edge Function...');
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('caption-generator', {
        body: {
          userId,
          friendIds,
          mediaType,
          context,
          mood
        }
      });

      if (error) {
        console.error('🤖 AIStore: Error from caption generator Edge Function:', error);
        console.error('🤖 AIStore: Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a function not found error
        if (error.message?.includes('Function not found') || error.message?.includes('404')) {
          console.warn('🤖 AIStore: Caption generator function not deployed, using fallback captions');
        } else if (error.message?.includes('OPENAI_API_KEY')) {
          console.warn('🤖 AIStore: OpenAI API key not configured, using fallback captions');
        }
        
        throw error;
      }

      if (!data || !data.captions || data.captions.length === 0) {
        console.warn('🤖 AIStore: No captions returned from Edge Function, using fallback');
        throw new Error('No captions generated');
      }

      // Clean the captions in case the Edge Function didn't clean them properly
      let cleanedCaptions = data.captions;
      if (Array.isArray(data.captions)) {
        cleanedCaptions = data.captions.map(caption => {
          if (typeof caption === 'string') {
            // Clean any remaining numbered prefixes
            return caption
              .replace(/^\d+[\.\)\-\:]?\s*/, '')
              .replace(/^[\-\*\+]\s*/, '')
              .replace(/^["']|["']$/g, '')
              .trim();
          }
          return caption;
        }).filter(caption => caption && caption.length > 0);
      }

      console.log('🤖 AIStore: Successfully generated clean captions:', cleanedCaptions);
      set({ 
        generatedCaptions: cleanedCaptions,
        loading: false,
        error: null
      });

      return cleanedCaptions;

    } catch (error) {
      console.error('🤖 AIStore: Error generating captions:', error);
      console.error('🤖 AIStore: Full error object:', JSON.stringify(error, null, 2));
      
      // Always provide fallback captions based on mood and mediaType
      const fallbackCaptions = get().getFallbackCaptions(mediaType, mood);
      
      console.log('🤖 AIStore: Using fallback captions:', fallbackCaptions);
      
      set({ 
        generatedCaptions: fallbackCaptions,
        error: `AI service unavailable: ${error.message}`,
        loading: false 
      });

      return fallbackCaptions;
    }
  },

  // Generate AI activity suggestions for friend groups
  generateActivitySuggestions: async (friendIds = [], context = '') => {
    try {
      console.log('🤖 AIStore: Generating activity suggestions for friends:', friendIds);
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get user and friend interests for context
      const { data: userInterests } = await supabase
        .from('user_interests')
        .select('interest_category, interest_value, confidence_score')
        .eq('user_id', userId);

      const { data: friendInterests } = await supabase
        .from('user_interests')
        .select('interest_category, interest_value, confidence_score, user_id')
        .in('user_id', friendIds);

      // Get recent group activities for context
      const { data: recentActivities } = await supabase
        .from('friend_group_activities')
        .select('activity_type, activity_description, location, date_occurred')
        .contains('user_ids', [userId])
        .order('date_occurred', { ascending: false })
        .limit(5);

      // Create activity suggestions based on interests and history
      const suggestions = await get().createActivitySuggestions(userInterests, friendInterests, recentActivities, context);
      
      set({ 
        activitySuggestions: suggestions,
        loading: false 
      });

      return suggestions;

    } catch (error) {
      console.error('🤖 AIStore: Error generating activity suggestions:', error);
      
      const fallbackSuggestions = [
        '🎬 Movie night at someone\'s place',
        '🍕 Try that new restaurant everyone\'s talking about',
        '🎮 Gaming session with the squad',
        '📸 Photo walk around the city',
        '☕ Coffee catch-up session'
      ];
      
      set({ 
        activitySuggestions: fallbackSuggestions,
        error: error.message,
        loading: false 
      });

      return fallbackSuggestions;
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

  // Helper function to get fallback captions
  getFallbackCaptions: (mediaType, mood) => {
    const captionSets = {
      fun: {
        image: [
          'Squad energy is unmatched ⚡',
          'Making memories with the best crew 💫',
          'Friendship goals achieved 🙌',
          'This is what happiness looks like 😊',
          'Good vibes only with these legends 🌟',
          'Creating our own sunshine ☀️',
          'Life is better with friends like these 💛',
          'Spontaneous adventures with the gang 🎪',
          'Main character energy activated 🌟',
          'Chaos coordinators at work 🎭',
          'Professional memory makers 📸',
          'Friendship level: Maximum 💯'
        ],
        video: [
          'When the squad gets together magic happens ✨',
          'Living our movie moment 🎬',
          'Action-packed memories in the making 🚀',
          'Epic adventures with epic people 🎭',
          'This is how we roll 🎪',
          'Creating content and chaos 📹',
          'Main character energy with the crew 🌟',
          'Behind the scenes of our friendship 🎥',
          'Unscripted moments are the best moments 🎬',
          'Documentary crew following legends 📹',
          'Motion picture masterpiece 🎭',
          'Academy award for best friendship 🏆'
        ]
      },
      casual: {
        image: [
          'Just us being authentically us 💯',
          'Low-key moments, high-key love 💛',
          'Simple times with complex friendships 🌿',
          'Everyday magic with extraordinary people ✨',
          'Keeping it real since day one 😌',
          'Comfortable chaos with the crew 🤝',
          'No filter needed for genuine moments 📷',
          'Regular day, irregular friends 🌈',
          'Vibes are immaculate today 🌸',
          'Effortlessly iconic 💫',
          'Natural habitat: Together 🏠',
          'Casually being legends 😎'
        ],
        video: [
          'Unscripted moments are the best moments 📱',
          'Casual vibes, eternal memories 🎥',
          'Just another day in paradise with y\'all 🌴',
          'Spontaneous storytelling 📖',
          'Raw, real, and ridiculously fun 🎬',
          'Documenting the ordinary extraordinary 📹',
          'Chill mode with chaotic energy 😎',
          'Life unfiltered with the best people 🎭',
          'Behind the scenes realness 🎥',
          'Casual Friday energy every day 📱',
          'Organic content creation 🌱',
          'Just vibing and thriving 🌊'
        ]
      },
      exciting: {
        image: [
          'Adrenaline rush with the rush crew 🔥',
          'Living life at maximum volume 📢',
          'Heart racing, friendship chasing 💓',
          'This is what dreams are made of 🚀',
          'Electric energy, magnetic friendship ⚡',
          'Pushing boundaries and breaking limits 🎢',
          'Adventure mode permanently activated 🌪️',
          'Can\'t contain this level of excitement 🎆',
          'Thrill seekers anonymous meeting 🎢',
          'Maximum energy unlocked ⚡',
          'Adrenaline addicts in action 💨',
          'Living on the edge of awesome 🔥'
        ],
        video: [
          'High octane friendship fuel ⛽',
          'Thrills, chills, and friendship skills 🎢',
          'Living on the edge of awesome 🔥',
          'Maximum energy, maximum memories 🚀',
          'Adrenaline addicts anonymous meeting 💨',
          'Heart pounding, soul bonding 💓',
          'This is our action movie montage 🎬',
          'Excitement overload in progress 🎆',
          'Fast and furious friendship edition 🏎️',
          'Extreme sports: Friendship edition 🏂',
          'High voltage vibes only ⚡',
          'Danger zone: Fun activated 🚨'
        ]
      },
      nostalgic: {
        image: [
          'Time capsule moments with timeless friends 🕰️',
          'Golden hour with golden hearts 💛',
          'Building memories that will last forever 🏗️',
          'These are the good old days happening now 📚',
          'Friendship that transcends time ⏳',
          'Making history one moment at a time 📖',
          'Precious gems in life\'s treasure chest 💎',
          'Forever friends in a temporary world 🌍',
          'Vintage vibes with modern hearts 💫',
          'Timeless bonds, priceless moments 💝',
          'Memory lane architects 🛤️',
          'Classic friendship, never goes out of style ✨'
        ],
        video: [
          'Capturing the essence of eternal friendship 🎥',
          'These moments will echo through time 🔄',
          'Building our legacy one laugh at a time 📹',
          'Time travelers documenting the journey 🚀',
          'Memory lane construction in progress 🛤️',
          'Friendship that ages like fine wine 🍷',
          'Creating tomorrow\'s favorite memories today 💭',
          'Timeless bonds in motion 🎬',
          'Vintage souls, modern memories 📹',
          'History in the making 📚',
          'Sentimental journey with the best crew 🚂',
          'Forever moments captured in time 🕰️'
        ]
      },
      celebration: {
        image: [
          'Success tastes sweeter with the squad 🍾',
          'Victory dance initiated 💃',
          'Milestone achieved, memories multiplied 🏆',
          'Cheers to us and our unstoppable energy 🥂',
          'Celebration station with the best delegation 🎉',
          'Worth every moment that led to this 🎊',
          'Party mode with the perfect people 🎪',
          'Achievement unlocked: Epic celebration 🔓',
          'Champions celebrating champion friends 🏅',
          'Success looks good on us 👑',
          'Winning streak continues 🎯',
          'Celebration specialists at work 🎉'
        ],
        video: [
          'Dance like the world is our stage 💃',
          'Celebration compilation in real time 🎬',
          'Party documentary featuring legends 📹',
          'This is how champions celebrate 🏆',
          'Victory lap with the victory squad 🏃',
          'Cheers to the journey and the destination 🥂',
          'Living proof that dreams come true 🌟',
          'Celebration masterclass in session 🎭',
          'Confetti cannon of friendship 🎊',
          'Party mode: Expert level 🎪',
          'Celebration choreography perfected 💃',
          'Fireworks of friendship 🎆'
        ]
      }
    };

    const moodCaptions = captionSets[mood] || captionSets.fun;
    const typeCaptions = moodCaptions[mediaType] || moodCaptions.image;
    
    // Return 3 random captions from the available options
    const shuffled = [...typeCaptions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  },

  // Clear generated content
  clearGeneratedContent: () => {
    set({ 
      generatedCaptions: [],
      activitySuggestions: [],
      error: null 
    });
  }
})); 