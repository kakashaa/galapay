import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, User, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';

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
      // Clear any existing invalid session before login
      await supabase.auth.signOut();
      
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
    <div className="min-h-screen premium-bg flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      <StarField starCount={40} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center"
            animate={{ boxShadow: ['0 0 30px hsla(142, 76%, 50%, 0.3)', '0 0 50px hsla(142, 76%, 50%, 0.5)', '0 0 30px hsla(142, 76%, 50%, 0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Shield className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground glow-text">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">غلا لايف</p>
        </motion.div>

        {/* Login Form */}
        <motion.form 
          onSubmit={handleLogin} 
          className="neon-card p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              اسم المستخدم
            </label>
            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="premium-input pr-12"
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="premium-input pr-12 pl-12"
                placeholder="••••••••"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg rounded-xl btn-glow disabled:opacity-50 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </motion.button>
        </motion.form>

        <motion.button
          onClick={() => navigate('/')}
          className="w-full text-center text-muted-foreground mt-6 hover:text-primary transition-colors py-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
        >
          العودة للصفحة الرئيسية
        </motion.button>
      </div>
    </div>
  );
};

export default AdminLogin;
