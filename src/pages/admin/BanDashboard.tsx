import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ShieldBan,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Gift,
  Eye,
  Search,
  RefreshCw,
  Megaphone,
  MessageSquareWarning,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BanType = 'promotion' | 'insult' | 'defamation';

interface BanReport {
  id: string;
  reporter_gala_id: string;
  reported_user_id: string;
  ban_type: BanType;
  description: string | null;
  evidence_url: string;
  evidence_type: string;
  is_verified: boolean;
  expires_at: string | null;
  reward_amount: number | null;
  reward_paid: boolean;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

const BAN_TYPE_INFO: Record<BanType, { label: string; icon: React.ReactNode; duration: string }> = {
  promotion: { label: 'ترويج', icon: <Megaphone className="w-4 h-4" />, duration: 'دائم' },
  insult: { label: 'شتم', icon: <MessageSquareWarning className="w-4 h-4" />, duration: '24 ساعة' },
  defamation: { label: 'قذف', icon: <AlertTriangle className="w-4 h-4" />, duration: '24 ساعة' },
};

export default function BanDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<BanReport[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<BanReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchReports();
    }
  }, [filter, isSuperAdmin]);

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
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      toast.error('لا تملك صلاحية الوصول لهذه الصفحة');
      navigate('/admin');
      return;
    }

    setIsSuperAdmin(true);
    setLoading(false);
  };

  const fetchReports = async () => {
    try {
      let query = supabase
        .from('ban_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.is('processed_at', null);
      } else if (filter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (filter === 'rejected') {
        query = query.eq('is_verified', false).not('processed_at', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports((data || []) as unknown as BanReport[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('حدث خطأ أثناء جلب البلاغات');
    }
  };

  const handleVerify = async (report: BanReport) => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Calculate expiry for non-permanent bans
      let expiresAt = null;
      if (report.ban_type !== 'promotion') {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        expiresAt = expiry.toISOString();
      }

      const { error } = await supabase
        .from('ban_reports')
        .update({
          is_verified: true,
          expires_at: expiresAt,
          admin_notes: adminNotes || null,
          processed_by: session?.user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (error) throw error;

      toast.success('تم تأكيد البلاغ بنجاح');
      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ أثناء تأكيد البلاغ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (report: BanReport) => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from('ban_reports')
        .update({
          is_verified: false,
          admin_notes: adminNotes || null,
          processed_by: session?.user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (error) throw error;

      toast.success('تم رفض البلاغ');
      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ أثناء رفض البلاغ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayReward = async (report: BanReport) => {
    if (!report.reward_amount) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('ban_reports')
        .update({ reward_paid: true })
        .eq('id', report.id);

      if (error) throw error;

      toast.success('تم تسجيل دفع المكافأة');
      fetchReports();
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredReports = reports.filter(r => 
    !searchQuery || 
    r.reported_user_id.includes(searchQuery) || 
    r.reporter_gala_id.includes(searchQuery)
  );

  const stats = {
    pending: reports.filter(r => !r.processed_at).length,
    verified: reports.filter(r => r.is_verified).length,
    rejected: reports.filter(r => !r.is_verified && r.processed_at).length,
    unpaidRewards: reports.filter(r => r.is_verified && r.reward_amount && !r.reward_paid).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => navigate('/admin')}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ShieldBan className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="font-bold">إدارة البلاغات</h1>
              <p className="text-xs text-muted-foreground">مراجعة بلاغات التبنيد</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchReports}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="p-4 grid grid-cols-4 gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === 'pending' ? 'bg-warning/20 border-2 border-warning' : 'bg-card border border-border'
          }`}
        >
          <Clock className={`w-5 h-5 mx-auto mb-1 ${filter === 'pending' ? 'text-warning' : 'text-muted-foreground'}`} />
          <p className="text-lg font-bold">{stats.pending}</p>
          <p className="text-[10px] text-muted-foreground">معلق</p>
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === 'verified' ? 'bg-success/20 border-2 border-success' : 'bg-card border border-border'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 mx-auto mb-1 ${filter === 'verified' ? 'text-success' : 'text-muted-foreground'}`} />
          <p className="text-lg font-bold">{stats.verified}</p>
          <p className="text-[10px] text-muted-foreground">مؤكد</p>
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === 'rejected' ? 'bg-destructive/20 border-2 border-destructive' : 'bg-card border border-border'
          }`}
        >
          <XCircle className={`w-5 h-5 mx-auto mb-1 ${filter === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`} />
          <p className="text-lg font-bold">{stats.rejected}</p>
          <p className="text-[10px] text-muted-foreground">مرفوض</p>
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === 'all' ? 'bg-primary/20 border-2 border-primary' : 'bg-card border border-border'
          }`}
        >
          <Gift className={`w-5 h-5 mx-auto mb-1 ${filter === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-lg font-bold">{stats.unpaidRewards}</p>
          <p className="text-[10px] text-muted-foreground">مكافآت</p>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالآيدي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 px-4 space-y-3">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldBan className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد بلاغات</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-card border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    report.ban_type === 'promotion' ? 'bg-purple-500/20 text-purple-500' :
                    report.ban_type === 'insult' ? 'bg-orange-500/20 text-orange-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {BAN_TYPE_INFO[report.ban_type].icon}
                    {BAN_TYPE_INFO[report.ban_type].label}
                  </span>
                  {!report.processed_at && (
                    <span className="bg-warning/20 text-warning px-2 py-1 rounded-lg text-xs font-bold">
                      معلق
                    </span>
                  )}
                  {report.is_verified && (
                    <span className="bg-success/20 text-success px-2 py-1 rounded-lg text-xs font-bold">
                      مؤكد
                    </span>
                  )}
                  {report.processed_at && !report.is_verified && (
                    <span className="bg-destructive/20 text-destructive px-2 py-1 rounded-lg text-xs font-bold">
                      مرفوض
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString('ar-SA')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">المُبلِّغ: </span>
                  <span className="font-bold">{report.reporter_gala_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">المُبلَّغ عنه: </span>
                  <span className="font-bold">{report.reported_user_id}</span>
                </div>
              </div>

              {report.reward_amount && report.is_verified && (
                <div className={`flex items-center justify-between p-2 rounded-lg ${
                  report.reward_paid ? 'bg-success/10' : 'bg-warning/10'
                }`}>
                  <div className="flex items-center gap-2">
                    <Gift className={`w-4 h-4 ${report.reward_paid ? 'text-success' : 'text-warning'}`} />
                    <span className="text-sm font-bold">
                      {report.reward_amount.toLocaleString()} كوينز
                    </span>
                  </div>
                  {!report.reward_paid && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePayReward(report)}
                      disabled={isProcessing}
                    >
                      تم الدفع
                    </Button>
                  )}
                  {report.reward_paid && (
                    <span className="text-xs text-success">✓ تم الدفع</span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedReport(report)}
                >
                  <Eye className="w-4 h-4 ml-1" />
                  عرض
                </Button>
                {!report.processed_at && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-success hover:bg-success/90"
                      onClick={() => {
                        setSelectedReport(report);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 ml-1" />
                      تأكيد
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldBan className="w-5 h-5 text-destructive" />
              تفاصيل البلاغ
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Evidence */}
              <div className="rounded-xl overflow-hidden border bg-muted/30">
                {selectedReport.evidence_type === 'video' ? (
                  <video
                    src={selectedReport.evidence_url}
                    controls
                    playsInline
                    className="w-full max-h-[300px] object-contain"
                  />
                ) : (
                  <img
                    src={selectedReport.evidence_url}
                    alt="Evidence"
                    className="w-full max-h-[300px] object-contain"
                  />
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">نوع المخالفة:</span>
                  <span className="font-bold flex items-center gap-1">
                    {BAN_TYPE_INFO[selectedReport.ban_type].icon}
                    {BAN_TYPE_INFO[selectedReport.ban_type].label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مدة البند:</span>
                  <span className="font-bold">{BAN_TYPE_INFO[selectedReport.ban_type].duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المُبلِّغ:</span>
                  <span className="font-bold">{selectedReport.reporter_gala_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المُبلَّغ عنه:</span>
                  <span className="font-bold">{selectedReport.reported_user_id}</span>
                </div>
                {selectedReport.description && (
                  <div>
                    <span className="text-muted-foreground">الوصف:</span>
                    <p className="mt-1 bg-muted/50 p-2 rounded-lg">{selectedReport.description}</p>
                  </div>
                )}
                {selectedReport.reward_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المكافأة:</span>
                    <span className="font-bold text-warning">
                      {selectedReport.reward_amount.toLocaleString()} كوينز
                    </span>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              {!selectedReport.processed_at && (
                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="ملاحظات المسؤول (اختياري)"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleReject(selectedReport)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 ml-1" />}
                      رفض
                    </Button>
                    <Button
                      className="flex-1 bg-success hover:bg-success/90"
                      onClick={() => handleVerify(selectedReport)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-1" />}
                      تأكيد البلاغ
                    </Button>
                  </div>
                </div>
              )}

              {/* Already Processed */}
              {selectedReport.processed_at && (
                <div className={`p-3 rounded-xl ${selectedReport.is_verified ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <p className={`text-sm font-bold ${selectedReport.is_verified ? 'text-success' : 'text-destructive'}`}>
                    {selectedReport.is_verified ? '✓ تم تأكيد هذا البلاغ' : '✗ تم رفض هذا البلاغ'}
                  </p>
                  {selectedReport.admin_notes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ملاحظات: {selectedReport.admin_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
