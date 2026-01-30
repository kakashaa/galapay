import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { BankCard } from '@/components/instant/BankCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Static bank data - will be replaced with database data later
const banksByCountry = {
  US: {
    name: 'أمريكا',
    flag: '🇺🇸',
    banks: [
      {
        name: 'CashApp',
        nameArabic: 'كاش آب',
        tag: '$Galalive313',
        accountHolder: 'Dobeee Soneee',
        qrImage: '/banks/cashapp-galalive313.jpeg',
        iconUrl: '/wallets/cashapp.png',
      },
      {
        name: 'CashApp',
        nameArabic: 'كاش آب (حساب 2)',
        tag: '$cashalk1',
        accountHolder: 'Gala live chat',
        qrImage: '/banks/cashapp-cashalk1.jpeg',
        iconUrl: '/wallets/cashapp.png',
      },
      {
        name: 'Zelle',
        nameArabic: 'زيل',
        email: 'ghalibali32@gmail.com',
        accountHolder: 'ASSAF GHALIB',
        qrImage: '/banks/zelle-assaf.jpeg',
        iconUrl: '/wallets/zelle.png',
      },
      {
        name: 'Zelle',
        nameArabic: 'زيل (حساب 2)',
        accountHolder: 'Hamza Ghalib',
        qrImage: '/banks/zelle-hamza.jpeg',
        iconUrl: '/wallets/zelle.png',
      },
      {
        name: 'Chime',
        nameArabic: 'تشايم',
        qrImage: '/banks/chime-qr.png',
        iconUrl: '/wallets/chime.png',
      },
      {
        name: 'Apple Pay',
        nameArabic: 'آبل باي',
        phoneNumber: '7146844346',
        iconUrl: '/wallets/apple-pay.png',
      },
    ],
  },
  YE: {
    name: 'اليمن',
    flag: '🇾🇪',
    banks: [
      {
        name: 'Kuraimi SAR',
        nameArabic: 'الكريمي - ريال سعودي',
        accountHolder: 'حمزه علي حسين غالب',
        accountNumber: '3183733892',
        qrImage: '/banks/kuraimi-sar.jpeg',
        iconUrl: '/wallets/kuraimi.png',
      },
      {
        name: 'Kuraimi USD',
        nameArabic: 'الكريمي - دولار',
        accountHolder: 'حمزه علي حسين غالب',
        accountNumber: '3183929703',
        qrImage: '/banks/kuraimi-usd.jpeg',
        iconUrl: '/wallets/kuraimi.png',
      },
      {
        name: 'Kuraimi YER',
        nameArabic: 'الكريمي - ريال يمني',
        accountHolder: 'حمزه علي حسين غالب',
        accountNumber: '3183742708',
        qrImage: '/banks/kuraimi-yer.jpeg',
        iconUrl: '/wallets/kuraimi.png',
      },
      {
        name: 'Jaib',
        nameArabic: 'جيب',
        phoneNumber: '776168713',
        accountHolder: 'حمزه علي حسين غالب',
        qrImage: '/banks/jaib-qr.jpeg',
        iconUrl: '/wallets/jaib.png',
        additionalInfo: {
          'الرقم البديل': '1542377',
        },
      },
    ],
  },
  SA: {
    name: 'السعودية',
    flag: '🇸🇦',
    banks: [
      {
        name: 'Al Rajhi Bank',
        nameArabic: 'بنك الراجحي',
        accountHolder: 'ASSAF ALI GHALIB',
        accountNumber: '618000010006080901670',
        iban: 'SA67 8000 0618 6080 1090 1670',
        qrImage: '/banks/alrajhi-qr.png',
        additionalInfo: {
          'كود السويفت': 'RJHISARI',
        },
      },
    ],
  },
};

const InstantPayoutBanks = () => {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [confirmed, setConfirmed] = useState(false);

  const currentCountry = banksByCountry[selectedCountry as keyof typeof banksByCountry];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/instant')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">حسابات الدفع</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-5 space-y-6 pb-32">
        {/* Instructions */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-foreground mb-1">اختر دولة الداعم</h3>
              <p className="text-sm text-muted-foreground">
                اختر الدولة التي سيحوّل منها الداعم، ثم شارك معه تفاصيل الحساب المناسب
              </p>
            </div>
          </div>
        </div>

        {/* Country Tabs */}
        <Tabs value={selectedCountry} onValueChange={setSelectedCountry} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            {Object.entries(banksByCountry).map(([code, country]) => (
              <TabsTrigger 
                key={code} 
                value={code}
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="text-2xl">{country.flag}</span>
                <span className="text-xs font-medium">{country.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(banksByCountry).map(([code, country]) => (
            <TabsContent key={code} value={code} className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center mb-4">
                الحسابات المتاحة في {country.name} - اضغط على أي حساب لعرض التفاصيل
              </p>
              {country.banks.map((bank, index) => (
                <BankCard key={`${code}-${index}`} {...bank} />
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Warning */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-foreground mb-1">تنبيه مهم</h3>
              <p className="text-sm text-muted-foreground">
                تأكد من إرسال الداعم للإيصال بعد التحويل، ستحتاجه في الخطوة التالية
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <button
          onClick={() => setConfirmed(!confirmed)}
          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
            confirmed 
              ? 'border-primary bg-primary/10' 
              : 'border-border bg-muted hover:border-primary/50'
          }`}
        >
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            confirmed ? 'border-primary bg-primary' : 'border-muted-foreground'
          }`}>
            {confirmed && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
          </div>
          <span className="font-medium text-foreground">نعم، الداعم حوّل الفلوس ولدي إيصال التحويل</span>
        </button>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-lg border-t border-border">
        <button
          onClick={() => navigate('/instant/request', { state: { selectedCountry } })}
          disabled={!confirmed}
          className={`w-full p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            confirmed
              ? 'bg-primary text-primary-foreground active:scale-[0.98]'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <span>متابعة رفع الطلب</span>
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default InstantPayoutBanks;
