import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ActivityRequest {
  userId: string
  friendIds?: string[]
  context?: string
  mood?: 'fun' | 'casual' | 'exciting' | 'nostalgic' | 'celebration'
  activityType?: 'hangout' | 'adventure' | 'creative' | 'food' | 'entertainment'
}

// Enhanced fallback activity suggestions with variety and creativity
const getEnhancedFallbackActivities = (mood: string, activityType: string) => {
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

  const moodActivities = activitySets[mood as keyof typeof activitySets] || activitySets.fun;
  const typeActivities = moodActivities[activityType as keyof typeof moodActivities] || moodActivities.hangout;
  
  // Return 3 random activities from the available options
  const shuffled = [...typeActivities].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

// Function to clean and parse AI-generated activities
const cleanAndParseActivities = (rawText: string): string[] => {
  if (!rawText || typeof rawText !== 'string') return [];
  
  // Split by newlines and clean each line
  const lines = rawText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const activities: string[] = [];
  
  for (const line of lines) {
    // Remove numbered prefixes (e.g., "1.", "2)", "- ", etc.)
    let cleaned = line
      .replace(/^\d+[\.\)\-\:]?\s*/, '') // Remove "1. ", "2) ", "3- ", "4: ", etc.
      .replace(/^[\-\*\+]\s*/, '') // Remove "- ", "* ", "+ "
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim();
    
    // Skip if the line is too short or looks like a header/instruction
    if (cleaned.length < 10 || 
        cleaned.toLowerCase().includes('activity') ||
        cleaned.toLowerCase().includes('option') ||
        cleaned.toLowerCase().includes('here are') ||
        cleaned.toLowerCase().includes('suggestions') ||
        cleaned.toLowerCase().includes('plan') ||
        cleaned.toLowerCase().includes('idea')) {
      continue;
    }
    
    // Only add if it's a valid activity and we don't have too many
    if (cleaned.length > 0 && activities.length < 3) {
      activities.push(cleaned);
    }
  }
  
  return activities;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, friendIds = [], context = '', mood = 'fun', activityType = 'hangout' }: ActivityRequest = await req.json()

    // Retrieve user context and friend information
    const { data: user } = await supabase
      .from('users')
      .select('username, display_name')
      .eq('id', userId)
      .single()

    const { data: friends } = await supabase
      .from('users')
      .select('username, display_name')
      .in('id', friendIds)

    // Get recent shared memories/messages for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, created_at')
      .or(`and(sender_id.eq.${userId},group_members.cs.{${friendIds.join(',')}}),and(recipient_id.eq.${userId},sender_id.in.(${friendIds.join(',')}))`)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get user interests for better recommendations
    const { data: userInterests } = await supabase
      .from('user_interests')
      .select('interest_category, interest_value, confidence_score')
      .in('user_id', [userId, ...friendIds])
      .order('confidence_score', { ascending: false })
      .limit(20)

    // Get past group activities for context
    const { data: pastActivities } = await supabase
      .from('friend_group_activities')
      .select('activity_type, activity_description, location, date_occurred')
      .contains('user_ids', [userId])
      .order('date_occurred', { ascending: false })
      .limit(5)

    // Build context for RAG
    const friendNames = friends?.map(f => f.display_name || f.username).join(', ') || 'friends'
    const userName = user?.display_name || user?.username || 'user'
    const recentTopics = recentMessages?.map(m => m.content).join(' ') || ''
    const interests = userInterests?.map(i => `${i.interest_category}: ${i.interest_value}`).join(', ') || ''
    const pastActivityDescriptions = pastActivities?.map(a => a.activity_description).join(', ') || ''
    
    // Create enhanced RAG context
    const ragContext = `
User: ${userName}
Friends: ${friendNames}
Mood: ${mood}
Activity Type: ${activityType}
Context: ${context}
Group Interests: ${interests}
Recent Conversations: ${recentTopics.substring(0, 200)}...
Past Activities: ${pastActivityDescriptions}
    `.trim()

    // Enhanced prompt for activity suggestions
    const systemPrompt = `You are an expert activity planner specializing in creating fun, engaging activities for friend groups. Your suggestions should be practical, achievable, and tailored to the group's interests and dynamics.

IMPORTANT RULES:
- Generate exactly 3 distinct activity suggestions
- Each suggestion should be specific and actionable
- NO numbered lists, bullet points, or prefixes
- Match the ${mood} mood and ${activityType} type perfectly
- Include relevant emojis naturally (1-2 per suggestion)
- Consider the group's interests, past activities, and recent conversations
- Make suggestions feel personal and achievable
- Avoid generic or overly complicated activities
- Focus on activities that bring friends together

Mood Guidelines:
- Fun: Playful, energetic, lighthearted activities
- Casual: Relaxed, low-key, comfortable activities
- Exciting: High-energy, thrilling, adventurous activities
- Nostalgic: Sentimental, meaningful, memory-making activities
- Celebration: Triumphant, joyful, festive activities

Activity Type Guidelines:
- Hangout: Indoor/outdoor social activities at home or casual venues
- Adventure: Outdoor activities, exploration, physical challenges
- Creative: Artistic, crafty, creative expression activities
- Food: Cooking, dining, food-related experiences
- Entertainment: Shows, games, performances, media consumption

Context: ${ragContext}`;

    const userPrompt = `Suggest 3 specific ${mood} ${activityType} activities for this friend group${context ? ` related to: ${context}` : ''}. Make them feel personal and achievable for this specific group.`;

    // Generate activities using OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.8, // Good balance of creativity and coherence
        presence_penalty: 0.6, // Encourage variety
        frequency_penalty: 0.3
      })
    })

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiResponse = await openAIResponse.json()
    
    // Clean and parse the AI response
    const activityText = aiResponse.choices?.[0]?.message?.content || ''
    let activities = cleanAndParseActivities(activityText);
    
    // If we don't have enough activities, use enhanced fallbacks
    if (activities.length < 3) {
      const fallbackActivities = getEnhancedFallbackActivities(mood, activityType);
      // Fill remaining slots with fallbacks
      while (activities.length < 3 && fallbackActivities.length > 0) {
        const fallback = fallbackActivities.shift();
        if (fallback && !activities.includes(fallback)) {
          activities.push(fallback);
        }
      }
    }

    // Ensure we always have exactly 3 activities
    if (activities.length === 0) {
      activities = getEnhancedFallbackActivities(mood, activityType);
    }

    // Store the generated activities for learning/improvement
    await supabase
      .from('ai_generated_content')
      .insert({
        user_id: userId,
        content_type: 'activity_suggestion',
        input_context: ragContext,
        generated_content: activities,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        activities: activities.slice(0, 3), // Ensure exactly 3 activities
        context: ragContext
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in activity-generator:', error)
    
    // Enhanced fallback response
    const requestBody = await req.json().catch(() => ({}));
    const fallbackActivities = getEnhancedFallbackActivities(
      requestBody?.mood || 'fun',
      requestBody?.activityType || 'hangout'
    );
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        activities: fallbackActivities
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 