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
      <div className="text-center mb-12">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Zalal Life Payouts
        </h1>
        <p className="text-muted-foreground text-lg">
          طلب صرف الراتب
        </p>
      </div>

      {/* Halo Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button className="halo-button w-40 h-40 flex flex-col items-center justify-center cursor-pointer">
            <Wallet className="w-12 h-12 mb-2" />
            <span className="text-lg font-semibold">طلب صرف</span>
          </button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="bottom-sheet h-auto max-h-[85vh] overflow-y-auto p-0">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-muted" />
          </div>
          
          <div className="p-6 space-y-6">
            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                تعليمات مهمة
              </h2>
              <p className="text-muted-foreground">
                اقرأ التعليمات بعناية قبل المتابعة
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="glass-card p-4 flex gap-3">
                <AlertCircle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
                <p className="text-foreground">
                  اقرأ التعليمات قبل رفع الطلب. نحن غير مسؤولين عن أي خطأ.
                </p>
              </div>

              <div className="glass-card p-4 flex gap-3">
                <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                <p className="text-foreground">
                  بعد إرسال الطلب سيظهر كود تتبع. <span className="font-bold text-destructive">احتفظ به ولا تشاركه.</span>
                </p>
              </div>

              <div className="glass-card p-4 flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
                <p className="text-foreground">
                  لا تعبّئ البيانات إلا بعد تحويل المبلغ إلى وكالة <span className="font-bold text-primary">10000</span> وتصوير الإيصال.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleProceed}
                className="mobile-btn-primary"
              >
                لقد حولت إلى ID=10000 ولدي إيصال
              </button>
              
              <button
                onClick={handleTrack}
                className="mobile-btn-outline"
              >
                <Search className="w-5 h-5 inline-block ml-2" />
                بحث عن حوالتي بالكود
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom hint */}
      <p className="text-muted-foreground text-sm mt-12 text-center">
        اضغط على الزر للبدء
      </p>
    </div>
  );
};

export default Index;
