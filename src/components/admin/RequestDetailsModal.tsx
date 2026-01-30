import { useState, useEffect } from 'react';
import { X, Upload, Loader2, CheckCircle2, XCircle, Eye, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RequestDetailsModalProps {
  requestId: string;
  onClose: () => void;
  onUpdate: () => void;
  userRole?: 'admin' | 'staff' | 'super_admin';
  currentUserId?: string;
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
  reference_number: string | null;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  processed_by: string | null;
  processed_at: string | null;
}

const RequestDetailsModal = ({ 
  requestId, 
  onClose, 
  onUpdate, 
  userRole = 'admin',
  currentUserId = ''
}: RequestDetailsModalProps) => {
  const [request, setRequest] = useState<PayoutRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [finalReceipt, setFinalReceipt] = useState<File | null>(null);
  const [finalReceiptPreview, setFinalReceiptPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAmount, setEditedAmount] = useState('');

  const isSuperAdmin = userRole === 'super_admin';

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
      setEditedAmount(data.amount?.toString() || '');
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
    // Validation for paid status - require receipt
    if (newStatus === 'paid' && !finalReceipt && !request?.admin_final_receipt_image_url) {
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

      // Only upload and set receipt URL for 'paid' status
      if (newStatus === 'paid') {
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
        } else {
          // Keep existing receipt if no new one uploaded
          finalReceiptUrl = request?.admin_final_receipt_image_url || null;
        }
      }

      // Build update object based on status
      const nowIso = new Date().toISOString();

      const updateData: Record<string, unknown> = {
        status: newStatus,
        admin_notes: adminNotes || null,
        processed_by: currentUserId || null,
        processed_at: nowIso,
      };

      // If an admin/staff is acting before explicitly claiming, auto-claim to ensure
      // the backend update policies pass and the request moves out of the shared pool.
      const shouldAutoClaim = !isSuperAdmin && !!currentUserId && !request?.claimed_by;
      if (shouldAutoClaim) {
        updateData.claimed_by = currentUserId;
        updateData.claimed_at = nowIso;
      }

      // Status-specific fields
      if (newStatus === 'paid') {
        updateData.admin_final_receipt_image_url = finalReceiptUrl;
        updateData.rejection_reason = null; // Clear any previous rejection reason
      } else if (newStatus === 'rejected') {
        updateData.rejection_reason = rejectionReason;
        updateData.admin_final_receipt_image_url = null; // Clear receipt for rejected
      } else if (newStatus === 'review') {
        // For review status, keep existing values but clear rejection reason
        updateData.rejection_reason = null;
      } else if (newStatus === 'pending') {
        // For pending (revert), clear processed info
        updateData.rejection_reason = null;
      }

      // Update request
      let updateQuery = supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('id');

      // If we're auto-claiming, only succeed if it was still unclaimed (avoid stealing)
      if (shouldAutoClaim) {
        updateQuery = updateQuery.is('claimed_by', null);
      }

      const { data: updatedRows, error: updateError } = await updateQuery;

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('no_rows_updated');
      }

      // Create audit log with descriptive action
      const actionDescriptions: Record<string, string> = {
        pending: 'إعادة الطلب إلى قيد الانتظار',
        review: 'بدء مراجعة الطلب',
        paid: 'تأكيد دفع الطلب',
        rejected: `رفض الطلب: ${rejectionReason}`,
      };

      await supabase.from('audit_log').insert({
        request_id: requestId,
        user_id: currentUserId || null,
        action: actionDescriptions[newStatus] || `Changed status to ${newStatus}`,
        old_status: request?.status,
        new_status: newStatus,
        notes: newStatus === 'rejected' ? rejectionReason : (adminNotes || null),
      });

      toast({
        title: 'تم التحديث',
        description: newStatus === 'rejected' 
          ? 'تم رفض الطلب بنجاح' 
          : newStatus === 'paid' 
            ? 'تم تأكيد الدفع بنجاح'
            : 'تم تحديث حالة الطلب بنجاح',
      });

      onUpdate();
      onClose(); // Close modal after successful update
    } catch (error) {
      console.error('Error updating status:', error);

      if (error instanceof Error && error.message === 'no_rows_updated') {
        toast({
          title: 'تعذر تحديث الطلب',
          description: 'يبدو أن الطلب تم استلامه/تعديله من مسؤول آخر. حدّث الصفحة ثم حاول مرة أخرى.',
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

  const handleEditRequest = async () => {
    if (!isSuperAdmin) {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه تعديل الطلبات',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          amount: parseFloat(editedAmount),
          admin_notes: adminNotes || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      // Create audit log for edit
      await supabase.from('audit_log').insert({
        request_id: requestId,
        user_id: currentUserId || null,
        action: `Edited request - Amount changed to ${editedAmount}`,
        notes: adminNotes || null,
      });

      toast({
        title: 'تم التعديل',
        description: 'تم تعديل الطلب بنجاح',
      });

      setIsEditing(false);
      fetchRequest();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تعديل الطلب',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRevertRejection = async () => {
    if (!isSuperAdmin) {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه التراجع عن الرفض',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: 'pending',
          rejection_reason: null,
          processed_by: currentUserId || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_log').insert({
        request_id: requestId,
        user_id: currentUserId || null,
        action: 'Reverted rejection - Status changed back to pending',
        old_status: 'rejected',
        new_status: 'pending',
        notes: 'تم التراجع عن الرفض بواسطة المسؤول',
      });

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
          <div className="flex items-center gap-2">
            {isSuperAdmin && (request.status === 'pending' || request.status === 'review') && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-primary"
                title="تعديل الطلب"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

          {/* Reference Number */}
          {request.reference_number && (
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground">الرقم المرجعي</p>
              <p className="font-mono text-lg font-bold text-primary" dir="ltr">{request.reference_number}</p>
            </div>
          )}

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
              {isEditing ? (
                <input
                  type="number"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  className="input-field mt-1"
                />
              ) : (
                <p className="font-bold text-lg">{request.amount} {request.currency}</p>
              )}
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
          {request.method_fields && Object.keys(request.method_fields).length > 0 && (
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

          {/* Edit Mode Save Button */}
          {isEditing && (
            <button
              onClick={handleEditRequest}
              disabled={updating}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              حفظ التعديلات
            </button>
          )}

          {/* Admin Section */}
          {!isEditing && request.status !== 'paid' && request.status !== 'rejected' && (
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
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
