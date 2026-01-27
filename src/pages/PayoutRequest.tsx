import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, X, Loader2, Wallet, Building, Globe, Send, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Country {
  id: string;
  country_name_arabic: string;
  country_code: string;
  dial_code: string;
  methods: PayoutMethod[];
}

interface PayoutMethod {
  nameArabic: string;
  iconUrl: string;
  requiredFields: RequiredField[];
}

interface RequiredField {
  name: string;
  labelArabic: string;
  type: string;
  optional?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  wallet: <Wallet className="w-5 h-5" />,
  building: <Building className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  send: <Send className="w-5 h-5" />,
  smartphone: <Smartphone className="w-5 h-5" />,
};

const PayoutRequest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    zalalLifeAccountId: '',
    zalalLifeUsername: '',
    recipientFullName: '',
    amount: '',
    phoneNumber: '',
    methodFields: {} as Record<string, string>,
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from('countries_methods')
      .select('*')
      .eq('is_active', true);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البلدان',
        variant: 'destructive',
      });
      return;
    }

    setCountries(data?.map(c => ({
      ...c,
      methods: c.methods as unknown as PayoutMethod[]
    })) || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'خطأ',
          description: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت',
          variant: 'destructive',
        });
        return;
      }
      setReceiptImage(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setReceiptImage(null);
    setReceiptPreview(null);
  };

  const handleCountryChange = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    setSelectedCountry(country || null);
    setSelectedMethod(null);
    setFormData(prev => ({
      ...prev,
      phoneNumber: country ? country.dial_code : '',
      methodFields: {},
    }));
  };

  const handleMethodChange = (methodName: string) => {
    const method = selectedCountry?.methods.find(m => m.nameArabic === methodName);
    setSelectedMethod(method || null);
    setFormData(prev => ({ ...prev, methodFields: {} }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receiptImage || !selectedCountry || !selectedMethod) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ صحيح',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload image first
      const fileExt = receiptImage.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(`user-receipts/${fileName}`, receiptImage);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(`user-receipts/${fileName}`);

      // Generate tracking code
      const { data: trackingData, error: trackingError } = await supabase
        .rpc('generate_tracking_code');

      if (trackingError) throw trackingError;

      // Validate receipt with AI - pass the expected amount and details
      const { data: aiResult } = await supabase.functions.invoke('validate-receipt', {
        body: { 
          imageUrl: urlData.publicUrl,
          expectedAmount: parseFloat(formData.amount),
          requestDetails: {
            trackingCode: trackingData,
            recipientName: formData.recipientFullName,
            country: selectedCountry.country_name_arabic,
            payoutMethod: selectedMethod.nameArabic,
            phoneNumber: formData.phoneNumber,
          }
        }
      });

      // If AI validation failed, show error and stop
      if (aiResult?.status === 'fail') {
        toast({
          title: 'الإيصال غير صالح',
          description: aiResult?.notes || 'يرجى التأكد من صحة الإيصال والمعلومات',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create payout request only if validation passed
      const { error: requestError } = await supabase
        .from('payout_requests')
        .insert({
          tracking_code: trackingData,
          zalal_life_account_id: formData.zalalLifeAccountId,
          zalal_life_username: formData.zalalLifeUsername || null,
          recipient_full_name: formData.recipientFullName,
          amount: parseFloat(formData.amount),
          currency: 'USD',
          country: selectedCountry.country_name_arabic,
          country_dial_code: selectedCountry.dial_code,
          payout_method: selectedMethod.nameArabic,
          phone_number: formData.phoneNumber,
          method_fields: formData.methodFields,
          user_receipt_image_url: urlData.publicUrl,
          ai_receipt_status: aiResult?.status || 'pending',
          ai_notes: aiResult?.notes || null,
          status: 'pending',
        });

      if (requestError) throw requestError;

      navigate('/success', { state: { trackingCode: trackingData } });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال الطلب',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => navigate('/confirm')}
            className="p-2 -mr-2"
          >
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">طلب صرف جديد</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-5">
        {/* Ghala Life Account ID */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            ايدي حسابك في غلا لايف <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.zalalLifeAccountId}
            onChange={(e) => setFormData(prev => ({ ...prev, zalalLifeAccountId: e.target.value }))}
            className="input-field"
            placeholder="أدخل ايدي الحساب"
          />
        </div>

        {/* Ghala Life Username */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            اسم حسابك في غلا لايف <span className="text-muted-foreground">(اختياري)</span>
          </label>
          <input
            type="text"
            value={formData.zalalLifeUsername}
            onChange={(e) => setFormData(prev => ({ ...prev, zalalLifeUsername: e.target.value }))}
            className="input-field"
            placeholder="اسم الحساب"
          />
        </div>

        {/* Recipient Full Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            اسم المستلم الكامل (3-4 أجزاء) <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.recipientFullName}
            onChange={(e) => setFormData(prev => ({ ...prev, recipientFullName: e.target.value }))}
            className="input-field"
            placeholder="الاسم الرباعي كما في الهوية"
          />
        </div>

        {/* Amount Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-foreground">
            المبلغ الذي تريد استلامه بالدولار <span className="text-destructive">*</span>
          </label>
          
          {/* Amount Input with USD label */}
          <div className="relative">
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="input-field text-xl font-bold pl-16"
              placeholder="0.00"
              dir="ltr"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              USD
            </span>
          </div>
          
          {/* SAR Conversion Display */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/30">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">ما يعادل بالريال السعودي</span>
                <div className="flex items-baseline gap-2" dir="ltr">
                  <span className="text-2xl font-bold text-primary">
                    {(parseFloat(formData.amount) * 3.70).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-medium text-primary/70">SAR</span>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Fees Notice */}
          <div className="p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-sm font-medium text-foreground mb-2">
              ⚠️ رسوم التحويل:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-muted-foreground">اليمن / السعودية:</span>
                <span className="font-bold text-foreground">3%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                <span className="text-muted-foreground">دول أخرى:</span>
                <span className="font-bold text-foreground">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            صورة إيصال التحويل <span className="text-destructive">*</span>
          </label>
          
          {receiptPreview ? (
            <div className="relative">
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="w-full h-48 object-cover rounded-xl border border-border"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 left-2 p-2 bg-destructive text-destructive-foreground rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mb-2" />
              <span className="text-muted-foreground">اضغط لرفع الصورة</span>
              <span className="text-xs text-muted-foreground mt-1">الحد الأقصى: 5 ميجابايت</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            بلد الاستلام <span className="text-destructive">*</span>
          </label>
          <select
            required
            value={selectedCountry?.id || ''}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="input-field"
          >
            <option value="">اختر البلد</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.country_name_arabic} ({country.dial_code})
              </option>
            ))}
          </select>
        </div>

        {/* Payout Method Selection */}
        {selectedCountry && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              طريقة الصرف <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {selectedCountry.methods.map((method) => (
                <button
                  key={method.nameArabic}
                  type="button"
                  onClick={() => handleMethodChange(method.nameArabic)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedMethod?.nameArabic === method.nameArabic
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedMethod?.nameArabic === method.nameArabic
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {iconMap[method.iconUrl] || <Wallet className="w-5 h-5" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {method.nameArabic}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phone Number */}
        {selectedCountry && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              رقم الهاتف <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              className="input-field"
              placeholder={selectedCountry.dial_code}
              dir="ltr"
            />
          </div>
        )}

        {/* Dynamic Method Fields */}
        {selectedMethod?.requiredFields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-foreground mb-2">
              {field.labelArabic} {!field.optional && <span className="text-destructive">*</span>}
            </label>
            <input
              type={field.type}
              required={!field.optional}
              value={formData.methodFields[field.name] || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                methodFields: { ...prev.methodFields, [field.name]: e.target.value }
              }))}
              className="input-field"
              placeholder={field.labelArabic}
            />
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mobile-btn-primary mt-8"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 inline-block animate-spin ml-2" />
              جاري الإرسال...
            </>
          ) : (
            'إرسال الطلب'
          )}
        </button>
      </form>
    </div>
  );
};

export default PayoutRequest;
