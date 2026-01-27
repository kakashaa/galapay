interface ExportData {
  id: string;
  tracking_code: string;
  zalal_life_account_id: string;
  zalal_life_username: string | null;
  recipient_full_name: string;
  amount: number;
  currency: string;
  country: string;
  payout_method: string;
  phone_number: string;
  status: string;
  created_at: string;
  reference_number: string | null;
  processed_by_name?: string;
  processed_at?: string;
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  review: 'قيد المراجعة',
  paid: 'تم التحويل',
  rejected: 'مرفوض',
};

export const exportToExcel = (data: ExportData[], fileName: string) => {
  // Create CSV content with BOM for Arabic support
  const BOM = '\uFEFF';
  
  const headers = [
    'كود التتبع',
    'ايدي غلا لايف',
    'اسم غلا لايف',
    'اسم المستلم',
    'المبلغ',
    'العملة',
    'البلد',
    'طريقة الصرف',
    'رقم الهاتف',
    'الحالة',
    'الرقم المرجعي',
    'تاريخ الطلب',
    'تمت المعالجة بواسطة',
    'تاريخ المعالجة',
  ];

  const rows = data.map(row => [
    row.tracking_code,
    row.zalal_life_account_id,
    row.zalal_life_username || '',
    row.recipient_full_name,
    row.amount.toString(),
    row.currency,
    row.country,
    row.payout_method,
    row.phone_number,
    statusLabels[row.status] || row.status,
    row.reference_number || '',
    new Date(row.created_at).toLocaleDateString('ar-EG'),
    row.processed_by_name || '',
    row.processed_at ? new Date(row.processed_at).toLocaleDateString('ar-EG') : '',
  ]);

  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
