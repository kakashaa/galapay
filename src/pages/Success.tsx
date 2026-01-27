import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, Copy, AlertTriangle, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Success = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const trackingCode = location.state?.trackingCode;

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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Success Icon */}
      <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-6 animate-scale-in">
        <CheckCircle2 className="w-12 h-12 text-success" />
      </div>

      {/* Success Message */}
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
        تم استلام طلبك بنجاح!
      </h1>
      <p className="text-muted-foreground text-center mb-8">
        سيتم التحويل خلال 1-2 يوم عمل
      </p>

      {/* Tracking Code Card */}
      <div className="glass-card p-6 w-full max-w-sm mb-6">
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

        <button
          onClick={copyToClipboard}
          className="mobile-btn-secondary w-full"
        >
          <Copy className="w-5 h-5 inline-block ml-2" />
          نسخ الكود
        </button>
      </div>

      {/* Warning */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 w-full max-w-sm mb-8 flex gap-3">
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
