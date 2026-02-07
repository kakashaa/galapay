import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Trash2, Play, Square, Trophy, Users, Clock, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import StarField from '@/components/StarField';

interface VotingGame {
  id: string;
  name: string;
  name_arabic: string;
  avatar_url: string | null;
  is_active: boolean;
  display_order: number;
}

interface VotingSession {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  results_sent: boolean;
}

interface GameVoteCount {
  game_id: string;
  game_name: string;
  vote_count: number;
}

const VotingDashboard = () => {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  const [games, setGames] = useState<VotingGame[]>([]);
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const [voteCounts, setVoteCounts] = useState<GameVoteCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New game form
  const [newGameName, setNewGameName] = useState('');
  const [newGameNameArabic, setNewGameNameArabic] = useState('');
  const [newGameAvatar, setNewGameAvatar] = useState('');
  const [showAddGame, setShowAddGame] = useState(false);

  // New session form
  const [sessionTitle, setSessionTitle] = useState('جلسة تصويت');
  const [sessionDuration, setSessionDuration] = useState(48);
  const [showAddSession, setShowAddSession] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      // Load games
      const { data: gamesData, error: gamesError } = await supabase
        .from('voting_games')
        .select('*')
        .order('display_order', { ascending: true });

      if (gamesError) throw gamesError;
      setGames(gamesData || []);

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('voting_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Load vote counts for active session
      const activeSession = (sessionsData || []).find(s => s.is_active && new Date(s.ends_at) > new Date());
      if (activeSession) {
        await loadVoteCounts(activeSession.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البيانات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVoteCounts = async (sessionId: string) => {
    const { data, error } = await supabase
      .rpc('get_session_vote_counts', { p_session_id: sessionId });

    if (!error && data) {
      const countsWithNames = data.map((vc: { game_id: string; vote_count: number }) => {
        const game = games.find(g => g.id === vc.game_id);
        return {
          game_id: vc.game_id,
          game_name: game?.name_arabic || 'غير معروف',
          vote_count: Number(vc.vote_count)
        };
      });
      setVoteCounts(countsWithNames);
    }
  };

  const handleAddGame = async () => {
    if (!newGameNameArabic.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم اللعبة بالعربي',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('voting_games')
        .insert({
          name: newGameName || newGameNameArabic,
          name_arabic: newGameNameArabic,
          avatar_url: newGameAvatar || null,
          display_order: games.length
        });

      if (error) throw error;

      toast({ title: 'تمت الإضافة بنجاح!' });
      setNewGameName('');
      setNewGameNameArabic('');
      setNewGameAvatar('');
      setShowAddGame(false);
      loadData();
    } catch (error) {
      console.error('Error adding game:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة اللعبة',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه اللعبة؟')) return;

    try {
      const { error } = await supabase
        .from('voting_games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      toast({ title: 'تم الحذف بنجاح!' });
      loadData();
    } catch (error) {
      console.error('Error deleting game:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف اللعبة',
        variant: 'destructive'
      });
    }
  };

  const handleToggleGame = async (gameId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('voting_games')
        .update({ is_active: isActive })
        .eq('id', gameId);

      if (error) throw error;

      setGames(prev => prev.map(g => g.id === gameId ? { ...g, is_active: isActive } : g));
    } catch (error) {
      console.error('Error toggling game:', error);
    }
  };

  const handleStartSession = async () => {
    setSaving(true);
    try {
      // Deactivate any existing active sessions
      await supabase
        .from('voting_sessions')
        .update({ is_active: false })
        .eq('is_active', true);

      // Create new session
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + sessionDuration);

      const { error } = await supabase
        .from('voting_sessions')
        .insert({
          title: sessionTitle,
          ends_at: endsAt.toISOString(),
          is_active: true
        });

      if (error) throw error;

      toast({ title: 'تم بدء جلسة التصويت!' });
      setShowAddSession(false);
      loadData();
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في بدء الجلسة',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStopSession = async (sessionId: string) => {
    if (!confirm('هل أنت متأكد من إيقاف التصويت؟')) return;

    try {
      const { error } = await supabase
        .from('voting_sessions')
        .update({ is_active: false, ends_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      toast({ title: 'تم إيقاف التصويت!' });
      loadData();
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  const activeSession = sessions.find(s => s.is_active && new Date(s.ends_at) > new Date());

  if (authLoading || loading) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen premium-bg relative overflow-hidden">
      <StarField starCount={30} />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-primary/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-amber-600 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">إدارة التصويت</h1>
            <p className="text-xs text-muted-foreground">تصويت الألعاب</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6 relative z-10">
        {/* Active Session Card */}
        {activeSession && (
          <Card className="border-warning/30 bg-gradient-to-br from-warning/10 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  جلسة نشطة
                </CardTitle>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleStopSession(activeSession.id)}
                >
                  <Square className="w-4 h-4 ml-1" />
                  إيقاف
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{activeSession.title}</p>
              <p className="text-xs text-muted-foreground">
                ينتهي: {new Date(activeSession.ends_at).toLocaleString('ar-SA')}
              </p>

              {/* Vote Counts */}
              {voteCounts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">النتائج الحالية:</p>
                  {voteCounts.sort((a, b) => b.vote_count - a.vote_count).slice(0, 5).map((vc, idx) => (
                    <div key={vc.game_id} className="flex items-center gap-2 text-sm">
                      <Badge variant={idx === 0 ? "default" : "secondary"}>#{idx + 1}</Badge>
                      <span className="flex-1">{vc.game_name}</span>
                      <span className="font-bold">{vc.vote_count} صوت</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Start New Session */}
        {!activeSession && (
          <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Play className="w-5 h-5 ml-2" />
                بدء جلسة تصويت جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>بدء جلسة تصويت</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>عنوان الجلسة</Label>
                  <Input
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                    placeholder="جلسة تصويت"
                  />
                </div>
                <div className="space-y-2">
                  <Label>مدة التصويت (بالساعات)</Label>
                  <Input
                    type="number"
                    value={sessionDuration}
                    onChange={e => setSessionDuration(Number(e.target.value))}
                    min={1}
                    max={168}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleStartSession} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Play className="w-4 h-4 ml-2" />}
                  بدء التصويت
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Games Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                إدارة الألعاب
              </CardTitle>
              <Dialog open={showAddGame} onOpenChange={setShowAddGame}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة لعبة
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة لعبة جديدة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>اسم اللعبة (عربي) *</Label>
                      <Input
                        value={newGameNameArabic}
                        onChange={e => setNewGameNameArabic(e.target.value)}
                        placeholder="اسم اللعبة بالعربي"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم اللعبة (إنجليزي)</Label>
                      <Input
                        value={newGameName}
                        onChange={e => setNewGameName(e.target.value)}
                        placeholder="Game name"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الصورة (اختياري)</Label>
                      <Input
                        value={newGameAvatar}
                        onChange={e => setNewGameAvatar(e.target.value)}
                        placeholder="https://..."
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddGame} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                      حفظ
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {games.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد ألعاب مضافة بعد
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اللعبة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map(game => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {game.avatar_url ? (
                            <img 
                              src={game.avatar_url} 
                              alt={game.name_arabic}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-4 h-4" />
                            </div>
                          )}
                          <span>{game.name_arabic}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={game.is_active}
                          onCheckedChange={checked => handleToggleGame(game.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGame(game.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Previous Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              الجلسات السابقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.filter(s => !s.is_active || new Date(s.ends_at) <= new Date()).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد جلسات سابقة
              </p>
            ) : (
              <div className="space-y-2">
                {sessions
                  .filter(s => !s.is_active || new Date(s.ends_at) <= new Date())
                  .slice(0, 5)
                  .map(session => (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.starts_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <Badge variant={session.results_sent ? "default" : "secondary"}>
                        {session.results_sent ? 'تم الإرسال' : 'منتهية'}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VotingDashboard;
