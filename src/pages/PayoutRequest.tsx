import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Upload, X, Loader2, Wallet, User, Phone, MapPin, CreditCard, CheckCircle2, Hash, AlertCircle, AlertTriangle, Image, Info, FileText, CalendarX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PayoutPolicyDialog } from '@/components/PayoutPolicyDialog';

interface Country {
  id: string;
  country_name_arabic: string;
  country_code: string;
  dial_code: string;
  methods: PayoutMethod[];
}

interface PayoutMethod {
  name: string;
  nameArabic?: string;
  iconUrl: string;
  requiredFields?: RequiredField[];
  fields?: RequiredField[];
  recommended?: boolean;
}

interface RequiredField {
  name: string;
  label: string;
  labelArabic?: string;
  type: string;
  placeholder?: string;
  optional?: boolean;
  required?: boolean;
}

// Check if today is the last day of the month
const isLastDayOfMonth = (): boolean => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getDate() === 1;
};

// Get next last day of month
const getNextLastDay = (): string => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return lastDay.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' });
};

const PayoutRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreviewMode = location.state?.previewMode === true;
  
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [dailyLimitError, setDailyLimitError] = useState<string | null>(null);
  const [extractingData, setExtractingData] = useState(false);
  const [referenceExtractedByAI, setReferenceExtractedByAI] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [_isNotLastDay, setIsNotLastDay] = useState(false);
  const [_alreadySubmittedThisMonth, setAlreadySubmittedThisMonth] = useState(false);
  const [checkingAccountId, setCheckingAccountId] = useState(false);
  const [accountIdError, setAccountIdError] = useState<string | null>(null);
  // Track flagged reference number when account ID has previous submission
  const [flaggedReferenceNumber, setFlaggedReferenceNumber] = useState<string | null>(null);
  const [referenceBlockedError, setReferenceBlockedError] = useState<string | null>(null);
  // Track if reference is flagged in database (persistent)
  const [isReferenceFlaggedInDB, setIsReferenceFlaggedInDB] = useState(false);
  // Store receipt URL for passing to coins page
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    zalalLifeAccountId: '',
    zalalLifeUsername: '',
    recipientFullName: '',
    amount: '',
    referenceNumber: '',
    phoneNumber: '',
    agencyCode: '',
    methodFields: {} as Record<string, string>,
  });
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [checkingReference, setCheckingReference] = useState(false);
  const [showSampleReceipt, setShowSampleReceipt] = useState(false);
  const [blockedAgencyCodes, setBlockedAgencyCodes] = useState<{code: string; message: string}[]>([]);
  const [agencyCodeWarning, setAgencyCodeWarning] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries();
    fetchBlockedAgencyCodes();
  }, []);

  const fetchBlockedAgencyCodes = async () => {
    const { data } = await supabase
      .from('blocked_agency_codes')
      .select('code, message');
    
    if (data) {
      setBlockedAgencyCodes(data);
    }
  };

  const checkAgencyCode = (code: string) => {
    if (!code.trim()) {
      setAgencyCodeWarning(null);
      return;
    }
    
    const blocked = blockedAgencyCodes.find(
      b => b.code.toLowerCase() === code.trim().toLowerCase()
    );
    
    if (blocked) {
      setAgencyCodeWarning(blocked.message);
    } else {
      setAgencyCodeWarning(null);
    }
  };

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
      
      // Auto-extract data from receipt
      await extractReceiptData(file);
    }
  };

  const extractReceiptData = async (file: File) => {
    setExtractingData(true);
    
    try {
      // Convert file to base64 directly (bypasses URL fetch issues)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('Sending image for extraction, size:', Math.round(base64.length / 1024), 'KB');

      // Also upload to storage for later use
      const fileExt = file.name.split('.').pop();
      const fileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(`temp-extractions/${fileName}`, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(`temp-extractions/${fileName}`);
        setUploadedReceiptUrl(urlData.publicUrl);
      }

      // Call AI to extract data - send base64 directly
      const { data: extractResult, error: extractError } = await supabase.functions.invoke('extract-receipt-data', {
        body: { imageBase64: base64 }
      });

      console.log('Extraction result:', extractResult);

      if (extractError) {
        console.error('Extraction error:', extractError);
        setReferenceExtractedByAI(false);
        toast({
          title: '⚠️ خطأ في الاستخراج',
          description: 'حدث خطأ أثناء معالجة الصورة، يرجى المحاولة مرة أخرى',
          variant: 'destructive',
        });
        setExtractingData(false);
        return;
      }

      if (extractResult?.success && extractResult.referenceNumber) {
        // Auto-fill extracted reference number
        setFormData(prev => ({ ...prev, referenceNumber: extractResult.referenceNumber }));
        setReferenceExtractedByAI(true);
        // Check if reference is already used
        checkReferenceNumber(extractResult.referenceNumber);
        toast({
          title: '✅ تم استخراج الرقم المرجعي',
          description: `الرقم المرجعي: ${extractResult.referenceNumber}`,
        });
        
        if (extractResult.amount && !formData.amount) {
          setFormData(prev => ({ ...prev, amount: extractResult.amount.toString() }));
        }
      } else {
        // No reference found - require new receipt upload
        setReferenceExtractedByAI(false);
        const errorNote = extractResult?.notes || 'يرجى رفع إيصال آخر أوضح أو التأكد من جودة الصورة';
        toast({
          title: '⚠️ لم يتم استخراج الرقم المرجعي',
          description: errorNote,
          variant: 'destructive',
        });
        
        // Still extract amount if available
        if (extractResult?.amount && !formData.amount) {
          setFormData(prev => ({ ...prev, amount: extractResult.amount.toString() }));
        }
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      setReferenceExtractedByAI(false);
      toast({
        title: '⚠️ خطأ',
        description: 'فشل في معالجة الصورة، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setExtractingData(false);
    }
  };

  const removeImage = () => {
    setReceiptImage(null);
    setReceiptPreview(null);
    setFormData(prev => ({ ...prev, referenceNumber: '', amount: '' }));
    
    setReferenceError(null);
    setReferenceExtractedByAI(false);
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
    const method = selectedCountry?.methods.find(m => (m.name || m.nameArabic) === methodName);
    setSelectedMethod(method || null);
    setFormData(prev => ({ ...prev, methodFields: {} }));
  };

  // Countries with USDT recommendation notice
  const usdtRecommendedCountries = ['EG', 'DZ', 'MA', 'TN', 'JO'];
  const showUSDTNotice = selectedCountry && usdtRecommendedCountries.includes(selectedCountry.country_code);

  // Get method fields (support both requiredFields and fields)
  const getMethodFields = (method: PayoutMethod | null) => {
    if (!method) return [];
    return method.requiredFields || method.fields || [];
  };

  // Check if reference number already exists
  const checkReferenceNumber = async (refNumber: string) => {
    if (!refNumber || refNumber.length < 3) {
      setReferenceError(null);
      setIsReferenceFlaggedInDB(false);
      return;
    }
    
    setCheckingReference(true);
    
    // Check if reference is flagged in database (persistent block)
    const { data: flaggedData } = await supabase
      .from('flagged_references')
      .select('id, original_account_id, reason')
      .eq('reference_number', refNumber.trim())
      .maybeSingle();
    
    if (flaggedData) {
      setIsReferenceFlaggedInDB(true);
      setReferenceBlockedError(`هذا الإيصال/الرقم المرجعي محظور. تم استخدامه مسبقاً من الأيدي: ${flaggedData.original_account_id}. يمكنك استلام كوينزات فقط.`);
      setCheckingReference(false);
      return;
    }
    
    // Check if reference was used in payout_requests
    const { data } = await supabase
      .from('payout_requests')
      .select('id')
      .eq('reference_number', refNumber.trim())
      .maybeSingle();
    
    setCheckingReference(false);
    
    if (data) {
      setReferenceError('هذا الرقم المرجعي مستخدم مسبقاً');
    } else {
      setReferenceError(null);
      setIsReferenceFlaggedInDB(false);
    }
  };

  // Navigate to coins payout page
  const goToCoinsPayoutPage = () => {
    navigate('/coins-payout', {
      state: {
        referenceNumber: formData.referenceNumber.trim(),
        amount: formData.amount,
        receiptImageUrl: uploadedReceiptUrl || receiptPreview,
        flaggedReason: referenceBlockedError || accountIdError,
      }
    });
  };

  // Check daily limit - only 1 request per day per account ID
  const checkDailyLimit = async (accountId: string): Promise<boolean> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('payout_requests')
      .select('id')
      .eq('zalal_life_account_id', accountId.trim())
      .gte('created_at', today.toISOString())
      .maybeSingle();
    
    if (error) {
      console.error('Error checking daily limit:', error);
      return true; // Allow on error
    }
    
    return !data; // Return true if no request found today
  };

  // Check if user already submitted this month (any status) - block repeat submissions in same month
  const checkMonthlySubmission = async (accountId: string): Promise<{ hasSubmitted: boolean; message: string }> => {
    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { data, error } = await supabase
      .from('payout_requests')
      .select('id, created_at, status')
      .eq('zalal_life_account_id', accountId.trim())
      .gte('created_at', startOfMonth.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking monthly submission:', error);
      return { hasSubmitted: false, message: '' };
    }
    
    if (data) {
      setAlreadySubmittedThisMonth(true);
      return { 
        hasSubmitted: true, 
        message: 'لقد قمت برفع راتبك هذا الشهر مسبقاً. لا يمكنك رفع طلب جديد حتى الشهر القادم.'
      };
    }
    
    return { hasSubmitted: false, message: '' };
  };

  // Check if reference number was used this month by anyone - for flagging duplicates
  const checkReferenceThisMonth = async (refNumber: string): Promise<{ isDuplicate: boolean; reason: string }> => {
    if (!refNumber || refNumber.trim().length < 3) {
      return { isDuplicate: false, reason: '' };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { data, error } = await supabase
      .from('payout_requests')
      .select('id, zalal_life_account_id, created_at')
      .eq('reference_number', refNumber.trim())
      .gte('created_at', startOfMonth.toISOString())
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking reference this month:', error);
      return { isDuplicate: false, reason: '' };
    }
    
    if (data) {
      return { 
        isDuplicate: true, 
        reason: `الرقم المرجعي مستخدم مسبقاً هذا الشهر من الأيدي: ${data.zalal_life_account_id}. هذا الطلب سيتم استلامه كـ "كوينز" فقط وليس راتب.`
      };
    }
    
    return { isDuplicate: false, reason: '' };
  };

  // Auto-check Account ID when user types
  const checkAccountIdOnChange = async (accountId: string) => {
    if (!accountId || accountId.trim().length < 3) {
      setAccountIdError(null);
      setAlreadySubmittedThisMonth(false);
      // Check if reference is flagged when clearing account ID
      checkFlaggedReference();
      return;
    }

    setCheckingAccountId(true);
    const result = await checkMonthlySubmission(accountId);
    setCheckingAccountId(false);

    if (result.hasSubmitted) {
      setAccountIdError(result.message);
      // Flag the current reference number when account ID has previous submission
      if (formData.referenceNumber && formData.referenceNumber.trim().length >= 3) {
        const refNum = formData.referenceNumber.trim();
        setFlaggedReferenceNumber(refNum);
        // Save to database for persistent blocking
        await supabase
          .from('flagged_references')
          .upsert({
            reference_number: refNum,
            original_account_id: accountId,
            reason: 'duplicate_account_monthly_payout',
          }, { onConflict: 'reference_number' });
      }
      setReferenceBlockedError(null); // Clear reference error when showing account error
      setPolicyDialogOpen(true); // Show policy dialog automatically
    } else {
      setAccountIdError(null);
      setAlreadySubmittedThisMonth(false);
      // Check if this reference was flagged and the new ID hasn't submitted before
      checkFlaggedReference();
    }
  };

  // Check if current reference number is flagged - called on blur and when switching IDs
  const checkFlaggedReference = () => {
    if (flaggedReferenceNumber && formData.referenceNumber && 
        formData.referenceNumber.trim() === flaggedReferenceNumber) {
      setReferenceBlockedError('هذا الإيصال/الرقم المرجعي محجوز لأن صاحبه الأصلي رفع راتب سابقاً هذا الشهر. يمكنك استلام كوينزات فقط وليس راتب.');
      setPolicyDialogOpen(true);
    } else {
      setReferenceBlockedError(null);
    }
  };

  // Handle account ID field blur - do full validation
  const handleAccountIdBlur = async () => {
    const accountId = formData.zalalLifeAccountId.trim();
    
    if (!accountId || accountId.length < 3) {
      // Just check if reference is flagged
      checkFlaggedReference();
      return;
    }

    // Re-check the account ID on blur to ensure we have the latest state
    setCheckingAccountId(true);
    const result = await checkMonthlySubmission(accountId);
    setCheckingAccountId(false);

    if (result.hasSubmitted) {
      setAccountIdError(result.message);
      // Flag the current reference number and save to database
      if (formData.referenceNumber && formData.referenceNumber.trim().length >= 3) {
        const refNum = formData.referenceNumber.trim();
        setFlaggedReferenceNumber(refNum);
        // Save to database for persistent blocking
        await supabase
          .from('flagged_references')
          .upsert({
            reference_number: refNum,
            original_account_id: accountId,
            reason: 'duplicate_account_monthly_payout',
          }, { onConflict: 'reference_number' });
      }
      setReferenceBlockedError(null);
      setPolicyDialogOpen(true);
    } else {
      setAccountIdError(null);
      setAlreadySubmittedThisMonth(false);
      // Check if the reference is flagged for this new valid account
      checkFlaggedReference();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block submission in preview mode
    if (isPreviewMode) {
      toast({
        title: 'وضع المعاينة',
        description: 'هذا وضع التصفح فقط. لا يمكنك إرسال طلب حقيقي.',
        variant: 'default',
      });
      return;
    }
    
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

    // Validate reference number
    if (!formData.referenceNumber || formData.referenceNumber.trim().length < 3) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال الرقم المرجعي من الإيصال',
        variant: 'destructive',
      });
      return;
    }

    if (referenceError) {
      toast({
        title: 'خطأ',
        description: referenceError,
        variant: 'destructive',
      });
      return;
    }

    // Check if today is the last day of the month
    if (!isLastDayOfMonth() && !isPreviewMode) {
      toast({
        title: '⏰ ليس وقت السحب',
        description: `السحب الشهري متاح فقط في آخر يوم من الشهر (${getNextLastDay()})`,
        variant: 'destructive',
      });
      setIsNotLastDay(true);
      return;
    }

    // Check if user already submitted this month
    const monthlyCheck = await checkMonthlySubmission(formData.zalalLifeAccountId);
    if (monthlyCheck.hasSubmitted) {
      toast({
        title: '❌ تم رفع الراتب مسبقاً',
        description: monthlyCheck.message,
        variant: 'destructive',
      });
      return;
    }

    // Check daily limit
    const canSubmit = await checkDailyLimit(formData.zalalLifeAccountId);
    if (!canSubmit) {
      setDailyLimitError('لقد قمت برفع طلب اليوم بالفعل. يمكنك رفع طلب واحد فقط يومياً.');
      toast({
        title: 'حد الطلبات اليومي',
        description: 'يمكنك رفع طلب واحد فقط في اليوم',
        variant: 'destructive',
      });
      return;
    }

    // Check if reference number was used this month by anyone (for flagging as coins-only)
    const duplicateCheck = await checkReferenceThisMonth(formData.referenceNumber);
    
    // Double-check reference number before submission - block if used in previous months
    const { data: existingRef } = await supabase
      .from('payout_requests')
      .select('id')
      .eq('reference_number', formData.referenceNumber.trim())
      .maybeSingle();

    if (existingRef && !duplicateCheck.isDuplicate) {
      // Reference exists from previous months - completely block
      toast({
        title: 'خطأ',
        description: 'هذا الرقم المرجعي مستخدم مسبقاً. لا يمكن استخدام نفس الإيصال مرتين.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const fileExt = receiptImage.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(`user-receipts/${fileName}`, receiptImage);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(`user-receipts/${fileName}`);

      const { data: trackingData, error: trackingError } = await supabase
        .rpc('generate_tracking_code');

      if (trackingError) throw trackingError;

      // Validate receipt with AI including reference number verification
      const { data: aiResult } = await supabase.functions.invoke('validate-receipt', {
        body: { 
          imageUrl: urlData.publicUrl,
          expectedAmount: parseFloat(formData.amount),
          expectedReferenceNumber: formData.referenceNumber.trim(),
        }
      });

      if (aiResult?.status === 'fail') {
        toast({
          title: 'الإيصال غير صالح',
          description: aiResult?.notes || 'يرجى التأكد من صحة الإيصال والمعلومات',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

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
          payout_method: selectedMethod.name || selectedMethod.nameArabic,
          phone_number: formData.phoneNumber,
          method_fields: formData.methodFields,
          user_receipt_image_url: urlData.publicUrl,
          reference_number: formData.referenceNumber.trim(),
          ai_receipt_status: aiResult?.status || 'pending',
          ai_notes: aiResult?.notes || null,
          status: 'pending',
          agency_code: formData.agencyCode.trim() || null,
          // Flag as duplicate if: 1) reference was used this month OR 2) reference was flagged because original owner already submitted
          is_duplicate_flagged: duplicateCheck.isDuplicate || !!referenceBlockedError,
          duplicate_flag_reason: referenceBlockedError 
            ? referenceBlockedError 
            : (duplicateCheck.isDuplicate ? duplicateCheck.reason : null),
        });

      if (requestError) throw requestError;

      // Get wallet number from method fields
      const walletNumber = formData.methodFields?.walletNumber || 
                          formData.methodFields?.wallet_number || 
                          formData.methodFields?.رقم_المحفظة ||
                          Object.values(formData.methodFields).find(v => v) || '';

      // Send Telegram notification after successful request creation
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          imageUrl: urlData.publicUrl,
          requestDetails: {
            trackingCode: trackingData,
            zalalLifeAccountId: formData.zalalLifeAccountId,
            zalalLifeUsername: formData.zalalLifeUsername || null,
            recipientName: formData.recipientFullName,
            amount: parseFloat(formData.amount),
            country: selectedCountry.country_name_arabic,
            payoutMethod: selectedMethod.nameArabic || selectedMethod.name,
            phoneNumber: formData.phoneNumber,
            referenceNumber: formData.referenceNumber.trim(),
            walletNumber: walletNumber,
            agencyCode: formData.agencyCode.trim() || null,
            methodFields: formData.methodFields,
          }
        }
      });

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

  // Progress steps - reordered: Receipt first
  const steps = [
    { id: 1, title: 'الإيصال', icon: Image },
    { id: 2, title: 'معلوماتك', icon: User },
    { id: 3, title: 'الاستلام', icon: MapPin },
    { id: 4, title: 'التأكيد', icon: CheckCircle2 },
  ];

  const isStep1Complete = receiptImage && formData.referenceNumber && formData.referenceNumber.trim().length >= 3 && !referenceError && formData.amount && parseFloat(formData.amount) > 0;
  // Allow step 2 completion even with referenceBlockedError (will be flagged as coins-only)
  const isStep2Complete = formData.zalalLifeAccountId && formData.recipientFullName && !accountIdError && !checkingAccountId;
  const isStep3Complete = selectedCountry && selectedMethod && formData.phoneNumber;

  // Check if user should be blocked from submitting
  const shouldBlockUser = !isLastDayOfMonth() && !isPreviewMode;

  return (
    <div className="min-h-screen premium-bg pb-8">
      {/* Policy Dialog */}
      <PayoutPolicyDialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen} />

      {/* Not Last Day Block Screen */}
      {shouldBlockUser && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-sm w-full text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mx-auto">
              <CalendarX className="w-10 h-10 text-warning" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">⏰ ليس وقت السحب</h2>
              <p className="text-muted-foreground">
                السحب الشهري متاح فقط في <span className="font-bold text-warning">آخر يوم من الشهر</span>
              </p>
              <p className="text-sm text-muted-foreground">
                (30 أو 31 حسب الشهر)
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">موعد السحب القادم:</p>
              <p className="text-lg font-bold text-primary">{getNextLastDay()}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setPolicyDialogOpen(true)}
                className="w-full py-3 rounded-xl bg-primary/10 text-primary font-bold border border-primary/20 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                قراءة شروط السحب الشهري
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-xl bg-muted text-foreground font-bold"
              >
                العودة للرئيسية
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-warning text-warning-foreground py-3 px-4 text-center sticky top-0 z-20">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium text-sm">
              وضع التصفح فقط - لن يتم إرسال أي طلب أو تحويل أي مبلغ
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`sticky ${isPreviewMode ? 'top-[44px]' : 'top-0'} bg-card/80 backdrop-blur-xl border-b border-primary/20 z-10`}>
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(isPreviewMode ? '/' : '/confirm')}
              className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground glow-text">
              {isPreviewMode ? 'معاينة طريقة رفع الراتب' : 'طلب صرف جديد'}
            </h1>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4 px-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentStep >= step.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`} style={currentStep >= step.id ? { boxShadow: '0 0 20px hsla(142, 76%, 50%, 0.4)' } : undefined}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${
                    currentStep >= step.id ? 'text-primary glow-text' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 transition-colors duration-300 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`} style={currentStep > step.id ? { boxShadow: '0 0 10px hsla(142, 76%, 50%, 0.3)' } : undefined} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        {/* Step 1: Receipt & Reference (MOVED TO FIRST) */}
        <div className={`p-4 space-y-4 transition-all duration-300 ${currentStep === 1 ? 'block animate-in fade-in slide-in-from-right-5' : 'hidden'}`}>
          <div className="neon-card p-5 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center" style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.2)' }}>
                <Image className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground glow-text">إيصال التحويل</h2>
                <p className="text-xs text-muted-foreground">ارفع إيصال تحويلك لغلا لايف</p>
              </div>
            </div>

            {/* Instructions Alert */}
            <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-400 mb-2">⚠️ تعليمات مهمة</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• حوّل المبلغ إلى حساب <span className="font-bold text-foreground">غلا لايف</span></li>
                    <li>• معرف الحساب: <span className="font-bold text-primary">10000</span></li>
                    <li>• الإيصال يجب أن يظهر اسم "غلا لايف" ومعرف 10000</li>
                    <li>• أدخل الرقم المرجعي من الإيصال بالضبط</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setShowSampleReceipt(!showSampleReceipt)}
                    className="mt-3 text-xs text-blue-400 font-medium underline"
                  >
                    {showSampleReceipt ? 'إخفاء نموذج الإيصال' : '📷 شاهد نموذج إيصال صحيح'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sample Receipt Preview */}
            {showSampleReceipt && (
              <div className="rounded-xl overflow-hidden border-2 border-blue-500/30 bg-blue-500/5">
                <div className="bg-blue-500/20 px-3 py-2 text-center">
                  <span className="text-xs font-bold text-blue-400">📋 نموذج إيصال صحيح</span>
                </div>
                <img
                  src="/sample-receipt.jpeg"
                  alt="نموذج إيصال"
                  className="w-full"
                />
                <div className="p-3 bg-blue-500/10 text-xs text-muted-foreground space-y-1">
                  <p>✅ اسم المستخدم: <span className="font-bold text-foreground">غلا لايف</span></p>
                  <p>✅ معرف المستخدم: <span className="font-bold text-primary">10000</span></p>
                  <p>✅ الرقم المرجعي: <span className="font-bold text-foreground">موجود في الإيصال</span></p>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                المبلغ المُحوَّل بالدولار <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-4 py-5 text-3xl font-bold rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:ring-0 transition-colors text-center"
                  placeholder="0.00"
                  dir="ltr"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">
                  USD
                </span>
              </div>

              {/* SAR Conversion */}
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">يعادل بالريال</span>
                    <div className="text-left" dir="ltr">
                      <span className="text-2xl font-bold text-primary">
                        {(parseFloat(formData.amount) * 3.70).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-primary/70 mr-1">SAR</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                صورة إيصال التحويل <span className="text-destructive">*</span>
              </label>
              
              {receiptPreview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-primary">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Loading overlay during extraction */}
                  {extractingData && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                      <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                      <span className="text-sm font-medium text-foreground">جاري قراءة الإيصال...</span>
                      <span className="text-xs text-muted-foreground">استخراج الرقم المرجعي تلقائياً</span>
                    </div>
                  )}
                  
                  {!extractingData && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 text-white text-sm">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      تم رفع الإيصال
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={extractingData}
                    className="absolute top-3 left-3 p-2 bg-destructive text-white rounded-full shadow-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">اضغط لرفع الإيصال</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG, JPG حتى 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Reference Number */}
            {receiptPreview && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  الرقم المرجعي من الإيصال <span className="text-destructive">*</span>
                </label>
                
                {/* Extraction status */}
                {extractingData && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                    <span className="text-sm text-primary font-medium">جاري استخراج الرقم المرجعي تلقائياً...</span>
                  </div>
                )}
                
                {!referenceExtractedByAI && !extractingData && receiptPreview && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-400 font-medium">لم يتم استخراج الرقم المرجعي</p>
                      <p className="text-xs text-muted-foreground">يرجى رفع إيصال آخر أوضح أو التأكد من جودة الصورة</p>
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.referenceNumber}
                    readOnly
                    disabled={extractingData}
                    className={`w-full px-4 py-3.5 text-lg rounded-xl border-2 ${
                      referenceError 
                        ? 'border-destructive bg-destructive/5' 
                        : formData.referenceNumber && !referenceError 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-background/50'
                    } focus:ring-0 transition-colors text-center font-mono tracking-wider disabled:opacity-50 cursor-not-allowed bg-muted/30`}
                    placeholder={extractingData ? 'جاري الاستخراج...' : 'سيتم استخراجه تلقائياً'}
                    dir="ltr"
                  />
                  {checkingReference && (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  {!checkingReference && !extractingData && formData.referenceNumber && !referenceError && referenceExtractedByAI && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  {!checkingReference && !extractingData && formData.referenceNumber && !referenceError && !referenceExtractedByAI && (
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                  )}
                  {!checkingReference && referenceError && (
                    <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
                  )}
                </div>
                
                {referenceError && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div>
                      <p className="text-sm text-destructive font-medium">{referenceError}</p>
                      <p className="text-xs text-destructive/70 mt-1">يرجى رفع إيصال جديد برقم مرجعي مختلف</p>
                    </div>
                  </div>
                )}
                
                {referenceExtractedByAI && !referenceError && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <p className="text-sm text-primary font-medium">تم استخراج الرقم المرجعي تلقائياً ولا يمكن تعديله</p>
                  </div>
                )}
                
              </div>
            )}

            {/* Fees Notice */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">اليمن / السعودية</p>
                <p className="text-lg font-bold text-primary">3%</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">دول أخرى</p>
                <p className="text-lg font-bold text-warning">10%</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => isStep1Complete && setCurrentStep(2)}
            disabled={!isStep1Complete}
            className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            التالي
          </button>
        </div>

        {/* Step 2: Personal Info */}
        {/* Step 2: Your Info */}
        <div className={`p-4 space-y-4 transition-all duration-300 ${currentStep === 2 ? 'block animate-in fade-in slide-in-from-right-5' : 'hidden'}`}>
          <motion.div 
            className="neon-card p-5 space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center" style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.2)' }}>
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground glow-text">معلومات الحساب</h2>
                <p className="text-xs text-muted-foreground">بيانات حسابك في غلا لايف</p>
              </div>
            </div>

            {/* Daily Limit Error */}
            {dailyLimitError && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive font-medium">{dailyLimitError}</p>
              </div>
            )}

            {/* Account ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                ايدي حسابك في غلا لايف
                <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.zalalLifeAccountId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, zalalLifeAccountId: value }));
                    setDailyLimitError(null);
                    // Auto-check for monthly duplicates
                    checkAccountIdOnChange(value);
                  }}
                  onBlur={handleAccountIdBlur}
                  className={`w-full px-4 py-3.5 text-base rounded-xl border-2 ${
                    accountIdError 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border bg-background/50'
                  } focus:border-primary focus:ring-0 transition-colors`}
                  placeholder="أدخل ايدي الحساب"
                />
                {checkingAccountId && (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                )}
                {formData.zalalLifeAccountId && !checkingAccountId && !accountIdError && (
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                )}
              </div>
              
              {/* Monthly submission error with policy button */}
              {accountIdError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-destructive font-bold">❌ تم رفع الراتب مسبقاً</p>
                      <p className="text-xs text-destructive/80 mt-1">{accountIdError}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={goToCoinsPayoutPage}
                      className="w-full py-3 rounded-lg bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors"
                    >
                      <Wallet className="w-4 h-4" />
                      هل تريد استلام كوينزات بدلاً من ذلك؟
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolicyDialogOpen(true)}
                      className="w-full py-2.5 rounded-lg bg-destructive/20 text-destructive font-medium text-sm flex items-center justify-center gap-2 hover:bg-destructive/30 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      اقرأ سياسة السحب الشهري
                    </button>
                  </div>
                </div>
              )}
              
              {/* Reference blocked error (when changing to different ID) */}
              {referenceBlockedError && !accountIdError && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-warning font-bold">🪙 هذا الإيصال محجوز - كوينزات فقط</p>
                      <p className="text-xs text-warning/80 mt-1">{referenceBlockedError}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={goToCoinsPayoutPage}
                      className="w-full py-3 rounded-lg bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors"
                    >
                      <Wallet className="w-4 h-4" />
                      استلام كوينزات بدلاً من الراتب
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolicyDialogOpen(true)}
                      className="w-full py-2.5 rounded-lg bg-warning/20 text-warning font-medium text-sm flex items-center justify-center gap-2 hover:bg-warning/30 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      اقرأ سياسة السحب الشهري
                    </button>
                  </div>
                </div>
              )}
              
              {!accountIdError && !referenceBlockedError && (
                <p className="text-xs text-muted-foreground bg-warning/10 p-2 rounded-lg border border-warning/20">
                  ⚠️ يُسمح برفع طلب واحد فقط شهرياً لكل حساب
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">2</span>
                اسم حسابك
                <span className="text-muted-foreground text-xs">(اختياري)</span>
              </label>
              <input
                type="text"
                value={formData.zalalLifeUsername}
                onChange={(e) => setFormData(prev => ({ ...prev, zalalLifeUsername: e.target.value }))}
                className="w-full px-4 py-3.5 text-base rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:ring-0 transition-colors"
                placeholder="اسم الحساب"
              />
            </div>

            {/* Agency Code (Optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">3</span>
                كود الوكالة
                <span className="text-muted-foreground text-xs">(اختياري)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.agencyCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, agencyCode: value }));
                    checkAgencyCode(value);
                  }}
                  className={`w-full px-4 py-3.5 text-base rounded-xl border-2 ${
                    agencyCodeWarning 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border bg-background/50'
                  } focus:border-primary focus:ring-0 transition-colors`}
                  placeholder="كود الوكالة الي أنت فيها"
                />
              </div>
              {agencyCodeWarning && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive font-medium">{agencyCodeWarning}</p>
                </div>
              )}
            </div>

            {/* Recipient Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">4</span>
                اسم المستلم الكامل
                <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.recipientFullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientFullName: e.target.value }))}
                  className="w-full px-4 py-3.5 text-base rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:ring-0 transition-colors"
                  placeholder="الاسم الرباعي كما في الهوية"
                />
                {formData.recipientFullName && (
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">يجب أن يكون 3-4 أجزاء مطابقاً للهوية</p>
            </div>
          </motion.div>

          <div className="flex gap-3">
            <motion.button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex-1 py-4 rounded-xl font-bold text-lg bg-muted text-foreground transition-all hover:bg-muted/80"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              السابق
            </motion.button>
            <motion.button
              type="button"
              onClick={() => isStep2Complete && setCurrentStep(3)}
              disabled={!isStep2Complete}
              className="flex-1 py-4 rounded-xl font-bold text-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
              whileHover={isStep2Complete ? { scale: 1.02 } : undefined}
              whileTap={isStep2Complete ? { scale: 0.98 } : undefined}
            >
              التالي
            </motion.button>
          </div>
        </div>

        {/* Step 3: Payout Details */}
        <div className={`p-4 space-y-4 transition-all duration-300 ${currentStep === 3 ? 'block animate-in fade-in slide-in-from-right-5' : 'hidden'}`}>
          <motion.div 
            className="neon-card p-5 space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center" style={{ boxShadow: '0 0 15px hsla(142, 76%, 50%, 0.2)' }}>
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground glow-text">بيانات الاستلام</h2>
                <p className="text-xs text-muted-foreground">اختر البلد وطريقة الصرف</p>
              </div>
            </div>

            {/* Country Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                بلد الاستلام <span className="text-destructive">*</span>
              </label>
              <Select value={selectedCountry?.id || ''} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full h-14 text-base rounded-xl border-2 border-border bg-background/50 focus:border-primary">
                  <SelectValue placeholder="اختر البلد" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border rounded-xl shadow-xl">
                  {countries.map((country) => (
                    <SelectItem 
                      key={country.id} 
                      value={country.id}
                      className="py-3 cursor-pointer hover:bg-muted focus:bg-muted"
                    >
                      <span className="font-medium">{country.country_name_arabic}</span>
                      <span className="text-muted-foreground mr-2">({country.dial_code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* USDT Notice */}
            {showUSDTNotice && (
              <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-400 mb-1">💡 ننصح باستخدام USDT</p>
                    <p className="text-xs text-muted-foreground">
                      للتحويل الأسرع، استخدم محفظة USDT على شبكة ERC20
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payout Method */}
            {selectedCountry && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  طريقة الصرف <span className="text-destructive">*</span>
                </label>
                <Select 
                  value={selectedMethod?.name || selectedMethod?.nameArabic || ''} 
                  onValueChange={handleMethodChange}
                >
                  <SelectTrigger className="w-full h-14 text-base rounded-xl border-2 border-border bg-background/50 focus:border-primary">
                    <SelectValue placeholder="اختر طريقة الصرف" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border rounded-xl shadow-xl max-h-72">
                    {selectedCountry.methods.map((method) => {
                      const methodName = method.name || method.nameArabic || '';
                      return (
                        <SelectItem 
                          key={methodName} 
                          value={methodName}
                          className="py-3 cursor-pointer hover:bg-muted focus:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{methodName}</span>
                            {method.recommended && (
                              <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                ⭐ موصى به
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Phone Number */}
            {selectedCountry && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  رقم الهاتف <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-4 py-3.5 text-base rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:ring-0 transition-colors"
                  placeholder={selectedCountry.dial_code}
                  dir="ltr"
                />
              </div>
            )}

            {/* Dynamic Method Fields */}
            {getMethodFields(selectedMethod).map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {field.label || field.labelArabic}
                  {(field.required !== false && !field.optional) && <span className="text-destructive"> *</span>}
                </label>
                <input
                  type={field.type}
                  required={field.required !== false && !field.optional}
                  value={formData.methodFields[field.name] || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    methodFields: { ...prev.methodFields, [field.name]: e.target.value }
                  }))}
                  className="w-full px-4 py-3.5 text-base rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:ring-0 transition-colors"
                  placeholder={field.placeholder || field.label || field.labelArabic}
                />
              </div>
            ))}
          </motion.div>

          <div className="flex gap-3">
            <motion.button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex-1 py-4 rounded-xl font-bold text-lg bg-muted text-foreground transition-all hover:bg-muted/80"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              السابق
            </motion.button>
            <motion.button
              type="button"
              onClick={() => isStep3Complete && setCurrentStep(4)}
              disabled={!isStep3Complete}
              className="flex-1 py-4 rounded-xl font-bold text-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
              whileHover={isStep3Complete ? { scale: 1.02 } : undefined}
              whileTap={isStep3Complete ? { scale: 0.98 } : undefined}
            >
              التالي
            </motion.button>
          </div>
        </div>

        {/* Step 4: Confirmation */}
        <div className={`p-4 space-y-4 transition-all duration-300 ${currentStep === 4 ? 'block animate-in fade-in slide-in-from-right-5' : 'hidden'}`}>
          <motion.div 
            className="neon-card p-5 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-primary/20">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
                animate={{ boxShadow: ['0 0 15px hsla(142, 76%, 50%, 0.2)', '0 0 25px hsla(142, 76%, 50%, 0.4)', '0 0 15px hsla(142, 76%, 50%, 0.2)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </motion.div>
              <div>
                <h2 className="font-bold text-foreground glow-text">تأكيد الطلب</h2>
                <p className="text-xs text-muted-foreground">راجع البيانات قبل الإرسال</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="space-y-3">
              {/* Amount Card */}
              <motion.div 
                className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20"
                style={{ boxShadow: '0 0 20px hsla(142, 76%, 50%, 0.15)' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="text-2xl font-bold text-primary glow-text" dir="ltr">
                    ${formData.amount || '0'}
                  </span>
                </div>
              </motion.div>

              {/* Details */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">ايدي الحساب</span>
                  <span className="font-medium">{formData.zalalLifeAccountId || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">اسم المستلم</span>
                  <span className="font-medium">{formData.recipientFullName || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">بلد الاستلام</span>
                  <span className="font-medium">{selectedCountry?.country_name_arabic || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">طريقة الصرف</span>
                  <span className="font-medium">{selectedMethod?.name || selectedMethod?.nameArabic || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">رقم الهاتف</span>
                  <span className="font-medium" dir="ltr">{formData.phoneNumber || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">الرقم المرجعي</span>
                  <span className="font-medium font-mono" dir="ltr">{formData.referenceNumber || '-'}</span>
                </div>
              </div>

              {/* Receipt Preview */}
              {receiptPreview && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={receiptPreview} alt="Receipt" className="w-full h-32 object-cover" />
                </div>
              )}
            </div>
          </motion.div>

          <div className="flex gap-3">
            <motion.button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex-1 py-4 rounded-xl font-bold text-lg bg-muted text-foreground transition-all hover:bg-muted/80"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              تعديل
            </motion.button>
            <motion.button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 rounded-xl font-bold text-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
              whileHover={!loading ? { scale: 1.02 } : undefined}
              whileTap={!loading ? { scale: 0.98 } : undefined}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الإرسال...
                </span>
              ) : (
                'إرسال الطلب'
              )}
            </motion.button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PayoutRequest;
