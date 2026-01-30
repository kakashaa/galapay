import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Copy, AlertTriangle, Search, Camera, Download, Check, Clock, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSavedRequests } from '@/hooks/use-saved-requests';

const Success = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveTrackingCode } = useSavedRequests();
  const trackingCode = location.state?.trackingCode;
  const isInstant = location.state?.isInstant || false;
  const [saved, setSaved] = useState(false);
  const codeCardRef = useRef<HTMLDivElement>(null);

  // Save tracking code to localStorage when page loads
  useEffect(() => {
    if (trackingCode) {
      saveTrackingCode(trackingCode);
      setSaved(true);
      // Show save confirmation
      toast({
        title: '✅ تم حفظ الكود تلقائياً',
        description: 'يمكنك الوصول لطلباتك السابقة من الصفحة الرئيسية',
      });
    }
  }, [trackingCode, saveTrackingCode]);

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
      // Try using the native share API with screenshot capability
      if (navigator.share && navigator.canShare) {
        // Create a canvas from the code card
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx && codeCardRef.current) {
          // Set canvas size
          canvas.width = 400;
          canvas.height = 200;
          
          // Draw background
          ctx.fillStyle = '#1a1a2e';
          ctx.roundRect(0, 0, 400, 200, 16);
          ctx.fill();
          
          // Draw title
          ctx.fillStyle = '#888';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('كود التتبع الخاص بك', 200, 50);
          
          // Draw tracking code
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 28px monospace';
          ctx.fillText(trackingCode, 200, 100);
          
          // Draw website
          ctx.fillStyle = '#666';
          ctx.font = '12px Arial';
          ctx.fillText('galapay.lovable.app', 200, 160);
          
          // Convert to blob and share
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
              } catch (shareError) {
                // If share fails, download instead
                downloadImage(blob);
              }
            }
          }, 'image/png');
        }
      } else {
        // Fallback: prompt user to take manual screenshot
        toast({
          title: '📸 التقط صورة للشاشة',
          description: 'اضغط على زر الطاقة + زر خفض الصوت معاً',
        });
      }
    } catch (error) {
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Success Icon */}
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-scale-in ${isInstant ? 'bg-warning/10' : 'bg-success/10'}`}>
        {isInstant ? (
          <Zap className="w-12 h-12 text-warning" />
        ) : (
          <CheckCircle2 className="w-12 h-12 text-success" />
        )}
      </div>

      {/* Success Message */}
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
        {isInstant ? 'تم استلام طلب السحب الفوري!' : 'تم استلام طلبك بنجاح!'}
      </h1>
      <p className="text-muted-foreground text-center mb-4">
        {isInstant ? 'سيتم معالجة طلبك خلال دقائق' : 'سيتم التحويل خلال 1-2 يوم عمل'}
      </p>

      {/* Instant Payout Time Warning */}
      {isInstant && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 w-full max-w-sm mb-6 flex gap-3 animate-fade-in">
          <Clock className="w-6 h-6 text-warning shrink-0" />
          <div>
            <p className="text-warning font-bold text-sm mb-1">
              ⏰ الوقت المحدد للتحويل
            </p>
            <p className="text-warning/80 text-sm">
              يجب استلام حوالتك خلال <span className="font-bold">1 إلى 10 دقائق</span> من الآن. تأكد من متابعة طلبك.
            </p>
          </div>
        </div>
      )}

      {/* Saved Confirmation Badge */}
      {saved && (
        <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full mb-4 animate-fade-in">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">تم حفظ الكود تلقائياً</span>
        </div>
      )}

      {/* Tracking Code Card */}
      <div ref={codeCardRef} className="glass-card p-6 w-full max-w-sm mb-4">
        <p className="text-sm text-muted-foreground mb-3 text-center">
          كود التتبع الخاص بك
        </p>
        
        <div className="flex items-center justify-between bg-muted rounded-xl p-4 mb-4">
          <span className="font-mono text-xl font-bold text-foreground tracking-wider" dir="ltr">
            {trackingCode}
          </span>
          <button
            onClick={copyToClipboard}
            className="p-2 hover:bg-background rounded-lg transition-colors"
          >
            <Copy className="w-5 h-5 text-primary" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyToClipboard}
            className="mobile-btn-secondary flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            نسخ
          </button>
          <button
            onClick={takeScreenshot}
            className="mobile-btn-secondary flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            صورة
          </button>
        </div>
      </div>

      {/* Screenshot Tip */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 w-full max-w-sm mb-4 text-center">
        <p className="text-primary text-sm">
          💡 التقط صورة للشاشة الآن لحفظ الكود
        </p>
      </div>

      {/* Warning */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 w-full max-w-sm mb-6 flex gap-3">
        <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
        <p className="text-destructive font-medium text-sm">
          لا تشارك هذا الكود مع أي شخص. هو الطريقة الوحيدة لتتبع طلبك.
        </p>
      </div>

      {/* Track Button */}
      <button
        onClick={() => navigate('/track', { state: { trackingCode } })}
        className="mobile-btn-primary w-full max-w-sm"
      >
        <Search className="w-5 h-5 inline-block ml-2" />
        تتبع الحوالة
      </button>

      {/* Home Link */}
      <button
        onClick={() => navigate('/')}
        className="text-muted-foreground mt-6 hover:text-foreground transition-colors"
      >
        العودة للصفحة الرئيسية
      </button>
    </div>
  );
};

export default Success;
