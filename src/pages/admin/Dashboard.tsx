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
  Download,
  Filter,
  Trash2,
  User,
  Power,
  PowerOff,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import RequestDetailsModal from '@/components/admin/RequestDetailsModal';
import { exportToExcel } from '@/lib/excel-export';
import { usePayoutSettings } from '@/hooks/use-payout-settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

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
  status: 'pending' | 'review' | 'paid' | 'rejected';
  created_at: string;
  ai_receipt_status: string | null;
  reference_number: string | null;
  processed_by: string | null;
  processed_at: string | null;
}

interface Stats {
  total: number;
  pending: number;
  paid: number;
  rejected: number;
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
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, paid: 0, rejected: 0, totalPending: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'super_admin'>('admin');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [adminUsers, setAdminUsers] = useState<Map<string, string>>(new Map());
  const [countries, setCountries] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    country: 'all',
    search: '',
    payoutMethod: 'all',
  });
  const { payoutEnabled, updateSettings } = usePayoutSettings();
  const [updatingPayoutStatus, setUpdatingPayoutStatus] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchData();
      fetchCountries();
    }
  }, [filters, currentUserId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
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

    // Fetch admin users for mapping processed_by
    const { data: users } = await supabase.auth.admin?.listUsers?.() || { data: null };
    if (!users) {
      // Fallback: fetch from user_roles
      const { data: roleUsers } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'staff', 'super_admin']);
      
      if (roleUsers) {
        const userMap = new Map<string, string>();
        roleUsers.forEach(u => {
          // Use a generic name since we can't access user metadata easily
          userMap.set(u.user_id, `مدير ${u.role === 'super_admin' ? '(مسؤول)' : ''}`);
        });
        setAdminUsers(userMap);
      }
    }
  };

  const fetchCountries = async () => {
    const { data } = await supabase
      .from('countries_methods')
      .select('country_name_arabic')
      .eq('is_active', true);
    
    if (data) {
      setCountries(data.map(c => c.country_name_arabic));
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
          rejected: allRequests.filter(r => r.status === 'rejected').length,
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
        .select('id, tracking_code, zalal_life_account_id, zalal_life_username, recipient_full_name, amount, currency, country, payout_method, phone_number, status, created_at, ai_receipt_status, reference_number, processed_by, processed_at')
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'pending' | 'review' | 'paid' | 'rejected');
      }
      if (filters.country && filters.country !== 'all') {
        query = query.eq('country', filters.country);
      }
      if (filters.search) {
        query = query.or(`tracking_code.ilike.%${filters.search}%,zalal_life_account_id.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`);
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

  const handleDeleteRequest = async (requestId: string) => {
    if (userRole !== 'super_admin') {
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
      const { error } = await supabase
        .from('payout_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف الطلب بنجاح',
      });

      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الطلب',
        variant: 'destructive',
      });
    }
  };

  const handleExportExcel = () => {
    if (userRole !== 'super_admin') {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه تحميل البيانات',
        variant: 'destructive',
      });
      return;
    }

    const exportData = requests.map(r => ({
      ...r,
      processed_by_name: r.processed_by ? (adminUsers.get(r.processed_by) || 'غير معروف') : '',
    }));

    const filterParts = [];
    if (filters.status !== 'all') filterParts.push(statusLabels[filters.status as keyof typeof statusLabels] || filters.status);
    if (filters.country !== 'all') filterParts.push(filters.country);
    
    const fileName = `طلبات_الصرف_${filterParts.length > 0 ? filterParts.join('_') + '_' : ''}${new Date().toLocaleDateString('ar-EG')}`;
    
    exportToExcel(exportData, fileName);

    toast({
      title: 'تم التحميل',
      description: 'تم تحميل الملف بنجاح',
    });
  };

  const getProcessedByName = (processedBy: string | null) => {
    if (!processedBy) return '-';
    return adminUsers.get(processedBy) || 'مدير';
  };

  const handleTogglePayoutStatus = async () => {
    if (userRole !== 'super_admin') {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه تغيير حالة رفع الراتب',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingPayoutStatus(true);
    const result = await updateSettings({ enabled: !payoutEnabled });
    setUpdatingPayoutStatus(false);

    if (result.success) {
      toast({
        title: payoutEnabled ? 'تم إيقاف رفع الراتب' : 'تم تفعيل رفع الراتب',
        description: payoutEnabled 
          ? 'لن يتمكن المستخدمون من رفع طلبات جديدة' 
          : 'يمكن للمستخدمين الآن رفع طلبات جديدة',
      });
    } else {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الإعدادات',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">لوحة التحكم</h1>
            {userRole === 'super_admin' && (
              <span className="px-2 py-1 bg-primary-foreground/20 rounded-full text-xs">
                مسؤول
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Payout Toggle - Super Admin Only */}
            {userRole === 'super_admin' && (
              <div className="flex items-center gap-3 px-4 py-2 bg-primary-foreground/10 rounded-lg">
                <span className="text-sm">رفع الراتب</span>
                <Switch
                  checked={payoutEnabled}
                  onCheckedChange={handleTogglePayoutStatus}
                  disabled={updatingPayoutStatus}
                />
                {payoutEnabled ? (
                  <Power className="w-4 h-4 text-success" />
                ) : (
                  <PowerOff className="w-4 h-4 text-destructive" />
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-lg hover:bg-primary-foreground/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">تم التحويل</p>
                <p className="text-2xl font-bold text-foreground">{stats.paid}</p>
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
                <TrendingUp className="w-5 h-5 text-success" />
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
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">تصفية النتائج</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="بحث بكود التتبع أو رقم الحساب أو الرقم المرجعي"
                  className="input-field pr-10"
                />
              </div>
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-auto min-w-[150px] bg-background">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="review">قيد المراجعة</SelectItem>
                <SelectItem value="paid">تم التحويل</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.country}
              onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}
            >
              <SelectTrigger className="w-auto min-w-[150px] bg-background">
                <SelectValue placeholder="كل البلدان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل البلدان</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {userRole === 'super_admin' && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تحميل Excel</span>
              </button>
            )}
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
                  <th className="text-right p-4 font-medium text-foreground">تمت المعالجة بواسطة</th>
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
                    <td className="p-4">
                      {request.processed_by ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{getProcessedByName(request.processed_by)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm" dir="ltr">
                      {new Date(request.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRequest(request.id)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {userRole === 'super_admin' && (
                          <button
                            onClick={() => handleDeleteRequest(request.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="حذف الطلب"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {requests.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      لا توجد طلبات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-center text-muted-foreground text-sm">
          عرض {requests.length} طلب
        </div>
      </main>

      {/* Request Details Modal */}
      {selectedRequest && (
        <RequestDetailsModal
          requestId={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={handleRequestUpdate}
          userRole={userRole}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
