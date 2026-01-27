import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Clock, 
  CheckCircle2, 
  Eye,
  Search,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import RequestDetailsModal from '@/components/admin/RequestDetailsModal';

interface PayoutRequest {
  id: string;
  tracking_code: string;
  zalal_life_account_id: string;
  recipient_full_name: string;
  amount: number;
  currency: string;
  country: string;
  payout_method: string;
  status: 'pending' | 'review' | 'paid' | 'rejected';
  created_at: string;
  ai_receipt_status: string | null;
}

interface Stats {
  total: number;
  pending: number;
  paid: number;
  totalPending: number;
  totalPaid: number;
}

const statusLabels = {
  pending: 'قيد الانتظار',
  review: 'قيد المراجعة',
  paid: 'تم التحويل',
  rejected: 'مرفوض',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, paid: 0, totalPending: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    country: '',
    search: '',
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [filters]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['admin', 'staff'])
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate('/admin/login');
    }
  };

  const fetchData = async () => {
    try {
      // Fetch stats
      const { data: allRequests } = await supabase
        .from('payout_requests')
        .select('status, amount');

      if (allRequests) {
        const stats: Stats = {
          total: allRequests.length,
          pending: allRequests.filter(r => r.status === 'pending' || r.status === 'review').length,
          paid: allRequests.filter(r => r.status === 'paid').length,
          totalPending: allRequests
            .filter(r => r.status === 'pending' || r.status === 'review')
            .reduce((sum, r) => sum + Number(r.amount), 0),
          totalPaid: allRequests
            .filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + Number(r.amount), 0),
        };
        setStats(stats);
      }

      // Fetch filtered requests
      let query = supabase
        .from('payout_requests')
        .select('id, tracking_code, zalal_life_account_id, recipient_full_name, amount, currency, country, payout_method, status, created_at, ai_receipt_status')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status as 'pending' | 'review' | 'paid' | 'rejected');
      }
      if (filters.country) {
        query = query.eq('country', filters.country);
      }
      if (filters.search) {
        query = query.or(`tracking_code.ilike.%${filters.search}%,zalal_life_account_id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data as PayoutRequest[] || []);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleRequestUpdate = () => {
    fetchData();
    setSelectedRequest(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-lg hover:bg-primary-foreground/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">قيد الانتظار</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">مبلغ الانتظار</p>
                <p className="text-xl font-bold text-foreground">${stats.totalPending.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">تم صرفه</p>
                <p className="text-xl font-bold text-foreground">${stats.totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="بحث بكود التتبع أو رقم الحساب"
                  className="input-field pr-10"
                />
              </div>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="input-field w-auto min-w-[150px]"
            >
              <option value="">كل الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="review">قيد المراجعة</option>
              <option value="paid">تم التحويل</option>
              <option value="rejected">مرفوض</option>
            </select>

            <select
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              className="input-field w-auto min-w-[150px]"
            >
              <option value="">كل البلدان</option>
              <option value="اليمن">اليمن</option>
              <option value="مصر">مصر</option>
              <option value="السعودية">السعودية</option>
              <option value="الإمارات">الإمارات</option>
              <option value="الأردن">الأردن</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right p-4 font-medium text-foreground">كود التتبع</th>
                  <th className="text-right p-4 font-medium text-foreground">المستلم</th>
                  <th className="text-right p-4 font-medium text-foreground">المبلغ</th>
                  <th className="text-right p-4 font-medium text-foreground">البلد</th>
                  <th className="text-right p-4 font-medium text-foreground">الحالة</th>
                  <th className="text-right p-4 font-medium text-foreground">التاريخ</th>
                  <th className="text-right p-4 font-medium text-foreground">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-mono text-sm" dir="ltr">{request.tracking_code}</td>
                    <td className="p-4">{request.recipient_full_name}</td>
                    <td className="p-4 font-medium">{request.amount} {request.currency}</td>
                    <td className="p-4">{request.country}</td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'paid' ? 'status-paid' :
                        request.status === 'rejected' ? 'status-rejected' :
                        request.status === 'review' ? 'status-review' : 'status-pending'
                      }`}>
                        {statusLabels[request.status]}
                      </span>
                      {request.ai_receipt_status === 'fail' && (
                        <span className="mr-2 text-xs text-destructive">⚠️ AI</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm" dir="ltr">
                      {new Date(request.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedRequest(request.id)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {requests.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      لا توجد طلبات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Request Details Modal */}
      {selectedRequest && (
        <RequestDetailsModal
          requestId={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={handleRequestUpdate}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
