import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Supporter {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  thank_you_text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SupporterFormData {
  name: string;
  handle: string;
  avatar_url: string;
  thank_you_text: string;
  is_active: boolean;
  sort_order: number;
}

const defaultFormData: SupporterFormData = {
  name: '',
  handle: '',
  avatar_url: '',
  thank_you_text: 'شكرًا جزيلًا لدعمك لتطبيق غلا لايف',
  is_active: true,
  sort_order: 0,
};

const SupportersManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupporter, setEditingSupporter] = useState<Supporter | null>(null);
  const [formData, setFormData] = useState<SupporterFormData>(defaultFormData);

  // Fetch all supporters (admin sees all, not just active)
  const { data: supporters = [], isLoading } = useQuery({
    queryKey: ['admin-supporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supporters')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Supporter[];
    },
  });

  // Add supporter mutation
  const addMutation = useMutation({
    mutationFn: async (data: SupporterFormData) => {
      const maxOrder = supporters.length > 0 ? Math.max(...supporters.map(s => s.sort_order)) : 0;
      const { error } = await supabase
        .from('supporters')
        .insert({
          ...data,
          sort_order: data.sort_order || maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-supporters'] });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
      toast({ title: 'تم إضافة الداعم بنجاح ✅' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'فشل في إضافة الداعم', variant: 'destructive' });
    },
  });

  // Update supporter mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SupporterFormData> }) => {
      const { error } = await supabase
        .from('supporters')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-supporters'] });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
      toast({ title: 'تم تحديث الداعم بنجاح ✅' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'فشل في تحديث الداعم', variant: 'destructive' });
    },
  });

  // Delete supporter mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supporters')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-supporters'] });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
      toast({ title: 'تم حذف الداعم ✅' });
    },
    onError: () => {
      toast({ title: 'فشل في حذف الداعم', variant: 'destructive' });
    },
  });

  // Toggle active status
  const toggleActive = (supporter: Supporter) => {
    updateMutation.mutate({
      id: supporter.id,
      data: { is_active: !supporter.is_active },
    });
  };

  // Move supporter up/down
  const moveSupporter = (supporter: Supporter, direction: 'up' | 'down') => {
    const currentIndex = supporters.findIndex(s => s.id === supporter.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= supporters.length) return;
    
    const targetSupporter = supporters[targetIndex];
    
    // Swap sort orders
    Promise.all([
      supabase.from('supporters').update({ sort_order: targetSupporter.sort_order }).eq('id', supporter.id),
      supabase.from('supporters').update({ sort_order: supporter.sort_order }).eq('id', targetSupporter.id),
    ]).then(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-supporters'] });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
    });
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingSupporter(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (supporter: Supporter) => {
    setEditingSupporter(supporter);
    setFormData({
      name: supporter.name,
      handle: supporter.handle,
      avatar_url: supporter.avatar_url || '',
      thank_you_text: supporter.thank_you_text,
      is_active: supporter.is_active,
      sort_order: supporter.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupporter) {
      updateMutation.mutate({ id: editingSupporter.id, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">إدارة الداعمين</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {supporters.length} داعم
          </span>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              إضافة داعم
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingSupporter ? 'تعديل داعم' : 'إضافة داعم جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الداعم *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أحمد محمد"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handle">معرف الحساب *</Label>
                <Input
                  id="handle"
                  value={formData.handle}
                  onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                  placeholder="@username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">رابط الصورة (اختياري)</Label>
                <Input
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thank_you_text">نص الشكر</Label>
                <Textarea
                  id="thank_you_text"
                  value={formData.thank_you_text}
                  onChange={(e) => setFormData({ ...formData, thank_you_text: e.target.value })}
                  placeholder="شكرًا جزيلًا لدعمك..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">مفعّل</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={addMutation.isPending || updateMutation.isPending}>
                  {(addMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingSupporter ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supporters List */}
      <div className="space-y-2">
        <AnimatePresence>
          {supporters.map((supporter, index) => (
            <motion.div
              key={supporter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`neon-card p-3 flex items-center gap-3 ${!supporter.is_active ? 'opacity-50' : ''}`}
            >
              {/* Avatar */}
              {supporter.avatar_url ? (
                <img 
                  src={supporter.avatar_url} 
                  alt={supporter.name}
                  className="w-10 h-10 rounded-full object-cover border border-primary/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{getInitials(supporter.name)}</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm truncate">{supporter.name}</span>
                  <span className="text-xs text-primary">{supporter.handle}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{supporter.thank_you_text}</p>
              </div>

              {/* Order Controls */}
              <div className="flex flex-col gap-0.5">
                <button 
                  onClick={() => moveSupporter(supporter, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => moveSupporter(supporter, 'down')}
                  disabled={index === supporters.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              {/* Toggle Active */}
              <Switch
                checked={supporter.is_active}
                onCheckedChange={() => toggleActive(supporter)}
                className="scale-75"
              />

              {/* Actions */}
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(supporter)}
                  className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    if (confirm('هل أنت متأكد من حذف هذا الداعم؟')) {
                      deleteMutation.mutate(supporter.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {supporters.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا يوجد داعمين بعد</p>
            <p className="text-xs">اضغط على "إضافة داعم" للبدء</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportersManagement;
