import { useState, useEffect } from 'react';
import { X, Upload, Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RequestDetailsModalProps {
  requestId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface PayoutRequest {
  id: string;
  tracking_code: string;
  zalal_life_account_id: string;
  zalal_life_username: string | null;
  recipient_full_name: string;
  amount: number;
  currency: string;
  country: string;
  country_dial_code: string;
  payout_method: string;
  phone_number: string;
  method_fields: Record<string, string>;
  user_receipt_image_url: string;
  ai_receipt_status: string | null;
  ai_notes: string | null;
  status: 'pending' | 'review' | 'paid' | 'rejected';
  admin_notes: string | null;
  admin_final_receipt_image_url: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const RequestDetailsModal = ({ requestId, onClose, onUpdate }: RequestDetailsModalProps) => {
  const [request, setRequest] = useState<PayoutRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [finalReceipt, setFinalReceipt] = useState<File | null>(null);
  const [finalReceiptPreview, setFinalReceiptPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequest(data as PayoutRequest);
      setAdminNotes(data.admin_notes || '');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل تفاصيل الطلب',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFinalReceipt(file);
      setFinalReceiptPreview(URL.createObjectURL(file));
    }
  };

  const updateStatus = async (newStatus: 'pending' | 'review' | 'paid' | 'rejected') => {
    if (newStatus === 'paid' && !finalReceipt && !request?.admin_final_receipt_image_url) {
      toast({
        title: 'خطأ',
        description: 'يجب رفع إيصال التحويل قبل تأكيد الدفع',
        variant: 'destructive',
      });
      return;
    }

    if (newStatus === 'rejected' && !rejectionReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال سبب الرفض',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);

    try {
      let finalReceiptUrl = request?.admin_final_receipt_image_url;

      // Upload final receipt if provided
      if (finalReceipt) {
        const fileExt = finalReceipt.name.split('.').pop();
        const fileName = `admin-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(`admin-receipts/${fileName}`, finalReceipt);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(`admin-receipts/${fileName}`);

        finalReceiptUrl = urlData.publicUrl;
      }

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();

      // Update request
      const { error: updateError } = await supabase
        .from('payout_requests')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          admin_final_receipt_image_url: finalReceiptUrl,
          rejection_reason: newStatus === 'rejected' ? rejectionReason : null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from('audit_log').insert({
        request_id: requestId,
        user_id: session?.user.id,
        action: `Changed status to ${newStatus}`,
        old_status: request?.status,
        new_status: newStatus,
        notes: adminNotes || null,
      });

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة الطلب بنجاح',
      });

      onUpdate();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الطلب',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-card rounded-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-foreground">تفاصيل الطلب</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Tracking */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">كود التتبع</p>
              <p className="font-mono text-lg font-bold" dir="ltr">{request.tracking_code}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              request.status === 'paid' ? 'status-paid' :
              request.status === 'rejected' ? 'status-rejected' :
              request.status === 'review' ? 'status-review' : 'status-pending'
            }`}>
              {request.status === 'pending' ? 'قيد الانتظار' :
               request.status === 'review' ? 'قيد المراجعة' :
               request.status === 'paid' ? 'تم التحويل' : 'مرفوض'}
            </span>
          </div>

          {/* AI Status */}
          {request.ai_receipt_status && (
            <div className={`p-4 rounded-xl ${
              request.ai_receipt_status === 'pass' ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
            }`}>
              <p className={`font-medium ${request.ai_receipt_status === 'pass' ? 'text-success' : 'text-destructive'}`}>
                فحص AI: {request.ai_receipt_status === 'pass' ? 'ناجح ✓' : 'فاشل ✗'}
              </p>
              {request.ai_notes && (
                <p className="text-sm mt-1 text-muted-foreground">{request.ai_notes}</p>
              )}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">ايدي حساب غلا لايف</p>
              <p className="font-medium">{request.zalal_life_account_id}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">اسم المستلم</p>
              <p className="font-medium">{request.recipient_full_name}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">المبلغ</p>
              <p className="font-bold text-lg">{request.amount} {request.currency}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">البلد</p>
              <p className="font-medium">{request.country}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">طريقة الصرف</p>
              <p className="font-medium">{request.payout_method}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">رقم الهاتف</p>
              <p className="font-medium" dir="ltr">{request.phone_number}</p>
            </div>
          </div>

          {/* Method Fields */}
          {Object.keys(request.method_fields).length > 0 && (
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground mb-2">بيانات إضافية</p>
              <div className="space-y-2">
                {Object.entries(request.method_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Receipt */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">إيصال المستخدم</p>
            <img
              src={request.user_receipt_image_url}
              alt="User receipt"
              className="w-full max-h-80 object-contain rounded-xl border border-border bg-muted"
            />
          </div>

          {/* Admin Section */}
          {request.status !== 'paid' && request.status !== 'rejected' && (
            <>
              <hr className="border-border" />

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  ملاحظات الإدارة
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="input-field min-h-[100px]"
                  placeholder="أضف ملاحظات..."
                />
              </div>

              {/* Final Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  إيصال التحويل النهائي (مطلوب للدفع)
                </label>
                {finalReceiptPreview || request.admin_final_receipt_image_url ? (
                  <div className="relative">
                    <img
                      src={finalReceiptPreview || request.admin_final_receipt_image_url!}
                      alt="Final receipt"
                      className="w-full max-h-60 object-contain rounded-xl border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFinalReceipt(null);
                        setFinalReceiptPreview(null);
                      }}
                      className="absolute top-2 left-2 p-2 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground text-sm">رفع إيصال التحويل</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Rejection Reason */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  سبب الرفض (مطلوب للرفض)
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="input-field"
                  placeholder="أدخل سبب الرفض..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {request.status === 'pending' && (
                  <button
                    onClick={() => updateStatus('review')}
                    disabled={updating}
                    className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                    بدء المراجعة
                  </button>
                )}
                
                <button
                  onClick={() => updateStatus('paid')}
                  disabled={updating}
                  className="flex-1 py-3 px-4 bg-success text-success-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  تأكيد الدفع
                </button>

                <button
                  onClick={() => updateStatus('rejected')}
                  disabled={updating}
                  className="flex-1 py-3 px-4 bg-destructive text-destructive-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-destructive/90 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  رفض
                </button>
              </div>
            </>
          )}

          {/* Completed Status */}
          {(request.status === 'paid' || request.status === 'rejected') && (
            <div className={`p-4 rounded-xl ${
              request.status === 'paid' ? 'bg-success/10' : 'bg-destructive/10'
            }`}>
              <p className={`font-medium ${request.status === 'paid' ? 'text-success' : 'text-destructive'}`}>
                {request.status === 'paid' ? '✓ تم تحويل هذا الطلب' : '✗ تم رفض هذا الطلب'}
              </p>
              {request.rejection_reason && (
                <p className="text-sm mt-1">سبب الرفض: {request.rejection_reason}</p>
              )}
              {request.admin_final_receipt_image_url && request.status === 'paid' && (
                <div className="mt-4">
                  <p className="text-sm mb-2">إيصال التحويل:</p>
                  <img
                    src={request.admin_final_receipt_image_url}
                    alt="Final receipt"
                    className="max-h-60 object-contain rounded-xl"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
