-- Draftwork Database Schema
-- Run this ENTIRE script in Supabase SQL Editor

-- Helper function to check document ownership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_document_owner(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = doc_id
    AND documents.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled document',
  content TEXT DEFAULT '',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document shares
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'edit' CHECK (permission IN ('view', 'edit', 'comment')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_document ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON document_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles insert for auth users" ON profiles;
DROP POLICY IF EXISTS "Owners can insert documents" ON documents;
DROP POLICY IF EXISTS "Owners can read their documents" ON documents;
DROP POLICY IF EXISTS "Owners can update their documents" ON documents;
DROP POLICY IF EXISTS "Owners can delete their documents" ON documents;
DROP POLICY IF EXISTS "Users can read shared documents" ON documents;
DROP POLICY IF EXISTS "Shared editors can update documents" ON documents;
DROP POLICY IF EXISTS "Owners can insert shares" ON document_shares;
DROP POLICY IF EXISTS "Owners can delete shares" ON document_shares;
DROP POLICY IF EXISTS "Users can view shares they own or that are on their docs" ON document_shares;

-- Profiles policies (no cross-table references, safe)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Profiles insert for auth users"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Documents policies (no cross-table references, safe)
CREATE POLICY "Owners can insert documents"
  ON documents FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can read their documents"
  ON documents FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their documents"
  ON documents FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their documents"
  ON documents FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Users can read shared documents"
  ON documents FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = documents.id
      AND document_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "Shared editors can update documents"
  ON documents FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = documents.id
      AND document_shares.user_id = auth.uid()
      AND document_shares.permission = 'edit'
    )
  );

-- Document shares policies (uses is_document_owner function to avoid recursion)
CREATE POLICY "Owners can insert shares"
  ON document_shares FOR INSERT WITH CHECK (
    is_document_owner(document_shares.document_id)
  );

CREATE POLICY "Owners can delete shares"
  ON document_shares FOR DELETE USING (
    is_document_owner(document_shares.document_id)
  );

CREATE POLICY "Users can view shares they own or that are on their docs"
  ON document_shares FOR SELECT USING (
    user_id = auth.uid()
    OR is_document_owner(document_shares.document_id)
  );

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Users with access can add comments" ON comments;
DROP POLICY IF EXISTS "Users with access can read comments" ON comments;
CREATE POLICY "Users with access can read comments"
  ON comments FOR SELECT USING (
    is_document_owner(comments.document_id)
    OR EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = comments.document_id
      AND document_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with access can add comments"
  ON comments FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      is_document_owner(comments.document_id)
      OR EXISTS (
        SELECT 1 FROM document_shares
        WHERE document_shares.document_id = comments.document_id
        AND document_shares.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE USING (user_id = auth.uid());

-- Create profiles for any existing users who signed up before the trigger
INSERT INTO profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
