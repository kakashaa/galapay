-- Create voting_games table for admin-managed games
CREATE TABLE public.voting_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_arabic TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voting_sessions table for managing voting periods
CREATE TABLE public.voting_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'جلسة تصويت',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  results_sent BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_votes table to track votes
CREATE TABLE public.game_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.voting_sessions(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.voting_games(id) ON DELETE CASCADE,
  voter_identifier TEXT NOT NULL, -- fingerprint/localStorage ID
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, game_id, voter_identifier)
);

-- Create index for faster queries
CREATE INDEX idx_game_votes_session ON public.game_votes(session_id);
CREATE INDEX idx_game_votes_voter ON public.game_votes(voter_identifier, session_id);
CREATE INDEX idx_voting_sessions_active ON public.voting_sessions(is_active, ends_at);

-- Enable RLS
ALTER TABLE public.voting_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voting_games
CREATE POLICY "Anyone can view active games"
ON public.voting_games FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage games"
ON public.voting_games FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for voting_sessions
CREATE POLICY "Anyone can view active sessions"
ON public.voting_sessions FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage sessions"
ON public.voting_sessions FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for game_votes
CREATE POLICY "Anyone can view votes"
ON public.game_votes FOR SELECT
USING (true);

CREATE POLICY "Anyone can vote"
ON public.game_votes FOR INSERT
WITH CHECK (true);

-- Enable realtime for votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_votes;

-- Function to get vote counts for a session
CREATE OR REPLACE FUNCTION public.get_session_vote_counts(p_session_id UUID)
RETURNS TABLE(game_id UUID, vote_count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT game_id, COUNT(*) as vote_count
  FROM public.game_votes
  WHERE session_id = p_session_id
  GROUP BY game_id
  ORDER BY vote_count DESC;
$$;