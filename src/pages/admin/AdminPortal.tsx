import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Zap, ShieldBan, Crown, LogOut, Loader2, Coins, Webhook } from 'lucide-react';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import { useAdminAuth } from '@/hooks/use-admin-auth';

const AdminPortal = () => {
  const navigate = useNavigate();
  const { session, loading, logout, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  const portalItems = [
    {
      title: 'السحب الشهري',
      subtitle: 'إدارة طلبات صرف الراتب الشهري',
      icon: Wallet,
      path: '/admin/dashboard',
      gradient: 'from-primary to-primary/80',
      glowColor: 'hsla(142, 76%, 50%, 0.4)',
    },
    {
      title: 'السحب الفوري',
      subtitle: 'إدارة طلبات السحب الفوري',
      icon: Zap,
      path: '/admin/instant',
      gradient: 'from-warning to-warning/80',
      glowColor: 'hsla(38, 92%, 55%, 0.4)',
      badge: '⚡ فوري',
    },
    {
      title: 'طلبات الكوينزات',
      subtitle: 'إدارة تحويل الرواتب للكوينزات',
      icon: Coins,
      path: '/admin/coins',
      gradient: 'from-amber-500 to-yellow-600',
      glowColor: 'hsla(45, 93%, 47%, 0.4)',
      badge: '🪙 كوينز',
    },
    {
      title: 'إدارة البلاغات',
      subtitle: 'مراجعة بلاغات التبنيد',
      icon: ShieldBan,
      path: '/admin/bans',
      gradient: 'from-destructive to-destructive/80',
      glowColor: 'hsla(0, 80%, 55%, 0.4)',
      badge: '🚫 بلاغات',
    },
    {
      title: 'الايدي المميز',
      subtitle: 'إدارة طلبات الايدي المميز',
      icon: Crown,
      path: '/admin/special-id',
      gradient: 'from-orange-500 to-amber-600',
      glowColor: 'hsla(25, 95%, 53%, 0.4)',
      badge: '👑 مميز',
    },
    {
      title: 'Webhooks',
      subtitle: 'إدارة الإشعارات الخارجية',
      icon: Webhook,
      path: '/admin/webhooks',
      gradient: 'from-purple-500 to-indigo-600',
      glowColor: 'hsla(260, 60%, 50%, 0.4)',
      badge: '🔗 API',
    },
  ];

  return (
    <div className="min-h-screen premium-bg flex flex-col relative overflow-hidden">
      <StarField starCount={50} />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-primary/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
              style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.2)' }}
              whileHover={{ scale: 1.1 }}
            >
              <Wallet className="w-5 h-5 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold glow-text">غلا لايف</h1>
              <p className="text-xs text-muted-foreground">مرحباً {session?.username}</p>
            </div>
          </div>
          <motion.button
            onClick={handleLogout}
            className="p-2.5 neon-card hover:border-destructive/50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative z-10">
        <motion.h2 
          className="text-2xl font-bold text-center mb-4 glow-text"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          اختر لوحة التحكم
        </motion.h2>
        
        <div className="w-full max-w-md space-y-4">
          {portalItems.map((item, index) => (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full p-5 rounded-2xl bg-gradient-to-br ${item.gradient} text-white flex items-center gap-4 relative overflow-hidden`}
              style={{ boxShadow: `0 0 30px ${item.glowColor}` }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {item.badge && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/20 rounded-full backdrop-blur-sm">
                  <span className="text-xs font-bold">{item.badge}</span>
                </div>
              )}
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <item.icon className="w-7 h-7" />
              </div>
              <div className="text-right flex-1">
                <p className="text-lg font-bold mb-0.5">{item.title}</p>
                <p className="text-sm opacity-90">{item.subtitle}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
