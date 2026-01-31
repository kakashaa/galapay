import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Eye,
  Search,
  Loader2,
  Home,
  Coins,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { exportCoinsToExcel } from '@/lib/excel-export';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CoinsRequest {
  id: string;
  tracking_code: string;
  gala_account_id: string;
  gala_username: string | null;
  reference_number: string;
  receipt_image_url: string;
  coins_amount: number;
  amount_usd: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

const CoinsDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CoinsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CoinsRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected'>('pending');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchRequests();
    }
  }, [currentUserId, activeTab, searchQuery]);

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

    setIsSuperAdmin(roleData.role === 'super_admin');
    setLoading(false);
  };

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from('coins_payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query = query.in('status', ['pending', 'processing']);
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'completed');
      } else if (activeTab === 'rejected') {
        query = query.eq('status', 'rejected');
      }

      if (searchQuery) {
        query = query.or(`tracking_code.ilike.%${searchQuery}%,gala_account_id.ilike.%${searchQuery}%,reference_number.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الطلبات',
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (status: 'completed' | 'rejected') => {
    if (!selectedRequest || !isSuperAdmin) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('coins_payout_requests')
        .update({
          status,
          admin_notes: adminNotes || null,
          processed_by: currentUserId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: status === 'completed' ? 'تم القبول' : 'تم الرفض',
        description: status === 'completed' 
          ? 'تم تسليم الكوينزات بنجاح' 
          : 'تم رفض الطلب',
      });

      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الحالة',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const getStats = () => {
    const pending = requests.filter(r => r.status === 'pending' || r.status === 'processing').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalCoins = requests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.coins_amount), 0);
    return { pending, completed, rejected, totalCoins };
  };

  if (loading) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="min-h-screen premium-bg flex flex-col relative overflow-hidden pb-20">
      <StarField starCount={30} />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-amber-500/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"
              style={{ boxShadow: '0 0 15px hsla(38, 92%, 55%, 0.2)' }}
            >
              <Coins className="w-5 h-5 text-amber-500" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-amber-400">طلبات الكوينزات</h1>
              <p className="text-xs text-muted-foreground">إدارة تحويل الرواتب للكوينزات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => {
                const fileName = `coins-requests-${new Date().toISOString().split('T')[0]}`;
                exportCoinsToExcel(requests, fileName);
                toast({
                  title: 'تم التصدير',
                  description: `تم تصدير ${requests.length} طلب`,
                });
              }}
              className="p-2.5 neon-card hover:border-amber-500/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="تصدير Excel"
            >
              <Download className="w-5 h-5 text-amber-500" />
            </motion.button>
            <motion.button
              onClick={() => navigate('/admin')}
              className="p-2.5 neon-card hover:border-primary/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Home className="w-5 h-5 text-muted-foreground" />
            </motion.button>
            <motion.button
              onClick={handleLogout}
              className="p-2.5 neon-card hover:border-destructive/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <motion.div 
          className="p-4 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Clock className="w-5 h-5 text-warning mb-2" />
          <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">معلق</p>
        </motion.div>
        <motion.div 
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CheckCircle className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-primary">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">مكتمل</p>
        </motion.div>
        <motion.div 
          className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Coins className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-amber-400">{(stats.totalCoins / 1000).toFixed(0)}K</p>
          <p className="text-xs text-muted-foreground">كوينزات</p>
        </motion.div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بكود التتبع أو الايدي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-card/50 border-border/50"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 bg-card/50 rounded-xl border border-border/50">
          {(['pending', 'completed', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? tab === 'pending' ? 'bg-warning/20 text-warning' :
                    tab === 'completed' ? 'bg-primary/20 text-primary' :
                    'bg-destructive/20 text-destructive'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab === 'pending' ? 'معلق' : tab === 'completed' ? 'مكتمل' : 'مرفوض'}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 px-4 space-y-3">
        {requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-2xl bg-card/50 border border-border/50 hover:border-amber-500/30 transition-all"
              style={{
                background: 'linear-gradient(145deg, hsl(38 30% 10%), hsl(38 30% 6%))',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{request.gala_account_id}</p>
                  {request.gala_username && (
                    <p className="text-xs text-muted-foreground">@{request.gala_username}</p>
                  )}
                </div>
                <Badge className={statusColors[request.status]}>
                  {statusLabels[request.status]}
                </Badge>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">المبلغ</p>
                  <p className="text-xl font-bold text-amber-400">
                    {request.coins_amount.toLocaleString()} <span className="text-sm">كوينز</span>
                  </p>
                  <p className="text-xs text-muted-foreground">${request.amount_usd}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setAdminNotes(request.admin_notes || '');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  التفاصيل
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span dir="ltr">{request.tracking_code}</span>
                <span>{new Date(request.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Request Details Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              تفاصيل طلب الكوينزات
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Receipt Image */}
              <div className="rounded-xl overflow-hidden border border-border">
                <img
                  src={selectedRequest.receipt_image_url}
                  alt="Receipt"
                  className="w-full h-48 object-cover"
                />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">ايدي غلا لايف</p>
                  <p className="font-medium">{selectedRequest.gala_account_id}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">اليوزر</p>
                  <p className="font-medium">{selectedRequest.gala_username || '-'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">الرقم المرجعي</p>
                  <p className="font-medium font-mono text-sm">{selectedRequest.reference_number}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">كود التتبع</p>
                  <p className="font-medium font-mono text-sm" dir="ltr">{selectedRequest.tracking_code}</p>
                </div>
              </div>

              {/* Amount Display */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">المبلغ المستحق</p>
                <p className="text-3xl font-bold text-amber-400">
                  {selectedRequest.coins_amount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">كوينز (${selectedRequest.amount_usd})</p>
              </div>

              {/* Admin Notes */}
              {isSuperAdmin && selectedRequest.status === 'pending' && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">ملاحظات المدير</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="أضف ملاحظات (اختياري)..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {/* Show existing notes if already processed */}
              {selectedRequest.admin_notes && selectedRequest.status !== 'pending' && (
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات المدير</p>
                  <p className="text-sm">{selectedRequest.admin_notes}</p>
                </div>
              )}

              {/* Actions */}
              {isSuperAdmin && selectedRequest.status === 'pending' && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={processing}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 ml-2" />
                        تم التسليم
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={processing}
                    variant="destructive"
                    className="flex-1"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 ml-2" />
                        رفض
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!isSuperAdmin && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  فقط المسؤول يمكنه معالجة الطلبات
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoinsDashboard;
