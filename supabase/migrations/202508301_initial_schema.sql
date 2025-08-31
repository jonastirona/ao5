-- Enum types for consistency
CREATE TYPE puzzle_type AS ENUM ('2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'megaminx', 'pyraminx', 'skewb', 'sq1', '3x3_oh', '3x3_bld');
CREATE TYPE penalty_type AS ENUM ('none', '+2', 'DNF');

-- User profiles, linked to auth.users table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions to group solves together
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  puzzle puzzle_type NOT NULL,
  session_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- The core table for every single solve
CREATE TABLE solves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  puzzle puzzle_type NOT NULL,
  time_ms INTEGER NOT NULL,
  scramble TEXT NOT NULL,
  penalty penalty_type NOT NULL DEFAULT 'none',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Add indexes for faster lookups on common queries
CREATE INDEX solves_user_id_puzzle_idx ON solves (user_id, puzzle);

-- A table to store user's personal bests, updated via database functions
CREATE TABLE personal_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  puzzle puzzle_type NOT NULL,
  best_single_ms INTEGER,
  best_ao5_ms INTEGER,
  best_ao12_ms INTEGER,
  best_ao100_ms INTEGER,
  best_ao_all_ms INTEGER,
  UNIQUE (user_id, puzzle)
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solves ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_bests ENABLE ROW LEVEL SECURITY;

-- Policies to ensure users can only access their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can manage own sessions" ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own solves" ON solves FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own PBs" ON personal_bests FOR ALL USING (auth.uid() = user_id);