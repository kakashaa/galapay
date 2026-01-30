import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Clock, Eye, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { FadeIn, AnimatedCard } from '@/components/AnimatedCard';
import StarField from '@/components/StarField';

type PayoutStatus = 'pending' | 'review' | 'paid' | 'rejected' | 'processing' | 'completed' | 'reserved';

interface PayoutRequest {
  id: string;
  tracking_code: string;
  status: PayoutStatus;
  country: string;
  payout_method: string;
  amount: number;
  currency: string;
  rejection_reason: string | null;
  reservation_reason: string | null;
  admin_final_receipt_image_url: string | null;
  created_at: string;
  isInstant?: boolean;
}

const monthlyStatusConfig = {
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    className: 'bg-warning/10 text-warning border-warning/30',
    glowColor: 'hsla(38, 92%, 55%, 0.3)',
    description: 'طلبك قيد المراجعة الأولية',
  },
  review: {
    label: 'قيد المراجعة',
    icon: Eye,
    className: 'bg-primary/10 text-primary border-primary/30',
    glowColor: 'hsla(142, 76%, 50%, 0.3)',
    description: 'يتم مراجعة طلبك حالياً',
  },
  paid: {
    label: 'تم التحويل',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success border-success/30',
    glowColor: 'hsla(142, 76%, 50%, 0.4)',
    description: 'مبروك! تم تحويل المبلغ بنجاح',
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    glowColor: 'hsla(0, 80%, 55%, 0.3)',
    description: 'للأسف تم رفض طلبك',
  },
  reserved: {
    label: 'محجوز',
    icon: Clock,
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    glowColor: 'hsla(25, 95%, 53%, 0.3)',
    description: 'تم حجز راتبك مؤقتاً',
  },
};

const instantStatusConfig = {
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    className: 'bg-warning/10 text-warning border-warning/30',
    glowColor: 'hsla(38, 92%, 55%, 0.3)',
    description: 'طلبك قيد المراجعة',
  },
  processing: {
    label: 'قيد المعالجة',
    icon: Eye,
    className: 'bg-primary/10 text-primary border-primary/30',
    glowColor: 'hsla(142, 76%, 50%, 0.3)',
    description: 'يتم معالجة طلبك حالياً',
  },
  completed: {
    label: 'مكتمل',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success border-success/30',
    glowColor: 'hsla(142, 76%, 50%, 0.4)',
    description: 'مبروك! تم تحويل المبلغ بنجاح',
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    glowColor: 'hsla(0, 80%, 55%, 0.3)',
    description: 'للأسف تم رفض طلبك',
  },
};

const Track = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(location.search);
  const codeFromQuery = searchParams.get('code');
  const initialCode = location.state?.trackingCode || codeFromQuery || '';
  
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<PayoutRequest | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (initialCode) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال كود التتبع',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setNotFound(false);
    setRequest(null);

    const code = trackingCode.trim().toUpperCase();

    try {
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('payout_requests')
        .select('id, tracking_code, status, country, payout_method, amount, currency, rejection_reason, reservation_reason, admin_final_receipt_image_url, created_at')
        .eq('tracking_code', code)
        .maybeSingle();

      if (monthlyError) throw monthlyError;

      if (monthlyData) {
        setRequest({ ...monthlyData, isInstant: false } as PayoutRequest);
        return;
      }

      const { data: instantData, error: instantError } = await supabase
        .from('instant_payout_requests')
        .select('id, tracking_code, status, host_country, host_payout_method, host_payout_amount, host_currency, rejection_reason, admin_final_receipt_url, created_at')
        .eq('tracking_code', code)
        .maybeSingle();

      if (instantError) throw instantError;

      if (instantData) {
        setRequest({
          id: instantData.id,
          tracking_code: instantData.tracking_code,
          status: instantData.status as any,
          country: instantData.host_country,
          payout_method: instantData.host_payout_method,
          amount: instantData.host_payout_amount,
          currency: instantData.host_currency,
          rejection_reason: instantData.rejection_reason,
          reservation_reason: null,
          admin_final_receipt_image_url: instantData.admin_final_receipt_url,
          created_at: instantData.created_at,
          isInstant: true,
        });
        return;
      }

      setNotFound(true);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء البحث',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    if (!request) return { ...monthlyStatusConfig.pending, glowColor: 'hsla(38, 92%, 55%, 0.3)' };
    
    if (request.isInstant) {
      const status = request.status as 'pending' | 'processing' | 'completed' | 'rejected';
      return instantStatusConfig[status] || instantStatusConfig.pending;
    } else {
      const status = request.status as 'pending' | 'review' | 'paid' | 'rejected' | 'reserved';
      return monthlyStatusConfig[status] || monthlyStatusConfig.pending;
    }
  };

  const currentStatusConfig = getStatusConfig();
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="min-h-screen premium-bg pb-8 relative overflow-hidden">
      <StarField starCount={30} />
      {/* Header */}
      <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-primary/20 p-4 z-10">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <motion.button
            onClick={() => navigate('/')}
            className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <h1 className="text-xl font-bold text-foreground glow-text">تتبع الحوالة</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Search Box */}
        <FadeIn delay={0.1}>
          <AnimatedCard className="p-4 mb-6" variant="neon">
            <label className="block text-sm font-medium text-foreground mb-2">
              أدخل كود التتبع
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="premium-input flex-1 font-mono text-center tracking-widest"
                placeholder="XXXXXXXXXXXX"
                dir="ltr"
              />
              <motion.button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl font-medium btn-glow disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Not Found */}
        {notFound && (
          <FadeIn delay={0.1}>
            <AnimatedCard className="p-6 text-center" variant="neon">
              <motion.div 
                className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"
                animate={{ boxShadow: ['0 0 20px hsla(0, 80%, 55%, 0.3)', '0 0 30px hsla(0, 80%, 55%, 0.4)', '0 0 20px hsla(0, 80%, 55%, 0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <XCircle className="w-8 h-8 text-destructive" />
              </motion.div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                لم يتم العثور على الطلب
              </h2>
              <p className="text-muted-foreground text-sm">
                تأكد من صحة كود التتبع وحاول مرة أخرى
              </p>
            </AnimatedCard>
          </FadeIn>
        )}

        {/* Request Found */}
        {request && (
          <div className="space-y-4">
            {/* Instant Payout Badge */}
            {request.isInstant && (
              <FadeIn delay={0.1}>
                <motion.div 
                  className="neon-card p-3 flex items-center gap-2 border-warning/30"
                  style={{ boxShadow: '0 0 15px hsla(38, 92%, 55%, 0.2)' }}
                >
                  <Zap className="w-5 h-5 text-warning" />
                  <span className="text-warning font-medium text-sm">طلب سحب فوري</span>
                </motion.div>
              </FadeIn>
            )}

            {/* Status Card */}
            <FadeIn delay={0.2}>
              <AnimatedCard className="p-6" variant="neon">
                <div className="flex items-center gap-4 mb-4">
                  <motion.div 
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${currentStatusConfig.className.split(' ')[0]}`}
                    animate={{ boxShadow: [`0 0 20px ${currentStatusConfig.glowColor}`, `0 0 35px ${currentStatusConfig.glowColor}`, `0 0 20px ${currentStatusConfig.glowColor}`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <StatusIcon className={`w-7 h-7 ${currentStatusConfig.className.split(' ')[1]}`} />
                  </motion.div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${currentStatusConfig.className}`}
                      style={{ boxShadow: `0 0 10px ${currentStatusConfig.glowColor}` }}
                    >
                      {currentStatusConfig.label}
                    </span>
                    <p className="text-muted-foreground text-sm mt-1">
                      {currentStatusConfig.description}
                    </p>
                  </div>
                </div>

                {request.status === 'rejected' && request.rejection_reason && (
                  <motion.div 
                    className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-destructive text-sm">
                      <strong>سبب الرفض:</strong> {request.rejection_reason}
                    </p>
                  </motion.div>
                )}

                {request.status === 'reserved' && request.reservation_reason && (
                  <motion.div 
                    className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-orange-500 text-sm">
                      <strong>الراتب محجوز بسبب:</strong> {request.reservation_reason}
                    </p>
                  </motion.div>
                )}

                {(request.status === 'paid' || request.status === 'completed') && request.admin_final_receipt_image_url && (
                  <motion.div 
                    className="mt-4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <p className="text-sm font-medium text-foreground mb-2">إيصال التحويل:</p>
                    <img
                      src={request.admin_final_receipt_image_url}
                      alt="Payout receipt"
                      className="w-full rounded-xl border border-primary/20"
                    />
                  </motion.div>
                )}
              </AnimatedCard>
            </FadeIn>

            {/* Request Details */}
            <FadeIn delay={0.3}>
              <AnimatedCard className="p-4" variant="neon">
                <h3 className="font-semibold text-foreground mb-3">تفاصيل الطلب</h3>
                <div className="space-y-2 text-sm">
                  {request.isInstant && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">نوع الطلب</span>
                      <span className="text-warning font-medium">سحب فوري ⚡</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">البلد</span>
                    <span className="text-foreground">{request.country}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">طريقة الصرف</span>
                    <span className="text-foreground">{request.payout_method}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">المبلغ</span>
                    <span className="text-foreground font-medium text-primary glow-text">
                      {request.amount.toLocaleString()} {request.currency}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">تاريخ الطلب</span>
                    <span className="text-foreground" dir="ltr">
                      {new Date(request.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              </AnimatedCard>
            </FadeIn>
          </div>
        )}
      </div>
    </div>
  );
};

export default Track;
