import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, User, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Username to email mapping for Arabic usernames
const USERNAME_MAP: Record<string, string> = {
  'جنجون': 'jnjun@ghala.admin',
  'بيسو': 'biso@ghala.admin',
  'ريلاكس': 'relax@ghala.admin',
  'naz': 'naz@ghala.admin',
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Map Arabic username to email
      const email = USERNAME_MAP[username.trim()];
      
      if (!email) {
        toast({
          title: 'خطأ',
          description: 'اسم المستخدم غير صحيح',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin, staff, or super_admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .in('role', ['admin', 'staff', 'super_admin'])
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: 'خطأ',
          description: 'ليس لديك صلاحية الوصول',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'مرحباً!',
        description: `تم تسجيل الدخول بنجاح`,
      });
      
      navigate('/admin');
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6 overflow-hidden" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">غلا لايف</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              اسم المستخدم
            </label>
            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-14 pr-12 pl-4 rounded-2xl border border-border bg-background/50 text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pr-12 pl-12 rounded-2xl border border-border bg-background/50 text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="••••••••"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-muted-foreground mt-6 hover:text-foreground transition-colors py-3"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
