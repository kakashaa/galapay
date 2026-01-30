-- تغيير صلاحية التحديث لتكون فقط للمسؤول الأعلى (super_admin)
-- هذا يمنع أي مسؤول عادي من تعديل أو قبول أو رفض الطلبات

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Admins and staff can update requests" ON public.payout_requests;

-- إنشاء سياسة جديدة: فقط super_admin يمكنه التحديث
CREATE POLICY "Only super admin can update requests" 
ON public.payout_requests 
FOR UPDATE 
USING (is_super_admin(auth.uid()));