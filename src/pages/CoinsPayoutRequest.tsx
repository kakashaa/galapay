import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Coins, User, Hash, Loader2, CheckCircle2, AlertTriangle, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { notifyNewCoinsPayout } from '@/hooks/use-webhook-notification';

// Conversion rate: $1 = 8,700 coins
const COINS_PER_DOLLAR = 8700;

const CoinsPayoutRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data passed from PayoutRequest page
  const passedData = location.state || {};
  const { 
    referenceNumber: initialReference = '',
    amount: initialAmount = '',
    receiptImageUrl = '',
    flaggedReason = ''
  } = passedData;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    galaAccountId: '',
    galaUsername: '',
    amountUsd: initialAmount,
    referenceNumber: initialReference,
  });

  // Calculate coins based on USD amount
  const coinsAmount = formData.amountUsd ? Math.floor(parseFloat(formData.amountUsd) * COINS_PER_DOLLAR) : 0;

  // Validate form
  const isFormValid = () => {
    return (
      formData.galaAccountId.trim().length >= 3 &&
      formData.amountUsd &&
      parseFloat(formData.amountUsd) > 0 &&
      formData.referenceNumber.trim().length >= 3 &&
      receiptImageUrl
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // CRITICAL: Check if reference was already used in coins_payout_requests
      const { data: existingCoins } = await supabase
        .from('coins_payout_requests')
        .select('id, tracking_code')
        .eq('reference_number', formData.referenceNumber.trim())
        .maybeSingle();

      if (existingCoins) {
        toast({
          title: '🚫 الرقم المرجعي مستخدم',
          description: `هذا الإيصال تم استخدامه مسبقاً لطلب كوينزات (${existingCoins.tracking_code}). لا يمكن استخدامه مرة أخرى.`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Insert coins payout request
      const { data: requestData, error: insertError } = await supabase
        .from('coins_payout_requests')
        .insert({
          gala_account_id: formData.galaAccountId.trim(),
          gala_username: formData.galaUsername.trim() || null,
          amount_usd: parseFloat(formData.amountUsd),
          coins_amount: coinsAmount,
          reference_number: formData.referenceNumber.trim(),
          receipt_image_url: receiptImageUrl,
        })
        .select('tracking_code')
        .single();

      if (insertError) throw insertError;

      // Flag the reference number in the database
      await supabase
        .from('flagged_references')
        .upsert({
          reference_number: formData.referenceNumber.trim(),
          original_account_id: formData.galaAccountId.trim(),
          reason: 'coins_payout_request',
        }, {
          onConflict: 'reference_number'
        });

      // Send Telegram notification
      try {
        await supabase.functions.invoke('send-coins-notification', {
          body: {
            trackingCode: requestData.tracking_code,
            galaAccountId: formData.galaAccountId.trim(),
            galaUsername: formData.galaUsername.trim() || undefined,
            amountUsd: parseFloat(formData.amountUsd),
            coinsAmount: coinsAmount,
            referenceNumber: formData.referenceNumber.trim(),
            receiptImageUrl: receiptImageUrl,
          }
        });
      } catch (notifyError) {
        console.error('Error sending Telegram notification:', notifyError);
      }

      // Send Webhook notification
      try {
        await notifyNewCoinsPayout({
          id: requestData.tracking_code, // Use tracking_code as we don't have id in response
          tracking_code: requestData.tracking_code,
          gala_account_id: formData.galaAccountId.trim(),
          gala_username: formData.galaUsername.trim() || undefined,
          amount_usd: parseFloat(formData.amountUsd),
          coins_amount: coinsAmount,
          created_at: new Date().toISOString(),
        });
      } catch (webhookError) {
        console.error('Error sending webhook notification:', webhookError);
      }

      toast({
        title: '✅ تم إرسال طلب الكوينزات بنجاح',
        description: `رقم التتبع: ${requestData.tracking_code}`,
      });

      // Navigate to success page
      navigate('/success', {
        state: {
          trackingCode: requestData.tracking_code,
          type: 'coins',
          coinsAmount: coinsAmount,
          amountUsd: formData.amountUsd,
        }
      });

    } catch (error) {
      console.error('Error submitting coins request:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-background to-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white py-4 px-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6" />
            <h1 className="text-lg font-bold">استلام كوينزات</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Warning Alert */}
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-200 text-sm">
            {flaggedReason || 'هذا الإيصال/الرقم المرجعي مرتبط بحساب استلم راتب هذا الشهر. سيتم استلام المبلغ ككوينزات فقط.'}
          </AlertDescription>
        </Alert>

        {/* Receipt Preview */}
        {receiptImageUrl && (
          <Card className="bg-card/50 backdrop-blur border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                <Image className="w-4 h-4" />
                الإيصال المرفق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img 
                src={receiptImageUrl} 
                alt="Receipt" 
                className="w-full h-32 object-contain rounded-lg bg-black/20"
              />
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-card/50 backdrop-blur border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <User className="w-5 h-5" />
                بيانات حساب غلا لايف
              </CardTitle>
              <CardDescription>أدخل بيانات الحساب لاستلام الكوينزات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-300">
                  أيدي الحساب في غلا لايف <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.galaAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, galaAccountId: e.target.value }))}
                  placeholder="مثال: 123456789"
                  className="bg-background/50 border-amber-500/30 focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-300">
                  اسم المستخدم في غلا لايف (اختياري)
                </label>
                <Input
                  type="text"
                  value={formData.galaUsername}
                  onChange={(e) => setFormData(prev => ({ ...prev, galaUsername: e.target.value }))}
                  placeholder="مثال: @username"
                  className="bg-background/50 border-amber-500/30 focus:border-amber-500"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Amount & Coins */}
          <Card className="bg-card/50 backdrop-blur border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <Coins className="w-5 h-5" />
                المبلغ والكوينزات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* USD Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-300">
                  المبلغ بالدولار <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.amountUsd}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountUsd: e.target.value }))}
                    placeholder="0.00"
                    className="bg-background/50 border-amber-500/30 focus:border-amber-500 pl-12"
                    dir="ltr"
                    step="0.01"
                    min="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                </div>
              </div>

              {/* Coins Display */}
              {coinsAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-amber-600/20 to-yellow-500/20 rounded-xl p-4 border border-amber-500/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300">سيتم شحن:</span>
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      <span className="text-2xl font-bold text-yellow-400">
                        {coinsAmount.toLocaleString()}
                      </span>
                      <span className="text-amber-300">كوينز</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    معدل التحويل: $1 = {COINS_PER_DOLLAR.toLocaleString()} كوينز
                  </p>
                </motion.div>
              )}

              {/* Reference Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-300 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  الرقم المرجعي <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.referenceNumber}
                  readOnly
                  className="bg-background/30 border-amber-500/30 text-muted-foreground cursor-not-allowed"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  الرقم المرجعي مقفل ولا يمكن تعديله
                </p>
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
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                  تأكيد طلب الكوينزات
                </>
              )}
            </Button>
          </motion.div>

          {/* Info Note */}
          <p className="text-center text-sm text-muted-foreground">
            سيتم شحن الكوينزات إلى حسابك خلال دقائق
          </p>
        </form>
      </div>
    </div>
  );
};

export default CoinsPayoutRequest;
