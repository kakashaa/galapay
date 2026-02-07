import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Check, Vote, Star, Users, ArrowRight, Crown, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const GameVotingPage = () => {
  const [session, setSession] = useState<VotingSession | null>(null);
  const [games, setGames] = useState<VotingGame[]>([]);
  const [votedGameIds, setVotedGameIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();
  
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

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-5 h-5 text-warning" />;
      case 1: return <Medal className="w-5 h-5 text-muted-foreground" />;
      case 2: return <Award className="w-5 h-5 text-warning/70" />;
      default: return <span className="text-muted-foreground font-bold">#{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!session || games.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <Vote className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">لا يوجد تصويت نشط حالياً</h1>
        <p className="text-muted-foreground mb-6">ترقب التصويت القادم!</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg">🎮 تصويت الألعاب</h1>
                <p className="text-xs text-muted-foreground">{session.title}</p>
              </div>
            </div>
            <Badge variant={isVotingEnded ? "destructive" : "secondary"} className="gap-1 text-sm">
              <Clock className="w-3 h-3" />
              {timeLeft}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Votes remaining indicator */}
        {!isVotingEnded && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-l from-primary/20 to-primary/5 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg">أصواتك المتبقية</p>
                  <p className="text-sm text-muted-foreground">اختر {MAX_VOTES} ألعاب مفضلة</p>
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: MAX_VOTES }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      i < votedGameIds.size 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    {i < votedGameIds.size ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{i + 1}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Top 4 Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-warning" />
              المتصدرون
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topGames.map((game, index) => (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-xl border ${
                  index === 0 
                    ? 'bg-gradient-to-l from-warning/20 to-amber-600/10 border-warning/30' 
                    : 'bg-card/50 border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  {game.avatar_url ? (
                    <img 
                      src={game.avatar_url} 
                      alt={game.name_arabic}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{game.name_arabic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress 
                        value={(game.vote_count / maxVotes) * 100} 
                        className="h-2 flex-1"
                      />
                      <span className="text-sm font-bold text-primary whitespace-nowrap">
                        {game.vote_count} صوت
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* All Games to Vote */}
        {!isVotingEnded && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Vote className="w-5 h-5" />
                جميع الألعاب ({games.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-1 gap-3">
                  <AnimatePresence>
                    {games.map((game, index) => {
                      const hasVoted = votedGameIds.has(game.id);
                      const canVote = !hasVoted && remainingVotes > 0;
                      
                      return (
                        <motion.button
                          key={game.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => canVote && handleVote(game.id)}
                          disabled={!canVote || voting === game.id}
                          className={`p-4 rounded-xl border text-right transition-all w-full ${
                            hasVoted 
                              ? 'bg-primary/10 border-primary/30' 
                              : canVote
                                ? 'bg-card hover:bg-accent border-border hover:border-primary/50 hover:shadow-lg'
                                : 'bg-muted/30 border-border/30 opacity-60'
                          }`}
                          whileHover={canVote ? { scale: 1.01 } : {}}
                          whileTap={canVote ? { scale: 0.99 } : {}}
                        >
                          <div className="flex items-center gap-4">
                            {game.avatar_url ? (
                              <img 
                                src={game.avatar_url} 
                                alt={game.name_arabic}
                                className="w-14 h-14 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <Users className="w-7 h-7 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-base truncate">{game.name_arabic}</p>
                              <p className="text-sm text-muted-foreground">{game.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{game.vote_count} صوت</p>
                            </div>
                            {hasVoted ? (
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5 text-primary-foreground" />
                              </div>
                            ) : voting === game.id ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full shrink-0"
                              />
                            ) : canVote ? (
                              <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                                <Vote className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                            ) : null}
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Voting ended message */}
        {isVotingEnded && (
          <Card className="bg-muted/50">
            <CardContent className="py-8 text-center">
              <Trophy className="w-16 h-16 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">انتهى التصويت!</h2>
              <p className="text-muted-foreground">شكراً لمشاركتك 🎉</p>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="mt-4"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للرئيسية
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GameVotingPage;
