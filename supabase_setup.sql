-- 1. Create the table
CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT,
  application_date DATE NOT NULL,
  source TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('Applied', 'Interview Scheduled', 'Offer', 'Rejected', 'On Hold')),
  hr_name TEXT,
  hr_email TEXT,
  salary TEXT,
  job_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (Security Policy)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Who can do what)
-- View own data
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
-- Insert own data
CREATE POLICY "Users can insert own applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Update own data
CREATE POLICY "Users can update own applications" ON applications FOR UPDATE USING (auth.uid() = user_id);
-- Delete own data
CREATE POLICY "Users can delete own applications" ON applications FOR DELETE USING (auth.uid() = user_id);

-- 4. Enable Realtime (This is CRITICAL for sync!)
alter publication supabase_realtime add table applications;
