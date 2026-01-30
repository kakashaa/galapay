import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Copy, AlertTriangle, Search, Camera, Check, Clock, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSavedRequests } from '@/hooks/use-saved-requests';
import { motion } from 'framer-motion';
import { FadeIn, AnimatedCard } from '@/components/AnimatedCard';

const Success = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveTrackingCode } = useSavedRequests();
  const trackingCode = location.state?.trackingCode;
  const isInstant = location.state?.isInstant || false;
  const [saved, setSaved] = useState(false);
  const codeCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trackingCode) {
      const requestType = isInstant ? 'instant' : 'payout';
      saveTrackingCode(trackingCode, requestType);
      setSaved(true);
      toast({
        title: '✅ تم حفظ الكود تلقائياً',
        description: 'يمكنك الوصول لطلباتك السابقة من الصفحة الرئيسية',
      });
    }
  }, [trackingCode, isInstant, saveTrackingCode]);

  if (!trackingCode) {
    return <Navigate to="/" replace />;
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ كود التتبع',
      });
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل في نسخ الكود',
        variant: 'destructive',
      });
    }
  };

  const takeScreenshot = async () => {
    try {
      if (navigator.share && navigator.canShare) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx && codeCardRef.current) {
          canvas.width = 400;
          canvas.height = 200;
          
          ctx.fillStyle = '#0a1a14';
          ctx.roundRect(0, 0, 400, 200, 16);
          ctx.fill();
          
          ctx.fillStyle = '#888';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('كود التتبع الخاص بك', 200, 50);
          
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 28px monospace';
          ctx.fillText(trackingCode, 200, 100);
          
          ctx.fillStyle = '#666';
          ctx.font = '12px Arial';
          ctx.fillText('galapay.lovable.app', 200, 160);
          
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], `tracking-code-${trackingCode}.png`, { type: 'image/png' });
              
              try {
                await navigator.share({
                  title: 'كود التتبع',
                  text: `كود التتبع: ${trackingCode}`,
                  files: [file],
                });
                toast({
                  title: 'تم المشاركة',
                  description: 'يمكنك حفظ الصورة في معرض الصور',
                });
              } catch {
                downloadImage(blob);
              }
            }
          }, 'image/png');
        }
      } else {
        toast({
          title: '📸 التقط صورة للشاشة',
          description: 'اضغط على زر الطاقة + زر خفض الصوت معاً',
        });
      }
    } catch {
      toast({
        title: '📸 التقط صورة للشاشة',
        description: 'اضغط على زر الطاقة + زر خفض الصوت معاً',
      });
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracking-code-${trackingCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'تم التحميل',
      description: 'تم حفظ صورة الكود',
    });
  };

  return (
    <div className="min-h-screen premium-bg flex flex-col items-center justify-center p-6">
      {/* Success Icon */}
      <FadeIn delay={0.1}>
        <motion.div 
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isInstant ? 'bg-warning/10' : 'bg-success/10'}`}
          animate={{ 
            boxShadow: isInstant 
              ? ['0 0 30px hsla(38, 92%, 55%, 0.3)', '0 0 50px hsla(38, 92%, 55%, 0.5)', '0 0 30px hsla(38, 92%, 55%, 0.3)']
              : ['0 0 30px hsla(142, 76%, 50%, 0.3)', '0 0 50px hsla(142, 76%, 50%, 0.5)', '0 0 30px hsla(142, 76%, 50%, 0.3)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isInstant ? (
            <Zap className="w-12 h-12 text-warning" />
          ) : (
            <CheckCircle2 className="w-12 h-12 text-success" />
          )}
        </motion.div>
      </FadeIn>

      {/* Success Message */}
      <FadeIn delay={0.2}>
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center glow-text">
          {isInstant ? 'تم استلام طلب السحب الفوري!' : 'تم استلام طلبك بنجاح!'}
        </h1>
        <p className="text-muted-foreground text-center mb-4">
          {isInstant ? 'سيتم معالجة طلبك خلال دقائق' : 'سيتم التحويل خلال 1-2 يوم عمل'}
        </p>
      </FadeIn>

      {/* Instant Payout Time Warning */}
      {isInstant && (
        <FadeIn delay={0.3}>
          <AnimatedCard className="p-4 w-full max-w-sm mb-6 flex gap-3 border-warning/30" variant="neon">
            <Clock className="w-6 h-6 text-warning shrink-0" />
            <div>
              <p className="text-warning font-bold text-sm mb-1">
                ⏰ الوقت المحدد للتحويل
              </p>
              <p className="text-warning/80 text-sm">
                يجب استلام حوالتك خلال <span className="font-bold">1 إلى 10 دقائق</span> من الآن. تأكد من متابعة طلبك.
              </p>
            </div>
          </AnimatedCard>
        </FadeIn>
      )}

      {/* Saved Confirmation Badge */}
      {saved && (
        <FadeIn delay={0.35}>
          <motion.div 
            className="flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full mb-4 border border-success/30"
            style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.2)' }}
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">تم حفظ الكود تلقائياً</span>
          </motion.div>
        </FadeIn>
      )}

      {/* Tracking Code Card */}
      <FadeIn delay={0.4}>
        <div ref={codeCardRef} className="neon-card p-6 w-full max-w-sm mb-4">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            كود التتبع الخاص بك
          </p>
          
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 mb-4 border border-primary/20">
            <span className="font-mono text-xl font-bold text-primary tracking-wider glow-text" dir="ltr">
              {trackingCode}
            </span>
            <motion.button
              onClick={copyToClipboard}
              className="p-2 hover:bg-background rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Copy className="w-5 h-5 text-primary" />
            </motion.button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={copyToClipboard}
              className="py-3 px-4 rounded-xl bg-muted/50 border border-primary/20 text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Copy className="w-4 h-4" />
              نسخ
            </motion.button>
            <motion.button
              onClick={takeScreenshot}
              className="py-3 px-4 rounded-xl bg-muted/50 border border-primary/20 text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Camera className="w-4 h-4" />
              صورة
            </motion.button>
          </div>
        </div>
      </FadeIn>

      {/* Screenshot Tip */}
      <FadeIn delay={0.5}>
        <div className="neon-card p-3 w-full max-w-sm mb-4 text-center border-primary/30">
          <p className="text-primary text-sm glow-text">
            💡 التقط صورة للشاشة الآن لحفظ الكود
          </p>
        </div>
      </FadeIn>

      {/* Warning */}
      <FadeIn delay={0.6}>
        <AnimatedCard className="p-4 w-full max-w-sm mb-6 flex gap-3 border-destructive/30" variant="neon">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
          <p className="text-destructive font-medium text-sm">
            لا تشارك هذا الكود مع أي شخص. هو الطريقة الوحيدة لتتبع طلبك.
          </p>
        </AnimatedCard>
      </FadeIn>

      {/* Track Button */}
      <FadeIn delay={0.7}>
        <motion.button
          onClick={() => navigate('/track', { state: { trackingCode } })}
          className="w-full max-w-sm py-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg btn-glow flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Search className="w-5 h-5" />
          تتبع الحوالة
        </motion.button>
      </FadeIn>

      {/* Home Link */}
      <motion.button
        onClick={() => navigate('/')}
        className="text-muted-foreground mt-6 hover:text-foreground transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.05 }}
      >
        العودة للصفحة الرئيسية
      </motion.button>
    </div>
  );
};

export default Success;
