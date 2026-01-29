import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Clock, 
  Eye,
  Search,
  Download,
  Filter,
  Trash2,
  User,
  Power,
  PowerOff,
  BarChart3,
  Settings,
  ListChecks,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import RequestDetailsModal from '@/components/admin/RequestDetailsModal';
import AdminStats from '@/components/admin/AdminStats';
import SuperAdminStats from '@/components/admin/SuperAdminStats';
import AdminManagement from '@/components/admin/AdminManagement';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  claimed_by: string | null;
  claimed_at: string | null;
}

interface MyStats {
  totalRequests: number;
  paidRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

const statusLabels = {
  pending: 'قيد الانتظار',
  review: 'قيد المراجعة',
  paid: 'تم التحويل',
  rejected: 'مرفوض',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<PayoutRequest[]>([]);
  const [myRequests, setMyRequests] = useState<PayoutRequest[]>([]);
  const [allRequests, setAllRequests] = useState<PayoutRequest[]>([]);
  const [myStats, setMyStats] = useState<MyStats>({
    totalRequests: 0,
    paidRequests: 0,
    rejectedRequests: 0,
    pendingRequests: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'super_admin'>('admin');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [adminProfiles, setAdminProfiles] = useState<Map<string, string>>(new Map());
  const [countries, setCountries] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [filters, setFilters] = useState({
    status: 'all',
    country: 'all',
    search: '',
    adminFilter: 'all',
  });
  const { payoutEnabled, updateSettings } = usePayoutSettings();
  const [updatingPayoutStatus, setUpdatingPayoutStatus] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchData();
      fetchCountries();
      fetchAdminProfiles();
    }
  }, [filters, currentUserId, activeTab]);

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

    // Get current user's display name
    const { data: profileData } = await supabase
      .from('admin_profiles')
      .select('display_name')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profileData) {
      setCurrentUserName(profileData.display_name);
    }
  };

  const fetchAdminProfiles = async () => {
    const { data } = await supabase
      .from('admin_profiles')
      .select('user_id, display_name');
    
    if (data) {
      setAdminProfiles(new Map(data.map(p => [p.user_id, p.display_name])));
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
      // Fetch pending requests (not claimed by anyone)
      const { data: pending } = await supabase
        .from('payout_requests')
        .select('*')
        .in('status', ['pending', 'review'])
        .is('claimed_by', null)
        .order('created_at', { ascending: false });

      setPendingRequests((pending as PayoutRequest[]) || []);

      // Fetch my requests (processed or claimed by me)
      const { data: mine } = await supabase
        .from('payout_requests')
        .select('*')
        .or(`processed_by.eq.${currentUserId},claimed_by.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      setMyRequests((mine as PayoutRequest[]) || []);

      // Calculate my stats
      if (mine) {
        const myProcessed = mine.filter(r => r.processed_by === currentUserId);
        setMyStats({
          totalRequests: myProcessed.length,
          paidRequests: myProcessed.filter(r => r.status === 'paid').length,
          rejectedRequests: myProcessed.filter(r => r.status === 'rejected').length,
          pendingRequests: myProcessed.filter(r => r.status === 'pending' || r.status === 'review').length,
          totalPaidAmount: myProcessed
            .filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + Number(r.amount), 0),
          totalPendingAmount: myProcessed
            .filter(r => r.status === 'pending' || r.status === 'review')
            .reduce((sum, r) => sum + Number(r.amount), 0),
        });
      }

      // Super admin: fetch all requests with filters
      if (isSuperAdmin) {
        let query = supabase
          .from('payout_requests')
          .select('*')
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
        if (filters.adminFilter && filters.adminFilter !== 'all') {
          query = query.eq('processed_by', filters.adminFilter);
        }

        const { data } = await query;
        setAllRequests((data as PayoutRequest[]) || []);
      }

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

  const handleClaimRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          claimed_by: currentUserId,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .is('claimed_by', null); // Only claim if not already claimed

      if (error) throw error;

      toast({
        title: 'تم',
        description: 'تم حجز الطلب لك',
      });

      fetchData();
      setSelectedRequest(requestId);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حجز الطلب - قد يكون محجوزاً من قبل مدير آخر',
        variant: 'destructive',
      });
      fetchData();
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
    if (!isSuperAdmin) {
      toast({
        title: 'غير مصرح',
        description: 'فقط المسؤول يمكنه تحميل البيانات',
        variant: 'destructive',
      });
      return;
    }

    const exportData = allRequests.map(r => ({
      ...r,
      processed_by_name: r.processed_by ? (adminProfiles.get(r.processed_by) || 'غير معروف') : '',
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

  const handleTogglePayoutStatus = async () => {
    if (!isSuperAdmin) {
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

  const getProcessedByName = (processedBy: string | null) => {
    if (!processedBy) return '-';
    return adminProfiles.get(processedBy) || 'مدير';
  };

  const renderRequestsTable = (requests: PayoutRequest[], showClaimButton = false, showAdminColumn = true) => (
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
              {showAdminColumn && (
                <th className="text-right p-4 font-medium text-foreground">تمت المعالجة بواسطة</th>
              )}
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
                {showAdminColumn && (
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
                )}
                <td className="p-4 text-muted-foreground text-sm" dir="ltr">
                  {new Date(request.created_at).toLocaleDateString('ar-EG')}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {showClaimButton ? (
                      <button
                        onClick={() => handleClaimRequest(request.id)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        استلام
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedRequest(request.id)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    )}
                    {isSuperAdmin && (
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
                <td colSpan={showAdminColumn ? 8 : 7} className="p-8 text-center text-muted-foreground">
                  لا توجد طلبات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">لوحة التحكم</h1>
            {currentUserName && (
              <span className="px-2 py-1 bg-primary-foreground/20 rounded-full text-xs">
                {currentUserName}
              </span>
            )}
            {isSuperAdmin && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-200 rounded-full text-xs">
                مسؤول أعلى
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Payout Toggle - Super Admin Only */}
            {isSuperAdmin && (
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>طلبات جديدة ({pendingRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="my-requests" className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              <span>طلباتي ({myRequests.length})</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="all-requests" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>كل الطلبات</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>الإعدادات</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Pending Requests Tab */}
          <TabsContent value="pending" className="space-y-6">
            <div className="glass-card p-4">
              <h2 className="font-bold text-lg mb-2">الطلبات الجديدة</h2>
              <p className="text-sm text-muted-foreground">
                هذه الطلبات متاحة لجميع المديرين. اضغط "استلام" لحجز الطلب لك.
              </p>
            </div>
            {renderRequestsTable(pendingRequests, true, false)}
          </TabsContent>

          {/* My Requests Tab */}
          <TabsContent value="my-requests" className="space-y-6">
            {/* My Stats */}
            <AdminStats stats={myStats} adminName="إحصائياتي" />
            
            <h3 className="font-bold text-lg">طلباتي</h3>
            {renderRequestsTable(myRequests, false, false)}
          </TabsContent>

          {/* All Requests Tab (Super Admin Only) */}
          {isSuperAdmin && (
            <TabsContent value="all-requests" className="space-y-6">
              {/* Super Admin Stats */}
              <SuperAdminStats />

              {/* Filters */}
              <div className="glass-card p-4">
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

                  <Select
                    value={filters.adminFilter}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, adminFilter: value }))}
                  >
                    <SelectTrigger className="w-auto min-w-[150px] bg-background">
                      <SelectValue placeholder="كل المديرين" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المديرين</SelectItem>
                      {Array.from(adminProfiles.entries()).map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل Excel</span>
                  </button>
                </div>
              </div>

              {renderRequestsTable(allRequests, false, true)}
              
              <div className="text-center text-muted-foreground text-sm">
                عرض {allRequests.length} طلب
              </div>
            </TabsContent>
          )}

          {/* Settings Tab (Super Admin Only) */}
          {isSuperAdmin && (
            <TabsContent value="settings" className="space-y-6">
              <AdminManagement onUpdate={fetchData} />
            </TabsContent>
          )}
        </Tabs>
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
