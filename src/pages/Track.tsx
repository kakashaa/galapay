import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Clock, Eye, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PayoutRequest {
  id: string;
  tracking_code: string;
  status: 'pending' | 'review' | 'paid' | 'rejected';
  country: string;
  payout_method: string;
  amount: number;
  currency: string;
  rejection_reason: string | null;
  admin_final_receipt_image_url: string | null;
  created_at: string;
}

const statusConfig = {
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    className: 'status-pending',
    description: 'طلبك قيد المراجعة الأولية',
  },
  review: {
    label: 'قيد المراجعة',
    icon: Eye,
    className: 'status-review',
    description: 'يتم مراجعة طلبك حالياً',
  },
  paid: {
    label: 'تم التحويل',
    icon: CheckCircle2,
    className: 'status-paid',
    description: 'مبروك! تم تحويل المبلغ بنجاح',
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    className: 'status-rejected',
    description: 'للأسف تم رفض طلبك',
  },
};

const Track = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState(location.state?.trackingCode || '');
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<PayoutRequest | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (location.state?.trackingCode) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال كود التتبع',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setNotFound(false);
    setRequest(null);

    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('id, tracking_code, status, country, payout_method, amount, currency, rejection_reason, admin_final_receipt_image_url, created_at')
        .eq('tracking_code', trackingCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRequest(data as PayoutRequest);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء البحث',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = request ? statusConfig[request.status].icon : Clock;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => navigate('/')}
            className="p-2 -mr-2"
          >
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">تتبع الحوالة</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Search Box */}
        <div className="glass-card p-4 mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            أدخل كود التتبع
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field flex-1 font-mono"
              placeholder="XXXXXXXXXXXX"
              dir="ltr"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Not Found */}
        {notFound && (
          <div className="glass-card p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              لم يتم العثور على الطلب
            </h2>
            <p className="text-muted-foreground text-sm">
              تأكد من صحة كود التتبع وحاول مرة أخرى
            </p>
          </div>
        )}

        {/* Request Found */}
        {request && (
          <div className="space-y-4 animate-fade-in">
            {/* Status Card */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  request.status === 'paid' ? 'bg-success/10' :
                  request.status === 'rejected' ? 'bg-destructive/10' :
                  request.status === 'review' ? 'bg-primary/10' : 'bg-warning/10'
                }`}>
                  <StatusIcon className={`w-7 h-7 ${
                    request.status === 'paid' ? 'text-success' :
                    request.status === 'rejected' ? 'text-destructive' :
                    request.status === 'review' ? 'text-primary' : 'text-warning'
                  }`} />
                </div>
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig[request.status].className}`}>
                    {statusConfig[request.status].label}
                  </span>
                  <p className="text-muted-foreground text-sm mt-1">
                    {statusConfig[request.status].description}
                  </p>
                </div>
              </div>

              {/* Rejection Reason */}
              {request.status === 'rejected' && request.rejection_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mt-4">
                  <p className="text-destructive text-sm">
                    <strong>سبب الرفض:</strong> {request.rejection_reason}
                  </p>
                </div>
              )}

              {/* Success Receipt */}
              {request.status === 'paid' && request.admin_final_receipt_image_url && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-foreground mb-2">إيصال التحويل:</p>
                  <img
                    src={request.admin_final_receipt_image_url}
                    alt="Payout receipt"
                    className="w-full rounded-xl border border-border"
                  />
                </div>
              )}
            </div>

            {/* Request Details */}
            <div className="glass-card p-4">
              <h3 className="font-semibold text-foreground mb-3">تفاصيل الطلب</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">البلد</span>
                  <span className="text-foreground">{request.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">طريقة الصرف</span>
                  <span className="text-foreground">{request.payout_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="text-foreground font-medium">
                    {request.amount.toLocaleString()} {request.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ الطلب</span>
                  <span className="text-foreground" dir="ltr">
                    {new Date(request.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Track;
