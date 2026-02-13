-- Create table for storing resume analysis history
CREATE TABLE IF NOT EXISTS resume_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resume_name TEXT NOT NULL,
  job_title TEXT,
  total_score INTEGER NOT NULL,
  section_scores JSONB NOT NULL, -- Stores { keywords, skills, formatting, experience, density }
  analysis_results JSONB, -- Stores { matched_keywords, missing_keywords, etc. }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own analyses"
  ON resume_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON resume_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON resume_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster history lookup
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_created_at ON resume_analyses(created_at DESC);
