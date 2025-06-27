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
    
    // Create RAG prompt based on friend group context
    const ragContext = `
User: ${userName}
Friends: ${friendNames}
Media Type: ${mediaType}
Mood: ${mood}
Recent Context: ${context}
Recent Conversations: ${recentTopics.substring(0, 200)}...
    `.trim()

    // Generate caption using OpenAI (you'll need to add your OpenAI API key)
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a creative caption generator for a social media app like Snapchat. Generate fun, engaging captions for friend group posts based on their shared context and memories. 

Guidelines:
- Keep captions under 50 characters when possible
- Match the specified mood (${mood})
- Reference shared experiences when context is provided
- Use appropriate emojis
- Sound natural and conversational
- Avoid overly generic phrases
- Make it feel personal to the friend group

Context: ${ragContext}`
          },
          {
            role: 'user',
            content: `Generate 3 different caption options for a ${mediaType} post with a ${mood} mood. ${context ? `Context: ${context}` : ''}`
          }
        ],
        max_tokens: 200,
        temperature: 0.8
      })
    })

    const aiResponse = await openAIResponse.json()
    
    // Parse the AI response to extract caption options
    const captionText = aiResponse.choices?.[0]?.message?.content || ''
    const captions = captionText.split('\n').filter(line => line.trim()).slice(0, 3)

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
        captions: captions.length > 0 ? captions : [
          `${mediaType === 'image' ? '📸' : '🎬'} Squad moments ✨`,
          `Living our best life! 🌟`,
          `Good vibes with the crew 🎉`
        ],
        context: ragContext
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in caption-generator:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        captions: [
          '📸 Squad moments ✨',
          'Living our best life! 🌟',
          'Good vibes with the crew 🎉'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 