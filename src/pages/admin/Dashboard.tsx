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
  Power,
  PowerOff,
  Loader2,
  BarChart3,
  Home,
  Wallet,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import FloatingDock from '@/components/admin/FloatingDock';
import TrashBin from '@/components/admin/TrashBin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import RequestDetailsModal from '@/components/admin/RequestDetailsModal';
import AdminStats from '@/components/admin/AdminStats';
import SuperAdminStats from '@/components/admin/SuperAdminStats';
import AdminManagement from '@/components/admin/AdminManagement';
import AnalyticsCharts from '@/components/admin/AnalyticsCharts';
import VideoManagement from '@/components/admin/VideoManagement';
import BlockedAgencyCodesManagement from '@/components/admin/BlockedAgencyCodesManagement';
import DuplicateDetection from '@/components/admin/DuplicateDetection';
import SupportersManagement from '@/components/admin/SupportersManagement';
import OrganizedPayoutRequests from '@/components/admin/OrganizedPayoutRequests';
import ExportPrintDialog from '@/components/admin/ExportPrintDialog';
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
  status: 'pending' | 'review' | 'paid' | 'rejected' | 'reserved';
  created_at: string;
  ai_receipt_status: string | null;
  reference_number: string | null;
  processed_by: string | null;
  processed_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  reservation_reason: string | null;
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
  reserved: 'محجوز',
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
    minAmount: '',
    maxAmount: '',
  });
  const { payoutEnabled, updateSettings } = usePayoutSettings();
  const [updatingPayoutStatus, setUpdatingPayoutStatus] = useState(false);
  const [resendingTelegram, setResendingTelegram] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

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
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      setPendingRequests((pending as PayoutRequest[]) || []);

      const { data: mine } = await supabase
        .from('payout_requests')
        .select('*')
        .or(`processed_by.eq.${currentUserId},claimed_by.eq.${currentUserId}`)
        .is('deleted_at', null)
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
          .is('deleted_at', null)
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
        if (filters.minAmount && !isNaN(Number(filters.minAmount))) {
          query = query.gte('amount', Number(filters.minAmount));
        }
        if (filters.maxAmount && !isNaN(Number(filters.maxAmount))) {
          query = query.lte('amount', Number(filters.maxAmount));
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

  // Claiming removed - only super_admin can process requests now

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

    if (!confirm('هل أنت متأكد من نقل هذا الطلب إلى سلة المحذوفات؟')) {
      return;
    }

    try {
      // Soft delete - move to trash
      const { error } = await supabase
        .from('payout_requests')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: currentUserId 
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'تم النقل للمحذوفات',
        description: 'تم نقل الطلب إلى سلة المحذوفات',
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

  const handleResendTelegramForPending = async () => {
    if (!isSuperAdmin) return;
    setResendingTelegram(true);
    try {
      const { data, error } = await supabase.functions.invoke('resend-telegram-notifications', {
        body: { limit: 23, statuses: ['pending', 'review'] },
      });

      if (error) throw error;

      toast({
        title: 'تم الإرسال',
        description: `تم إرسال ${data?.sent ?? 0} إشعار (صورة: ${data?.photoSent ?? 0}).`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'خطأ',
        description: 'فشل في إعادة إرسال إشعارات التليجرام',
        variant: 'destructive',
      });
    } finally {
      setResendingTelegram(false);
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-primary';
      case 'rejected': return 'text-destructive';
      case 'review': return 'text-warning';
      case 'reserved': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-primary/10 border-primary/30';
      case 'rejected': return 'bg-destructive/10 border-destructive/30';
      case 'review': return 'bg-warning/10 border-warning/30';
      case 'reserved': return 'bg-orange-500/10 border-orange-500/30';
      default: return 'bg-muted border-border';
    }
  };

  // Premium Crypto-Style Request Card
  const RequestCard = ({ request }: { request: PayoutRequest }) => {
    return (
      <div className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(145deg, hsl(150 35% 10%), hsl(150 35% 6%))',
          border: '1px solid hsla(142, 70%, 45%, 0.15)',
          boxShadow: '0 4px 20px -5px hsla(150, 50%, 3%, 0.6), inset 0 1px 0 hsla(142, 70%, 50%, 0.08)',
        }}
      >
        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, hsla(142, 76%, 50%, 0.08), transparent 70%)' }} 
        />
        
        <div className="relative p-4 space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                request.status === 'paid' ? 'bg-primary shadow-primary/50' :
                request.status === 'rejected' ? 'bg-destructive shadow-destructive/50' :
                request.status === 'review' ? 'bg-warning shadow-warning/50' :
                request.status === 'reserved' ? 'bg-orange-500 shadow-orange-500/50' : 'bg-muted-foreground'
              }`} />
              <span className="text-sm font-medium text-foreground">{request.recipient_full_name}</span>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-lg font-medium ${
              request.status === 'paid' ? 'bg-primary/15 text-primary border border-primary/30' :
              request.status === 'rejected' ? 'bg-destructive/15 text-destructive border border-destructive/30' :
              request.status === 'review' ? 'bg-warning/15 text-warning border border-warning/30' :
              request.status === 'reserved' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' : 
              'bg-muted text-muted-foreground border border-border'
            }`}>
              {statusLabels[request.status]}
            </span>
          </div>

          {/* Amount - Large Crypto Display */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">{request.country} · {request.payout_method}</p>
              <p className="text-2xl font-bold text-primary drop-shadow-[0_0_10px_hsla(142,76%,50%,0.3)]">
                ${request.amount.toLocaleString()}
              </p>
            </div>
            <div className="text-left space-y-0.5">
              <p className="text-[10px] text-primary/70 font-mono" dir="ltr">{request.tracking_code}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(request.created_at).toLocaleDateString('ar-EG')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setSelectedRequest(request.id)}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 
                bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30
                hover:from-primary/30 hover:to-primary/20 hover:border-primary/50 hover:shadow-[0_0_20px_hsla(142,76%,50%,0.2)]"
            >
              <Eye className="w-4 h-4" />
              التفاصيل
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => handleDeleteRequest(request.id)}
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

  // Home Tab - Premium Dashboard Overview
  const renderHomeTab = () => (
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{currentUserName || 'مدير'}</h2>
          <p className="text-sm text-primary/80">
            {isSuperAdmin ? 'مسؤول النظام' : 'مدير'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="p-3 rounded-xl transition-all border border-border/50 hover:border-primary/30 hover:bg-primary/5"
          style={{ background: 'linear-gradient(145deg, hsl(150 35% 10%), hsl(150 35% 7%))' }}
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Premium Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Clock, label: 'طلبات جديدة', value: pendingRequests.length, color: 'warning' },
          { icon: Wallet, label: 'طلباتي', value: myRequests.length, color: 'primary' },
          { icon: CheckCircle, label: 'تم قبولها', value: myStats.paidRequests, subValue: `$${myStats.totalPaidAmount.toLocaleString()}`, color: 'primary' },
          { icon: XCircle, label: 'مرفوضة', value: myStats.rejectedRequests, color: 'destructive' },
        ].map((stat, i) => (
          <div 
            key={i}
            className="relative overflow-hidden rounded-2xl p-4 transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(145deg, hsl(150 35% 10%), hsl(150 35% 6%))',
              border: '1px solid hsla(142, 70%, 45%, 0.15)',
              boxShadow: '0 4px 20px -5px hsla(150, 50%, 3%, 0.6), inset 0 1px 0 hsla(142, 70%, 50%, 0.08)',
            }}
          >
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-20 h-20 opacity-30 pointer-events-none"
              style={{ background: `radial-gradient(circle at 100% 0%, hsl(var(--${stat.color}) / 0.15), transparent 70%)` }} 
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 text-${stat.color}`} />
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color === 'primary' ? 'text-primary' : stat.color === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
                {stat.value}
              </p>
              {stat.subValue && (
                <p className="text-[11px] text-muted-foreground mt-1">{stat.subValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payout Toggle for Super Admin */}
      {isSuperAdmin && (
        <div 
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, hsl(150 35% 10%), hsl(150 35% 6%))',
            border: `1px solid ${payoutEnabled ? 'hsla(142, 70%, 45%, 0.25)' : 'hsla(0, 80%, 55%, 0.25)'}`,
            boxShadow: payoutEnabled 
              ? '0 4px 20px -5px hsla(142, 76%, 50%, 0.15), inset 0 1px 0 hsla(142, 70%, 50%, 0.1)' 
              : '0 4px 20px -5px hsla(0, 80%, 55%, 0.15)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {payoutEnabled ? (
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Power className="w-5 h-5 text-primary" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                  <PowerOff className="w-5 h-5 text-destructive" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm text-foreground">رفع الراتب</p>
                <p className={`text-xs ${payoutEnabled ? 'text-primary' : 'text-destructive'}`}>
                  {payoutEnabled ? 'مفعّل' : 'معطّل'}
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

      {/* Recent Requests Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">طلبات جديدة</h3>
          {pendingRequests.length > 0 && (
            <button 
              onClick={() => setActiveTab('pending')}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              عرض الكل ({pendingRequests.length})
            </button>
          )}
        </div>
        {pendingRequests.slice(0, 3).map(request => (
          <RequestCard key={request.id} request={request} />
        ))}
        {pendingRequests.length === 0 && (
          <div 
            className="rounded-2xl p-10 text-center"
            style={{
              background: 'linear-gradient(145deg, hsl(150 35% 9%), hsl(150 35% 5%))',
              border: '1px solid hsla(142, 70%, 45%, 0.1)',
            }}
          >
            <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">لا توجد طلبات جديدة</p>
          </div>
        )}
      </div>
    </div>
  );

  // Pending Requests Tab
  const renderPendingTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">طلبات جديدة</h2>
        <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-lg">
          {pendingRequests.length}
        </span>
      </div>
      {pendingRequests.map(request => (
        <RequestCard key={request.id} request={request} />
      ))}
      {pendingRequests.length === 0 && (
        <div className="dark-card p-12 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد طلبات جديدة</p>
        </div>
      )}
    </div>
  );

  // My Requests Tab
  const renderMyRequestsTab = () => {
    const inProgressRequests = myRequests.filter(r => r.status === 'pending' || r.status === 'review');
    const completedRequests = myRequests.filter(r => r.status === 'paid' || r.status === 'rejected');
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">طلباتي</h2>
        <AdminStats stats={myStats} adminName="إحصائياتي" />
        
        {/* In Progress Section */}
        {inProgressRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-warning flex items-center gap-2">
              <Clock className="w-4 h-4" />
              قيد المعالجة ({inProgressRequests.length})
            </h3>
            {inProgressRequests.map(request => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
        
        {/* Completed Section */}
        {completedRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              تمت المعالجة ({completedRequests.length})
            </h3>
            {completedRequests.map(request => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
        
        {myRequests.length === 0 && (
          <div className="dark-card p-12 text-center text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لم تستلم أي طلبات بعد</p>
          </div>
        )}
      </div>
    );
  };

  // Analytics Tab (Super Admin)
  const renderAnalyticsTab = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">التحليلات</h2>
      
      {/* Charts Section */}
      <AnalyticsCharts stats={{
        totalRequests: allRequests.length,
        paidRequests: allRequests.filter(r => r.status === 'paid').length,
        rejectedRequests: allRequests.filter(r => r.status === 'rejected').length,
        pendingRequests: allRequests.filter(r => r.status === 'pending' || r.status === 'review').length,
        totalPaidAmount: allRequests.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount), 0),
        totalPendingAmount: allRequests.filter(r => r.status === 'pending' || r.status === 'review').reduce((sum, r) => sum + Number(r.amount), 0),
      }} />
      
      <SuperAdminStats />
      
      {/* Filters */}
      <div className="dark-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">تصفية</span>
        </div>
        
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="بحث..."
            className="w-full input-field pr-10 py-3 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="bg-background text-sm">
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
            <SelectTrigger className="bg-background text-sm">
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

        {/* Amount Range Filter */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">البحث بالمبلغ ($)</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
              placeholder="من"
              className="input-field py-2 text-sm text-center"
              min="0"
            />
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
              placeholder="إلى"
              className="input-field py-2 text-sm text-center"
              min="0"
            />
          </div>
        </div>

        <Select
          value={filters.adminFilter}
          onValueChange={(value) => setFilters(prev => ({ ...prev, adminFilter: value }))}
        >
          <SelectTrigger className="bg-background text-sm">
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
        >
          <Download className="w-4 h-4" />
          تحميل Excel
        </button>
      </div>

      {/* Results */}
      <p className="text-xs text-muted-foreground text-center">
        {allRequests.length} طلب
      </p>
      {allRequests.map(request => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  );

  // Settings Tab (Super Admin)
  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">إدارة المديرين</h2>

      <div className="dark-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">إشعارات التليجرام</p>
            <p className="text-xs text-muted-foreground">إعادة إرسال إشعارات آخر الطلبات المعلّقة</p>
          </div>
          <button
            onClick={handleResendTelegramForPending}
            disabled={resendingTelegram}
            className="py-2.5 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {resendingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            إرسال الآن
          </button>
        </div>
      </div>

      <AdminManagement onUpdate={fetchData} />
      
      {/* Blocked Agency Codes */}
      <BlockedAgencyCodesManagement />
    </div>
  );

  // Videos Tab (Super Admin)
  const renderVideosTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">إدارة الفيديوهات</h2>
      <VideoManagement onUpdate={fetchData} />
    </div>
  );

  // Supporters Tab (Super Admin)
  const renderSupportersTab = () => (
    <div className="space-y-4">
      <SupportersManagement />
    </div>
  );

  // Scan Tab (Super Admin)
  const renderScanTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">فحص الطلبات المشبوهة</h2>
      <DuplicateDetection onViewRequest={(id) => setSelectedRequest(id)} />
    </div>
  );

  // Trash Tab (Super Admin)
  const renderTrashTab = () => (
    <TrashBin />
  );

  // Organized Requests Tab (Super Admin)
  const renderOrganizedRequestsTab = () => (
    <OrganizedPayoutRequests
      onViewRequest={(id) => setSelectedRequest(id)}
      onDeleteRequest={handleDeleteRequest}
      isSuperAdmin={isSuperAdmin}
    />
  );

  // Navigation Items - Main 4 items only (More options in sheet)
  const mainNavItems = [
    { id: 'home', icon: Home, label: 'الرئيسية' },
    ...(isSuperAdmin ? [
      { id: 'organized', icon: Wallet, label: 'الطلبات', badge: pendingRequests.length },
    ] : [
      { id: 'pending', icon: Clock, label: 'جديدة', badge: pendingRequests.length },
    ]),
    { id: 'analytics', icon: BarChart3, label: 'التحليلات' },
  ];

  return (
    <div 
      className="min-h-screen pb-24"
      style={{
        background: 'linear-gradient(180deg, hsl(150 40% 4%) 0%, hsl(150 35% 6%) 50%, hsl(150 40% 4%) 100%)',
      }}
    >
      {/* Premium Header */}
      <header 
        className="sticky top-0 z-20 px-4 py-3"
        style={{
          background: 'linear-gradient(180deg, hsla(150, 40%, 5%, 0.98) 0%, hsla(150, 40%, 5%, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid hsla(142, 70%, 45%, 0.12)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsla(142, 76%, 50%, 0.2), hsla(142, 76%, 50%, 0.1))',
                border: '1px solid hsla(142, 70%, 45%, 0.3)',
                boxShadow: '0 0 20px hsla(142, 76%, 50%, 0.15)',
              }}
            >
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground">غلا لايف</h1>
          </div>
          {isSuperAdmin && (
            <span 
              className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-primary"
              style={{
                background: 'linear-gradient(135deg, hsla(142, 76%, 50%, 0.15), hsla(142, 76%, 50%, 0.08))',
                border: '1px solid hsla(142, 70%, 45%, 0.25)',
              }}
            >
              مسؤول
            </span>
          )}
        </div>
      </header>

      {/* Main Content with Tab Transitions */}
      <main className="px-4 py-5">
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'organized' && isSuperAdmin && renderOrganizedRequestsTab()}
          {activeTab === 'pending' && renderPendingTab()}
          {activeTab === 'my-requests' && renderMyRequestsTab()}
          {activeTab === 'scan' && isSuperAdmin && renderScanTab()}
          {activeTab === 'trash' && isSuperAdmin && renderTrashTab()}
          {activeTab === 'analytics' && isSuperAdmin && renderAnalyticsTab()}
          {activeTab === 'videos' && isSuperAdmin && renderVideosTab()}
          {activeTab === 'supporters' && isSuperAdmin && renderSupportersTab()}
          {activeTab === 'settings' && isSuperAdmin && renderSettingsTab()}
        </div>
      </main>

      {/* Floating MacBook-Style Dock */}
      <FloatingDock 
        items={mainNavItems}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Floating Export Button - Only for Super Admin */}
      {isSuperAdmin && (
        <button
          onClick={() => setShowExportDialog(true)}
          className="fixed bottom-24 left-4 z-30 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 group"
          style={{
            background: 'linear-gradient(135deg, hsl(142 76% 50%), hsl(150 70% 45%))',
            boxShadow: `
              0 4px 20px hsla(142, 76%, 50%, 0.4),
              0 0 30px hsla(142, 76%, 50%, 0.2),
              inset 0 1px 0 hsla(255, 255%, 255%, 0.3)
            `,
          }}
        >
          <Send className="w-6 h-6 text-primary-foreground group-hover:rotate-12 transition-transform" />
          <div 
            className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, hsla(142, 76%, 50%, 0.3) 0%, transparent 70%)',
            }}
          />
        </button>
      )}

      {/* Export Print Dialog */}
      <ExportPrintDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        countries={countries}
        adminProfiles={adminProfiles}
      />

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
