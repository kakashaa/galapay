import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Search, AlertCircle, CheckCircle2, FileText, Sparkles, DollarSign } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MyRequestsSheet } from '@/components/MyRequestsSheet';
import { useSavedRequests } from '@/hooks/use-saved-requests';
import { FlyingMoney } from '@/components/FlyingMoney';
import { PayoutDisabledDialog } from '@/components/PayoutDisabledDialog';
import { usePayoutSettings } from '@/hooks/use-payout-settings';

const Index = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);
  const [disabledDialogOpen, setDisabledDialogOpen] = useState(false);
  const { hasSavedRequests } = useSavedRequests();
  const { payoutEnabled, nextPayoutDate, loading: settingsLoading } = usePayoutSettings();

  const handleMainButtonClick = () => {
    if (!payoutEnabled) {
      setDisabledDialogOpen(true);
    } else {
      setIsOpen(true);
    }
  };

  const handleProceed = () => {
    setIsOpen(false);
    navigate('/confirm');
  };

  const handleTrack = () => {
    setIsOpen(false);
    navigate('/track');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Flying Money Background */}
      <FlyingMoney />

      {/* Promo Banner */}
      <div className="promo-banner w-full max-w-sm mb-8 z-10">
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary animate-bounce-subtle" />
            <span className="text-xs font-medium text-primary">خدمة سريعة وموثوقة</span>
            <Sparkles className="w-5 h-5 text-primary animate-bounce-subtle" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            ارفع راتبك واستلمه فوراً! 💰
          </h2>
          <p className="text-sm text-muted-foreground">
            حوّل راتبك الشهري واستلمه بأسرع وقت
          </p>
        </div>
      </div>

      {/* Logo and Title */}
      <div className="text-center mb-8 z-10">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center relative">
          <Wallet className="w-10 h-10 text-primary" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center animate-bounce-subtle">
            <DollarSign className="w-4 h-4 text-success-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          غلا لايف
        </h1>
        <p className="text-muted-foreground">
          طلب صرف الراتب
        </p>
      </div>

      {/* Halo Button */}
      <button 
        onClick={handleMainButtonClick}
        className="halo-button w-36 h-36 flex flex-col items-center justify-center cursor-pointer z-10"
        disabled={settingsLoading}
      >
        <Wallet className="w-12 h-12 mb-2" />
        <span className="text-lg font-bold">طلب صرف</span>
      </button>

      {/* Bottom Sheet - Only shows when payout is enabled */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        
        <SheetContent side="bottom" className="bottom-sheet h-auto max-h-[80vh] overflow-y-auto p-0">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted" />
          </div>
          
          <div className="p-5 space-y-5">
            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">
                تعليمات مهمة
              </h2>
              <p className="text-muted-foreground text-sm">
                اقرأ التعليمات بعناية قبل المتابعة
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="glass-card p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-foreground text-sm">
                  اقرأ التعليمات قبل رفع الطلب. نحن غير مسؤولين عن أي خطأ.
                </p>
              </div>

              <div className="glass-card p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-foreground text-sm">
                  بعد إرسال الطلب سيظهر كود تتبع. <span className="font-bold text-destructive">احتفظ به ولا تشاركه.</span>
                </p>
              </div>

              <div className="glass-card p-3 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground text-sm">
                  لا تعبّئ البيانات إلا بعد تحويل المبلغ إلى وكالة <span className="font-bold text-primary">10000</span> وتصوير الإيصال.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-1">
              <button
                onClick={handleProceed}
                className="mobile-btn-primary text-sm py-3"
              >
                لقد حولت إلى ID=10000 ولدي إيصال
              </button>
              
              <button
                onClick={handleTrack}
                className="mobile-btn-outline text-sm py-3"
              >
                <Search className="w-4 h-4 inline-block ml-2" />
                بحث عن حوالتي بالكود
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* My Requests Button - Only show if user has saved requests */}
      {hasSavedRequests && (
        <button
          onClick={() => setMyRequestsOpen(true)}
          className="mt-8 flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-xl font-medium transition-all hover:bg-primary/20 z-10"
        >
          <FileText className="w-5 h-5" />
          طلباتي السابقة
        </button>
      )}

      {/* Bottom hint */}
      <p className="text-muted-foreground text-xs mt-6 text-center z-10">
        اضغط على الزر للبدء
      </p>

      {/* My Requests Sheet */}
      <MyRequestsSheet open={myRequestsOpen} onOpenChange={setMyRequestsOpen} />

      {/* Payout Disabled Dialog */}
      <PayoutDisabledDialog 
        open={disabledDialogOpen} 
        onOpenChange={setDisabledDialogOpen}
        nextDate={nextPayoutDate}
      />
    </div>
  );
};

export default Index;
