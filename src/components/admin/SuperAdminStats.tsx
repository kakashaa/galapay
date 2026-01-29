import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminStats from './AdminStats';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [expandedAdmins, setExpandedAdmins] = useState<Set<string>>(new Set());

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

  const toggleAdmin = (userId: string) => {
    setExpandedAdmins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
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
      {/* Total Stats */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg text-foreground">الإحصائيات الإجمالية</h3>
        </div>
        <AdminStats stats={totalStats} showTitle={false} />
      </div>

      {/* Per-Admin Stats */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-foreground">إحصائيات كل مدير</h3>
        
        {adminStats.map((admin) => (
          <Collapsible
            key={admin.userId}
            open={expandedAdmins.has(admin.userId)}
            onOpenChange={() => toggleAdmin(admin.userId)}
          >
            <div className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">
                      {admin.displayName.charAt(0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{admin.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {admin.stats.totalRequests} طلب • ${admin.stats.totalPaidAmount.toLocaleString()} تم صرفه
                    </p>
                  </div>
                </div>
                {expandedAdmins.has(admin.userId) ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t border-border">
                  <AdminStats stats={admin.stats} showTitle={false} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

        {adminStats.length === 0 && (
          <p className="text-center text-muted-foreground py-4">لا توجد إحصائيات بعد</p>
        )}
      </div>
    </div>
  );
};

export default SuperAdminStats;
