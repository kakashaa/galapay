import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  Loader2,
  ChevronLeft,
  Zap,
  ShieldBan,
  Crown,
  DollarSign
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useSavedRequests, RequestType } from '@/hooks/use-saved-requests';
import { MyRequestsFilter, FilterOptions } from './MyRequestsFilter';

interface RequestStatus {
  tracking_code: string;
  status: string;
  amount?: number;
  currency?: string;
  country?: string;
  created_at: string;
  type: RequestType;
}

const statusConfig = {
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    bgClass: 'bg-warning/10',
    textClass: 'text-warning',
  },
  review: {
    label: 'قيد المراجعة',
    icon: Eye,
    bgClass: 'bg-primary/10',
    textClass: 'text-primary',
  },
  processing: {
    label: 'قيد المعالجة',
    icon: Eye,
    bgClass: 'bg-primary/10',
    textClass: 'text-primary',
  },
  paid: {
    label: 'تم التحويل',
    icon: CheckCircle2,
    bgClass: 'bg-success/10',
    textClass: 'text-success',
  },
  completed: {
    label: 'مكتمل',
    icon: CheckCircle2,
    bgClass: 'bg-success/10',
    textClass: 'text-success',
  },
  approved: {
    label: 'تمت الموافقة',
    icon: CheckCircle2,
    bgClass: 'bg-success/10',
    textClass: 'text-success',
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
  },
  reserved: {
    label: 'محجوز',
    icon: Clock,
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-500',
  },
};

const typeConfig = {
  payout: {
    label: 'راتب شهري',
    icon: DollarSign,
    color: 'text-green-500',
  },
  instant: {
    label: 'سحب فوري',
    icon: Zap,
    color: 'text-warning',
  },
  ban_report: {
    label: 'بلاغ حظر',
    icon: ShieldBan,
    color: 'text-destructive',
  },
  special_id: {
    label: 'ايدي مميز',
    icon: Crown,
    color: 'text-primary',
  },
};

interface MyRequestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialFilters: FilterOptions = {
  country: 'all',
  status: 'all',
  minAmount: '',
  maxAmount: '',
  type: 'all',
};

export const MyRequestsSheet = ({ open, onOpenChange }: MyRequestsSheetProps) => {
  const navigate = useNavigate();
  const { savedRequests, removeTrackingCode } = useSavedRequests();
  const [requestStatuses, setRequestStatuses] = useState<RequestStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  // Fetch statuses when sheet opens
  useEffect(() => {
    if (open && savedRequests.length > 0) {
      fetchRequestStatuses();
    }
  }, [open, savedRequests]);

  const fetchRequestStatuses = async () => {
    setLoading(true);
    try {
      const results: RequestStatus[] = [];
      
      // Get payout requests
      const payoutCodes = savedRequests.filter(r => r.type === 'payout').map(r => r.trackingCode);
      if (payoutCodes.length > 0) {
        const { data: payoutData } = await supabase
          .from('payout_requests')
          .select('tracking_code, status, amount, currency, country, created_at')
          .in('tracking_code', payoutCodes);
        if (payoutData) {
          results.push(...payoutData.map(d => ({ ...d, type: 'payout' as RequestType })));
        }
      }
      
      // Get instant payout requests
      const instantCodes = savedRequests.filter(r => r.type === 'instant').map(r => r.trackingCode);
      if (instantCodes.length > 0) {
        const { data: instantData } = await supabase
          .from('instant_payout_requests')
          .select('tracking_code, status, host_payout_amount, host_currency, host_country, created_at')
          .in('tracking_code', instantCodes);
        if (instantData) {
          results.push(...instantData.map(d => ({ 
            tracking_code: d.tracking_code,
            status: d.status,
            amount: d.host_payout_amount,
            currency: d.host_currency,
            country: d.host_country,
            created_at: d.created_at,
            type: 'instant' as RequestType 
          })));
        }
      }
      
      // Get ban reports (using id as tracking_code)
      const banReportIds = savedRequests.filter(r => r.type === 'ban_report').map(r => r.trackingCode);
      if (banReportIds.length > 0) {
        const { data: banData } = await supabase
          .from('ban_reports')
          .select('id, is_verified, created_at')
          .in('id', banReportIds);
        if (banData) {
          results.push(...banData.map(d => ({ 
            tracking_code: d.id,
            status: d.is_verified ? 'approved' : 'pending',
            created_at: d.created_at,
            type: 'ban_report' as RequestType 
          })));
        }
      }
      
      // Get special ID requests
      const specialIdIds = savedRequests.filter(r => r.type === 'special_id').map(r => r.trackingCode);
      if (specialIdIds.length > 0) {
        const { data: specialData } = await supabase
          .from('special_id_requests')
          .select('id, status, created_at')
          .in('id', specialIdIds);
        if (specialData) {
          results.push(...specialData.map(d => ({ 
            tracking_code: d.id,
            status: d.status,
            created_at: d.created_at,
            type: 'special_id' as RequestType 
          })));
        }
      }

      setRequestStatuses(results);
    } catch (error) {
      console.error('Error fetching request statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique countries from requests
  const availableCountries = useMemo(() => {
    const countries = requestStatuses
      .map(r => r.country)
      .filter((c): c is string => !!c);
    return [...new Set(countries)];
  }, [requestStatuses]);

  // Filter requests based on filters
  const filteredRequests = useMemo(() => {
    return savedRequests.filter((saved) => {
      const status = requestStatuses.find(r => r.tracking_code === saved.trackingCode);
      
      // Type filter
      if (filters.type !== 'all' && saved.type !== filters.type) {
        return false;
      }

      // Country filter
      if (filters.country !== 'all' && status?.country !== filters.country) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && status?.status !== filters.status) {
        return false;
      }

      // Amount range filter
      if (status?.amount) {
        const minAmount = filters.minAmount ? parseFloat(filters.minAmount) : 0;
        const maxAmount = filters.maxAmount ? parseFloat(filters.maxAmount) : Infinity;
        if (status.amount < minAmount || status.amount > maxAmount) {
          return false;
        }
      } else if (filters.minAmount || filters.maxAmount) {
        // If there's an amount filter but request has no amount, exclude it
        return false;
      }

      return true;
    });
  }, [savedRequests, requestStatuses, filters]);

  const handleViewRequest = (trackingCode: string, type: RequestType) => {
    onOpenChange(false);
    if (type === 'ban_report') {
      navigate('/ban-report');
    } else if (type === 'special_id') {
      navigate('/special-id');
    } else {
      navigate('/track', { state: { trackingCode } });
    }
  };

  const handleRemoveRequest = (e: React.MouseEvent, trackingCode: string) => {
    e.stopPropagation();
    removeTrackingCode(trackingCode);
    setRequestStatuses((prev) => prev.filter((r) => r.tracking_code !== trackingCode));
  };

  const getStatusInfo = (trackingCode: string) => {
    return requestStatuses.find((r) => r.tracking_code === trackingCode);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bottom-sheet h-[85vh] p-0">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        <SheetHeader className="px-5 pb-4 border-b border-border">
          <SheetTitle className="text-xl font-bold text-foreground text-center">
            طلباتي السابقة
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-100px)]">
          <div className="p-5 space-y-3">
            {/* Filter Section */}
            {savedRequests.length > 0 && !loading && (
              <MyRequestsFilter
                filters={filters}
                onFiltersChange={setFilters}
                countries={availableCountries}
                onClearFilters={handleClearFilters}
              />
            )}

            {/* Results count */}
            {savedRequests.length > 0 && !loading && (
              <div className="text-xs text-muted-foreground text-center">
                عرض {filteredRequests.length} من {savedRequests.length} طلب
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : savedRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد نتائج تطابق الفلتر</p>
              </div>
            ) : (
              filteredRequests.map((saved) => {
                const status = getStatusInfo(saved.trackingCode);
                const statusConfigItem = status?.status ? statusConfig[status.status as keyof typeof statusConfig] : null;
                const typeItem = typeConfig[saved.type];
                const StatusIcon = statusConfigItem?.icon || Clock;
                const TypeIcon = typeItem?.icon || FileText;

                return (
                  <div
                    key={saved.trackingCode}
                    onClick={() => handleViewRequest(saved.trackingCode, saved.type)}
                    className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {/* Type Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${statusConfigItem?.bgClass || 'bg-muted'}`}>
                      <TypeIcon className={`w-6 h-6 ${typeItem?.color || 'text-muted-foreground'}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${typeItem?.color}`}>{typeItem?.label}</span>
                        {status?.country && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {status.country}
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground mb-1" dir="ltr">
                        {saved.trackingCode.length > 12 ? saved.trackingCode.substring(0, 8) + '...' : saved.trackingCode}
                      </p>
                      {status ? (
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-3 h-3 ${statusConfigItem?.textClass}`} />
                          <span className={`text-xs font-medium ${statusConfigItem?.textClass}`}>
                            {statusConfigItem?.label}
                          </span>
                          {status.amount && status.currency && (
                            <span className="text-xs text-muted-foreground">
                              • {status.amount.toLocaleString()} {status.currency}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">جاري التحميل...</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleRemoveRequest(e, saved.trackingCode)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
