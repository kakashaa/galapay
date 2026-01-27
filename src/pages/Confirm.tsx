import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckSquare, Square } from 'lucide-react';

const Confirm = () => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const handleContinue = () => {
    if (confirmed) {
      navigate('/request');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      {/* Header */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-muted-foreground mb-8"
      >
        <ArrowRight className="w-5 h-5" />
        <span>رجوع</span>
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        {/* Warning Card */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              تأكيد مهم
            </h1>
          </div>

          <div className="space-y-4 text-foreground">
            <p>
              قبل المتابعة، تأكد من أنك قمت بالتالي:
            </p>
            
            <ul className="space-y-3 mr-4">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>تحويل المبلغ إلى <span className="font-bold text-primary">Agency ID = 10000</span></span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>تصوير إيصال التحويل بشكل واضح</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>التأكد من صحة البيانات قبل الإرسال</span>
              </li>
            </ul>

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mt-4">
              <p className="text-destructive font-medium text-sm">
                ⚠️ لن يتم قبول أي طلب بدون إيصال تحويل صحيح
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <button
          onClick={() => setConfirmed(!confirmed)}
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border mb-6 transition-all"
        >
          {confirmed ? (
            <CheckSquare className="w-6 h-6 text-primary" />
          ) : (
            <Square className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">
            أؤكد أني حولت إلى 10000 ولدي إيصال
          </span>
        </button>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!confirmed}
          className={`mobile-btn-primary ${
            !confirmed ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          متابعة
        </button>
      </div>
    </div>
  );
};

export default Confirm;
