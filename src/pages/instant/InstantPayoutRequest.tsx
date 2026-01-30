import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, CheckCircle2, User, DollarSign, MapPin, Loader2, AlertCircle, Lock, CreditCard, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const COINS_PER_DOLLAR = 8500;

// Available payment methods for supporter (our actual banks)
const SUPPORTER_PAYMENT_METHODS = [
  { id: 'cashapp', name: 'CashApp', iconUrl: '/banks/cashapp-icon.png' },
  { id: 'zelle', name: 'Zelle', iconUrl: '/banks/zelle-icon.png' },
  { id: 'chime', name: 'Chime', iconUrl: '/banks/chime-icon.png' },
  { id: 'apple_pay', name: 'Apple Pay', iconUrl: '/banks/applepay-icon.png' },
  { id: 'visa', name: 'Visa/MC', iconUrl: '/banks/visa-icon.jpeg' },
  { id: 'kuraimi', name: 'الكريمي', iconUrl: '/banks/kuraimi-icon.png' },
  { id: 'jaib', name: 'جيب', iconUrl: '/banks/jaib-icon.jpeg' },
  { id: 'alrajhi', name: 'الراجحي', iconUrl: '/banks/alrajhi-icon.png' },
];

interface PayoutMethod {
  name: string;
  nameArabic?: string;
  iconUrl?: string;
  fields?: Array<{ name: string; label: string; type: string; required: boolean }>;
  requiredFields?: Array<{ name: string; label: string; labelArabic?: string; type: string; required?: boolean; optional?: boolean }>;
}

interface Country {
  id: string;
  country_name_arabic: string;
  country_code: string;
  dial_code: string;
  methods: PayoutMethod[];
}

const InstantPayoutRequest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Supporter info
  const [supporterName, setSupporterName] = useState('');
  const [supporterAccountId, setSupporterAccountId] = useState('');
  const [supporterAmountUsd, setSupporterAmountUsd] = useState('');
  const [supporterPaymentMethod, setSupporterPaymentMethod] = useState('');
  const [supporterReceipt, setSupporterReceipt] = useState<File | null>(null);
  const [supporterReceiptPreview, setSupporterReceiptPreview] = useState<string | null>(null);
  
  // Host info
  const [hostName, setHostName] = useState('');
  const [hostAccountId, setHostAccountId] = useState('');
  const [hostUsdAmount, setHostUsdAmount] = useState('');
  const [hostReceipt, setHostReceipt] = useState<File | null>(null);
  const [hostReceiptPreview, setHostReceiptPreview] = useState<string | null>(null);
  const [hostReferenceNumber, setHostReferenceNumber] = useState('');
  const [isExtractingReference, setIsExtractingReference] = useState(false);
  const [referenceExtracted, setReferenceExtracted] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  
  // Payout details - Step 3
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [recipientFullName, setRecipientFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [methodFields, setMethodFields] = useState<Record<string, string>>({});
  
  const supporterReceiptRef = useRef<HTMLInputElement>(null);
  const hostReceiptRef = useRef<HTMLInputElement>(null);

  // Fetch countries and methods
  const { data: countries } = useQuery({
    queryKey: ['countries-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries_methods')
        .select('*')
        .eq('is_active', true)
        .order('country_name_arabic');
      if (error) throw error;
      return data?.map(c => ({
        ...c,
        methods: c.methods as unknown as PayoutMethod[]
      })) as Country[];
    },
  });

  // Get selected country data
  const selectedCountry = countries?.find(c => c.id === selectedCountryId);
  const methods = selectedCountry?.methods || [];
  
  // Get selected method fields
  const selectedMethodData = methods.find(m => m.name === payoutMethod);
  const methodFieldsConfig = selectedMethodData?.fields || selectedMethodData?.requiredFields || [];

  // Calculate coins from USD amount
  const hostCoinsAmount = hostUsdAmount ? Math.round(parseFloat(hostUsdAmount) * COINS_PER_DOLLAR) : 0;
  const hostPayoutAmount = parseFloat(hostUsdAmount) || 0;

  const handleSupporterReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSupporterReceipt(file);
      const reader = new FileReader();
      reader.onloadend = () => setSupporterReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleHostReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHostReceipt(file);
      setHostReferenceNumber('');
      setReferenceExtracted(false);
      setReferenceError(null);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setHostReceiptPreview(base64);
        
        // Extract reference number using AI
        await extractReferenceNumber(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractReferenceNumber = async (base64Image: string) => {
    setIsExtractingReference(true);
    setReferenceError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-receipt-data', {
        body: { 
          imageBase64: base64Image,
          extractionType: 'reference_only'
        }
      });
      
      if (error) throw error;
      
      if (data?.referenceNumber) {
        // Check if reference is already used
        const { data: isUsed, error: checkError } = await supabase
          .rpc('is_reference_used', { ref_number: data.referenceNumber });
        
        if (checkError) throw checkError;
        
        if (isUsed) {
          setReferenceError('⚠️ هذا الرقم المرجعي مستخدم مسبقاً! هذه محاولة احتيال. يرجى استخدام إيصال جديد.');
          setHostReferenceNumber('');
          setReferenceExtracted(false);
        } else {
          setHostReferenceNumber(data.referenceNumber);
          setReferenceExtracted(true);
          toast({
            title: 'تم استخراج الرقم المرجعي',
            description: `الرقم المرجعي: ${data.referenceNumber}`,
          });
        }
      } else {
        setReferenceError('لم يتم العثور على رقم مرجعي في الإيصال. تأكد من وضوح الصورة.');
      }
    } catch (error) {
      console.error('Error extracting reference:', error);
      setReferenceError('حدث خطأ أثناء قراءة الإيصال. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExtractingReference(false);
    }
  };

  const isStep1Valid = supporterName && supporterAccountId && supporterAmountUsd && supporterPaymentMethod && supporterReceipt;
  const isStep2Valid = hostName && hostAccountId && hostUsdAmount && hostReceipt && hostReferenceNumber && referenceExtracted && !referenceError;
  const isStep3Valid = recipientFullName && phoneNumber && payoutMethod;

  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) return;
    
    setIsSubmitting(true);
    
    try {
      // Double-check reference number is not used (security)
      const { data: isUsed, error: checkError } = await supabase
        .rpc('is_reference_used', { ref_number: hostReferenceNumber });
      
      if (checkError) throw checkError;
      
      if (isUsed) {
        toast({
          title: 'الرقم المرجعي مستخدم',
          description: 'هذا الرقم المرجعي تم استخدامه مسبقاً. يرجى استخدام إيصال جديد.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      // Upload supporter receipt
      const supporterFileName = `instant/supporter_${Date.now()}_${supporterReceipt!.name}`;
      const { error: supporterUploadError } = await supabase.storage
        .from('receipts')
        .upload(supporterFileName, supporterReceipt!);
      
      if (supporterUploadError) throw supporterUploadError;
      
      const { data: supporterUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(supporterFileName);
      
      // Upload host receipt
      const hostFileName = `instant/host_${Date.now()}_${hostReceipt!.name}`;
      const { error: hostUploadError } = await supabase.storage
        .from('receipts')
        .upload(hostFileName, hostReceipt!);
      
      if (hostUploadError) throw hostUploadError;
      
      const { data: hostUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(hostFileName);
      
      // Generate tracking code
      const { data: trackingCode, error: trackingError } = await supabase
        .rpc('generate_tracking_code');
      
      if (trackingError) throw trackingError;
      
      // Insert request
      const { error: insertError } = await supabase
        .from('instant_payout_requests')
        .insert({
          supporter_name: supporterName,
          supporter_account_id: supporterAccountId,
          supporter_amount_usd: parseFloat(supporterAmountUsd),
          supporter_payment_method: supporterPaymentMethod,
          supporter_receipt_url: supporterUrlData.publicUrl,
          host_name: hostName,
          host_account_id: hostAccountId,
          host_coins_amount: hostCoinsAmount,
          host_payout_amount: hostPayoutAmount,
          host_receipt_url: hostUrlData.publicUrl,
          host_receipt_reference: hostReferenceNumber,
          host_country: selectedCountry?.country_name_arabic || '',
          host_country_dial_code: selectedCountry?.dial_code || '+1',
          host_phone_number: phoneNumber,
          host_payout_method: payoutMethod,
          host_recipient_full_name: recipientFullName,
          host_method_fields: methodFields,
          tracking_code: trackingCode,
          status: 'pending',
        });
      
      if (insertError) throw insertError;
      
      // Navigate to success page
      navigate('/success', { 
        state: { 
          trackingCode,
          isInstant: true,
        } 
      });
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'حدث خطأ',
        description: 'فشل في إرسال الطلب. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border shrink-0">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/instant/banks')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">طلب سحب فوري</h1>
          <div className="w-10" />
        </div>
        
        {/* Progress indicator */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex-1">
                <div className={`h-2 rounded-full transition-all ${
                  currentStep >= step ? 'bg-warning' : 'bg-muted'
                }`} />
                <p className={`text-xs mt-1 text-center ${
                  currentStep >= step ? 'text-warning font-medium' : 'text-muted-foreground'
                }`}>
                  {step === 1 ? 'الداعم' : step === 2 ? 'المضيف' : 'التحويل'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">
        {/* Step 1: Supporter Info */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <User className="w-5 h-5 text-warning" />
                معلومات الداعم
              </h3>
              <p className="text-sm text-muted-foreground">
                أدخل بيانات الداعم الذي حوّل لك الفلوس
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم الداعم</label>
                <input
                  type="text"
                  value={supporterName}
                  onChange={(e) => setSupporterName(e.target.value)}
                  placeholder="أدخل اسم الداعم"
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ايدي الداعم (في غلا لايف)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={supporterAccountId}
                  onChange={(e) => setSupporterAccountId(e.target.value.replace(/\D/g, ''))}
                  placeholder="مثال: 123456789"
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-warning" />
                  الداعم حوّل عبر
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SUPPORTER_PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSupporterPaymentMethod(method.id)}
                      className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        supporterPaymentMethod === method.id
                          ? 'border-warning bg-warning/10'
                          : 'border-border hover:border-warning/50'
                      }`}
                    >
                      <img 
                        src={method.iconUrl} 
                        alt={method.name} 
                        className="w-10 h-10 object-contain rounded-lg"
                      />
                      <span className="text-[10px] font-medium text-foreground text-center leading-tight">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">المبلغ بالدولار (الذي حوّله الداعم)</label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={supporterAmountUsd}
                    onChange={(e) => setSupporterAmountUsd(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 pr-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-warning focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">صورة إيصال التحويل من الداعم</label>
                <input
                  ref={supporterReceiptRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSupporterReceiptChange}
                  className="hidden"
                />
                <button
                  onClick={() => supporterReceiptRef.current?.click()}
                  className={`w-full p-6 rounded-xl border-2 border-dashed transition-all ${
                    supporterReceiptPreview 
                      ? 'border-warning bg-warning/10' 
                      : 'border-border hover:border-warning/50'
                  }`}
                >
                  {supporterReceiptPreview ? (
                    <div className="space-y-2">
                      <img 
                        src={supporterReceiptPreview} 
                        alt="إيصال الداعم" 
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-warning font-medium">اضغط لتغيير الصورة</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">اضغط لرفع صورة الإيصال</p>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Host Info */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                معلومات المضيف (أنت)
              </h3>
              <p className="text-sm text-muted-foreground">
                أدخل بياناتك وإيصال تحويل الكوينزات لوكالة 10000
              </p>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">تنبيه مهم!</h4>
                  <p className="text-sm text-muted-foreground">
                    يجب أن يكون الإيصال لتحويل كوينزات إلى <span className="font-bold text-foreground">غلا لايف (ايدي 10000)</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسمك في غلا لايف</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="أدخل اسمك في غلا لايف"
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ايدي حسابك في غلا لايف</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={hostAccountId}
                  onChange={(e) => setHostAccountId(e.target.value.replace(/\D/g, ''))}
                  placeholder="مثال: 987654321"
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  كم دولار حوّلت إلى كوينزات؟
                </label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={hostUsdAmount}
                    onChange={(e) => setHostUsdAmount(e.target.value)}
                    placeholder="أدخل المبلغ بالدولار"
                    className="w-full p-3 pr-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                {/* Coins calculation display */}
                {hostUsdAmount && parseFloat(hostUsdAmount) > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Coins className="w-4 h-4" />
                        الكوينزات المحوّلة:
                      </span>
                      <span className="font-bold text-primary text-lg">
                        {hostCoinsAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      (8,500 كوينز = $1)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">صورة إيصال تحويل الكوينزات (لوكالة 10000)</label>
                <input
                  ref={hostReceiptRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHostReceiptChange}
                  className="hidden"
                />
                <button
                  onClick={() => hostReceiptRef.current?.click()}
                  className={`w-full p-6 rounded-xl border-2 border-dashed transition-all ${
                    hostReceiptPreview 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {hostReceiptPreview ? (
                    <div className="space-y-2">
                      <img 
                        src={hostReceiptPreview} 
                        alt="إيصال المضيف" 
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-primary font-medium">اضغط لتغيير الصورة</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">اضغط لرفع صورة الإيصال</p>
                    </div>
                  )}
                </button>
              </div>

              {/* Reference Number - Read Only, AI Extracted */}
              {hostReceiptPreview && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    الرقم المرجعي (يتم استخراجه تلقائياً)
                  </label>
                  
                  {isExtractingReference ? (
                    <div className="w-full p-4 rounded-xl border border-border bg-muted/50 flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">جاري قراءة الإيصال...</span>
                    </div>
                  ) : referenceError ? (
                    <div className="w-full p-4 rounded-xl border border-destructive bg-destructive/10">
                      <p className="text-sm text-destructive font-medium">{referenceError}</p>
                      <button
                        onClick={() => hostReceiptRef.current?.click()}
                        className="mt-2 text-sm text-primary underline"
                      >
                        رفع إيصال جديد
                      </button>
                    </div>
                  ) : hostReferenceNumber ? (
                    <div className="w-full p-4 rounded-xl border border-primary bg-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="font-mono font-bold text-foreground">{hostReferenceNumber}</span>
                      </div>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="w-full p-4 rounded-xl border border-border bg-muted/50">
                      <p className="text-sm text-muted-foreground text-center">
                        سيظهر الرقم المرجعي بعد رفع الإيصال
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Payout Details */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-muted border border-border rounded-xl p-4">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                تفاصيل التحويل
              </h3>
              <p className="text-sm text-muted-foreground">
                أدخل بيانات استلام المبلغ
              </p>
            </div>

            <div className="space-y-4">
              {/* Recipient Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم المستلم</label>
                <input
                  type="text"
                  value={recipientFullName}
                  onChange={(e) => setRecipientFullName(e.target.value)}
                  placeholder="الاسم الكامل كما في الهوية"
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Country Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">بلد الاستلام</label>
                <select
                  value={selectedCountryId}
                  onChange={(e) => {
                    const countryId = e.target.value;
                    setSelectedCountryId(countryId);
                    setPayoutMethod('');
                    setMethodFields({});
                    const country = countries?.find(c => c.id === countryId);
                    if (country) {
                      setPhoneNumber(country.dial_code);
                    }
                  }}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">اختر البلد</option>
                  {countries?.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.country_name_arabic}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payout Method Selection - Show after country */}
              {selectedCountry && methods.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">طريقة الاستلام</label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {methods.map((method) => (
                      <button
                        key={method.name}
                        onClick={() => {
                          setPayoutMethod(method.name);
                          setMethodFields({});
                        }}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          payoutMethod === method.name
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {method.iconUrl && (
                          <img src={method.iconUrl} alt={method.name} className="w-8 h-8 object-contain" />
                        )}
                        <span className="text-xs font-medium text-foreground text-center">{method.nameArabic || method.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Phone Number - Show after method */}
              {payoutMethod && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">رقم الجوال</label>
                  <div className="flex gap-2">
                    <div className="px-3 py-3 rounded-xl border border-border bg-muted text-foreground text-sm min-w-[70px] text-center">
                      {selectedCountry?.dial_code || '+1'}
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phoneNumber.replace(selectedCountry?.dial_code || '', '')}
                      onChange={(e) => setPhoneNumber((selectedCountry?.dial_code || '') + e.target.value.replace(/\D/g, ''))}
                      placeholder="رقم الجوال"
                      className="flex-1 p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic method fields */}
              {methodFieldsConfig.length > 0 && payoutMethod && (
                <div className="space-y-4 pt-2">
                  {methodFieldsConfig.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {field.labelArabic || field.label}
                        {(field.required || !field.optional) && <span className="text-destructive">*</span>}
                      </label>
                      <input
                        type={field.type}
                        inputMode={field.type === 'number' ? 'numeric' : undefined}
                        value={methodFields[field.name] || ''}
                        onChange={(e) => setMethodFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                        placeholder={field.labelArabic || field.label}
                        className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-primary/10 to-warning/10 border border-primary/30 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-foreground">ملخص الطلب</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الداعم:</span>
                  <span className="text-foreground font-medium">{supporterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">طريقة دفع الداعم:</span>
                  <span className="text-foreground font-medium">
                    {SUPPORTER_PAYMENT_METHODS.find(m => m.id === supporterPaymentMethod)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مبلغ الداعم:</span>
                  <span className="text-foreground font-medium">${supporterAmountUsd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الكوينزات المحوّلة:</span>
                  <span className="text-foreground font-medium">{hostCoinsAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">المبلغ المستحق:</span>
                  <span className="text-primary font-bold text-lg">${hostPayoutAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-lg border-t border-border">
        {currentStep < 3 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={currentStep === 1 ? !isStep1Valid : !isStep2Valid}
            className={`w-full p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              (currentStep === 1 ? isStep1Valid : isStep2Valid)
                ? 'bg-warning text-warning-foreground active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <span>التالي</span>
            <CheckCircle2 className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isStep3Valid || isSubmitting}
            className={`w-full p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              isStep3Valid && !isSubmitting
                ? 'bg-primary text-primary-foreground active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <span>إرسال الطلب</span>
                <CheckCircle2 className="w-5 h-5" />
              </>
            )}
          </button>
        )}
        
        {currentStep > 1 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="w-full mt-2 p-3 rounded-xl font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            رجوع للخطوة السابقة
          </button>
        )}
      </div>
    </div>
  );
};

export default InstantPayoutRequest;
