import { useState, useRef } from 'react';
import {
  Send,
  Download,
  Calendar,
  DollarSign,
  Globe,
  FileText,
  Image,
  FileSpreadsheet,
  Smartphone,
  Share2,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { exportToExcel } from '@/lib/excel-export';

interface PayoutRequest {
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
  status: 'pending' | 'review' | 'paid' | 'rejected' | 'reserved';
  created_at: string;
  reference_number: string | null;
  processed_by: string | null;
  processed_at: string | null;
}

interface ExportPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countries: string[];
  adminProfiles: Map<string, string>;
}

const statusLabels = {
  pending: 'قيد الانتظار',
  review: 'قيد المراجعة',
  paid: 'تم التحويل',
  rejected: 'مرفوض',
  reserved: 'محجوز',
  all: 'الكل',
};

const statusOptions = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'review', label: 'قيد المراجعة' },
  { value: 'paid', label: 'تم التحويل' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'reserved', label: 'محجوز' },
];

const formatOptions = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'png', label: 'PNG', icon: Image },
  { value: 'jpeg', label: 'JPEG', icon: Image },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { value: 'txt', label: 'TXT', icon: FileText },
];

const deviceOptions = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'android', label: 'Android' },
];

const ExportPrintDialog = ({
  open,
  onOpenChange,
  countries,
  adminProfiles,
}: ExportPrintDialogProps) => {
  const [status, setStatus] = useState('all');
  const [country, setCountry] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [includeTotal, setIncludeTotal] = useState(true);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [deviceType, setDeviceType] = useState('iphone');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [step, setStep] = useState<'filters' | 'format' | 'preview'>('filters');
  const exportRef = useRef<HTMLDivElement>(null);

  const fetchFilteredRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status as 'pending' | 'review' | 'paid' | 'rejected' | 'reserved');
      }
      if (country !== 'all') {
        query = query.eq('country', country);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = (data as PayoutRequest[]) || [];

      // Apply date filter client-side for better accuracy
      if (startDate || endDate) {
        filteredData = filteredData.filter((r) => {
          const createdDate = new Date(r.created_at);
          if (startDate && endDate) {
            return isWithinInterval(createdDate, {
              start: startOfDay(startDate),
              end: endOfDay(endDate),
            });
          }
          if (startDate) {
            return createdDate >= startOfDay(startDate);
          }
          if (endDate) {
            return createdDate <= endOfDay(endDate);
          }
          return true;
        });
      }

      setRequests(filteredData);
      setStep('format');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البيانات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const total = requests.reduce((sum, r) => sum + Number(r.amount), 0);
    const byStatus = {
      pending: requests.filter((r) => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0),
      review: requests.filter((r) => r.status === 'review').reduce((sum, r) => sum + Number(r.amount), 0),
      paid: requests.filter((r) => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount), 0),
      rejected: requests.filter((r) => r.status === 'rejected').reduce((sum, r) => sum + Number(r.amount), 0),
      reserved: requests.filter((r) => r.status === 'reserved').reduce((sum, r) => sum + Number(r.amount), 0),
    };
    return { total, byStatus };
  };

  const generateImageExport = async (): Promise<string | null> => {
    if (!exportRef.current) return null;

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#0a1a12',
        scale: 2,
        useCORS: true,
      });
      return canvas.toDataURL(exportFormat === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const totals = calculateTotals();
      const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: ar });
      const fileName = `تقرير_غلا_لايف_${dateStr}`;

      if (exportFormat === 'xlsx') {
        const exportData = requests.map((r) => ({
          ...r,
          processed_by_name: r.processed_by ? adminProfiles.get(r.processed_by) || 'غير معروف' : '',
        }));
        exportToExcel(exportData, fileName);
        toast({ title: 'تم التصدير', description: 'تم تحميل ملف Excel بنجاح' });
      } else if (exportFormat === 'txt') {
        let content = `تقرير طلبات الصرف - غلا لايف\n`;
        content += `التاريخ: ${dateStr}\n`;
        content += `عدد الطلبات: ${requests.length}\n`;
        if (includeTotal) {
          content += `المبلغ الإجمالي: $${totals.total.toLocaleString()}\n`;
        }
        content += `\n-----------------------------------\n\n`;

        requests.forEach((r, i) => {
          content += `${i + 1}. ${r.recipient_full_name}\n`;
          content += `   كود التتبع: ${r.tracking_code}\n`;
          content += `   المبلغ: $${r.amount}\n`;
          content += `   الدولة: ${r.country}\n`;
          content += `   الحالة: ${statusLabels[r.status]}\n`;
          content += `   التاريخ: ${format(new Date(r.created_at), 'yyyy-MM-dd')}\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: 'تم التصدير', description: 'تم تحميل ملف TXT بنجاح' });
      } else if (exportFormat === 'pdf') {
        setStep('preview');
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const imageData = await generateImageExport();
        if (!imageData) throw new Error('Failed to generate image');

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const imgProps = pdf.getImageProperties(imageData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
        toast({ title: 'تم التصدير', description: 'تم تحميل ملف PDF بنجاح' });
      } else if (exportFormat === 'png' || exportFormat === 'jpeg') {
        setStep('preview');
        await new Promise((resolve) => setTimeout(resolve, 500));

        const imageData = await generateImageExport();
        if (!imageData) throw new Error('Failed to generate image');

        const link = document.createElement('a');
        link.href = imageData;
        link.download = `${fileName}.${exportFormat}`;
        link.click();
        toast({ title: 'تم التصدير', description: `تم تحميل ملف ${exportFormat.toUpperCase()} بنجاح` });
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تصدير الملف',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      setStep('preview');
      await new Promise((resolve) => setTimeout(resolve, 500));

      const imageData = await generateImageExport();
      if (!imageData) throw new Error('Failed to generate image');

      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], `تقرير_غلا_لايف.${exportFormat === 'png' ? 'png' : 'jpg'}`, {
        type: exportFormat === 'png' ? 'image/png' : 'image/jpeg',
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'تقرير غلا لايف',
          text: 'تقرير طلبات الصرف',
        });
        toast({ title: 'تمت المشاركة', description: 'تم مشاركة التقرير بنجاح' });
      } else {
        // Fallback: download the file
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `تقرير_غلا_لايف.${exportFormat === 'png' ? 'png' : 'jpg'}`;
        link.click();
        toast({ title: 'تم التحميل', description: 'المشاركة غير متاحة، تم تحميل الملف بدلاً من ذلك' });
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في مشاركة الملف',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStatus('all');
    setCountry('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setIncludeTotal(true);
    setExportFormat('pdf');
    setDeviceType('iphone');
    setRequests([]);
    setStep('filters');
  };

  const totals = calculateTotals();

  // Export Preview Template
  const ExportPreview = () => (
    <div
      ref={exportRef}
      className="w-[400px] p-6 rounded-2xl"
      style={{
        background: 'linear-gradient(145deg, #0a1a12, #061108)',
        border: '2px solid rgba(74, 222, 128, 0.3)',
      }}
      dir="rtl"
    >
      {/* Header with Logo */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
          style={{
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(74, 222, 128, 0.1))',
            border: '2px solid rgba(74, 222, 128, 0.4)',
            boxShadow: '0 0 30px rgba(74, 222, 128, 0.3)',
          }}
        >
          <span className="text-3xl font-bold text-[#4ade80]">غ</span>
        </div>
        <h1 className="text-2xl font-bold text-white">غلا لايف</h1>
        <p className="text-sm text-[#4ade80]/80 mt-1">تقرير طلبات الصرف</p>
        <p className="text-xs text-gray-400 mt-2">
          {format(new Date(), 'dd MMMM yyyy', { locale: ar })}
        </p>
      </div>

      {/* Filter Summary */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: 'rgba(74, 222, 128, 0.1)',
          border: '1px solid rgba(74, 222, 128, 0.2)',
        }}
      >
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">الحالة:</span>
            <span className="text-white mr-2">{statusLabels[status as keyof typeof statusLabels]}</span>
          </div>
          <div>
            <span className="text-gray-400">الدولة:</span>
            <span className="text-white mr-2">{country === 'all' ? 'الكل' : country}</span>
          </div>
          {startDate && (
            <div>
              <span className="text-gray-400">من:</span>
              <span className="text-white mr-2">{format(startDate, 'dd/MM/yyyy')}</span>
            </div>
          )}
          {endDate && (
            <div>
              <span className="text-gray-400">إلى:</span>
              <span className="text-white mr-2">{format(endDate, 'dd/MM/yyyy')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: 'rgba(74, 222, 128, 0.15)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
          }}
        >
          <p className="text-3xl font-bold text-[#4ade80]">{requests.length}</p>
          <p className="text-xs text-gray-400 mt-1">عدد الطلبات</p>
        </div>
        {includeTotal && (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: 'rgba(74, 222, 128, 0.15)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
            }}
          >
            <p className="text-3xl font-bold text-[#4ade80]">${totals.total.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">المبلغ الإجمالي</p>
          </div>
        )}
      </div>

      {/* Status Breakdown */}
      {includeTotal && (
        <div className="space-y-2 mb-4">
          {Object.entries(totals.byStatus).map(([key, value]) => {
            const count = requests.filter((r) => r.status === key).length;
            if (count === 0) return null;
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                <span className="text-sm text-gray-300">
                  {statusLabels[key as keyof typeof statusLabels]} ({count})
                </span>
                <span className="text-sm font-medium text-[#4ade80]">${value.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Requests Preview */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 mb-2">آخر الطلبات:</p>
        {requests.slice(0, 5).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <div>
              <p className="text-sm text-white">{r.recipient_full_name}</p>
              <p className="text-xs text-gray-500">{r.tracking_code}</p>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#4ade80]">${r.amount}</p>
              <p className="text-xs text-gray-500">{r.country}</p>
            </div>
          </div>
        ))}
        {requests.length > 5 && (
          <p className="text-center text-xs text-gray-500">و {requests.length - 5} طلبات أخرى...</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 text-center">
        <p className="text-xs text-gray-500">
          تم إنشاؤه بواسطة نظام غلا لايف للصرف
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(145deg, hsl(150 35% 10%), hsl(150 35% 6%))',
          border: '1px solid hsla(142, 70%, 45%, 0.2)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            تصدير التقرير
          </DialogTitle>
        </DialogHeader>

        {step === 'filters' && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                الحالة
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" />
                الدولة
              </label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="اختر الدولة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الدول</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                نطاق التاريخ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-right bg-background/50"
                    >
                      {startDate ? format(startDate, 'dd/MM/yyyy') : 'من تاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-right bg-background/50"
                    >
                      {endDate ? format(endDate, 'dd/MM/yyyy') : 'إلى تاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Include Total Checkbox */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/30">
              <Checkbox
                id="includeTotal"
                checked={includeTotal}
                onCheckedChange={(checked) => setIncludeTotal(checked as boolean)}
              />
              <label htmlFor="includeTotal" className="text-sm cursor-pointer flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                إضافة المبلغ الإجمالي
              </label>
            </div>

            <Button
              onClick={fetchFilteredRequests}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
              متابعة
            </Button>
          </div>
        )}

        {step === 'format' && (
          <div className="space-y-4">
            {/* Results Summary */}
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: 'rgba(74, 222, 128, 0.1)',
                border: '1px solid rgba(74, 222, 128, 0.2)',
              }}
            >
              <p className="text-2xl font-bold text-primary">{requests.length}</p>
              <p className="text-sm text-muted-foreground">طلب تم العثور عليه</p>
              {includeTotal && (
                <p className="text-lg font-medium text-primary mt-2">
                  ${totals.total.toLocaleString()}
                </p>
              )}
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">صيغة الملف</label>
              <div className="grid grid-cols-3 gap-2">
                {formatOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExportFormat(opt.value)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      exportFormat === opt.value
                        ? 'bg-primary/20 border-primary/50 border-2'
                        : 'bg-background/30 border border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <opt.icon
                      className={`w-5 h-5 mx-auto mb-1 ${
                        exportFormat === opt.value ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <p className={`text-xs ${exportFormat === opt.value ? 'text-primary' : ''}`}>
                      {opt.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Device Type (for image formats) */}
            {['png', 'jpeg', 'pdf'].includes(exportFormat) && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  نوع الجهاز (للمشاركة الأفضل)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {deviceOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDeviceType(opt.value)}
                      className={`p-3 rounded-xl text-center transition-all flex items-center justify-center gap-2 ${
                        deviceType === opt.value
                          ? 'bg-primary/20 border-primary/50 border-2'
                          : 'bg-background/30 border border-border/50 hover:border-primary/30'
                      }`}
                    >
                      {deviceType === opt.value && <Check className="w-4 h-4 text-primary" />}
                      <span className={deviceType === opt.value ? 'text-primary' : ''}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={handleExport}
                disabled={loading || requests.length === 0}
                className="bg-primary text-primary-foreground"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Download className="w-4 h-4 ml-2" />
                )}
                تحميل
              </Button>
              {['png', 'jpeg'].includes(exportFormat) && (
                <Button
                  onClick={handleShare}
                  disabled={loading || requests.length === 0}
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Share2 className="w-4 h-4 ml-2" />
                  )}
                  مشاركة
                </Button>
              )}
            </div>

            <Button
              onClick={() => setStep('filters')}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              العودة للتعديل
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex justify-center">
            <ExportPreview />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExportPrintDialog;
