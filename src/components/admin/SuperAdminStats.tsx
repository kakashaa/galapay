import { useState, useEffect } from 'react';
import { Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminStats from './AdminStats';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AdminStatsData {
  userId: string;
  displayName: string;
  role: string;
  stats: {
    totalRequests: number;
    paidRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  };
}

interface TotalStats {
  totalRequests: number;
  paidRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

const SuperAdminStats = () => {
  const [adminStats, setAdminStats] = useState<AdminStatsData[]>([]);
  const [totalStats, setTotalStats] = useState<TotalStats>({
    totalRequests: 0,
    paidRequests: 0,
    rejectedRequests: 0,
    pendingRequests: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      // Get all admins
      const { data: adminsData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'staff', 'super_admin']);

      const { data: profilesData } = await supabase
        .from('admin_profiles')
        .select('user_id, display_name');

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.display_name]) || []);

      // Get all requests
      const { data: requestsData } = await supabase
        .from('payout_requests')
        .select('status, amount, processed_by');

      if (!requestsData) return;

      // Calculate stats per admin
      const statsMap = new Map<string, AdminStatsData>();

      adminsData?.forEach(admin => {
        const adminRequests = requestsData.filter(r => r.processed_by === admin.user_id);
        
        statsMap.set(admin.user_id, {
          userId: admin.user_id,
          displayName: profilesMap.get(admin.user_id) || 'مدير',
          role: admin.role,
          stats: {
            totalRequests: adminRequests.length,
            paidRequests: adminRequests.filter(r => r.status === 'paid').length,
            rejectedRequests: adminRequests.filter(r => r.status === 'rejected').length,
            pendingRequests: adminRequests.filter(r => r.status === 'pending' || r.status === 'review').length,
            totalPaidAmount: adminRequests
              .filter(r => r.status === 'paid')
              .reduce((sum, r) => sum + Number(r.amount), 0),
            totalPendingAmount: adminRequests
              .filter(r => r.status === 'pending' || r.status === 'review')
              .reduce((sum, r) => sum + Number(r.amount), 0),
          },
        });
      });

      // Calculate total stats
      const totals: TotalStats = {
        totalRequests: requestsData.length,
        paidRequests: requestsData.filter(r => r.status === 'paid').length,
        rejectedRequests: requestsData.filter(r => r.status === 'rejected').length,
        pendingRequests: requestsData.filter(r => r.status === 'pending' || r.status === 'review').length,
        totalPaidAmount: requestsData
          .filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + Number(r.amount), 0),
        totalPendingAmount: requestsData
          .filter(r => r.status === 'pending' || r.status === 'review')
          .reduce((sum, r) => sum + Number(r.amount), 0),
      };

      setAdminStats(Array.from(statsMap.values()).filter(a => a.stats.totalRequests > 0));
      setTotalStats(totals);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get the stats to display based on selected admin
  const getDisplayStats = (): TotalStats => {
    if (selectedAdmin === 'all') {
      return totalStats;
    }
    const adminData = adminStats.find(a => a.userId === selectedAdmin);
    if (adminData) {
      return adminData.stats;
    }
    return totalStats;
  };

  const getDisplayTitle = (): string => {
    if (selectedAdmin === 'all') {
      return 'الإحصائيات الإجمالية';
    }
    const adminData = adminStats.find(a => a.userId === selectedAdmin);
    return adminData ? `إحصائيات ${adminData.displayName}` : 'الإحصائيات';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Selector */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-foreground">{getDisplayTitle()}</h3>
          </div>
          
          <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="اختر المدير" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الجميع</SelectItem>
              {adminStats.map((admin) => (
                <SelectItem key={admin.userId} value={admin.userId}>
                  {admin.displayName} ({admin.stats.totalRequests} طلب)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Display */}
      <AdminStats stats={getDisplayStats()} showTitle={false} />

      {/* Admin Summary (only when showing all) */}
      {selectedAdmin === 'all' && adminStats.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="font-bold mb-4 text-foreground">ملخص المديرين</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminStats.map((admin) => (
              <div
                key={admin.userId}
                className="p-4 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => setSelectedAdmin(admin.userId)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">
                      {admin.displayName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{admin.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {admin.role === 'super_admin' ? 'مسؤول أعلى' : admin.role === 'admin' ? 'مدير' : 'موظف'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">الطلبات:</span>
                    <span className="font-medium mr-1">{admin.stats.totalRequests}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">مقبول:</span>
                    <span className="font-medium mr-1 text-success">{admin.stats.paidRequests}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">مرفوض:</span>
                    <span className="font-medium mr-1 text-destructive">{admin.stats.rejectedRequests}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">المبلغ:</span>
                    <span className="font-medium mr-1">${admin.stats.totalPaidAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminStats.length === 0 && (
        <p className="text-center text-muted-foreground py-4">لا توجد إحصائيات بعد</p>
      )}
    </div>
  );
};

export default SuperAdminStats;
