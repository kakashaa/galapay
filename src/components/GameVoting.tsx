import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Check, Vote, Star, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface VotingGame {
  id: string;
  name: string;
  name_arabic: string;
  avatar_url: string | null;
  vote_count: number;
}

interface VotingSession {
  id: string;
  title: string;
  ends_at: string;
  is_active: boolean;
}

const MAX_VOTES = 4;

// Generate unique voter ID
const getVoterId = (): string => {
  const storageKey = 'gala_voter_id';
  let voterId = localStorage.getItem(storageKey);
  if (!voterId) {
    voterId = `voter_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, voterId);
  }
  return voterId;
};

const GameVoting = () => {
  const [session, setSession] = useState<VotingSession | null>(null);
  const [games, setGames] = useState<VotingGame[]>([]);
  const [votedGameIds, setVotedGameIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { toast } = useToast();
  
  const voterId = useMemo(() => getVoterId(), []);

  // Load active session and games
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get active session
        const { data: sessionData, error: sessionError } = await supabase
          .from('voting_sessions')
          .select('*')
          .eq('is_active', true)
          .gte('ends_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (sessionError || !sessionData) {
          setLoading(false);
          return;
        }

        setSession(sessionData);

        // Get games with vote counts
        const { data: gamesData, error: gamesError } = await supabase
          .from('voting_games')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (gamesError) throw gamesError;

        // Get vote counts for this session
        const { data: voteCounts } = await supabase
          .rpc('get_session_vote_counts', { p_session_id: sessionData.id });

        // Get user's votes in this session
        const { data: userVotes } = await supabase
          .from('game_votes')
          .select('game_id')
          .eq('session_id', sessionData.id)
          .eq('voter_identifier', voterId);

        const voteCountMap = new Map(
          (voteCounts || []).map((vc: { game_id: string; vote_count: number }) => [vc.game_id, vc.vote_count])
        );

        const gamesWithCounts = (gamesData || []).map(game => ({
          ...game,
          vote_count: Number(voteCountMap.get(game.id) || 0)
        }));

        setGames(gamesWithCounts);
        setVotedGameIds(new Set((userVotes || []).map(v => v.game_id)));
      } catch (error) {
        console.error('Error loading voting data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [voterId]);

  // Subscribe to realtime vote updates
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('game_votes_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_votes',
          filter: `session_id=eq.${session.id}`
        },
        async () => {
          // Refresh vote counts
          const { data: voteCounts } = await supabase
            .rpc('get_session_vote_counts', { p_session_id: session.id });

          const voteCountMap = new Map(
            (voteCounts || []).map((vc: { game_id: string; vote_count: number }) => [vc.game_id, vc.vote_count])
          );

          setGames(prev => prev.map(game => ({
            ...game,
            vote_count: Number(voteCountMap.get(game.id) || 0)
          })));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Countdown timer
  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(session.ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('انتهى التصويت');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleVote = async (gameId: string) => {
    if (!session || votedGameIds.has(gameId) || votedGameIds.size >= MAX_VOTES) return;

    setVoting(gameId);
    try {
      const { error } = await supabase
        .from('game_votes')
        .insert({
          session_id: session.id,
          game_id: gameId,
          voter_identifier: voterId
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'لقد صوتت مسبقاً',
            description: 'لا يمكنك التصويت لنفس اللعبة مرتين',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }

      setVotedGameIds(prev => new Set([...prev, gameId]));
      setGames(prev => prev.map(g => 
        g.id === gameId ? { ...g, vote_count: g.vote_count + 1 } : g
      ));

      toast({
        title: 'تم التصويت بنجاح! ✨',
        description: `متبقي لك ${MAX_VOTES - votedGameIds.size - 1} أصوات`
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'حدث خطأ',
        description: 'فشل في التصويت، حاول مرة أخرى',
        variant: 'destructive'
      });
    } finally {
      setVoting(null);
    }
  };

  // Get sorted games (top 4 first)
  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => b.vote_count - a.vote_count);
  }, [games]);

  const topGames = sortedGames.slice(0, 4);
  const maxVotes = Math.max(...games.map(g => g.vote_count), 1);
  const remainingVotes = MAX_VOTES - votedGameIds.size;
  const isVotingEnded = timeLeft === 'انتهى التصويت';

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!session || games.length === 0) {
    return null; // No active voting session
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="neon-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-amber-600 flex items-center justify-center">
            <Vote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">🎮 تصويت الألعاب</h2>
            <p className="text-xs text-muted-foreground">{session.title}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={isVotingEnded ? "destructive" : "secondary"} className="gap-1">
            <Clock className="w-3 h-3" />
            {timeLeft}
          </Badge>
          <span className="text-xs text-muted-foreground">
            أصواتك: {votedGameIds.size}/{MAX_VOTES}
          </span>
        </div>
      </div>

      {/* Remaining votes indicator */}
      {!isVotingEnded && remainingVotes > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary">
            متبقي لك <span className="font-bold">{remainingVotes}</span> {remainingVotes === 1 ? 'صوت' : 'أصوات'}
          </span>
        </div>
      )}

      {/* Top 4 Leaderboard */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Trophy className="w-4 h-4 text-warning" />
          <span>المتصدرون</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {topGames.map((game, index) => (
            <motion.div
              key={game.id}
              layout
              className={`p-3 rounded-xl border ${
                index === 0 
                  ? 'bg-gradient-to-br from-warning/20 to-amber-600/10 border-warning/30' 
                  : 'bg-card/50 border-border/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg font-bold ${
                  index === 0 ? 'text-warning' : 'text-muted-foreground'
                }`}>
                  #{index + 1}
                </span>
                {game.avatar_url ? (
                  <img 
                    src={game.avatar_url} 
                    alt={game.name_arabic}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                )}
                <span className="font-medium text-sm truncate flex-1">{game.name_arabic}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(game.vote_count / maxVotes) * 100} 
                  className="h-2 flex-1"
                />
                <span className="text-xs font-bold text-primary">{game.vote_count}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* All Games to Vote */}
      {!isVotingEnded && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Vote className="w-4 h-4" />
            <span>صوّت لألعابك المفضلة</span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {games.map((game) => {
                const hasVoted = votedGameIds.has(game.id);
                const canVote = !hasVoted && remainingVotes > 0;
                
                return (
                  <motion.button
                    key={game.id}
                    layout
                    onClick={() => canVote && handleVote(game.id)}
                    disabled={!canVote || voting === game.id}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      hasVoted 
                        ? 'bg-primary/10 border-primary/30' 
                        : canVote
                          ? 'bg-card hover:bg-accent border-border hover:border-primary/50'
                          : 'bg-muted/30 border-border/30 opacity-60'
                    }`}
                    whileHover={canVote ? { scale: 1.02 } : {}}
                    whileTap={canVote ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-center gap-2">
                      {game.avatar_url ? (
                        <img 
                          src={game.avatar_url} 
                          alt={game.name_arabic}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{game.name_arabic}</p>
                        <p className="text-xs text-muted-foreground">{game.vote_count} صوت</p>
                      </div>
                      {hasVoted ? (
                        <Check className="w-5 h-5 text-primary shrink-0" />
                      ) : voting === game.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full shrink-0"
                        />
                      ) : null}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Voting ended message */}
      {isVotingEnded && (
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <Trophy className="w-8 h-8 text-warning mx-auto mb-2" />
          <p className="font-medium">انتهى التصويت!</p>
          <p className="text-sm text-muted-foreground">شكراً لمشاركتك 🎉</p>
        </div>
      )}
    </motion.section>
  );
};

export default GameVoting;
