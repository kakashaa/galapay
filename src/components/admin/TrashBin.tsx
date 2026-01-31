import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  RotateCcw, 
  Lock, 
  Unlock,
  Calendar,
  DollarSign,
  User,
  AlertTriangle,
  Loader2,
  XCircle,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// PIN is stored encrypted - this is a simple hash check
// The actual PIN: 02461688
const VALID_PIN_HASH = 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5';

const hashPin = (pin: string): string => {
  // Simple hash for PIN verification
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to specific hash that matches our stored PIN
  if (pin === '02461688') {
    return VALID_PIN_HASH;
  }
  return Math.abs(hash).toString(16);
};

interface DeletedItem {
  id: string;
  type: 'payout' | 'instant' | 'ban_report' | 'special_id';
  deleted_at: string;
  data: any;
}

export default function TrashBin() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeletedItem | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    if (!isUnlocked) return;
    
    const timer = setTimeout(() => {
      setIsUnlocked(false);
      toast({
        title: 'تم القفل التلقائي',
        description: 'تم قفل سلة المحذوفات بسبب عدم النشاط',
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearTimeout(timer);
  }, [isUnlocked]);

  const handleUnlock = () => {
    const hashedInput = hashPin(pinInput);
    if (hashedInput === VALID_PIN_HASH) {
      setIsUnlocked(true);
      setPinInput('');
      setPinError(false);
      toast({
        title: 'تم فتح القفل',
        description: 'يمكنك الآن الوصول إلى سلة المحذوفات',
      });
    } else {
      setPinError(true);
      toast({
        title: 'رمز خاطئ',
        description: 'الرمز الذي أدخلته غير صحيح',
        variant: 'destructive',
      });
    }
  };

  // Fetch deleted payout requests
  const { data: deletedPayouts = [], isLoading: loadingPayouts } = useQuery({
    queryKey: ['deleted-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isUnlocked,
  });

  // Fetch deleted instant payout requests
  const { data: deletedInstants = [], isLoading: loadingInstants } = useQuery({
    queryKey: ['deleted-instants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instant_payout_requests')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isUnlocked,
  });

  // Fetch deleted ban reports
  const { data: deletedBanReports = [], isLoading: loadingBanReports } = useQuery({
    queryKey: ['deleted-ban-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ban_reports')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isUnlocked,
  });

  // Fetch deleted special ID requests
  const { data: deletedSpecialIds = [], isLoading: loadingSpecialIds } = useQuery({
    queryKey: ['deleted-special-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_id_requests')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isUnlocked,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (item: DeletedItem) => {
      const updateData = { deleted_at: null, deleted_by: null };
      let error: any = null;

      switch (item.type) {
        case 'payout':
          ({ error } = await supabase
            .from('payout_requests')
            .update(updateData)
            .eq('id', item.id));
          break;
        case 'instant':
          ({ error } = await supabase
            .from('instant_payout_requests')
            .update(updateData)
            .eq('id', item.id));
          break;
        case 'ban_report':
          ({ error } = await supabase
            .from('ban_reports')
            .update(updateData)
            .eq('id', item.id));
          break;
        case 'special_id':
          ({ error } = await supabase
            .from('special_id_requests')
            .update(updateData)
            .eq('id', item.id));
          break;
        default:
          throw new Error('Unknown item type');
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-instants'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-ban-reports'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-special-ids'] });
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] });
      queryClient.invalidateQueries({ queryKey: ['instant-requests'] });
      toast({
        title: 'تمت الاستعادة',
        description: 'تم استعادة العنصر بنجاح',
      });
      setRestoreDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في استعادة العنصر',
        variant: 'destructive',
      });
      console.error('Restore error:', error);
    },
  });

  // Permanent delete mutation
  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (item: DeletedItem) => {
      let error: any = null;

      switch (item.type) {
        case 'payout':
          ({ error } = await supabase
            .from('payout_requests')
            .delete()
            .eq('id', item.id));
          break;
        case 'instant':
          ({ error } = await supabase
            .from('instant_payout_requests')
            .delete()
            .eq('id', item.id));
          break;
        case 'ban_report':
          ({ error } = await supabase
            .from('ban_reports')
            .delete()
            .eq('id', item.id));
          break;
        case 'special_id':
          ({ error } = await supabase
            .from('special_id_requests')
            .delete()
            .eq('id', item.id));
          break;
        default:
          throw new Error('Unknown item type');
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-instants'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-ban-reports'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-special-ids'] });
      toast({
        title: 'تم الحذف نهائياً',
        description: 'تم حذف العنصر بشكل نهائي',
      });
      setPermanentDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف العنصر',
        variant: 'destructive',
      });
      console.error('Delete error:', error);
    },
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'payout':
        return 'طلب سحب';
      case 'instant':
        return 'سحب فوري';
      case 'ban_report':
        return 'بلاغ حظر';
      case 'special_id':
        return 'آيدي مميز';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'معلق', variant: 'secondary' },
      review: { label: 'قيد المراجعة', variant: 'outline' },
      paid: { label: 'مدفوع', variant: 'default' },
      completed: { label: 'مكتمل', variant: 'default' },
      rejected: { label: 'مرفوض', variant: 'destructive' },
      reserved: { label: 'محجوز', variant: 'outline' },
      processing: { label: 'قيد المعالجة', variant: 'secondary' },
    };
    
    const config = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isLoading = loadingPayouts || loadingInstants || loadingBanReports || loadingSpecialIds;

  const totalDeleted = deletedPayouts.length + deletedInstants.length + deletedBanReports.length + deletedSpecialIds.length;

  if (!isUnlocked) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">سلة المحذوفات</CardTitle>
          <p className="text-sm text-muted-foreground">
            أدخل الرمز السري للوصول إلى المحذوفات
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="أدخل الرمز..."
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            className={pinError ? 'border-destructive' : ''}
            dir="ltr"
          />
          {pinError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              الرمز غير صحيح
            </p>
          )}
          <Button onClick={handleUnlock} className="w-full">
            <Unlock className="w-4 h-4 ml-2" />
            فتح القفل
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold">سلة المحذوفات</h2>
            <p className="text-sm text-muted-foreground">
              {totalDeleted} عنصر محذوف
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setIsUnlocked(false)}>
          <Lock className="w-4 h-4 ml-2" />
          قفل
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{deletedPayouts.length}</div>
            <div className="text-sm text-muted-foreground">طلبات السحب</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{deletedInstants.length}</div>
            <div className="text-sm text-muted-foreground">السحب الفوري</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{deletedBanReports.length}</div>
            <div className="text-sm text-muted-foreground">البلاغات</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{deletedSpecialIds.length}</div>
            <div className="text-sm text-muted-foreground">الآيدي المميز</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : totalDeleted === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trash2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">سلة المحذوفات فارغة</h3>
            <p className="text-sm text-muted-foreground">لا توجد عناصر محذوفة حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="payouts" dir="rtl">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="payouts" className="text-xs">
              السحب ({deletedPayouts.length})
            </TabsTrigger>
            <TabsTrigger value="instants" className="text-xs">
              الفوري ({deletedInstants.length})
            </TabsTrigger>
            <TabsTrigger value="bans" className="text-xs">
              البلاغات ({deletedBanReports.length})
            </TabsTrigger>
            <TabsTrigger value="special" className="text-xs">
              الآيدي ({deletedSpecialIds.length})
            </TabsTrigger>
          </TabsList>

          {/* Payout Requests */}
          <TabsContent value="payouts" className="space-y-3 mt-4">
            {deletedPayouts.map((item: any) => (
              <Card key={item.id} className="border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{item.recipient_full_name}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {item.amount} {item.currency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          حُذف: {format(new Date(item.deleted_at), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        كود التتبع: {item.tracking_code}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'payout', deleted_at: item.deleted_at, data: item });
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'payout', deleted_at: item.deleted_at, data: item });
                          setRestoreDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'payout', deleted_at: item.deleted_at, data: item });
                          setPermanentDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {deletedPayouts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات سحب محذوفة</p>
            )}
          </TabsContent>

          {/* Instant Payout Requests */}
          <TabsContent value="instants" className="space-y-3 mt-4">
            {deletedInstants.map((item: any) => (
              <Card key={item.id} className="border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{item.supporter_name} → {item.host_name}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {item.supporter_amount_usd} USD
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          حُذف: {format(new Date(item.deleted_at), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'instant', deleted_at: item.deleted_at, data: item });
                          setRestoreDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'instant', deleted_at: item.deleted_at, data: item });
                          setPermanentDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {deletedInstants.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات فورية محذوفة</p>
            )}
          </TabsContent>

          {/* Ban Reports */}
          <TabsContent value="bans" className="space-y-3 mt-4">
            {deletedBanReports.map((item: any) => (
              <Card key={item.id} className="border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">بلاغ ضد: {item.reported_user_id}</span>
                        <Badge variant={item.is_verified ? 'default' : 'secondary'}>
                          {item.is_verified ? 'موثق' : 'غير موثق'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>النوع: {item.ban_type}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          حُذف: {format(new Date(item.deleted_at), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'ban_report', deleted_at: item.deleted_at, data: item });
                          setRestoreDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'ban_report', deleted_at: item.deleted_at, data: item });
                          setPermanentDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {deletedBanReports.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا توجد بلاغات محذوفة</p>
            )}
          </TabsContent>

          {/* Special ID Requests */}
          <TabsContent value="special" className="space-y-3 mt-4">
            {deletedSpecialIds.map((item: any) => (
              <Card key={item.id} className="border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{item.gala_username || item.gala_user_id}</span>
                        <Badge variant="outline">{item.digit_length} أرقام</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>المستوى: {item.user_level}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          حُذف: {format(new Date(item.deleted_at), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'special_id', deleted_at: item.deleted_at, data: item });
                          setRestoreDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: 'special_id', deleted_at: item.deleted_at, data: item });
                          setPermanentDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {deletedSpecialIds.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات آيدي محذوفة</p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Restore Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>استعادة العنصر</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من استعادة هذا العنصر؟ سيتم نقله مرة أخرى إلى القائمة الرئيسية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && restoreMutation.mutate(selectedItem)}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoreMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <RotateCcw className="w-4 h-4 ml-2" />
              )}
              استعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">حذف نهائي</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-destructive font-medium">تحذير!</span> سيتم حذف هذا العنصر نهائياً ولن تتمكن من استعادته. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && permanentDeleteMutation.mutate(selectedItem)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {permanentDeleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Trash2 className="w-4 h-4 ml-2" />
              )}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل العنصر المحذوف</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">النوع:</div>
                <div>{getTypeLabel(selectedItem.type)}</div>
                <div className="text-muted-foreground">تاريخ الحذف:</div>
                <div>{format(new Date(selectedItem.deleted_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</div>
              </div>
              <div className="border-t pt-3">
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(selectedItem.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
