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
    console.log('🤖 Group Member Recommender: Starting function...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { groupName, groupInterests, friendIds }: MemberRecommenderRequest = await req.json();
    
    console.log('🤖 Group Member Recommender: Request data:', {
      groupName,
      groupInterests,
      friendIds: friendIds?.length || 0,
      hasOpenAIKey: !!openAIKey
    });

    if (!friendIds || friendIds.length === 0) {
      console.log('🤖 Group Member Recommender: No friends provided, returning empty recommendations');
      return new Response(
        JSON.stringify({ success: true, recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!openAIKey) {
      console.error('🤖 Group Member Recommender: OpenAI API key not found');
      return new Response(
        JSON.stringify({ success: true, recommendations: [], message: 'AI features not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // 1. Create a content string to embed
    const contentToEmbed = `Group Name: ${groupName}. Group Interests: ${groupInterests.join(', ')}`;
    console.log('🤖 Group Member Recommender: Content to embed:', contentToEmbed);

    // 2. Generate embedding for the content string
    console.log('🤖 Group Member Recommender: Calling OpenAI for embedding...');
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
      console.error('🤖 Group Member Recommender: OpenAI embedding failed:', errorBody);
      return new Response(
        JSON.stringify({ success: true, recommendations: [], message: 'AI embedding failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const embeddingResponse = await openAIResponse.json();
    const embedding = embeddingResponse.data?.[0]?.embedding;

    if (!embedding) {
      console.error('🤖 Group Member Recommender: No embedding received from OpenAI');
      return new Response(
        JSON.stringify({ success: true, recommendations: [], message: 'Failed to generate embedding' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('🤖 Group Member Recommender: Embedding generated successfully, length:', embedding.length);

    // 3. Call the SQL function to get recommendations
    console.log('🤖 Group Member Recommender: Calling SQL function with params:', {
      user_uuids: friendIds,
      similarity_threshold: 0.1,
      max_results_per_user: 5
    });

    const { data: recommendations, error: rpcError } = await supabase
      .rpc('find_similar_content_among_users', {
        query_embedding: embedding,
        user_uuids: friendIds,
        similarity_threshold: 0.1,
        max_results_per_user: 5
      });

    if (rpcError) {
      console.error('🤖 Group Member Recommender: SQL function error:', rpcError);
      return new Response(
        JSON.stringify({ success: true, recommendations: [], message: 'Database query failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('🤖 Group Member Recommender: SQL function returned:', recommendations?.length || 0, 'recommendations');

    if (!recommendations || recommendations.length === 0) {
      console.log('🤖 Group Member Recommender: No recommendations found - likely no embeddings data yet');
      return new Response(
        JSON.stringify({ 
          success: true, 
          recommendations: [], 
          message: 'No similar content found - AI will improve as more content is added' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, recommendations: recommendations || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('🤖 Group Member Recommender: Error:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations: [], 
        message: `AI recommendations temporarily unavailable: ${error.message}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}); 