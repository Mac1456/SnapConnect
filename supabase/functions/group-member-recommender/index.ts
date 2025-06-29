import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const openAIKey = Deno.env.get('OPENAI_API_KEY');

interface MemberRecommenderRequest {
  groupName: string;
  groupInterests: string[];
  friendIds: string[];
  forceRefresh?: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  recent_messages: string[];
  story_captions: string[];
  interests_from_activity: string[];
}

serve(async (req) => {
  console.log('🤖 Group Member Recommender: === FUNCTION START ===');
  console.log('🤖 Group Member Recommender: Request method:', req.method);
  console.log('🤖 Group Member Recommender: Request URL:', req.url);
  console.log('🤖 Group Member Recommender: Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🤖 Group Member Recommender: Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🤖 Group Member Recommender: Starting recommendation process');
    
    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('🤖 Group Member Recommender: Raw request body text:', bodyText);
      
      if (!bodyText) {
        console.log('🤖 Group Member Recommender: ❌ Empty request body');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Empty request body',
            error: 'No data provided'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('🤖 Group Member Recommender: Request body parsed successfully');
      console.log('🤖 Group Member Recommender: Request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('🤖 Group Member Recommender: ❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid JSON in request body',
          error: parseError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    const { groupName, groupInterests, friendIds, forceRefresh } = requestBody;
    
    console.log('🤖 Group Member Recommender: Input parameters:', {
      groupName: groupName || 'undefined',
      groupInterests: groupInterests?.length || 0,
      friendIdsCount: friendIds?.length || 0,
      forceRefresh: forceRefresh || false
    });

    // Minimal validation
    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      console.log('🤖 Group Member Recommender: ❌ No valid friend IDs provided');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No valid friend IDs provided',
          recommendations: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Simple test response - no database access
    console.log('🤖 Group Member Recommender: ✅ Returning test response');
    const testRecommendations = friendIds.slice(0, 2).map((id, index) => ({
      user_id: id,
      reason: `Test recommendation ${index + 1} for ${groupName || 'group'}`,
      compatibility_score: 0.8 - (index * 0.1)
    }));
    
    console.log('🤖 Group Member Recommender: ✅ Test recommendations:', testRecommendations);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Edge function is working - returning test recommendations',
        recommendations: testRecommendations
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('🤖 Group Member Recommender: ❌ Unexpected error:', error);
    console.error('🤖 Group Member Recommender: ❌ Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function extractInterestsFromText(text: string): string[] {
  const interests: string[] = [];
  const commonInterests = [
    'pizza', 'food', 'cooking', 'music', 'movies', 'sports', 'gaming', 'travel',
    'photography', 'art', 'books', 'fitness', 'dancing', 'shopping', 'coffee',
    'wine', 'beer', 'hiking', 'beach', 'party', 'concert', 'festival'
  ];
  
  commonInterests.forEach(interest => {
    if (text.includes(interest)) {
      interests.push(interest);
    }
  });
  
  return [...new Set(interests)]; // Remove duplicates
}

async function getAIRecommendations(
  groupName: string,
  groupInterests: string[],
  userProfiles: UserProfile[]
): Promise<any[]> {
  const prompt = `
You are an expert at recommending group members based on shared interests and compatibility.

Group Context:
- Name: "${groupName}"
- Interests: ${groupInterests.join(', ')}

User Profiles:
${userProfiles.map(profile => `
- ${profile.display_name} (@${profile.username})
  Recent messages: ${profile.recent_messages.slice(0, 3).join('; ')}
  Story captions: ${profile.story_captions.slice(0, 3).join('; ')}
  Detected interests: ${profile.interests_from_activity.join(', ')}
`).join('\n')}

Please recommend the BEST 2-4 users for this group based on:
1. Shared interests with the group theme
2. Communication style compatibility
3. Activity level and engagement

Return ONLY a JSON array with user IDs and brief reasons:
[
  {
    "user_id": "user_id_here",
    "reason": "Brief reason for recommendation",
    "compatibility_score": 0.85
  }
]
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a social group recommendation expert. Always return valid JSON arrays only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();
  
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  try {
    const recommendations = JSON.parse(content);
    return Array.isArray(recommendations) ? recommendations : [];
  } catch (parseError) {
    console.error('🤖 Group Member Recommender: ❌ Failed to parse AI response:', content);
    throw new Error('Invalid JSON response from AI');
  }
}

function getRuleBasedRecommendations(
  groupName: string,
  groupInterests: string[],
  userProfiles: UserProfile[]
): any[] {
  const recommendations = userProfiles.map(profile => {
    let score = 0.5; // Base score
    let reasons: string[] = [];
    
    // Interest matching
    const matchingInterests = profile.interests_from_activity.filter(interest =>
      groupInterests.some(groupInterest => 
        groupInterest.toLowerCase().includes(interest) || 
        interest.includes(groupInterest.toLowerCase())
      )
    );
    
    if (matchingInterests.length > 0) {
      score += 0.3 * matchingInterests.length;
      reasons.push(`Shares ${matchingInterests.length} interests`);
    }
    
    // Name/username relevance to group
    const nameRelevance = checkNameRelevance(profile, groupName, groupInterests);
    if (nameRelevance.score > 0) {
      score += nameRelevance.score;
      reasons.push(nameRelevance.reason);
    }
    
    // Activity level
    const totalActivity = profile.recent_messages.length + profile.story_captions.length;
    if (totalActivity > 5) {
      score += 0.2;
      reasons.push('Active user');
    }
    
    // Content quality (longer messages/captions suggest engagement)
    const avgContentLength = [...profile.recent_messages, ...profile.story_captions]
      .reduce((sum, content) => sum + content.length, 0) / Math.max(totalActivity, 1);
    
    if (avgContentLength > 20) {
      score += 0.1;
      reasons.push('Engaging content');
    }
    
    return {
      user_id: profile.id,
      compatibility_score: Math.min(score, 1.0),
      reason: reasons.length > 0 ? reasons.join(', ') : 'Good potential match',
      profile: {
        username: profile.username,
        display_name: profile.display_name
      }
    };
  });
  
  // Sort by score and return top recommendations
  return recommendations
    .filter(rec => rec.compatibility_score > 0.4)
    .sort((a, b) => b.compatibility_score - a.compatibility_score)
    .slice(0, 5);
}

function checkNameRelevance(
  profile: UserProfile,
  groupName: string,
  groupInterests: string[]
): { score: number; reason: string } {
  const allGroupTerms = [groupName, ...groupInterests].map(term => term.toLowerCase());
  const userTerms = [profile.username, profile.display_name].map(term => term.toLowerCase());
  
  for (const groupTerm of allGroupTerms) {
    for (const userTerm of userTerms) {
      if (userTerm.includes(groupTerm) || groupTerm.includes(userTerm)) {
        return { score: 0.2, reason: 'Name matches group theme' };
      }
    }
  }
  
  return { score: 0, reason: '' };
} 