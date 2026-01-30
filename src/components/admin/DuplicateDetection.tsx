import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  Search,
  Loader2,
  Users,
  Hash,
  Image,
  Eye,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PayoutRequest {
  id: string;
  tracking_code: string;
  zalal_life_account_id: string;
  zalal_life_username: string | null;
  recipient_full_name: string;
  amount: number;
  reference_number: string | null;
  user_receipt_image_url: string;
  status: string;
  created_at: string;
  country: string;
  payout_method: string;
}

interface DuplicateGroup {
  type: 'account_id' | 'reference_number' | 'similar_receipt' | 'reference_mismatch';
  reason: string;
  requests: PayoutRequest[];
}

interface DetectionResult {
  success: boolean;
  totalScanned: number;
  duplicateGroups: DuplicateGroup[];
  summary: {
    accountIdDuplicates: number;
    referenceNumberDuplicates: number;
    referenceMismatches: number;
    similarReceipts: number;
  };
}

interface DuplicateDetectionProps {
  onViewRequest: (requestId: string) => void;
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  review: 'قيد المراجعة',
  paid: 'تم التحويل',
  rejected: 'مرفوض',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-primary/10 text-primary border-primary/30';
    case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'review': return 'bg-warning/10 text-warning border-warning/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'account_id': return <Users className="w-4 h-4" />;
    case 'reference_number': return <Hash className="w-4 h-4" />;
    case 'reference_mismatch': return <AlertTriangle className="w-4 h-4" />;
    case 'similar_receipt': return <Image className="w-4 h-4" />;
    default: return <AlertTriangle className="w-4 h-4" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'account_id': return 'تكرار الايدي';
    case 'reference_number': return 'تكرار المرجعي';
    case 'reference_mismatch': return 'رقم مرجعي خاطئ';
    case 'similar_receipt': return 'إيصالات متشابهة';
    default: return 'مشبوه';
  }
};

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'account_id': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    case 'reference_number': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    case 'reference_mismatch': return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'similar_receipt': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    default: return 'bg-destructive/10 text-destructive border-destructive/30';
  }
};

export default function DuplicateDetection({ onViewRequest }: DuplicateDetectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const handleScan = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('detect-duplicates', {
        body: {},
      });

      if (error) throw error;

      setResult(data);

      if (data.duplicateGroups.length === 0) {
        toast({
          title: '✅ لا توجد طلبات مشبوهة',
          description: `تم فحص ${data.totalScanned} طلب`,
        });
      } else {
        toast({
          title: '⚠️ تم العثور على طلبات مشبوهة',
          description: `${data.duplicateGroups.length} مجموعة مشبوهة من ${data.totalScanned} طلب`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error scanning:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في فحص الطلبات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* Scan Button */}
      <div className="dark-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">فحص الذكاء الاصطناعي</p>
            <p className="text-xs text-muted-foreground">
              يفحص الطلبات المتكررة والإيصالات المتشابهة
            </p>
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full py-3 bg-warning text-warning-foreground font-medium rounded-xl hover:bg-warning/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الفحص...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              بدء الفحص
            </>
          )}
        </button>
      </div>

      {/* Results Summary */}
      {result && (
        <div className="dark-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">نتائج الفحص</p>
            <span className="text-xs text-muted-foreground">
              {result.totalScanned} طلب
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-500/10 rounded-xl p-3 text-center">
              <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-500">{result.summary.accountIdDuplicates}</p>
              <p className="text-[10px] text-muted-foreground">تكرار ايدي</p>
            </div>
            <div className="bg-orange-500/10 rounded-xl p-3 text-center">
              <Hash className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-500">{result.summary.referenceNumberDuplicates}</p>
              <p className="text-[10px] text-muted-foreground">تكرار مرجعي</p>
            </div>
            <div className="bg-destructive/10 rounded-xl p-3 text-center">
              <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
              <p className="text-lg font-bold text-destructive">{result.summary.referenceMismatches || 0}</p>
              <p className="text-[10px] text-muted-foreground">رقم مرجعي خاطئ</p>
            </div>
            <div className="bg-purple-500/10 rounded-xl p-3 text-center">
              <Image className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-500">{result.summary.similarReceipts}</p>
              <p className="text-[10px] text-muted-foreground">إيصالات مشبوهة</p>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Groups */}
      {result && result.duplicateGroups.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            طلبات مشبوهة ({result.duplicateGroups.length})
          </h3>

          {result.duplicateGroups.map((group, index) => (
            <div key={index} className="dark-card overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(index)}
                className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeBadgeColor(group.type)}`}>
                    {getTypeIcon(group.type)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{group.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.requests.length} طلب
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${getTypeBadgeColor(group.type)}`}>
                    {getTypeLabel(group.type)}
                  </Badge>
                  {expandedGroups.has(index) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedGroups.has(index) && (
                <div className="border-t border-border">
                  {group.requests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground" dir="ltr">
                            {request.tracking_code}
                          </span>
                          <Badge className={`text-[10px] ${getStatusColor(request.status)}`}>
                            {statusLabels[request.status] || request.status}
                          </Badge>
                        </div>
                        <button
                          onClick={() => onViewRequest(request.id)}
                          className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">الايدي: </span>
                          <span className="font-medium">{request.zalal_life_account_id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">المبلغ: </span>
                          <span className="font-bold text-primary">${request.amount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الاسم: </span>
                          <span>{request.recipient_full_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">المرجعي: </span>
                          <span dir="ltr">{request.reference_number || '-'}</span>
                        </div>
                      </div>

                      {/* Receipt Thumbnail */}
                      {request.user_receipt_image_url && (
                        <div className="mt-2">
                          <img
                            src={request.user_receipt_image_url}
                            alt="إيصال"
                            className="w-16 h-16 object-cover rounded-lg border border-border"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {result && result.duplicateGroups.length === 0 && (
        <div className="dark-card p-8 text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد طلبات مشبوهة</p>
          <p className="text-xs text-muted-foreground mt-1">
            تم فحص {result.totalScanned} طلب
          </p>
        </div>
      )}
    </div>
  );
}
