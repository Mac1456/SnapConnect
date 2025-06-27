import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const openAIKey = Deno.env.get('OPENAI_API_KEY');

interface MemberRecommenderRequest {
  groupName: string;
  groupInterests: string[];
  friendIds: string[];
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

    const { groupName, groupInterests, friendIds }: MemberRecommenderRequest = await req.json();

    if (!friendIds || friendIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // 1. Create a content string to embed
    const contentToEmbed = `Group Name: ${groupName}. Group Interests: ${groupInterests.join(', ')}`;

    // 2. Generate embedding for the content string
    const openAIResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: contentToEmbed,
      })
    });

    if (!openAIResponse.ok) {
      const errorBody = await openAIResponse.text();
      throw new Error(`OpenAI embedding request failed: ${errorBody}`);
    }

    const embeddingResponse = await openAIResponse.json();
    const embedding = embeddingResponse.data?.[0]?.embedding;

    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }

    // 3. Call the SQL function to get recommendations
    const { data: recommendations, error: rpcError } = await supabase
      .rpc('find_similar_content_among_users', {
        query_embedding: embedding,
        user_uuids: friendIds,
        similarity_threshold: 0.1,
        max_results_per_user: 5
      });

    if (rpcError) throw rpcError;

    return new Response(
      JSON.stringify({ success: true, recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in group-member-recommender:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ success: false, error: error.message, details: error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 