import { TrendingUp, Users, CheckCircle2, XCircle, Clock, Wallet } from 'lucide-react';

interface AdminStatsProps {
  stats: {
    totalRequests: number;
    paidRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  };
  adminName?: string;
  showTitle?: boolean;
}

const AdminStats = ({ stats, adminName, showTitle = true }: AdminStatsProps) => {
  return (
    <div className="space-y-4">
      {showTitle && adminName && (
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg text-foreground">{adminName}</h3>
        </div>
      )}
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalRequests}</p>
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
              <p className="text-2xl font-bold text-foreground">{stats.paidRequests}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">مرفوض</p>
              <p className="text-2xl font-bold text-foreground">{stats.rejectedRequests}</p>
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
              <p className="text-2xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">مبلغ التحويل</p>
              <p className="text-xl font-bold text-foreground">${stats.totalPaidAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">مبلغ الانتظار</p>
              <p className="text-xl font-bold text-foreground">${stats.totalPendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
