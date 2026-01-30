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

interface InstantExportData {
  tracking_code: string;
  status: string;
  supporter_name: string;
  supporter_account_id: string;
  supporter_amount_usd: number;
  supporter_payment_method: string | null;
  host_name: string;
  host_account_id: string;
  host_coins_amount: number;
  host_country: string;
  host_payout_method: string;
  host_payout_amount: number;
  host_currency: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  review: 'قيد المراجعة',
  paid: 'تم التحويل',
  rejected: 'مرفوض',
};

const instantStatusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
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

export const exportInstantToExcel = (data: InstantExportData[], fileName: string) => {
  // Create CSV content with BOM for Arabic support
  const BOM = '\uFEFF';
  
  const headers = [
    'كود التتبع',
    'الحالة',
    'اسم الداعم',
    'ايدي الداعم',
    'المبلغ بالدولار',
    'طريقة الدفع',
    'اسم المضيف',
    'ايدي المضيف',
    'الكوينزات',
    'بلد المضيف',
    'طريقة الصرف',
    'مبلغ الصرف',
    'العملة',
    'تاريخ الطلب',
  ];

  const rows = data.map(row => [
    row.tracking_code,
    instantStatusLabels[row.status] || row.status,
    row.supporter_name,
    row.supporter_account_id,
    row.supporter_amount_usd.toString(),
    row.supporter_payment_method || '',
    row.host_name,
    row.host_account_id,
    row.host_coins_amount.toString(),
    row.host_country,
    row.host_payout_method,
    row.host_payout_amount.toString(),
    row.host_currency,
    new Date(row.created_at).toLocaleDateString('ar-EG'),
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
