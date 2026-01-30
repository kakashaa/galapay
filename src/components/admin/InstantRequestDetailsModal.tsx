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
  supporter_amount_usd: number;
  supporter_receipt_url: string;
  supporter_receipt_reference: string | null;
  supporter_payment_method: string | null;
  host_name: string;
  host_account_id: string;
  host_coins_amount: number;
  host_receipt_url: string;
  host_receipt_reference: string;
  host_country: string;
  host_country_dial_code: string;
  host_phone_number: string;
  host_payout_method: string;
  host_payout_amount: number;
  host_currency: string;
  host_recipient_full_name: string;
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
    // Validation for completed status - require receipt
    if (newStatus === 'completed' && !finalReceipt && !request?.admin_final_receipt_url) {
      toast({
        title: 'خطأ',
        description: 'يجب رفع إيصال التحويل قبل تأكيد الدفع',
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
      } else if (newStatus === 'processing' || newStatus === 'pending') {
        updateData.rejection_reason = null;
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('instant_payout_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('id');

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('no_rows_updated');
      }

      toast({
        title: 'تم التحديث',
        description:
          newStatus === 'rejected'
            ? 'تم رفض الطلب بنجاح'
            : newStatus === 'completed'
            ? 'تم تأكيد الدفع بنجاح'
            : 'تم تحديث حالة الطلب بنجاح',
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);

      if (error instanceof Error && error.message === 'no_rows_updated') {
        toast({
          title: 'تعذر تحديث الطلب',
          description: 'يبدو أن الطلب تم تعديله من مسؤول آخر. حدّث الصفحة ثم حاول مرة أخرى.',
          variant: 'destructive',
        });
        return;
      }

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'processing':
        return 'قيد المعالجة';
      case 'completed':
        return 'مكتمل';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'bg-primary/20 text-primary';
      case 'completed':
        return 'status-paid';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'bg-muted text-muted-foreground';
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

  const canProcess = request.status === 'pending' || request.status === 'processing';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-warning/10 border-b border-warning/30 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-foreground">تفاصيل الطلب الفوري</h2>
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
              {getStatusLabel(request.status)}
            </span>
          </div>

          {/* AI Status */}
          {(request.ai_host_receipt_status || request.ai_supporter_receipt_status) && (
            <div className="space-y-2">
              {request.ai_supporter_receipt_status && (
                <div
                  className={`p-3 rounded-xl ${
                    request.ai_supporter_receipt_status === 'pass'
                      ? 'bg-success/10 border border-success/20'
                      : 'bg-destructive/10 border border-destructive/20'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      request.ai_supporter_receipt_status === 'pass' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    فحص إيصال الداعم: {request.ai_supporter_receipt_status === 'pass' ? 'ناجح ✓' : 'فاشل ✗'}
                  </p>
                </div>
              )}
              {request.ai_host_receipt_status && (
                <div
                  className={`p-3 rounded-xl ${
                    request.ai_host_receipt_status === 'pass'
                      ? 'bg-success/10 border border-success/20'
                      : 'bg-destructive/10 border border-destructive/20'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      request.ai_host_receipt_status === 'pass' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    فحص إيصال المضيف: {request.ai_host_receipt_status === 'pass' ? 'ناجح ✓' : 'فاشل ✗'}
                  </p>
                </div>
              )}
              {request.ai_notes && <p className="text-sm text-muted-foreground">{request.ai_notes}</p>}
            </div>
          )}

          {/* Supporter Section */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-bold text-warning flex items-center gap-2">
              💰 بيانات الداعم
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
              {request.supporter_receipt_reference && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">الرقم المرجعي</p>
                  <p className="font-mono font-bold text-primary">{request.supporter_receipt_reference}</p>
                </div>
              )}
            </div>
            {/* Supporter Receipt */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">إيصال الداعم:</p>
              <a
                href={request.supporter_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={request.supporter_receipt_url}
                  alt="Supporter receipt"
                  className="w-full max-h-48 object-contain rounded-xl border border-border bg-muted"
                />
              </a>
            </div>
          </div>

          {/* Host Section */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-bold text-primary flex items-center gap-2">
              🎤 بيانات المضيف
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
                <p className="text-muted-foreground text-xs">الكوينزات</p>
                <p className="font-bold text-warning text-lg">{request.host_coins_amount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">الرقم المرجعي</p>
                <p className="font-mono font-bold text-primary">{request.host_receipt_reference}</p>
              </div>
            </div>
            {/* Host Receipt */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">إيصال المضيف (تحويل الوكالة):</p>
              <a href={request.host_receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={request.host_receipt_url}
                  alt="Host receipt"
                  className="w-full max-h-48 object-contain rounded-xl border border-border bg-muted"
                />
              </a>
            </div>
          </div>

          {/* Payout Details */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-bold text-foreground">📤 بيانات الاستلام</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">اسم المستلم</p>
                <p className="font-medium">{request.host_recipient_full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">الدولة</p>
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
              <div>
                <p className="text-muted-foreground text-xs">المبلغ المستحق</p>
                <p className="font-bold text-primary text-lg">
                  {request.host_payout_amount} {request.host_currency}
                </p>
              </div>
            </div>

            {/* Method Fields */}
            {request.host_method_fields && Object.keys(request.host_method_fields).length > 0 && (
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-2">بيانات إضافية:</p>
                <div className="space-y-1">
                  {Object.entries(request.host_method_fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin Section - Only for Super Admin when request can be processed */}
          {isSuperAdmin && canProcess && (
            <>
              <hr className="border-border" />

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ملاحظات الإدارة</label>
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
                  إيصال التحويل النهائي (مطلوب لإتمام الطلب)
                </label>
                {finalReceiptPreview || request.admin_final_receipt_url ? (
                  <div className="relative">
                    <img
                      src={finalReceiptPreview || request.admin_final_receipt_url!}
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
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-warning/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground text-sm">رفع إيصال التحويل</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Rejection Reason */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">سبب الرفض (مطلوب للرفض)</label>
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
                    onClick={() => updateStatus('processing')}
                    disabled={updating}
                    className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                    بدء المعالجة
                  </button>
                )}

                <button
                  onClick={() => updateStatus('completed')}
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

          {/* View Only Notice for Non-Super Admin */}
          {!isSuperAdmin && canProcess && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground text-center">
                📋 هذا الطلب قيد الانتظار - فقط المسؤول الأعلى يمكنه قبوله أو رفضه
              </p>
            </div>
          )}

          {/* Completed Status */}
          {(request.status === 'completed' || request.status === 'rejected') && (
            <div className={`p-4 rounded-xl ${request.status === 'completed' ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <p
                className={`font-medium ${request.status === 'completed' ? 'text-success' : 'text-destructive'}`}
              >
                {request.status === 'completed' ? '✓ تم إتمام هذا الطلب' : '✗ تم رفض هذا الطلب'}
              </p>
              {request.rejection_reason && <p className="text-sm mt-1">سبب الرفض: {request.rejection_reason}</p>}
              {request.admin_final_receipt_url && request.status === 'completed' && (
                <div className="mt-4">
                  <p className="text-sm mb-2">إيصال التحويل:</p>
                  <img
                    src={request.admin_final_receipt_url}
                    alt="Final receipt"
                    className="max-h-60 object-contain rounded-xl"
                  />
                </div>
              )}

              {/* Super Admin: Revert Rejection */}
              {isSuperAdmin && request.status === 'rejected' && (
                <button
                  onClick={handleRevertRejection}
                  disabled={updating}
                  className="mt-4 w-full py-3 px-4 bg-warning text-warning-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-warning/90 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  التراجع عن الرفض
                </button>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-center text-xs text-muted-foreground">
            تاريخ الإنشاء:{' '}
            {new Date(request.created_at).toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'short',
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
