import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Search, AlertCircle, CheckCircle2, FileText, Sparkles, DollarSign, Settings, Zap, BookOpen } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MyRequestsSheet } from '@/components/MyRequestsSheet';
import { useSavedRequests } from '@/hooks/use-saved-requests';
import { FlyingMoney } from '@/components/FlyingMoney';
import { PayoutDisabledDialog } from '@/components/PayoutDisabledDialog';
import { usePayoutSettings } from '@/hooks/use-payout-settings';
import { VideoStoryCircle } from '@/components/VideoStoryCircle';

const INSTANT_INTRO_DISMISSED_KEY = 'instant_intro_dismissed';

const Index = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);
  const [disabledDialogOpen, setDisabledDialogOpen] = useState(false);
  const [instantInfoOpen, setInstantInfoOpen] = useState(false);
  const [dontShowInstantAgain, setDontShowInstantAgain] = useState(false);
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
      {/* Admin Icon - Top Left */}
      <button
        onClick={() => navigate('/admin/login')}
        className="absolute top-14 left-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-20"
        title="دخول المسؤولين"
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Flying Money Background */}
      <FlyingMoney />

      {/* Video Story Circle - Tutorial */}
      <div className="mb-6 z-10">
        <VideoStoryCircle />
      </div>

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

      {/* Two Main Buttons Side by Side */}
      <div className="flex gap-3 z-10 w-full max-w-sm px-4">
        {/* Monthly Payout Button */}
        <button 
          onClick={handleMainButtonClick}
          className="flex-1 p-3 rounded-xl bg-primary text-primary-foreground flex flex-col items-center gap-1.5 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl"
          disabled={settingsLoading}
        >
          <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold">سحب شهري</p>
            <p className="text-[9px] opacity-80">صرف راتبك</p>
          </div>
        </button>

        {/* Instant Payout Button */}
        <button 
          onClick={() => {
            const isDismissed = localStorage.getItem(INSTANT_INTRO_DISMISSED_KEY) === 'true';
            if (isDismissed) {
              navigate('/instant/banks');
            } else {
              setInstantInfoOpen(true);
            }
          }}
          className="flex-1 p-3 rounded-xl bg-warning text-warning-foreground flex flex-col items-center gap-1.5 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-white/20 rounded-full">
            <span className="text-[8px] font-bold">جديد ⚡</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold">سحب فوري</p>
            <p className="text-[9px] opacity-90">بيع راتبك</p>
          </div>
        </button>
      </div>

      {/* Bottom Sheet - Only shows when payout is enabled */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        
        <SheetContent side="bottom" className="bottom-sheet h-auto max-h-[85vh] overflow-y-auto p-0">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted" />
          </div>
          
          <div className="p-5 space-y-6">
            {/* Simple Question */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                ماذا تريد أن تفعل؟
              </h2>
            </div>

            {/* Main Options */}
            <div className="space-y-4">
              {/* Option 1: New Monthly Request */}
              <button
                onClick={handleProceed}
                className="w-full p-5 rounded-2xl bg-primary text-primary-foreground flex items-center gap-4 transition-all active:scale-[0.98] shadow-lg"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-lg font-bold mb-1">رفع طلب صرف شهري</p>
                  <p className="text-sm opacity-80">حولت المبلغ ولدي إيصال التحويل</p>
                </div>
              </button>

              {/* Option 2: Track Existing */}
              <button
                onClick={handleTrack}
                className="w-full p-5 rounded-2xl bg-muted border-2 border-border flex items-center gap-4 transition-all active:scale-[0.98] hover:border-primary/50"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Search className="w-7 h-7 text-primary" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-lg font-bold text-foreground mb-1">تتبع طلب سابق</p>
                  <p className="text-sm text-muted-foreground">لدي كود تتبع وأريد معرفة حالة طلبي</p>
                </div>
              </button>
            </div>

            {/* Important Note - Simplified */}
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-foreground font-medium text-sm">
                    قبل رفع طلب جديد تأكد من:
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>تحويل المبلغ لوكالة <strong className="text-primary">10000</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>تصوير إيصال التحويل</span>
                    </li>
                  </ul>
                </div>
              </div>
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

      {/* Instant Payout Info Dialog */}
      <Dialog open={instantInfoOpen} onOpenChange={(open) => {
        setInstantInfoOpen(open);
        if (!open) setDontShowInstantAgain(false);
      }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-6" dir="rtl">
          <DialogTitle className="sr-only">معلومات السحب الفوري</DialogTitle>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-warning" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">السحب الفوري ⚡</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                لو سمحت اقرأ الشرح بعناية لفهم كيف يعمل نظام السحب الفوري قبل المتابعة
              </p>
            </div>
            
            {/* Don't show again checkbox */}
            <button
              onClick={() => setDontShowInstantAgain(!dontShowInstantAgain)}
              className="w-full p-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-all flex items-center justify-center gap-3"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                dontShowInstantAgain ? 'border-warning bg-warning' : 'border-muted-foreground'
              }`}>
                {dontShowInstantAgain && <CheckCircle2 className="w-3 h-3 text-warning-foreground" />}
              </div>
              <span className="text-sm text-muted-foreground">عدم إظهار هذا مجدداً</span>
            </button>

            <button
              onClick={() => {
                if (dontShowInstantAgain) {
                  localStorage.setItem(INSTANT_INTRO_DISMISSED_KEY, 'true');
                }
                setInstantInfoOpen(false);
                navigate('/instant');
              }}
              className="w-full py-3 rounded-xl bg-warning text-warning-foreground font-bold transition-all active:scale-[0.98]"
            >
              فهمت، متابعة
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
