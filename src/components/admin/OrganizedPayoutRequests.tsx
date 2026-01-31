import { useState, useEffect } from 'react';
import { 
  Clock, 
  Eye, 
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Calendar,
  User,
  DollarSign,
  FileText,
  Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

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
  rejection_reason: string | null;
  reservation_reason: string | null;
}

interface OrganizedPayoutRequestsProps {
  onViewRequest: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  isSuperAdmin: boolean;
}

const statusConfig = {
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  review: {
    label: 'قيد المراجعة',
    icon: Eye,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  paid: {
    label: 'تم التحويل',
    icon: CheckCircle,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
  },
  reserved: {
    label: 'محجوز',
    icon: Ban,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
};

const OrganizedPayoutRequests = ({ 
  onViewRequest, 
  onDeleteRequest, 
  isSuperAdmin 
}: OrganizedPayoutRequestsProps) => {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as PayoutRequest[]) || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الطلبات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter requests by status and search query
  const filterRequests = (status: string) => {
    let filtered = requests;
    
    // Filter by status(es)
    if (status === 'pending') {
      filtered = filtered.filter(r => r.status === 'pending' || r.status === 'review');
    } else if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(r => 
        r.tracking_code.toLowerCase().includes(query) ||
        r.zalal_life_account_id.toLowerCase().includes(query) ||
        r.recipient_full_name.toLowerCase().includes(query) ||
        (r.reference_number && r.reference_number.toLowerCase().includes(query)) ||
        r.phone_number.includes(query)
      );
    }
    
    return filtered;
  };

  // Get counts for each tab
  const getCounts = () => {
    const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'review').length;
    const paidCount = requests.filter(r => r.status === 'paid').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;
    const reservedCount = requests.filter(r => r.status === 'reserved').length;
    return { pendingCount, paidCount, rejectedCount, reservedCount };
  };

  const counts = getCounts();

  // Request Card Component
  const RequestCard = ({ request }: { request: PayoutRequest }) => {
    const config = statusConfig[request.status];
    const StatusIcon = config.icon;

    return (
      <div 
        className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(145deg, hsl(150 35% 10%), hsl(150 35% 6%))',
          border: '1px solid hsla(142, 70%, 45%, 0.15)',
          boxShadow: '0 4px 20px -5px hsla(150, 50%, 3%, 0.6), inset 0 1px 0 hsla(142, 70%, 50%, 0.08)',
        }}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${config.color}`} />
              <span className={`text-xs px-2 py-1 rounded-lg ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                {config.label}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {new Date(request.created_at).toLocaleDateString('ar-EG')}
            </span>
          </div>

          {/* Main Info */}
          <div className="space-y-2">
            {/* Name & ID */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{request.recipient_full_name}</span>
            </div>
            
            {/* Account ID */}
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm text-primary">{request.zalal_life_account_id}</span>
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xl font-bold text-primary">${request.amount.toLocaleString()}</span>
            </div>

            {/* Country & Method */}
            <div className="text-xs text-muted-foreground">
              {request.country} · {request.payout_method}
            </div>

            {/* Reference Number if exists */}
            {request.reference_number && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">المرجعي:</span>
                <span className="font-mono text-primary">{request.reference_number}</span>
              </div>
            )}

            {/* Rejection/Reservation Reason */}
            {request.status === 'rejected' && request.rejection_reason && (
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">{request.rejection_reason}</p>
              </div>
            )}
            {request.status === 'reserved' && request.reservation_reason && (
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs text-orange-400">{request.reservation_reason}</p>
              </div>
            )}

            {/* Processed Date for paid/rejected */}
            {request.processed_at && (request.status === 'paid' || request.status === 'rejected') && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>تمت المعالجة: {new Date(request.processed_at).toLocaleDateString('ar-EG')}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onViewRequest(request.id)}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 
                bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30
                hover:from-primary/30 hover:to-primary/20 hover:border-primary/50"
            >
              <Eye className="w-4 h-4" />
              {isSuperAdmin ? 'عرض ومعالجة' : 'عرض التفاصيل'}
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => onDeleteRequest(request.id)}
                className="p-2.5 bg-destructive/10 text-destructive rounded-xl border border-destructive/20
                  hover:bg-destructive/20 hover:border-destructive/40 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Empty State
  const EmptyState = ({ message }: { message: string }) => (
    <div 
      className="rounded-2xl p-10 text-center"
      style={{
        background: 'linear-gradient(145deg, hsl(150 35% 9%), hsl(150 35% 5%))',
        border: '1px solid hsla(142, 70%, 45%, 0.1)',
      }}
    >
      <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">إدارة طلبات السحب الشهري</h2>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالايدي، الاسم، كود التتبع، أو الرقم المرجعي..."
          className="pr-10 bg-background/50"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/30">
          <TabsTrigger 
            value="pending" 
            className="flex items-center gap-1 text-xs py-2 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-500"
          >
            <Clock className="w-3 h-3" />
            جديدة
            {counts.pendingCount > 0 && (
              <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 rounded-full">
                {counts.pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="paid" 
            className="flex items-center gap-1 text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
          >
            <CheckCircle className="w-3 h-3" />
            تم التحويل
            {counts.paidCount > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] px-1.5 rounded-full">
                {counts.paidCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="rejected" 
            className="flex items-center gap-1 text-xs py-2 data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
          >
            <XCircle className="w-3 h-3" />
            مرفوض
            {counts.rejectedCount > 0 && (
              <span className="bg-destructive/20 text-destructive text-[10px] px-1.5 rounded-full">
                {counts.rejectedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="reserved" 
            className="flex items-center gap-1 text-xs py-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
          >
            <Ban className="w-3 h-3" />
            محجوز
            {counts.reservedCount > 0 && (
              <span className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5 rounded-full">
                {counts.reservedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {filterRequests('pending').length > 0 ? (
            filterRequests('pending').map(request => (
              <RequestCard key={request.id} request={request} />
            ))
          ) : (
            <EmptyState message="لا توجد طلبات جديدة" />
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-3 mt-4">
          {filterRequests('paid').length > 0 ? (
            filterRequests('paid').map(request => (
              <RequestCard key={request.id} request={request} />
            ))
          ) : (
            <EmptyState message="لا توجد طلبات تم تحويلها" />
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-3 mt-4">
          {filterRequests('rejected').length > 0 ? (
            filterRequests('rejected').map(request => (
              <RequestCard key={request.id} request={request} />
            ))
          ) : (
            <EmptyState message="لا توجد طلبات مرفوضة" />
          )}
        </TabsContent>

        <TabsContent value="reserved" className="space-y-3 mt-4">
          {filterRequests('reserved').length > 0 ? (
            filterRequests('reserved').map(request => (
              <RequestCard key={request.id} request={request} />
            ))
          ) : (
            <EmptyState message="لا توجد طلبات محجوزة" />
          )}
        </TabsContent>
      </Tabs>

      {/* Total Count */}
      <p className="text-xs text-muted-foreground text-center">
        إجمالي الطلبات: {requests.length}
      </p>
    </div>
  );
};

export default OrganizedPayoutRequests;
