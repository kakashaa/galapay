import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Upload, X, Loader2, Wallet, CheckCircle2, AlertTriangle, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PayoutMethod {
  name: string;
  nameArabic?: string;
  iconUrl: string;
  requiredFields?: { name: string; label: string; labelArabic?: string; type: string; placeholder?: string }[];
  fields?: { name: string; label: string; labelArabic?: string; type: string; placeholder?: string }[];
}

interface RequestData {
  id: string;
  tracking_code: string;
  country: string;
  payout_method: string;
  user_receipt_image_url: string;
  reservation_reason: string | null;
  amount: number;
  recipient_full_name: string;
  zalal_life_account_id: string;
  method_fields: Record<string, string> | null;
}

const EditReservedRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const trackingCode = location.state?.trackingCode || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [request, setRequest] = useState<RequestData | null>(null);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [methodFields, setMethodFields] = useState<Record<string, string>>({});
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingCode) {
      navigate('/track');
      return;
    }
    fetchRequestData();
  }, [trackingCode]);

  const fetchRequestData = async () => {
    setLoading(true);

    // Fetch request details
    const { data: requestData, error: requestError } = await supabase
      .from('payout_requests')
      .select('id, tracking_code, country, payout_method, user_receipt_image_url, reservation_reason, amount, recipient_full_name, zalal_life_account_id, status, method_fields')
      .eq('tracking_code', trackingCode)
      .maybeSingle();

    if (requestError || !requestData) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على الطلب',
        variant: 'destructive',
      });
      navigate('/track');
      return;
    }

    // Check if request is reserved
    if (requestData.status !== 'reserved') {
      toast({
        title: 'غير مسموح',
        description: 'يمكن تعديل الطلبات المحجوزة فقط',
        variant: 'destructive',
      });
      navigate('/track', { state: { trackingCode } });
      return;
    }

    setRequest(requestData as RequestData);
    setSelectedMethod(requestData.payout_method);
    setReceiptPreview(requestData.user_receipt_image_url);
    setMethodFields((requestData.method_fields as Record<string, string>) || {});

    // Fetch available methods for the country
    const { data: countryData } = await supabase
      .from('countries_methods')
      .select('methods')
      .eq('country_name_arabic', requestData.country)
      .maybeSingle();

    if (countryData?.methods) {
      setMethods(countryData.methods as unknown as PayoutMethod[]);
    }

    setLoading(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // Reset to original image
    if (request) {
      setReceiptPreview(request.user_receipt_image_url);
    }
  };

  // Get current method's required fields
  const currentMethodConfig = methods.find(m => (m.name || m.nameArabic) === selectedMethod);
  const requiredFields = currentMethodConfig?.requiredFields || currentMethodConfig?.fields || [];

  const handleSubmit = async () => {
    if (!request) return;

    // Validate
    if (!selectedMethod) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار طريقة الصرف',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    for (const field of requiredFields) {
      if (!methodFields[field.name]?.trim()) {
        toast({
          title: 'خطأ',
          description: `يرجى إدخال ${field.labelArabic || field.label}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);

    try {
      let newReceiptUrl = request.user_receipt_image_url;

      // Upload new receipt if changed
      if (receiptImage) {
        const fileExt = receiptImage.name.split('.').pop();
        const fileName = `edit-${request.tracking_code}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(`edited/${fileName}`, receiptImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(`edited/${fileName}`);

        newReceiptUrl = urlData.publicUrl;
      }

      // Check if anything actually changed
      const methodChanged = selectedMethod !== request.payout_method;
      const receiptChanged = receiptImage !== null;
      const fieldsChanged = JSON.stringify(methodFields) !== JSON.stringify(request.method_fields || {});

      if (!methodChanged && !receiptChanged && !fieldsChanged) {
        toast({
          title: 'لا يوجد تغييرات',
          description: 'لم تقم بإجراء أي تعديلات على الطلب',
        });
        setSaving(false);
        return;
      }

      // Update the request
      const { error: updateError } = await supabase
        .from('payout_requests')
        .update({
          payout_method: selectedMethod,
          method_fields: methodFields,
          user_receipt_image_url: newReceiptUrl,
          user_edited_at: new Date().toISOString(),
          previous_payout_method: methodChanged ? request.payout_method : null,
          previous_receipt_image_url: receiptChanged ? request.user_receipt_image_url : null,
        })
        .eq('id', request.id)
        .eq('status', 'reserved'); // Extra safety check

      if (updateError) throw updateError;

      toast({
        title: '✅ تم تعديل الطلب بنجاح',
        description: 'سيتم مراجعة التعديلات من قبل الإدارة',
      });

      navigate('/track', { state: { trackingCode } });

    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ التعديلات',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-950 via-background to-background flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-950 via-background to-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white py-4 px-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/track', { state: { trackingCode } })}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">تعديل الطلب المحجوز</h1>
            <p className="text-sm text-white/80">#{request.tracking_code}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Reservation Reason */}
        {request.reservation_reason && (
          <Alert className="bg-orange-500/10 border-orange-500/30">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-200 text-sm">
              <strong>سبب الحجز:</strong> {request.reservation_reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Request Info */}
        <Card className="bg-card/50 backdrop-blur border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">معلومات الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الأيدي</span>
              <span className="font-mono" dir="ltr">{request.zalal_life_account_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الاسم</span>
              <span>{request.recipient_full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المبلغ</span>
              <span className="text-primary font-medium">${request.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الدولة</span>
              <span>{request.country}</span>
            </div>
          </CardContent>
        </Card>

        {/* Editable Fields */}
        <Card className="bg-card/50 backdrop-blur border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-orange-400 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              تعديل البيانات
            </CardTitle>
            <CardDescription>يمكنك تعديل طريقة الصرف ورقم المحفظة وصورة الإيصال</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payout Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-orange-300">
                طريقة الصرف <span className="text-red-400">*</span>
              </label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger className="bg-background/50 border-orange-500/30">
                  <SelectValue placeholder="اختر طريقة الصرف" />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((method) => (
                    <SelectItem key={method.name || method.nameArabic} value={method.name || method.nameArabic || ''}>
                      <div className="flex items-center gap-2">
                        {method.iconUrl && (
                          <img src={method.iconUrl} alt="" className="w-5 h-5 rounded" />
                        )}
                        <span>{method.nameArabic || method.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMethod !== request.payout_method && (
                <p className="text-xs text-orange-400">
                  سيتم تغيير طريقة الصرف من "{request.payout_method}" إلى "{selectedMethod}"
                </p>
              )}
            </div>

            {/* Method Fields (Wallet/Account Number) */}
            {requiredFields.length > 0 && (
              <div className="space-y-3">
                {requiredFields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <label className="text-sm font-medium text-orange-300">
                      {field.labelArabic || field.label} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={methodFields[field.name] || ''}
                      onChange={(e) => setMethodFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder || field.labelArabic || field.label}
                      className="w-full px-3 py-2 bg-background/50 border border-orange-500/30 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      dir="ltr"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Receipt Image */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-orange-300 flex items-center gap-2">
                <Image className="w-4 h-4" />
                صورة الإيصال
              </label>
              
              {receiptPreview && (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt"
                    className="w-full h-40 object-contain rounded-lg bg-black/20 border border-orange-500/20"
                  />
                  {receiptImage && (
                    <button
                      onClick={removeImage}
                      className="absolute top-2 left-2 p-1 bg-destructive rounded-full text-white hover:bg-destructive/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="cursor-pointer border-2 border-dashed border-orange-500/30 rounded-xl p-4 text-center hover:border-orange-500/50 transition-colors">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                  <p className="text-sm text-muted-foreground">
                    {receiptImage ? 'اختر صورة أخرى' : 'رفع صورة إيصال جديدة'}
                  </p>
                </div>
              </label>
              
              {receiptImage && (
                <p className="text-xs text-orange-400">
                  سيتم استبدال الإيصال القديم بالصورة الجديدة
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 ml-2" />
                حفظ التعديلات
              </>
            )}
          </Button>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground">
          سيتم مراجعة التعديلات من قبل الإدارة
        </p>
      </div>
    </div>
  );
};

export default EditReservedRequest;
