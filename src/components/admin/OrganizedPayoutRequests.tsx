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
  Filter,
  X,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

// Filter options
const countryOptions = [
  'اليمن', 'السعودية', 'مصر', 'العراق', 'الأردن', 'فلسطين', 
  'سوريا', 'لبنان', 'الجزائر', 'المغرب', 'تونس', 'ليبيا',
  'السودان', 'عمان', 'الكويت', 'الإمارات', 'قطر', 'البحرين'
];

const OrganizedPayoutRequests = ({ 
  onViewRequest, 
  onDeleteRequest, 
  isSuperAdmin 
}: OrganizedPayoutRequestsProps) => {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [countryFilter, setCountryFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

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

  // Filter requests by status (uses base filtered requests)
  const filterRequests = (status: string) => {
    let filtered = getBaseFilteredRequests();
    
    // Filter by status(es)
    if (status === 'pending') {
      filtered = filtered.filter(r => r.status === 'pending' || r.status === 'review');
    } else if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }
    
    return filtered;
  };

  // Apply base filters (search, country, amount) to all requests
  const getBaseFilteredRequests = () => {
    let filtered = requests;
    
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

    // Filter by country
    if (countryFilter !== 'all') {
      filtered = filtered.filter(r => r.country === countryFilter);
    }

    // Filter by amount range
    if (minAmount) {
      filtered = filtered.filter(r => r.amount >= parseFloat(minAmount));
    }
    if (maxAmount) {
      filtered = filtered.filter(r => r.amount <= parseFloat(maxAmount));
    }
    
    return filtered;
  };

  // Get counts and totals for each tab based on filtered data
  const getCountsAndTotals = () => {
    const baseFiltered = getBaseFilteredRequests();
    
    const pendingRequests = baseFiltered.filter(r => r.status === 'pending' || r.status === 'review');
    const paidRequests = baseFiltered.filter(r => r.status === 'paid');
    const rejectedRequests = baseFiltered.filter(r => r.status === 'rejected');
    const reservedRequests = baseFiltered.filter(r => r.status === 'reserved');
    
    return {
      pendingCount: pendingRequests.length,
      pendingTotal: pendingRequests.reduce((sum, r) => sum + r.amount, 0),
      paidCount: paidRequests.length,
      paidTotal: paidRequests.reduce((sum, r) => sum + r.amount, 0),
      rejectedCount: rejectedRequests.length,
      rejectedTotal: rejectedRequests.reduce((sum, r) => sum + r.amount, 0),
      reservedCount: reservedRequests.length,
      reservedTotal: reservedRequests.reduce((sum, r) => sum + r.amount, 0),
    };
  };

  const stats = getCountsAndTotals();

  const clearFilters = () => {
    setCountryFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setSearchQuery('');
  };

  const hasActiveFilters = countryFilter !== 'all' || minAmount !== '' || maxAmount !== '' || searchQuery !== '';

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

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالايدي، الاسم، كود التتبع، أو الرقم المرجعي..."
            className="pr-10 bg-background/50"
          />
        </div>

        {/* Advanced Filters */}
        <Collapsible>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Filter className="w-3.5 h-3.5" />
                فلترة متقدمة
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">!</span>
                )}
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
                مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent className="mt-3">
            <div className="glass-card p-3 space-y-3 rounded-xl border border-border/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">الدولة</label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="اختر الدولة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">جميع الدول</SelectItem>
                      {countryOptions.map((country) => (
                        <SelectItem key={country} value={country} className="text-xs">{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">نطاق المبلغ ($)</label>
                  <div className="flex gap-1.5 items-center">
                    <Input
                      type="number"
                      placeholder="من"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="h-9 text-xs"
                      dir="ltr"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="number"
                      placeholder="إلى"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="h-9 text-xs"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Tabs with Stats */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1.5 bg-muted/30 rounded-xl">
          <TabsTrigger 
            value="pending" 
            className="flex flex-col items-center gap-0.5 text-[10px] py-2 px-1 rounded-lg data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-500"
          >
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>انتظار</span>
              {stats.pendingCount > 0 && (
                <span className="bg-yellow-500/20 text-yellow-500 text-[9px] px-1 rounded-full">
                  {stats.pendingCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold opacity-80">${stats.pendingTotal.toLocaleString()}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="paid" 
            className="flex flex-col items-center gap-0.5 text-[10px] py-2 px-1 rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
          >
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>تحويل</span>
              {stats.paidCount > 0 && (
                <span className="bg-primary/20 text-primary text-[9px] px-1 rounded-full">
                  {stats.paidCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold opacity-80">${stats.paidTotal.toLocaleString()}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="rejected" 
            className="flex flex-col items-center gap-0.5 text-[10px] py-2 px-1 rounded-lg data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
          >
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              <span>مرفوض</span>
              {stats.rejectedCount > 0 && (
                <span className="bg-destructive/20 text-destructive text-[9px] px-1 rounded-full">
                  {stats.rejectedCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold opacity-80">${stats.rejectedTotal.toLocaleString()}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="reserved" 
            className="flex flex-col items-center gap-0.5 text-[10px] py-2 px-1 rounded-lg data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
          >
            <div className="flex items-center gap-1">
              <Ban className="w-3 h-3" />
              <span>محجوز</span>
              {stats.reservedCount > 0 && (
                <span className="bg-orange-500/20 text-orange-400 text-[9px] px-1 rounded-full">
                  {stats.reservedCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold opacity-80">${stats.reservedTotal.toLocaleString()}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {filterRequests('pending').length > 0 ? (
            filterRequests('pending').map(request => (
              <RequestCard key={request.id} request={request} />
            ))
          ) : (
            <EmptyState message="لا توجد طلبات في الانتظار" />
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
