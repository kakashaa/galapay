import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, KeyRound } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogin = async (value: string) => {
    if (value.length !== 6) return;
    
    setLoading(true);

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = login(value);

    if (result.success) {
      toast({
        title: 'مرحباً!',
        description: 'تم تسجيل الدخول بنجاح',
      });
      navigate('/admin');
    } else {
      toast({
        title: 'خطأ',
        description: result.error || 'الرمز غير صحيح',
        variant: 'destructive',
      });
      setCode('');
    }

    setLoading(false);
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      handleLogin(value);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <motion.div 
          className="neon-card p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <label className="block text-lg font-medium text-foreground">
              أدخل رمز الدخول
            </label>
            <p className="text-sm text-muted-foreground">
              رمز مكون من 6 أرقام
            </p>
          </div>

          <div className="flex justify-center" dir="ltr">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-xl border-primary/30 bg-background/50" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl border-primary/30 bg-background/50" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl border-primary/30 bg-background/50" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl border-primary/30 bg-background/50" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl border-primary/30 bg-background/50" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl border-primary/30 bg-background/50" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري التحقق...</span>
            </div>
          )}
        </motion.div>

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
