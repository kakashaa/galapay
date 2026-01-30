import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Search, AlertCircle, CheckCircle2, FileText, Sparkles, Settings, Zap, BookOpen } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MyRequestsSheet } from '@/components/MyRequestsSheet';
import { useSavedRequests } from '@/hooks/use-saved-requests';
import { FlyingMoney } from '@/components/FlyingMoney';
import { PayoutDisabledDialog } from '@/components/PayoutDisabledDialog';
import { usePayoutSettings } from '@/hooks/use-payout-settings';
import { VideoStoryCircle } from '@/components/VideoStoryCircle';
import InstantPayoutCountdown from '@/components/InstantPayoutCountdown';
import { ServiceIconsGrid } from '@/components/ServiceIconsGrid';
import { motion } from 'framer-motion';
import { FadeIn, AnimatedCard } from '@/components/AnimatedCard';
import StarField from '@/components/StarField';
import { useTapFeedback } from '@/hooks/use-haptic-feedback';
import SupportersSpotlight from '@/components/SupportersSpotlight';

// Track bouncing state for main buttons
const useBounceAnimation = () => {
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const { triggerFeedback } = useTapFeedback();
  
  const triggerBounce = (id: string) => {
    setBouncingId(id);
    triggerFeedback({ sound: true, haptic: true });
    setTimeout(() => setBouncingId(null), 400);
  };
  
  return { bouncingId, triggerBounce };
};

const INSTANT_INTRO_DISMISSED_KEY = 'instant_intro_dismissed';
const INSTANT_SERVICE_LAUNCHED = false;

const Index = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);
  const [disabledDialogOpen, setDisabledDialogOpen] = useState(false);
  const [instantInfoOpen, setInstantInfoOpen] = useState(false);
  const [dontShowInstantAgain, setDontShowInstantAgain] = useState(false);
  const { hasSavedRequests } = useSavedRequests();
  const { payoutEnabled, nextPayoutDate, loading: settingsLoading } = usePayoutSettings();
  const [currentBanner, setCurrentBanner] = useState(0);
  const { bouncingId, triggerBounce } = useBounceAnimation();

  useEffect(() => {
    if (INSTANT_SERVICE_LAUNCHED) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleMainButtonClick = () => {
    triggerBounce('monthly');
    if (!payoutEnabled) {
      setDisabledDialogOpen(true);
    } else {
      setTimeout(() => setIsOpen(true), 200);
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
    <div className="min-h-screen premium-bg flex flex-col items-center relative overflow-hidden">
      <StarField starCount={35} />
      
      {/* Sticky Top Banner - Coming Soon */}
      {!INSTANT_SERVICE_LAUNCHED && (
        <div className="sticky top-0 left-0 right-0 z-50 w-full bg-card/95 backdrop-blur-xl border-b border-warning/30">
          <div className="flex items-center justify-center gap-3 px-4 py-2">
            <motion.div
              className="flex items-center gap-2"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-xs font-bold text-warning">قريباً - السحب الفوري ⚡</span>
            </motion.div>
            <div className="h-4 w-px bg-warning/30" />
            <InstantPayoutCountdown />
          </div>
        </div>
      )}

      {/* Admin Icon */}
      <motion.button
        onClick={() => navigate('/admin/login')}
        className="absolute top-16 left-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-20 backdrop-blur-sm border border-border/50"
        title="دخول المسؤولين"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
      </motion.button>

      <FlyingMoney />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full p-6">
        
        {/* Rotating Promo Banners */}
        <FadeIn delay={0.1} className="w-full max-w-sm mb-4 z-10 h-20 relative px-4">
          <motion.div 
            className={`absolute inset-x-4 inset-y-0 neon-card p-3 transition-all duration-500 ${
              currentBanner === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary glow-text">خدمة سريعة وموثوقة</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  ارفع راتبك واستلمه فوراً! 💰
                </p>
              </div>
            </div>
          </motion.div>

          {!INSTANT_SERVICE_LAUNCHED && (
            <motion.div 
              className={`absolute inset-x-4 inset-y-0 neon-card p-3 transition-all duration-500 ${
                currentBanner === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              <div className="flex items-center h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-warning" />
                    <span className="text-xs font-bold text-warning">قريباً - السحب الفوري ⚡</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    اسحب راتبك بأي وقت تحتاجه!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {!INSTANT_SERVICE_LAUNCHED && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              <button 
                onClick={() => setCurrentBanner(0)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${currentBanner === 0 ? 'bg-primary w-4 shadow-[0_0_10px_hsl(var(--primary))]' : 'bg-muted-foreground/30'}`}
              />
              <button 
                onClick={() => setCurrentBanner(1)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${currentBanner === 1 ? 'bg-warning w-4 shadow-[0_0_10px_hsl(var(--warning))]' : 'bg-muted-foreground/30'}`}
              />
            </div>
          )}
        </FadeIn>

        {/* Spotlight Area - Supporters Spotlight */}
        <div className="w-full max-w-sm flex items-center justify-center z-10 mb-4 py-2">
          <SupportersSpotlight />
        </div>

        {/* Tutorial Videos Section - Below Spotlight */}
        <FadeIn delay={0.2} className="z-10 mb-6 w-full max-w-sm">
          <h3 className="text-sm font-bold text-muted-foreground text-center mb-3">فيديوهات تعليمية 📹</h3>
          <div className="flex justify-center">
            <VideoStoryCircle />
          </div>
        </FadeIn>

        {/* Two Main Payout Buttons */}
        <FadeIn delay={0.3} className="flex gap-3 z-10 w-full max-w-sm px-4 mb-6 relative">
          {/* Monthly Payout Button */}
          <motion.button 
            onClick={handleMainButtonClick}
            className="flex-1 p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex flex-col items-center gap-1.5 btn-glow ripple"
            disabled={settingsLoading}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className={`w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm ${bouncingId === 'monthly' ? 'animate-mac-bounce' : ''}`}>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">سحب شهري</p>
              <p className="text-[9px] opacity-80">صرف راتبك</p>
            </div>
          </motion.button>

          {/* Instant Payout Button */}
          <motion.button 
            onClick={() => {
              triggerBounce('instant');
              if (!INSTANT_SERVICE_LAUNCHED) {
                setTimeout(() => navigate('/instant'), 200);
              } else {
                const isDismissed = localStorage.getItem(INSTANT_INTRO_DISMISSED_KEY) === 'true';
                if (isDismissed) {
                  setTimeout(() => navigate('/instant'), 200);
                } else {
                  setTimeout(() => setInstantInfoOpen(true), 200);
                }
              }
            }}
            className="flex-1 p-3 rounded-xl bg-gradient-to-br from-warning to-warning/80 text-warning-foreground flex flex-col items-center gap-1.5 relative ripple"
            style={{ boxShadow: '0 0 20px hsla(38, 92%, 55%, 0.3)' }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            {!INSTANT_SERVICE_LAUNCHED && (
              <motion.div 
                className="absolute -top-3 left-2 bg-destructive text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                قريباً
              </motion.div>
            )}
            <div className={`w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm ${bouncingId === 'instant' ? 'animate-mac-bounce' : ''}`}>
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">سحب فوري</p>
              <p className="text-[9px] opacity-90">سحب راتبك</p>
            </div>
          </motion.button>
        </FadeIn>

        {/* Service Icons Grid */}
        <FadeIn delay={0.4} className="z-10 mb-4">
          <ServiceIconsGrid />
        </FadeIn>
      </div>

      {/* Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="bottom-sheet h-auto max-h-[85vh] overflow-y-auto p-0 bg-card/95 backdrop-blur-xl border-t border-primary/20">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-primary/30" />
          </div>
          
          <div className="p-5 space-y-6">
            <motion.div 
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-foreground glow-text">
                ماذا تريد أن تفعل؟
              </h2>
            </motion.div>

            <div className="space-y-4">
              <motion.button
                onClick={handleProceed}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center gap-4 btn-glow ripple"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-lg font-bold mb-1">رفع طلب صرف شهري</p>
                  <p className="text-sm opacity-80">حولت المبلغ ولدي إيصال التحويل</p>
                </div>
              </motion.button>

              <motion.button
                onClick={handleTrack}
                className="w-full p-5 rounded-2xl neon-card flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Search className="w-7 h-7 text-primary" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-lg font-bold text-foreground mb-1">تتبع طلب سابق</p>
                  <p className="text-sm text-muted-foreground">لدي كود تتبع وأريد معرفة حالة طلبي</p>
                </div>
              </motion.button>
            </div>

            <motion.div 
              className="neon-card p-4 border-warning/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-foreground font-medium text-sm">
                    قبل رفع طلب جديد تأكد من:
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>تحويل المبلغ لوكالة <strong className="text-primary glow-text">10000</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>تصوير إيصال التحويل</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>

      {/* My Requests Button */}
      {hasSavedRequests && (
        <motion.button
          onClick={() => setMyRequestsOpen(true)}
          className="mt-8 flex items-center gap-2 px-6 py-3 neon-card text-primary font-medium z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FileText className="w-5 h-5" />
          طلباتي السابقة
        </motion.button>
      )}

      <motion.p 
        className="text-muted-foreground text-xs mt-6 text-center z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        اضغط على الزر للبدء
      </motion.p>

      <MyRequestsSheet open={myRequestsOpen} onOpenChange={setMyRequestsOpen} />
      <PayoutDisabledDialog open={disabledDialogOpen} onOpenChange={setDisabledDialogOpen} nextDate={nextPayoutDate} />

      {/* Instant Payout Info Dialog */}
      <Dialog open={instantInfoOpen} onOpenChange={(open) => {
        setInstantInfoOpen(open);
        if (!open) setDontShowInstantAgain(false);
      }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-6 neon-card border-warning/30" dir="rtl">
          <DialogTitle className="sr-only">معلومات السحب الفوري</DialogTitle>
          <div className="text-center space-y-4">
            <motion.div 
              className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center"
              animate={{ boxShadow: ['0 0 20px hsla(38, 92%, 55%, 0.3)', '0 0 40px hsla(38, 92%, 55%, 0.5)', '0 0 20px hsla(38, 92%, 55%, 0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <BookOpen className="w-8 h-8 text-warning" />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">السحب الفوري ⚡</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                لو سمحت اقرأ الشرح بعناية لفهم كيف يعمل نظام السحب الفوري قبل المتابعة
              </p>
            </div>
            
            <button
              onClick={() => setDontShowInstantAgain(!dontShowInstantAgain)}
              className={`w-full p-3 rounded-xl border transition-all flex items-center justify-center gap-3 ${
                dontShowInstantAgain ? 'border-warning bg-warning/10' : 'border-border bg-muted/50 hover:border-warning/50'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                dontShowInstantAgain ? 'border-warning bg-warning' : 'border-muted-foreground'
              }`}>
                {dontShowInstantAgain && <CheckCircle2 className="w-3 h-3 text-warning-foreground" />}
              </div>
              <span className="text-sm text-muted-foreground">عدم إظهار هذا مجدداً</span>
            </button>

            <motion.button
              onClick={() => {
                if (dontShowInstantAgain) {
                  localStorage.setItem(INSTANT_INTRO_DISMISSED_KEY, 'true');
                }
                setInstantInfoOpen(false);
                navigate('/instant');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-warning to-warning/80 text-warning-foreground font-bold"
              style={{ boxShadow: '0 0 20px hsla(38, 92%, 55%, 0.3)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              فهمت، متابعة
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
