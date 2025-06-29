import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CaptionRequest {
  userId: string
  friendIds?: string[]
  mediaType: 'image' | 'video'
  context?: string
  mood?: 'fun' | 'casual' | 'exciting' | 'nostalgic' | 'celebration'
}

// Enhanced fallback captions with more variety and creativity
const getEnhancedFallbackCaptions = (mediaType: string, mood: string) => {
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
        'Spontaneous adventures with the gang 🎪'
      ],
      video: [
        'When the squad gets together magic happens ✨',
        'Living our movie moment 🎬',
        'Action-packed memories in the making 🚀',
        'Epic adventures with epic people 🎭',
        'This is how we roll 🎪',
        'Creating content and chaos 📹',
        'Main character energy with the crew 🌟',
        'Behind the scenes of our friendship 🎥'
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
        'Regular day, irregular friends 🌈'
      ],
      video: [
        'Unscripted moments are the best moments 📱',
        'Casual vibes, eternal memories 🎥',
        'Just another day in paradise with y\'all 🌴',
        'Spontaneous storytelling 📖',
        'Raw, real, and ridiculously fun 🎬',
        'Documenting the ordinary extraordinary 📹',
        'Chill mode with chaotic energy 😎',
        'Life unfiltered with the best people 🎭'
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
        'Can\'t contain this level of excitement 🎆'
      ],
      video: [
        'High octane friendship fuel ⛽',
        'Thrills, chills, and friendship skills 🎢',
        'Living on the edge of awesome 🔥',
        'Maximum energy, maximum memories 🚀',
        'Adrenaline addicts anonymous meeting 💨',
        'Heart pounding, soul bonding 💓',
        'This is our action movie montage 🎬',
        'Excitement overload in progress 🎆'
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
        'Forever friends in a temporary world 🌍'
      ],
      video: [
        'Capturing the essence of eternal friendship 🎥',
        'These moments will echo through time 🔄',
        'Building our legacy one laugh at a time 📹',
        'Time travelers documenting the journey 🚀',
        'Memory lane construction in progress 🛤️',
        'Friendship that ages like fine wine 🍷',
        'Creating tomorrow\'s favorite memories today 💭',
        'Timeless bonds in motion 🎬'
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
        'Achievement unlocked: Epic celebration 🔓'
      ],
      video: [
        'Dance like the world is our stage 💃',
        'Celebration compilation in real time 🎬',
        'Party documentary featuring legends 📹',
        'This is how champions celebrate 🏆',
        'Victory lap with the victory squad 🏃',
        'Cheers to the journey and the destination 🥂',
        'Living proof that dreams come true 🌟',
        'Celebration masterclass in session 🎭'
      ]
    }
  };

  const moodCaptions = captionSets[mood as keyof typeof captionSets] || captionSets.fun;
  const typeCaptions = moodCaptions[mediaType as keyof typeof moodCaptions] || moodCaptions.image;
  
  // Return 3 random captions from the available options
  const shuffled = [...typeCaptions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

// Function to clean and parse AI-generated captions
const cleanAndParseCaptions = (rawText: string): string[] => {
  if (!rawText || typeof rawText !== 'string') return [];
  
  // Split by newlines and clean each line
  const lines = rawText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const captions: string[] = [];
  
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

    const { userId, friendIds = [], mediaType, context = '', mood = 'fun' }: CaptionRequest = await req.json()

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

    // Build context for RAG
    const friendNames = friends?.map(f => f.display_name || f.username).join(', ') || 'friends'
    const userName = user?.display_name || user?.username || 'user'
    const recentTopics = recentMessages?.map(m => m.content).join(' ') || ''
    
    // Create enhanced RAG context
    const ragContext = `
User: ${userName}
Friends: ${friendNames}
Media Type: ${mediaType}
Mood: ${mood}
Context: ${context}
Recent Conversations: ${recentTopics.substring(0, 200)}...
    `.trim()

    // Enhanced prompt for more creative and coherent captions
    const systemPrompt = `You are a creative social media caption writer specializing in authentic, engaging captions for friend groups. Your captions should feel natural, personal, and capture the essence of real friendships.

IMPORTANT RULES:
- Generate exactly 3 distinct caption options
- Each caption should be 15-40 characters when possible
- NO numbered lists, bullet points, or prefixes
- Match the ${mood} mood perfectly
- Use relevant emojis naturally (1-3 per caption)
- Sound conversational and authentic
- Avoid clichés and generic phrases
- Make each caption unique and creative

Mood Guidelines:
- Fun: Playful, energetic, lighthearted
- Casual: Relaxed, natural, comfortable
- Exciting: High-energy, thrilling, adventurous
- Nostalgic: Sentimental, meaningful, timeless
- Celebration: Triumphant, joyful, festive

Context: ${ragContext}`;

    const userPrompt = `Create 3 creative ${mood} captions for a ${mediaType} post${context ? ` about: ${context}` : ''}. Make them feel personal to this friend group.`;

    // Generate caption using OpenAI
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
        max_tokens: 150,
        temperature: 0.9, // Increased for more creativity
        presence_penalty: 0.6, // Encourage variety
        frequency_penalty: 0.3
      })
    })

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiResponse = await openAIResponse.json()
    
    // Clean and parse the AI response
    const captionText = aiResponse.choices?.[0]?.message?.content || ''
    let captions = cleanAndParseCaptions(captionText);
    
    // If we don't have enough captions, use enhanced fallbacks
    if (captions.length < 3) {
      const fallbackCaptions = getEnhancedFallbackCaptions(mediaType, mood);
      // Fill remaining slots with fallbacks
      while (captions.length < 3 && fallbackCaptions.length > 0) {
        const fallback = fallbackCaptions.shift();
        if (fallback && !captions.includes(fallback)) {
          captions.push(fallback);
        }
      }
    }

    // Ensure we always have exactly 3 captions
    if (captions.length === 0) {
      captions = getEnhancedFallbackCaptions(mediaType, mood);
    }

    // Store the generated captions for learning/improvement
    await supabase
      .from('ai_generated_content')
      .insert({
        user_id: userId,
        content_type: 'caption',
        input_context: ragContext,
        generated_content: captions,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        captions: captions.slice(0, 3), // Ensure exactly 3 captions
        context: ragContext
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in caption-generator:', error)
    
    // Enhanced fallback response
    const fallbackCaptions = getEnhancedFallbackCaptions(
      (await req.json().catch(() => ({})))?.mediaType || 'image',
      (await req.json().catch(() => ({})))?.mood || 'fun'
    );
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        captions: fallbackCaptions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 