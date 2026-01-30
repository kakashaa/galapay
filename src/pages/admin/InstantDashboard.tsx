import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Zap,
  Loader2,
  Search,
  Filter,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Home,
  Download,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import InstantRequestDetailsModal from '@/components/admin/InstantRequestDetailsModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InstantPayoutRequest {
  id: string;
  tracking_code: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  supporter_name: string;
  supporter_account_id: string;
  supporter_amount_usd: number;
  supporter_payment_method: string | null;
  host_name: string;
  host_account_id: string;
  host_coins_amount: number;
  host_country: string;
  host_payout_amount: number;
  host_currency: string;
  created_at: string;
  processed_by: string | null;
}

interface Stats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  rejected: number;
  totalCompletedAmount: number;
  totalPendingAmount: number;
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

const InstantDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<InstantPayoutRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'super_admin'>('admin');
  const [currentUserId, setCurrentUserId] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    rejected: 0,
    totalCompletedAmount: 0,
    totalPendingAmount: 0,
  });

  const isSuperAdmin = userRole === 'super_admin';

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchRequests();
    }
  }, [statusFilter, currentUserId]);

  const checkAuthAndFetch = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    setCurrentUserId(session.user.id);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['admin', 'staff', 'super_admin'])
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate('/admin/login');
      return;
    }

    setUserRole(roleData.role as 'admin' | 'staff' | 'super_admin');
  };

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from('instant_payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'processing' | 'completed' | 'rejected');
      }

      const { data, error } = await query;

      if (error) throw error;

      const requestsData = (data as InstantPayoutRequest[]) || [];
      setRequests(requestsData);

      // Calculate stats
      const allData = statusFilter === 'all' ? requestsData : await fetchAllForStats();
      calculateStats(allData);
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

  const fetchAllForStats = async () => {
    const { data } = await supabase
      .from('instant_payout_requests')
      .select('status, supporter_amount_usd');
    return data || [];
  };

  const calculateStats = (data: { status: string; supporter_amount_usd: number }[]) => {
    setStats({
      total: data.length,
      pending: data.filter((r) => r.status === 'pending').length,
      processing: data.filter((r) => r.status === 'processing').length,
      completed: data.filter((r) => r.status === 'completed').length,
      rejected: data.filter((r) => r.status === 'rejected').length,
      totalCompletedAmount: data
        .filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.supporter_amount_usd), 0),
      totalPendingAmount: data
        .filter((r) => r.status === 'pending' || r.status === 'processing')
        .reduce((sum, r) => sum + Number(r.supporter_amount_usd), 0),
    });
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!isSuperAdmin) {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه حذف الطلبات',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      const { error } = await supabase.from('instant_payout_requests').delete().eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف الطلب بنجاح',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الطلب',
        variant: 'destructive',
      });
    }
  };

  const handleExportCSV = () => {
    if (!isSuperAdmin) {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه تحميل البيانات',
        variant: 'destructive',
      });
      return;
    }

    const csvContent = [
      [
        'كود التتبع',
        'الحالة',
        'اسم الداعم',
        'ايدي الداعم',
        'المبلغ $',
        'طريقة الدفع',
        'اسم المضيف',
        'ايدي المضيف',
        'الكوينزات',
        'الدولة',
        'التاريخ',
      ].join(','),
      ...requests.map((r) =>
        [
          r.tracking_code,
          statusLabels[r.status],
          r.supporter_name,
          r.supporter_account_id,
          r.supporter_amount_usd,
          r.supporter_payment_method || '',
          r.host_name,
          r.host_account_id,
          r.host_coins_amount,
          r.host_country,
          new Date(r.created_at).toLocaleDateString('ar-EG'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `طلبات_السحب_الفوري_${new Date().toLocaleDateString('ar-EG')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'تم التحميل',
      description: 'تم تحميل الملف بنجاح',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/20 text-warning';
      case 'processing':
        return 'bg-primary/20 text-primary';
      case 'completed':
        return 'bg-success/20 text-success';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning';
      case 'processing':
        return 'bg-primary';
      case 'completed':
        return 'bg-success';
      case 'rejected':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  const filteredRequests = requests.filter(
    (req) =>
      req.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.host_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.supporter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.host_account_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.supporter_account_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'processing');

  // Request Card Component
  const RequestCard = ({ request }: { request: InstantPayoutRequest }) => (
    <div className="dark-card p-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusDot(request.status)}`} />
          <span className="text-sm font-medium">{request.host_name}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-lg ${getStatusColor(request.status)}`}>
          {statusLabels[request.status]}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">الداعم</p>
          <p className="font-medium truncate">{request.supporter_name}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">المبلغ</p>
          <p className="font-bold text-success">${request.supporter_amount_usd}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">الكوينزات</p>
          <p className="font-medium text-warning">{request.host_coins_amount?.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">الدولة</p>
          <p className="font-medium">{request.host_country}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
          {request.tracking_code}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(request.created_at).toLocaleDateString('ar-SA')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setSelectedRequest(request.id)}
          className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          <Eye className="w-4 h-4" />
          التفاصيل
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => handleDeleteRequest(request.id)}
            className="p-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  // Home Tab
  const renderHomeTab = () => (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="dark-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted-foreground">قيد الانتظار</span>
          </div>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">قيد المعالجة</span>
          </div>
          <p className="text-2xl font-bold">{stats.processing}</p>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">مكتمل</span>
          </div>
          <p className="text-2xl font-bold text-success">{stats.completed}</p>
          <p className="text-xs text-muted-foreground mt-1">${stats.totalCompletedAmount.toLocaleString()}</p>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">مرفوض</span>
          </div>
          <p className="text-2xl font-bold">{stats.rejected}</p>
        </div>
      </div>

      {/* Pending Amount */}
      <div className="dark-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">المبلغ المعلق</p>
            <p className="text-2xl font-bold text-warning">${stats.totalPendingAmount.toLocaleString()}</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Recent Pending Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">طلبات جديدة</h3>
          {pendingRequests.length > 0 && (
            <button onClick={() => setActiveTab('requests')} className="text-xs text-warning">
              عرض الكل ({pendingRequests.length})
            </button>
          )}
        </div>
        {pendingRequests.slice(0, 3).map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
        {pendingRequests.length === 0 && (
          <div className="dark-card p-8 text-center text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>لا توجد طلبات جديدة</p>
          </div>
        )}
      </div>
    </div>
  );

  // Requests Tab
  const renderRequestsTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="dark-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">تصفية</span>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالكود أو الاسم أو الايدي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-background text-sm">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="processing">قيد المعالجة</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>

        {isSuperAdmin && (
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-center gap-2 py-3 bg-warning text-warning-foreground rounded-xl font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            تحميل CSV
          </button>
        )}
      </div>

      {/* Results Count */}
      <p className="text-xs text-muted-foreground text-center">{filteredRequests.length} طلب</p>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="dark-card p-12 text-center text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد طلبات</p>
        </div>
      ) : (
        filteredRequests.map((request) => <RequestCard key={request.id} request={request} />)
      )}
    </div>
  );

  // Navigation Items
  const navItems = [
    { id: 'home', icon: Home, label: 'الرئيسية' },
    { id: 'requests', icon: Zap, label: 'الطلبات', badge: pendingRequests.length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-warning/10 backdrop-blur-xl border-b border-warning/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-warning/20 hover:bg-warning/30 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-warning" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-warning" />
              </div>
              <div>
                <h1 className="text-lg font-bold">السحب الفوري</h1>
                <p className="text-xs text-muted-foreground">{stats.total} طلب</p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            className="p-2 rounded-xl bg-warning/20 hover:bg-warning/30 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-warning" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4">
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'requests' && renderRequestsTab()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-300 ease-out transform ${
                activeTab === item.id
                  ? 'bg-warning text-warning-foreground scale-105 shadow-lg shadow-warning/30'
                  : 'text-muted-foreground hover:text-foreground hover:scale-105'
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : ''}`}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && activeTab !== item.id && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-warning-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Request Details Modal */}
      {selectedRequest && (
        <InstantRequestDetailsModal
          requestId={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={() => {
            fetchRequests();
            setSelectedRequest(null);
          }}
          isSuperAdmin={isSuperAdmin}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default InstantDashboard;
