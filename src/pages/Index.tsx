import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Index = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleProceed = () => {
    setIsOpen(false);
    navigate('/confirm');
  };

  const handleTrack = () => {
    setIsOpen(false);
    navigate('/track');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo and Title */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          غلا لايف
        </h1>
        <p className="text-muted-foreground">
          طلب صرف الراتب
        </p>
      </div>

      {/* Halo Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button className="halo-button w-32 h-32 flex flex-col items-center justify-center cursor-pointer">
            <Wallet className="w-10 h-10 mb-1" />
            <span className="text-base font-semibold">طلب صرف</span>
          </button>
        </SheetTrigger>
        
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

      {/* Bottom hint */}
      <p className="text-muted-foreground text-xs mt-10 text-center">
        اضغط على الزر للبدء
      </p>
    </div>
  );
};

export default Index;
