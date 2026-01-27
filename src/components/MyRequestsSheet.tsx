import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  Loader2,
  ChevronLeft
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useSavedRequests } from '@/hooks/use-saved-requests';

interface RequestStatus {
  tracking_code: string;
  status: 'pending' | 'review' | 'paid' | 'rejected';
  amount: number;
  currency: string;
  created_at: string;
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
  paid: {
    label: 'تم التحويل',
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
};

interface MyRequestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MyRequestsSheet = ({ open, onOpenChange }: MyRequestsSheetProps) => {
  const navigate = useNavigate();
  const { savedRequests, removeTrackingCode } = useSavedRequests();
  const [requestStatuses, setRequestStatuses] = useState<RequestStatus[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch statuses when sheet opens
  useEffect(() => {
    if (open && savedRequests.length > 0) {
      fetchRequestStatuses();
    }
  }, [open, savedRequests]);

  const fetchRequestStatuses = async () => {
    setLoading(true);
    try {
      const trackingCodes = savedRequests.map((r) => r.trackingCode);
      
      const { data, error } = await supabase
        .from('payout_requests')
        .select('tracking_code, status, amount, currency, created_at')
        .in('tracking_code', trackingCodes);

      if (error) throw error;

      setRequestStatuses(data as RequestStatus[]);
    } catch (error) {
      console.error('Error fetching request statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (trackingCode: string) => {
    onOpenChange(false);
    navigate('/track', { state: { trackingCode } });
  };

  const handleRemoveRequest = (e: React.MouseEvent, trackingCode: string) => {
    e.stopPropagation();
    removeTrackingCode(trackingCode);
    setRequestStatuses((prev) => prev.filter((r) => r.tracking_code !== trackingCode));
  };

  const getStatusInfo = (trackingCode: string) => {
    return requestStatuses.find((r) => r.tracking_code === trackingCode);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bottom-sheet h-[70vh] p-0">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        <SheetHeader className="px-5 pb-4 border-b border-border">
          <SheetTitle className="text-xl font-bold text-foreground text-center">
            طلباتي السابقة
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-100px)]">
          <div className="p-5 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : savedRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
              </div>
            ) : (
              savedRequests.map((saved) => {
                const status = getStatusInfo(saved.trackingCode);
                const config = status ? statusConfig[status.status] : null;
                const StatusIcon = config?.icon || Clock;

                return (
                  <div
                    key={saved.trackingCode}
                    onClick={() => handleViewRequest(saved.trackingCode)}
                    className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${config?.bgClass || 'bg-muted'}`}>
                      <StatusIcon className={`w-6 h-6 ${config?.textClass || 'text-muted-foreground'}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-foreground mb-1" dir="ltr">
                        {saved.trackingCode}
                      </p>
                      {status ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${config?.textClass}`}>
                            {config?.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {status.amount.toLocaleString()} {status.currency}
                          </span>
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
