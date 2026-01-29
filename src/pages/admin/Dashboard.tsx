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
  Home,
  TrendingUp,
  Users,
  ChevronLeft,
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
  const [activeTab, setActiveTab] = useState('home');
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
      const { data: pending } = await supabase
        .from('payout_requests')
        .select('*')
        .in('status', ['pending', 'review'])
        .is('claimed_by', null)
        .order('created_at', { ascending: false });

      setPendingRequests((pending as PayoutRequest[]) || []);

      const { data: mine } = await supabase
        .from('payout_requests')
        .select('*')
        .or(`processed_by.eq.${currentUserId},claimed_by.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      setMyRequests((mine as PayoutRequest[]) || []);

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
        .is('claimed_by', null);

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

  // Mobile Request Card Component
  const RequestCard = ({ request, showClaimButton = false }: { request: PayoutRequest; showClaimButton?: boolean }) => (
    <div className="glass-card-hover p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          request.status === 'paid' ? 'bg-success/20 text-success' :
          request.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
          request.status === 'review' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'
        }`}>
          {statusLabels[request.status]}
        </span>
        <span className="text-xs text-muted-foreground" dir="ltr">
          {new Date(request.created_at).toLocaleDateString('ar-EG')}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">المستلم</span>
          <span className="font-medium">{request.recipient_full_name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">المبلغ</span>
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {request.amount} {request.currency}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">البلد</span>
          <span>{request.country}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">كود التتبع</span>
          <span className="font-mono text-xs" dir="ltr">{request.tracking_code}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        {showClaimButton ? (
          <button
            onClick={() => handleClaimRequest(request.id)}
            className="flex-1 py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            استلام الطلب
          </button>
        ) : (
          <button
            onClick={() => setSelectedRequest(request.id)}
            className="flex-1 py-2.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            عرض التفاصيل
          </button>
        )}
        {isSuperAdmin && !showClaimButton && (
          <button
            onClick={() => handleDeleteRequest(request.id)}
            className="p-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  // Stats Card Component
  const StatCard = ({ icon: Icon, label, value, subValue, gradient = false }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number; 
    subValue?: string;
    gradient?: boolean;
  }) => (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${gradient ? 'bg-gradient-to-br from-primary/20 to-accent/20' : 'bg-muted'}`}>
          <Icon className={`w-5 h-5 ${gradient ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="pr-11">
        <p className={`text-2xl font-bold ${gradient ? 'bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent' : ''}`}>
          {value}
        </p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  );

  // Render Home Tab
  const renderHomeTab = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-card p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">مرحباً، {currentUserName || 'مدير'}</h2>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin ? 'المسؤول الأعلى' : 'مدير'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 bg-muted rounded-xl hover:bg-muted/70 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          icon={Clock} 
          label="طلبات جديدة" 
          value={pendingRequests.length}
          gradient
        />
        <StatCard 
          icon={ListChecks} 
          label="طلباتي" 
          value={myRequests.length}
        />
        <StatCard 
          icon={TrendingUp} 
          label="تم قبولها" 
          value={myStats.paidRequests}
          subValue={`${myStats.totalPaidAmount.toLocaleString()} $`}
        />
        <StatCard 
          icon={BarChart3} 
          label="مرفوضة" 
          value={myStats.rejectedRequests}
        />
      </div>

      {/* Payout Toggle for Super Admin */}
      {isSuperAdmin && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {payoutEnabled ? (
                <Power className="w-5 h-5 text-success" />
              ) : (
                <PowerOff className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">حالة رفع الراتب</p>
                <p className="text-xs text-muted-foreground">
                  {payoutEnabled ? 'مفعّل - يمكن للمستخدمين رفع الطلبات' : 'معطّل - لا يمكن رفع طلبات جديدة'}
                </p>
              </div>
            </div>
            <Switch
              checked={payoutEnabled}
              onCheckedChange={handleTogglePayoutStatus}
              disabled={updatingPayoutStatus}
            />
          </div>
        </div>
      )}

      {/* Recent New Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">طلبات جديدة</h3>
          <button 
            onClick={() => setActiveTab('pending')}
            className="text-sm text-primary flex items-center gap-1"
          >
            عرض الكل
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        {pendingRequests.slice(0, 3).map(request => (
          <RequestCard key={request.id} request={request} showClaimButton />
        ))}
        {pendingRequests.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground">
            لا توجد طلبات جديدة
          </div>
        )}
      </div>
    </div>
  );

  // Render Pending Requests Tab
  const renderPendingTab = () => (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h2 className="font-bold text-lg mb-1">طلبات جديدة</h2>
        <p className="text-sm text-muted-foreground">
          اضغط "استلام" لحجز الطلب لك
        </p>
      </div>
      {pendingRequests.map(request => (
        <RequestCard key={request.id} request={request} showClaimButton />
      ))}
      {pendingRequests.length === 0 && (
        <div className="glass-card p-8 text-center text-muted-foreground">
          لا توجد طلبات جديدة
        </div>
      )}
    </div>
  );

  // Render My Requests Tab
  const renderMyRequestsTab = () => (
    <div className="space-y-4">
      <AdminStats stats={myStats} adminName="إحصائياتي" />
      <h3 className="font-bold text-lg">طلباتي</h3>
      {myRequests.map(request => (
        <RequestCard key={request.id} request={request} />
      ))}
      {myRequests.length === 0 && (
        <div className="glass-card p-8 text-center text-muted-foreground">
          لم تستلم أي طلبات بعد
        </div>
      )}
    </div>
  );

  // Render Analytics Tab (Super Admin)
  const renderAnalyticsTab = () => (
    <div className="space-y-4">
      <SuperAdminStats />
      
      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium">تصفية النتائج</span>
        </div>
        
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="بحث..."
            className="w-full input-field pr-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="الحالة" />
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
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="البلد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل البلدان</SelectItem>
              {countries.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select
          value={filters.adminFilter}
          onValueChange={(value) => setFilters(prev => ({ ...prev, adminFilter: value }))}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="المدير" />
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-medium"
        >
          <Download className="w-5 h-5" />
          تحميل Excel
        </button>
      </div>

      {/* Requests List */}
      <div className="text-sm text-muted-foreground text-center">
        عرض {allRequests.length} طلب
      </div>
      {allRequests.map(request => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  );

  // Render Settings Tab (Super Admin)
  const renderSettingsTab = () => (
    <div className="space-y-4">
      <AdminManagement onUpdate={fetchData} />
    </div>
  );

  // Navigation Items
  const navItems = [
    { id: 'home', icon: Home, label: 'الرئيسية' },
    { id: 'pending', icon: Clock, label: 'جديدة', badge: pendingRequests.length },
    { id: 'my-requests', icon: ListChecks, label: 'طلباتي' },
    ...(isSuperAdmin ? [
      { id: 'analytics', icon: TrendingUp, label: 'التحليلات' },
      { id: 'settings', icon: Users, label: 'المديرين' },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-3">
        <div className="glass-card px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              لوحة التحكم
            </h1>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <span className="px-2 py-1 bg-gradient-to-r from-primary/20 to-accent/20 text-primary rounded-full text-xs font-medium">
                  مسؤول
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-2">
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'pending' && renderPendingTab()}
        {activeTab === 'my-requests' && renderMyRequestsTab()}
        {activeTab === 'analytics' && isSuperAdmin && renderAnalyticsTab()}
        {activeTab === 'settings' && isSuperAdmin && renderSettingsTab()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4">
        <div className="glass-card py-2 px-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

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
