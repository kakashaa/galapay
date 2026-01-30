import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckSquare, Square, Image } from 'lucide-react';

const Confirm = () => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const handleContinue = () => {
    if (confirmed) {
      navigate('/request');
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-6 pb-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground mb-4"
        >
          <ArrowRight className="w-5 h-5" />
          <span>رجوع</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Warning Card */}
        <div className="glass-card p-5 mb-5">
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
                <span>تحويل المبلغ إلى <span className="font-bold text-primary">غلا لايف - ID = 10000</span></span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>تصوير إيصال التحويل بشكل واضح</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>التأكد من أن الإيصال يظهر اسم "غلا لايف" ومعرف 10000</span>
              </li>
            </ul>

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mt-4">
              <p className="text-destructive font-medium text-sm">
                ⚠️ لن يتم قبول أي طلب بدون إيصال تحويل صحيح لغلا لايف
              </p>
            </div>
          </div>
        </div>

        {/* Sample Receipt Section */}
        <div className="glass-card p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">نموذج الإيصال المطلوب</h2>
              <p className="text-xs text-muted-foreground">تأكد أن إيصالك مشابه لهذا</p>
            </div>
          </div>

          {/* Sample Receipt Image - Full Display */}
          <div className="rounded-xl overflow-hidden border-2 border-primary/30 bg-primary/5">
            <div className="bg-primary/20 px-3 py-2 text-center">
              <span className="text-xs font-bold text-primary">📋 نموذج إيصال صحيح</span>
            </div>
            <img
              src="/sample-receipt.jpeg"
              alt="نموذج إيصال صحيح"
              className="w-full"
            />
            <div className="p-3 bg-primary/10 text-xs text-muted-foreground space-y-1">
              <p>✅ اسم المستخدم: <span className="font-bold text-foreground">غلا لايف</span></p>
              <p>✅ معرف المستخدم: <span className="font-bold text-primary">10000</span></p>
              <p>✅ الرقم المرجعي: <span className="font-bold text-foreground">موجود في الإيصال</span></p>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <button
          onClick={() => setConfirmed(!confirmed)}
          className={`flex items-center gap-3 p-4 rounded-xl border mb-6 transition-all ${
            confirmed 
              ? 'bg-primary/10 border-primary' 
              : 'bg-card border-border'
          }`}
        >
          {confirmed ? (
            <CheckSquare className="w-6 h-6 text-primary" />
          ) : (
            <Square className="w-6 h-6 text-muted-foreground" />
          )}
          <span className={`font-medium ${confirmed ? 'text-primary' : 'text-foreground'}`}>
            أؤكد أني حولت إلى غلا لايف (10000) ولدي إيصال مشابه
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
          متابعة لرفع الطلب
        </button>
      </div>
    </div>
  );
};

export default Confirm;
