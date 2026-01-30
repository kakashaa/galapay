import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Users, Wallet, Shield, ChevronLeft, CheckCircle2, Info, AlertCircle, DollarSign } from 'lucide-react';

const InstantPayoutIntro = () => {
  const navigate = useNavigate();
  const [understood, setUnderstood] = useState(false);

  const handleContinue = () => {
    navigate('/instant/banks');
  };

  const steps = [
    {
      icon: Users,
      title: 'الداعم يريد يشتري كوينزات',
      description: 'نوفر له جميع البنوك (أمريكا، السعودية، اليمن) عشان يختار اللي تناسبه',
    },
    {
      icon: Wallet,
      title: 'الداعم يحوّل على حساباتنا',
      description: 'الداعم يحول المبلغ على أحد حساباتنا البنكية المتاحة',
    },
    {
      icon: Zap,
      title: 'حوّل كوينزاتك لوكالتنا',
      description: 'حوّل الكوينزات لوكالة 10000 ونحن نحولها للداعم + نحوّل لك الفلوس!',
    },
  ];

  return (
    <div className="min-h-screen premium-bg" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-warning/20">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground" style={{ textShadow: '0 0 10px hsla(38, 92%, 55%, 0.3)' }}>سحب الراتب الفوري</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-5 space-y-6 pb-32">
        {/* Hero Section */}
        <div className="text-center space-y-4 animate-in fade-in">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-warning to-warning/60 flex items-center justify-center" style={{ boxShadow: '0 0 30px hsla(38, 92%, 55%, 0.4)' }}>
            <Zap className="w-10 h-10 text-warning-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2" style={{ textShadow: '0 0 15px hsla(38, 92%, 55%, 0.3)' }}>
              بيع راتبك بسهولة! 💰
            </h2>
            <p className="text-muted-foreground">
              نساعدك تبيع كوينزاتك لأي داعم ونوفر له كل طرق الدفع
            </p>
          </div>
        </div>

        {/* What is this? */}
        <div className="neon-card p-4 animate-in fade-in slide-in-from-bottom-3" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0" style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.2)' }}>
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1 glow-text">كيف نساعدك؟</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                عندك داعم يريد يشتري منك كوينزات؟ 🤔
                <br /><br />
                <strong className="text-foreground">نسهّل عليك!</strong> إحنا نوفر للداعم جميع طرق الدفع، 
                الداعم يحوّل الفلوس على حساباتنا، وأنت تحوّل الكوينزات لوكالتنا <strong className="text-primary glow-text">(10000)</strong>، 
                ونحن نحولها للداعم ونحوّل لك المبلغ على بنكك فوراً! 💸
              </p>
            </div>
          </div>
        </div>

        {/* Why through us? */}
        <div className="neon-card p-4 border-success/30 animate-in fade-in slide-in-from-bottom-3" style={{ animationDelay: '0.2s', boxShadow: '0 0 20px hsla(142, 76%, 50%, 0.15)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0" style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.3)' }}>
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">ليش تحوّل لنا بدل الداعم؟ 🤑</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                لو حوّلت الكوينزات للداعم مباشرة تحصل على <strong className="text-destructive">7,500</strong> كوينز للدولار فقط!
                <br />
                لكن لما تحوّل لوكالتنا <strong className="text-primary glow-text">(10000)</strong> تحصل على <strong className="text-success">8,500</strong> كوينز للدولار! 🎉
                <br /><br />
                <span className="text-foreground font-medium">يعني ربح إضافي 1,000 كوينز لكل دولار!</span>
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">كيف تعمل الخدمة؟</h3>
          
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="neon-card p-4 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-3" style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center" style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.2)' }}>
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center" style={{ boxShadow: '0 0 10px hsla(142, 76%, 50%, 0.4)' }}>
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

        {/* Critical Warning */}
        <div className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h3 className="font-bold text-destructive">⚠️ تنبيه مهم جداً!</h3>
          </div>
          <p className="text-sm text-foreground font-medium leading-relaxed">
            لا تحوّل الكوينزات لوكالتنا إلا بعد ما تتأكد إن الداعم حوّل الفلوس وأرسلك الإيصال!
            <br />
            <span className="text-muted-foreground">تأكد من إيصال الداعم أولاً لحماية نفسك من أي احتيال.</span>
          </p>
        </div>

        {/* Important Notes */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-warning" />
            <h3 className="font-bold text-foreground">كيف تتم العملية؟</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>أرسل للداعم رابط حساباتنا البنكية</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>الداعم يحوّل ويرسلك إيصال التحويل</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>بعد التأكد من الإيصال، حوّل الكوينزات لوكالتنا <strong className="text-primary">(10000)</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>نحن نحوّل الكوينزات للداعم</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>نحوّل لك المبلغ على بنكك خلال دقائق!</span>
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
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-card/80 backdrop-blur-xl border-t border-primary/20">
        <button
          onClick={handleContinue}
          disabled={!understood}
          className={`w-full p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            understood
              ? 'bg-gradient-to-br from-warning to-warning/80 text-warning-foreground active:scale-[0.98]'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          style={understood ? { boxShadow: '0 0 25px hsla(38, 92%, 55%, 0.4)' } : undefined}
        >
          <span>عرض حسابات الدفع</span>
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default InstantPayoutIntro;
