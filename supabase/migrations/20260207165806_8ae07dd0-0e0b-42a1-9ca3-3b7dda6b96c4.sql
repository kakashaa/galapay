-- Fix RLS policies for voting tables to work with local admin auth system
-- Since the app uses local admin codes (not Supabase Auth), we need to allow public access for management

-- Drop old restrictive policies on voting_games
DROP POLICY IF EXISTS "Anyone can view active games" ON public.voting_games;
DROP POLICY IF EXISTS "Super admins can manage games" ON public.voting_games;

-- Create new permissive policies for voting_games
CREATE POLICY "Anyone can view all games"
ON public.voting_games
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage games"
ON public.voting_games
FOR ALL
USING (true)
WITH CHECK (true);

-- Drop old restrictive policies on voting_sessions
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.voting_sessions;
DROP POLICY IF EXISTS "Super admins can manage sessions" ON public.voting_sessions;

-- Create new permissive policies for voting_sessions
CREATE POLICY "Anyone can view all sessions"
ON public.voting_sessions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage sessions"
ON public.voting_sessions
FOR ALL
USING (true)
WITH CHECK (true);