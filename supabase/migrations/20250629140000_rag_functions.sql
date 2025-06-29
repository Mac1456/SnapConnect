-- Create content_embeddings table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_created_at ON content_embeddings(created_at);

-- Function to find similar content across a group of users
CREATE OR REPLACE FUNCTION find_similar_content_among_users(
  query_embedding VECTOR(1536),
  user_uuids UUID[],
  similarity_threshold FLOAT DEFAULT 0.3,
  max_results_per_user INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  content TEXT,
  content_type VARCHAR(50),
  similarity FLOAT,
  metadata JSONB
) 
LANGUAGE SQL
AS $$
  SELECT 
    ce.user_id,
    ce.content,
    ce.content_type,
    (ce.embedding <=> query_embedding) * -1 + 1 AS similarity,
    ce.metadata
  FROM content_embeddings ce
  WHERE ce.user_id = ANY(user_uuids)
    AND (ce.embedding <=> query_embedding) * -1 + 1 >= similarity_threshold
  ORDER BY ce.user_id, similarity DESC
  LIMIT max_results_per_user * array_length(user_uuids, 1);
$$;

-- Enable RLS
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view own embeddings" ON content_embeddings;
DROP POLICY IF EXISTS "Users can insert own embeddings" ON content_embeddings;
DROP POLICY IF EXISTS "Users can update own embeddings" ON content_embeddings;
DROP POLICY IF EXISTS "Users can delete own embeddings" ON content_embeddings;

CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own embeddings" ON content_embeddings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own embeddings" ON content_embeddings
  FOR DELETE USING (auth.uid() = user_id); 