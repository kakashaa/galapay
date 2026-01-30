import { useState, useEffect } from 'react';
import { X, Upload, Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface InstantRequestDetailsModalProps {
  requestId: string;
  onClose: () => void;
  onUpdate: () => void;
  isSuperAdmin: boolean;
  currentUserId: string;
}

interface InstantPayoutRequest {
  id: string;
  tracking_code: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  supporter_name: string;
  supporter_account_id: string;
  supporter_receipt_url: string;
  supporter_receipt_reference: string | null;
  supporter_amount_usd: number;
  supporter_payment_method: string | null;
  supporter_bank_id: string | null;
  host_name: string;
  host_account_id: string;
  host_receipt_url: string;
  host_receipt_reference: string;
  host_coins_amount: number;
  host_country: string;
  host_country_dial_code: string;
  host_phone_number: string;
  host_payout_method: string;
  host_recipient_full_name: string;
  host_payout_amount: number;
  host_currency: string;
  host_method_fields: Record<string, string> | null;
  ai_host_receipt_status: string | null;
  ai_supporter_receipt_status: string | null;
  ai_notes: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  admin_final_receipt_url: string | null;
  created_at: string;
  processed_by: string | null;
  processed_at: string | null;
}

const statusLabels = {
  pending: 'قيد الانتظار',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

const InstantRequestDetailsModal = ({
  requestId,
  onClose,
  onUpdate,
  isSuperAdmin,
  currentUserId,
}: InstantRequestDetailsModalProps) => {
  const [request, setRequest] = useState<InstantPayoutRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [finalReceipt, setFinalReceipt] = useState<File | null>(null);
  const [finalReceiptPreview, setFinalReceiptPreview] = useState<string | null>(null);
  const [activeReceiptTab, setActiveReceiptTab] = useState<'supporter' | 'host'>('supporter');

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('instant_payout_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequest(data as InstantPayoutRequest);
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

  const updateStatus = async (newStatus: 'pending' | 'processing' | 'completed' | 'rejected') => {
    if (!isSuperAdmin) {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه تحديث الطلبات',
        variant: 'destructive',
      });
      return;
    }

    // Validation for completed status - require receipt
    if (newStatus === 'completed' && !finalReceipt && !request?.admin_final_receipt_url) {
      toast({
        title: 'خطأ',
        description: 'يجب رفع إيصال التحويل قبل تأكيد الإكمال',
        variant: 'destructive',
      });
      return;
    }

    // Validation for rejected status - require reason
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
      let finalReceiptUrl: string | null = null;

      // Only upload and set receipt URL for 'completed' status
      if (newStatus === 'completed') {
        if (finalReceipt) {
          const fileExt = finalReceipt.name.split('.').pop();
          const fileName = `instant-admin-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(`instant-admin-receipts/${fileName}`, finalReceipt);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(`instant-admin-receipts/${fileName}`);

          finalReceiptUrl = urlData.publicUrl;
        } else {
          finalReceiptUrl = request?.admin_final_receipt_url || null;
        }
      }

      const nowIso = new Date().toISOString();

      const updateData: Record<string, unknown> = {
        status: newStatus,
        admin_notes: adminNotes || null,
        processed_by: currentUserId || null,
        processed_at: nowIso,
      };

      if (newStatus === 'completed') {
        updateData.admin_final_receipt_url = finalReceiptUrl;
        updateData.rejection_reason = null;
      } else if (newStatus === 'rejected') {
        updateData.rejection_reason = rejectionReason;
        updateData.admin_final_receipt_url = null;
      } else if (newStatus === 'processing') {
        updateData.rejection_reason = null;
      } else if (newStatus === 'pending') {
        updateData.rejection_reason = null;
      }

      const { error: updateError } = await supabase
        .from('instant_payout_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: 'تم التحديث',
        description:
          newStatus === 'rejected'
            ? 'تم رفض الطلب بنجاح'
            : newStatus === 'completed'
            ? 'تم تأكيد الإكمال بنجاح'
            : 'تم تحديث حالة الطلب بنجاح',
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الطلب. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRevertRejection = async () => {
    if (!isSuperAdmin) return;

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('instant_payout_requests')
        .update({
          status: 'pending',
          rejection_reason: null,
          processed_by: currentUserId || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'تم التراجع',
        description: 'تم إعادة الطلب إلى قيد الانتظار',
      });

      onUpdate();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في التراجع عن الرفض',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      case 'processing':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-warning/20 text-warning';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-card rounded-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-warning" />
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
          <h2 className="text-xl font-bold text-foreground">تفاصيل السحب الفوري</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Tracking */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">كود التتبع</p>
              <p className="font-mono text-lg font-bold" dir="ltr">
                {request.tracking_code}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
              {statusLabels[request.status]}
            </span>
          </div>

          {/* Supporter Info */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-semibold text-warning flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              بيانات الداعم
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">اسم الداعم</p>
                <p className="font-medium">{request.supporter_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ايدي الداعم</p>
                <p className="font-medium">{request.supporter_account_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">المبلغ بالدولار</p>
                <p className="font-bold text-success text-lg">${request.supporter_amount_usd}</p>
              </div>
              {request.supporter_payment_method && (
                <div>
                  <p className="text-muted-foreground text-xs">طريقة الدفع</p>
                  <p className="font-medium">{request.supporter_payment_method}</p>
                </div>
              )}
            </div>
          </div>

          {/* Host Info */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              بيانات المضيف
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">اسم المضيف</p>
                <p className="font-medium">{request.host_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ايدي المضيف</p>
                <p className="font-medium">{request.host_account_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">كوينزات غلا لايف</p>
                <p className="font-bold text-warning">{request.host_coins_amount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">الرقم المرجعي</p>
                <p className="font-mono font-bold text-primary">{request.host_receipt_reference}</p>
              </div>
            </div>
          </div>

          {/* Payout Info */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-semibold text-success flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              بيانات الاستلام
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">اسم المستلم</p>
                <p className="font-medium">{request.host_recipient_full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">البلد</p>
                <p className="font-medium">{request.host_country}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">طريقة الصرف</p>
                <p className="font-medium">{request.host_payout_method}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">رقم الهاتف</p>
                <p className="font-medium" dir="ltr">
                  {request.host_country_dial_code}
                  {request.host_phone_number}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">مبلغ الصرف</p>
                <p className="font-bold text-lg text-success">
                  {request.host_payout_amount} {request.host_currency}
                </p>
              </div>
            </div>

            {/* Method Fields */}
            {request.host_method_fields && Object.keys(request.host_method_fields).length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground">بيانات إضافية</p>
                {Object.entries(request.host_method_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Status */}
          {(request.ai_host_receipt_status || request.ai_supporter_receipt_status) && (
            <div className="glass-card p-4 space-y-2">
              <p className="text-sm font-medium">فحص AI</p>
              <div className="flex gap-4">
                {request.ai_supporter_receipt_status && (
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      request.ai_supporter_receipt_status === 'pass'
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    إيصال الداعم: {request.ai_supporter_receipt_status === 'pass' ? 'ناجح ✓' : 'فاشل ✗'}
                  </span>
                )}
                {request.ai_host_receipt_status && (
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      request.ai_host_receipt_status === 'pass'
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    إيصال المضيف: {request.ai_host_receipt_status === 'pass' ? 'ناجح ✓' : 'فاشل ✗'}
                  </span>
                )}
              </div>
              {request.ai_notes && <p className="text-xs text-muted-foreground">{request.ai_notes}</p>}
            </div>
          )}

          {/* Receipt Tabs */}
          <div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setActiveReceiptTab('supporter')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeReceiptTab === 'supporter' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                إيصال الداعم
              </button>
              <button
                onClick={() => setActiveReceiptTab('host')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeReceiptTab === 'host' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                إيصال المضيف
              </button>
            </div>
            <img
              src={activeReceiptTab === 'supporter' ? request.supporter_receipt_url : request.host_receipt_url}
              alt={activeReceiptTab === 'supporter' ? 'Supporter receipt' : 'Host receipt'}
              className="w-full max-h-80 object-contain rounded-xl border border-border bg-muted"
            />
          </div>

          {/* Admin Final Receipt (if completed) */}
          {request.admin_final_receipt_url && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">إيصال الإدارة</p>
              <img
                src={request.admin_final_receipt_url}
                alt="Admin final receipt"
                className="w-full max-h-80 object-contain rounded-xl border border-border bg-muted"
              />
            </div>
          )}

          {/* Rejection Reason Display */}
          {request.status === 'rejected' && request.rejection_reason && (
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
              <p className="text-sm font-medium text-destructive mb-1">سبب الرفض</p>
              <p className="text-sm">{request.rejection_reason}</p>
              {isSuperAdmin && (
                <button
                  onClick={handleRevertRejection}
                  disabled={updating}
                  className="mt-3 text-sm text-primary underline"
                >
                  {updating ? 'جاري التراجع...' : 'التراجع عن الرفض'}
                </button>
              )}
            </div>
          )}

          {/* Admin Section - Only for Super Admin */}
          {isSuperAdmin && request.status !== 'completed' && request.status !== 'rejected' && (
            <>
              <hr className="border-border" />

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ملاحظات الإدارة</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="input-field w-full min-h-[80px]"
                  placeholder="أضف ملاحظات..."
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Start Processing */}
                {request.status === 'pending' && (
                  <button
                    onClick={() => updateStatus('processing')}
                    disabled={updating}
                    className="w-full py-3 px-4 bg-primary/20 text-primary rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/30 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                    بدء المعالجة
                  </button>
                )}

                {/* Complete with Receipt */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">إيصال التحويل النهائي</p>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-success transition-colors">
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          {finalReceipt ? finalReceipt.name : 'اختر صورة'}
                        </span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                  {finalReceiptPreview && (
                    <img
                      src={finalReceiptPreview}
                      alt="Preview"
                      className="w-full max-h-40 object-contain rounded-xl border border-border"
                    />
                  )}
                </div>

                <button
                  onClick={() => updateStatus('completed')}
                  disabled={updating}
                  className="w-full py-3.5 px-4 bg-success text-success-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  تأكيد الإكمال
                </button>

                {/* Reject */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="سبب الرفض..."
                    className="input-field w-full"
                  />
                  <button
                    onClick={() => updateStatus('rejected')}
                    disabled={updating}
                    className="w-full py-3 px-4 bg-destructive/20 text-destructive rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-destructive/30 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                    رفض الطلب
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Date Info */}
          <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
            تاريخ الإنشاء:{' '}
            {new Date(request.created_at).toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstantRequestDetailsModal;
