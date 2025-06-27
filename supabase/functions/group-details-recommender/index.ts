import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const openAIKey = Deno.env.get('OPENAI_API_KEY');

interface GroupDetailsRequest {
  memberIds: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { memberIds }: GroupDetailsRequest = await req.json();

    if (!memberIds || memberIds.length === 0) {
      throw new Error('Missing or empty memberIds');
    }

    // 1. Fetch user details (for names)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, username')
      .in('id', memberIds);

    if (usersError) throw usersError;

    // 2. Fetch recent messages involving these users
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, content')
      .or(`sender_id.in.(${memberIds.join(',')}),recipient_id.in.(${memberIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesError) throw messagesError;

    // 3. Fetch recent story captions from these users
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('user_id, caption')
      .in('user_id', memberIds)
      .not('caption', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (storiesError) throw storiesError;

    // 4. Construct the prompt for OpenAI
    const userNames = users?.map(u => u.display_name || u.username).join(', ');
    const messageContext = messages?.map(m => `${users?.find(u => u.id === m.sender_id)?.display_name || 'User'}: ${m.content}`).join('\\n');
    const storyContext = stories?.map(s => `${users?.find(u => u.id === s.user_id)?.display_name || 'User'} posted a story: ${s.caption}`).join('\\n');

    const prompt = `
      Based on the following users and their recent activity, suggest a creative and relevant group chat name and a list of 5 interests for their group.
      The users are: ${userNames}.

      Their recent messages include:
      ${messageContext}

      Their recent story captions include:
      ${storyContext}

      RULES:
      - The group name should be fun, short, and relevant to their conversations and interests. Do not use quotes in the name.
      - The interests should be a JSON array of 5 strings.
      - Your response MUST be a valid JSON object with the keys "groupName" and "groupInterests".
      - Example Response: {"groupName": "Weekend Warriors", "groupInterests": ["hiking", "brunch", "live music", "memes", "road trips"]}
    `;

    // 5. Call OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openAIResponse.ok) {
      const errorBody = await openAIResponse.text();
      throw new Error(`OpenAI request failed: ${errorBody}`);
    }

    const completion = await openAIResponse.json();
    const suggestions = JSON.parse(completion.choices[0].message.content);

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in group-details-recommender:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ success: false, error: error.message, details: error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 