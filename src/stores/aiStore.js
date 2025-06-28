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

      console.log('🤖 AIStore: Successfully generated captions:', data.captions);
      set({ 
        generatedCaptions: data.captions,
        loading: false,
        error: null
      });

      return data.captions;

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
  getGroupDetailsRecommendations: async (memberIds) => {
    if (!memberIds || memberIds.length === 0) return;
    try {
      console.log('🤖 AIStore: Getting group detail recommendations for members:', memberIds);
      set({ loading: true, error: null });

      const { data, error } = await supabase.functions.invoke('group-details-recommender', {
        body: { memberIds },
      });

      if (error) throw error;

      if (data.success) {
        set({ groupDetailsSuggestions: data.suggestions, loading: false });
        return data.suggestions;
      } else {
        throw new Error(data.error || 'Failed to get group detail suggestions.');
      }
    } catch (error) {
      console.error('🤖 AIStore: Error getting group detail recommendations:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Get AI-powered recommendations for group members
  getGroupMemberRecommendations: async (groupName, groupInterests, friendIds) => {
    if (!groupName && (!groupInterests || groupInterests.length === 0)) return;
    try {
      console.log('🤖 AIStore: Getting group member recommendations for:', { groupName, groupInterests });
      set({ loading: true, error: null });

      const { data, error } = await supabase.functions.invoke('group-member-recommender', {
        body: { groupName, groupInterests, friendIds },
      });

      if (error) throw error;

      if (data.success) {
        // We need to map the recommended user_ids back to full friend objects
        const { friends } = useSupabaseFriendStore.getState();
        const recommendedFriends = data.recommendations
          .map(rec => {
            const friend = friends.find(f => f.id === rec.user_id);
            return friend ? { ...friend, similarity: rec.total_similarity } : null;
          })
          .filter(Boolean); // Filter out any nulls if a friend wasn't found

        set({ groupMemberRecommendations: recommendedFriends, loading: false });
        return recommendedFriends;
      } else {
        throw new Error(data.error || 'Failed to get group member recommendations.');
      }
    } catch (error) {
      console.error('🤖 AIStore: Error getting group member recommendations:', error);
      set({ error: error.message, loading: false });
    }
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

  // Helper function to get fallback captions
  getFallbackCaptions: (mediaType, mood) => {
    const captionMap = {
      fun: {
        image: [
          '📸 Squad moments ✨', 
          'Living our best life! 🌟', 
          'Good vibes with the crew 🎉',
          'Capturing the magic ✨',
          'Friends who snap together 📷',
          'Making memories one pic at a time 💫',
          'Squad goals achieved 🙌',
          'This is what happiness looks like 😊'
        ],
        video: [
          '🎬 Making memories! 📹', 
          'The gang\'s all here! 🎭', 
          'Epic moments captured 🚀',
          'Action-packed adventures 🎬',
          'Living in the moment 🎥',
          'Squad energy is unmatched ⚡',
          'Good times in motion 🎪',
          'Creating our own movie 🎬'
        ]
      },
      casual: {
        image: [
          'Just chillin\' 😎', 
          'Casual moments 📷', 
          'Simple times together 🤝',
          'Low-key vibes 🌿',
          'Everyday magic ✨',
          'Keeping it real 💯',
          'Simple pleasures 🌸',
          'Just us being us 😌'
        ],
        video: [
          'Random fun 🎥', 
          'Just hanging out 📱', 
          'Everyday adventures 🌈',
          'Spontaneous moments 🎬',
          'Chill mode activated 😎',
          'Nothing fancy, just fun 🎪',
          'Regular day, special people 💛',
          'Casual chaos 🎭'
        ]
      },
      exciting: {
        image: [
          'Adventure time! 🚀', 
          'This is it! ⚡', 
          'Epic squad energy 💫',
          'Adrenaline rush! 🎢',
          'Living on the edge 🔥',
          'Maximum excitement mode 🎆',
          'Can\'t contain this energy! ⚡',
          'Pure adrenaline 🚀'
        ],
        video: [
          'Action-packed! 🎬', 
          'Can\'t contain the excitement! 🎆', 
          'Living the dream! ✨',
          'High energy vibes 🔥',
          'Thrilling moments 🎢',
          'Adventure mode: ON 🚀',
          'Heart racing moments 💓',
          'Pure excitement captured 🎭'
        ]
      },
      nostalgic: {
        image: [
          'Good times 💭', 
          'Memories in the making 📸', 
          'These moments matter 💖',
          'Time stands still 🕰️',
          'Forever friends 👫',
          'Golden memories ✨',
          'Precious moments 💎',
          'Making history together 📚'
        ],
        video: [
          'Time flies 🕰️', 
          'Capturing the feels 🎥', 
          'Forever friends 👯',
          'Moments to remember 💭',
          'Building our story 📖',
          'These are the days 🌅',
          'Memory lane in the making 🛤️',
          'Timeless friendships 💫'
        ]
      },
      celebration: {
        image: [
          'Celebration time! 🎉', 
          'Cheers to us! 🥳', 
          'Making it count! 🎊',
          'Party mode activated 🎪',
          'Success tastes sweet 🍾',
          'Victory dance time 💃',
          'Milestone achieved! 🏆',
          'Worth celebrating 🎈'
        ],
        video: [
          'Party mode ON! 🎬', 
          'Celebrating life! 🎭', 
          'Epic celebration! 🎆',
          'Dance like nobody\'s watching 💃',
          'Cheers to good times 🥂',
          'Celebration vibes 🎪',
          'Party in motion 🎉',
          'Living it up! 🎊'
        ]
      }
    };

    const moodCaptions = captionMap[mood] || captionMap.fun;
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