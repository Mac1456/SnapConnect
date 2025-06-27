-- SnapConnect RAG Enhancement Schema
-- Run this AFTER the main schema to add AI and group messaging features

-- ========================================
-- ENABLE EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- AI GENERATED CONTENT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'caption', 'story_prompt', 'activity_suggestion'
  input_context TEXT NOT NULL,
  generated_content JSONB NOT NULL, -- Array of generated options
  selected_option INTEGER, -- Which option the user selected (0-based index)
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE -- When the user actually used the content
);

-- ========================================
-- CONTENT EMBEDDINGS TABLE (for RAG)
-- ========================================
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'message', 'story_caption', 'user_interest', 'group_activity'
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- GROUP CHATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_ids UUID[] DEFAULT '{}',
  admin_ids UUID[] DEFAULT '{}',
  group_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER INTERESTS TABLE (for RAG personalization)
-- ========================================
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_category VARCHAR(50) NOT NULL, -- 'hobby', 'music', 'food', 'travel', 'sports', etc.
  interest_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- How confident we are about this interest
  source VARCHAR(50) DEFAULT 'inferred', -- 'explicit', 'inferred', 'activity_based'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_category, interest_value)
);

-- ========================================
-- FRIEND GROUP ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS friend_group_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_ids UUID[] NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'hangout', 'trip', 'event', 'celebration'
  activity_description TEXT NOT NULL,
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ENHANCED MESSAGES TABLE UPDATES
-- ========================================

-- Add AI enhancement columns to existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_suggestion_used INTEGER; -- Which AI suggestion was used
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0; -- For disappearing messages

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_type ON ai_generated_content(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_created_at ON ai_generated_content(created_at);

-- Embedding indexes
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_created_at ON content_embeddings(created_at);

-- Group chat indexes
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);

-- User interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON user_interests(user_id, interest_category);
CREATE INDEX IF NOT EXISTS idx_user_interests_confidence ON user_interests(confidence_score DESC);

-- Friend activities indexes
CREATE INDEX IF NOT EXISTS idx_friend_activities_users ON friend_group_activities USING GIN(user_ids);
CREATE INDEX IF NOT EXISTS idx_friend_activities_date ON friend_group_activities(date_occurred);

-- Enhanced messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_ai_generated ON messages(ai_generated);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- AI Generated Content policies
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own AI content" ON ai_generated_content
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI content" ON ai_generated_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI content" ON ai_generated_content
  FOR UPDATE USING (auth.uid() = user_id);

-- Content Embeddings policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group Chats policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);
CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- User Interests policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interests" ON user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Friend Group Activities policies
ALTER TABLE friend_group_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view activities they're part of" ON friend_group_activities
  FOR SELECT USING (auth.uid() = ANY(user_ids));
CREATE POLICY "Users can create activities for themselves" ON friend_group_activities
  FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user interests for RAG context
CREATE OR REPLACE FUNCTION get_user_interests_for_context(user_uuid UUID)
RETURNS TABLE (
  category VARCHAR,
  interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.interest_category,
    array_agg(ui.interest_value ORDER BY ui.confidence_score DESC) as interests
  FROM user_interests ui
  WHERE ui.user_id = user_uuid
    AND ui.confidence_score > 0.3
  GROUP BY ui.interest_category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar content using embeddings
CREATE OR REPLACE FUNCTION find_similar_content(
  query_embedding VECTOR(1536),
  user_uuid UUID,
  content_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  content_id UUID,
  content TEXT,
  content_type VARCHAR,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content,
    ce.content_type,
    (1 - (ce.embedding <=> query_embedding))::DECIMAL as similarity
  FROM content_embeddings ce
  WHERE ce.user_id = user_uuid
    AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND (1 - (ce.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar content across a group of users
CREATE OR REPLACE FUNCTION find_similar_content_among_users(
  query_embedding VECTOR(1536),
  user_uuids UUID[],
  content_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.1,
  max_results_per_user INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  total_similarity REAL,
  top_content TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_user_content AS (
    SELECT
      ce.user_id,
      (1 - (ce.embedding <=> query_embedding))::REAL AS similarity,
      ce.content,
      ROW_NUMBER() OVER(PARTITION BY ce.user_id ORDER BY (1 - (ce.embedding <=> query_embedding)) DESC) as rn
    FROM content_embeddings ce
    WHERE ce.user_id = ANY(user_uuids)
      AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
      AND (1 - (ce.embedding <=> query_embedding)) > similarity_threshold
  )
  SELECT
    ruc.user_id,
    SUM(ruc.similarity) as total_similarity,
    array_agg(ruc.content ORDER BY ruc.similarity DESC) as top_content
  FROM ranked_user_content ruc
  WHERE ruc.rn <= max_results_per_user
  GROUP BY ruc.user_id
  ORDER BY total_similarity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_interest(
  user_uuid UUID,
  category VARCHAR,
  value TEXT,
  confidence DECIMAL DEFAULT 0.5,
  source_type VARCHAR DEFAULT 'inferred'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source)
  VALUES (user_uuid, category, value, confidence, source_type)
  ON CONFLICT (user_id, interest_category, interest_value)
  DO UPDATE SET 
    confidence_score = GREATEST(user_interests.confidence_score, confidence),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_content;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample user interests (you can remove this in production)
/*
INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'hobby', 'photography', 0.8, 'explicit'),
  ('550e8400-e29b-41d4-a716-446655440001', 'music', 'indie rock', 0.7, 'inferred'),
  ('550e8400-e29b-41d4-a716-446655440002', 'food', 'italian cuisine', 0.9, 'activity_based'),
  ('550e8400-e29b-41d4-a716-446655440002', 'travel', 'europe', 0.6, 'inferred');
*/ 