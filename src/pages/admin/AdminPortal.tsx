import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Zap, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminPortal = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['admin', 'staff', 'super_admin'])
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate('/admin/login');
      return;
    }

    // Get display name
    const { data: profileData } = await supabase
      .from('admin_profiles')
      .select('display_name')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profileData) {
      setUserName(profileData.display_name);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">غلا لايف</h1>
              <p className="text-xs text-muted-foreground">مرحباً {userName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <h2 className="text-2xl font-bold text-center mb-4">اختر لوحة التحكم</h2>
        
        <div className="w-full max-w-md space-y-4">
          {/* Monthly Payout Dashboard */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full p-6 rounded-2xl bg-primary text-primary-foreground flex items-center gap-4 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            <div className="w-16 h-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Wallet className="w-8 h-8" />
            </div>
            <div className="text-right flex-1">
              <p className="text-xl font-bold mb-1">السحب الشهري</p>
              <p className="text-sm opacity-80">إدارة طلبات صرف الراتب الشهري</p>
            </div>
          </button>

          {/* Instant Payout Dashboard */}
          <button
            onClick={() => navigate('/admin/instant')}
            className="w-full p-6 rounded-2xl bg-warning text-warning-foreground flex items-center gap-4 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/20 rounded-full">
              <span className="text-xs font-bold">جديد ⚡</span>
            </div>
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="w-8 h-8" />
            </div>
            <div className="text-right flex-1">
              <p className="text-xl font-bold mb-1">السحب الفوري</p>
              <p className="text-sm opacity-90">إدارة طلبات السحب الفوري</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
