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
    if (!groupName && (!groupInterests || groupInterests.length === 0)) return;
    
    // If forceRefresh is true, clear previous recommendations first
    if (forceRefresh) {
      set({ groupMemberRecommendations: [], error: null });
    }
    
    try {
      console.log('🤖 AIStore: Getting group member recommendations for:', { groupName, groupInterests, friendIds: friendIds?.length || 0, forceRefresh });
      set({ loading: true, error: null });

      const { data, error } = await supabase.functions.invoke('group-member-recommender', {
        body: { groupName, groupInterests, friendIds, forceRefresh },
      });

      if (error) {
        console.error('🤖 AIStore: Edge Function error:', error);
        throw error;
      }

      if (data && data.success) {
        // Log any message from the AI service
        if (data.message) {
          console.log('🤖 AIStore: AI service message:', data.message);
        }

        // We need to map the recommended user_ids back to full friend objects
        const { friends } = useSupabaseFriendStore.getState();
        const recommendedFriends = (data.recommendations || [])
          .map(rec => {
            const friend = friends.find(f => f.id === rec.user_id);
            return friend ? { ...friend, similarity: rec.total_similarity } : null;
          })
          .filter(Boolean); // Filter out any nulls if a friend wasn't found

        console.log('🤖 AIStore: Successfully got', recommendedFriends.length, 'AI recommendations');
        
        // If AI returned no recommendations, use fallback
        if (recommendedFriends.length === 0) {
          console.log('🤖 AIStore: No AI recommendations, using fallback');
          const fallbackRecommendations = get().getFallbackMemberRecommendations(
            groupName, 
            groupInterests, 
            friends, 
            friendIds
          );
          
          set({ 
            groupMemberRecommendations: fallbackRecommendations, 
            error: data.message || 'Using fallback recommendations',
            loading: false 
          });
          return fallbackRecommendations;
        }
        
        set({ groupMemberRecommendations: recommendedFriends, loading: false });
        return recommendedFriends;
      } else {
        throw new Error(data?.error || 'Failed to get group member recommendations.');
      }
    } catch (error) {
      console.error('🤖 AIStore: Error getting group member recommendations:', error);
      
      // Fallback: provide simple recommendations based on available friends
      const { friends } = useSupabaseFriendStore.getState();
      const fallbackRecommendations = get().getFallbackMemberRecommendations(
        groupName, 
        groupInterests, 
        friends, 
        friendIds
      );
      
      console.log('🤖 AIStore: Using fallback recommendations:', fallbackRecommendations.length);
      set({ 
        groupMemberRecommendations: fallbackRecommendations, 
        error: `AI recommendations unavailable: ${error.message}`, 
        loading: false 
      });
      
      return fallbackRecommendations;
    }
  },

  // Fallback member recommendations when AI is unavailable
  getFallbackMemberRecommendations: (groupName, groupInterests, allFriends, excludedIds = []) => {
    if (!allFriends || allFriends.length === 0) return [];
    
    // Filter out already selected friends
    const availableFriends = allFriends.filter(friend => !excludedIds.includes(friend.id));
    
    // If we have group interests, try to match friends based on username/display name
    if (groupInterests && groupInterests.length > 0) {
      const interestKeywords = groupInterests.map(interest => interest.toLowerCase());
      const matchedFriends = availableFriends.filter(friend => {
        const friendText = `${friend.username} ${friend.display_name}`.toLowerCase();
        return interestKeywords.some(keyword => friendText.includes(keyword));
      });
      
      if (matchedFriends.length > 0) {
        return matchedFriends.slice(0, 3).map(friend => ({ ...friend, similarity: 0.8 }));
      }
    }
    
    // If group name contains keywords, try to match
    if (groupName) {
      const nameKeywords = groupName.toLowerCase().split(' ');
      const matchedFriends = availableFriends.filter(friend => {
        const friendText = `${friend.username} ${friend.display_name}`.toLowerCase();
        return nameKeywords.some(keyword => keyword.length > 2 && friendText.includes(keyword));
      });
      
      if (matchedFriends.length > 0) {
        return matchedFriends.slice(0, 3).map(friend => ({ ...friend, similarity: 0.7 }));
      }
    }
    
    // Random fallback - suggest up to 2 random friends
    const shuffled = [...availableFriends].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2).map(friend => ({ ...friend, similarity: 0.5 }));
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