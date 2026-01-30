import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Loader2, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

const InstantDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    // Check if user has admin role
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

    // Fetch instant payout requests
    const { data, error } = await supabase
      .from('instant_payout_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning';
      case 'processing': return 'bg-primary/20 text-primary';
      case 'completed': return 'bg-success/20 text-success';
      case 'rejected': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'processing': return 'قيد المعالجة';
      case 'completed': return 'مكتمل';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const filteredRequests = requests.filter(req =>
    req.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.host_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.supporter_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-warning/10 backdrop-blur-xl border-b border-warning/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl bg-warning/20 hover:bg-warning/30 transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-warning" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h1 className="text-lg font-bold">السحب الفوري</h1>
              <p className="text-xs text-muted-foreground">{requests.length} طلب</p>
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالكود أو الاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Requests List */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات سحب فوري</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="glass-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {getStatusText(request.status)}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {request.tracking_code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">المضيف</p>
                  <p className="font-medium">{request.host_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">الداعم</p>
                  <p className="font-medium">{request.supporter_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">الكوينزات</p>
                  <p className="font-medium text-warning">{request.host_coins_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">المبلغ بالدولار</p>
                  <p className="font-medium text-success">${request.supporter_amount_usd}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {new Date(request.created_at).toLocaleDateString('ar-SA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default InstantDashboard;
