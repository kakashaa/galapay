import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BlockedCode {
  id: string;
  code: string;
  message: string;
  created_at: string;
}

const BlockedAgencyCodesManagement = () => {
  const [codes, setCodes] = useState<BlockedCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newMessage, setNewMessage] = useState('عفواً، يرجى استلام راتبك من وكيلك لأن راتبك عنده');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_agency_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching blocked codes:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الأكواد المحظورة',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCode = async () => {
    if (!newCode.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال كود الوكالة',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('blocked_agency_codes')
        .insert({
          code: newCode.trim(),
          message: newMessage.trim() || 'عفواً، يرجى استلام راتبك من وكيلك لأن راتبك عنده',
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'خطأ',
            description: 'هذا الكود موجود مسبقاً',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'تم',
        description: 'تمت إضافة الكود المحظور',
      });

      setNewCode('');
      setNewMessage('عفواً، يرجى استلام راتبك من وكيلك لأن راتبك عنده');
      fetchCodes();
    } catch (error) {
      console.error('Error adding code:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة الكود',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;

    try {
      const { error } = await supabase
        .from('blocked_agency_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'تم',
        description: 'تم حذف الكود',
      });

      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الكود',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h2 className="text-lg font-bold">أكواد الوكالات المحظورة</h2>
          <p className="text-sm text-muted-foreground">
            المستخدمون الذين يدخلون هذه الأكواد سيرون رسالة تحذير
          </p>
        </div>
      </div>

      {/* Add New Code */}
      <div className="dark-card p-4 space-y-3">
        <label className="text-sm font-medium">إضافة كود محظور جديد</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="كود الوكالة (مثل: 10)"
            className="input-field flex-1"
          />
        </div>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="رسالة التحذير للمستخدم"
          className="input-field min-h-[80px]"
        />
        <button
          onClick={handleAddCode}
          disabled={adding}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          إضافة كود
        </button>
      </div>

      {/* List of Blocked Codes */}
      <div className="space-y-3">
        {codes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد أكواد محظورة
          </div>
        ) : (
          codes.map((code) => (
            <div key={code.id} className="dark-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-lg font-bold text-warning">{code.code}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{code.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(code.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteCode(code.id)}
                  className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BlockedAgencyCodesManagement;
