import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Users, Wallet, Shield, ChevronLeft, CheckCircle2, Info } from 'lucide-react';

const InstantPayoutIntro = () => {
  const navigate = useNavigate();
  const [understood, setUnderstood] = useState(false);

  const steps = [
    {
      icon: Users,
      title: 'الدعم يحوّل لك الفلوس',
      description: 'الداعم يحول المبلغ على أحد حساباتنا البنكية',
    },
    {
      icon: Wallet,
      title: 'أنت تحوّل الكوينزات للوكالة',
      description: 'حوّل الكوينزات لحساب الوكالة (آيدي 10000)',
    },
    {
      icon: Zap,
      title: 'استلم فلوسك فوراً',
      description: 'نحوّل لك المبلغ خلال دقائق بعد التأكد من الإيصالات',
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">سحب الراتب الفوري</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-5 space-y-6 pb-32">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              بيع راتبك في أي وقت! ⚡
            </h2>
            <p className="text-muted-foreground">
              خدمة سريعة تساعدك تستلم فلوسك فوراً من الداعمين
            </p>
          </div>
        </div>

        {/* What is this? */}
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">ما هي هذه الخدمة؟</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                إذا عندك داعم يريد يشحن لك في تطبيق غلا لايف، بدل ما تنتظر الراتب الشهري، 
                الداعم يحوّل الفلوس على حساباتنا البنكية، وأنت تحوّل له الكوينزات، 
                وإحنا نحوّل لك المبلغ فوراً! 💰
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">كيف تعمل الخدمة؟</h3>
          
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="glass-card p-4 flex items-start gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-warning" />
            <h3 className="font-bold text-foreground">ملاحظات مهمة</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>الداعم يحول على حساباتنا فقط (سنعرضها لك)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>أنت تحول الكوينزات لوكالة <strong className="text-primary">10000</strong> (غلا لايف)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>نحتاج إيصال تحويل الداعم + إيصال تحويلك للكوينزات</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>العملية تستغرق من دقيقة إلى 10 دقائق</span>
            </li>
          </ul>
        </div>

        {/* Confirmation */}
        <button
          onClick={() => setUnderstood(!understood)}
          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
            understood 
              ? 'border-primary bg-primary/10' 
              : 'border-border bg-muted hover:border-primary/50'
          }`}
        >
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            understood ? 'border-primary bg-primary' : 'border-muted-foreground'
          }`}>
            {understood && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
          </div>
          <span className="font-medium text-foreground">فهمت كيف تعمل الخدمة</span>
        </button>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-lg border-t border-border">
        <button
          onClick={() => navigate('/instant/banks')}
          disabled={!understood}
          className={`w-full p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            understood
              ? 'bg-primary text-primary-foreground active:scale-[0.98]'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <span>عرض حسابات الدفع</span>
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default InstantPayoutIntro;
