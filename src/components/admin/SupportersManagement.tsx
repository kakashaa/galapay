import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, Users, Loader2, Upload, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Sortable Supporter Item Component
const SortableSupporterItem = ({ 
  supporter, 
  onEdit, 
  onDelete, 
  onToggleActive,
  getInitials 
}: { 
  supporter: Supporter;
  onEdit: (s: Supporter) => void;
  onDelete: (id: string) => void;
  onToggleActive: (s: Supporter) => void;
  getInitials: (name: string) => string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: supporter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`neon-card p-3 flex items-center gap-3 ${!supporter.is_active ? 'opacity-50' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      {/* Drag Handle */}
      <button 
        {...attributes} 
        {...listeners}
        className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

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

      {/* Toggle Active */}
      <Switch
        checked={supporter.is_active}
        onCheckedChange={() => onToggleActive(supporter)}
        className="scale-75"
      />

      {/* Actions */}
      <div className="flex gap-1">
        <button 
          onClick={() => onEdit(supporter)}
          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => {
            if (confirm('هل أنت متأكد من حذف هذا الداعم؟')) {
              onDelete(supporter.id);
            }
          }}
          className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

const SupportersManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupporter, setEditingSupporter] = useState<Supporter | null>(null);
  const [formData, setFormData] = useState<SupporterFormData>(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch all supporters
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

  // Upload avatar to storage
  const uploadAvatar = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('supporter-avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('supporter-avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'يرجى اختيار صورة', variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت', variant: 'destructive' });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const url = await uploadAvatar(file);
      setFormData(prev => ({ ...prev, avatar_url: url }));
      toast({ title: 'تم رفع الصورة بنجاح ✅' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'فشل في رفع الصورة', variant: 'destructive' });
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Generate AI thank you message
  const generateThankYouMessage = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'يرجى إدخال اسم الداعم أولاً', variant: 'destructive' });
      return;
    }

    setIsGeneratingMessage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-thank-you', {
        body: { supporterName: formData.name }
      });

      if (error) throw error;

      if (data?.thankYouText) {
        setFormData(prev => ({ ...prev, thank_you_text: data.thankYouText }));
        toast({ title: 'تم توليد رسالة الشكر ✨' });
      }
    } catch (error) {
      console.error('Error generating message:', error);
      toast({ title: 'فشل في توليد الرسالة', variant: 'destructive' });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

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

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = supporters.findIndex(s => s.id === active.id);
    const newIndex = supporters.findIndex(s => s.id === over.id);

    const reorderedSupporters = arrayMove(supporters, oldIndex, newIndex);

    // Update sort orders in database
    const updates = reorderedSupporters.map((s, index) => ({
      id: s.id,
      sort_order: index + 1,
    }));

    // Optimistically update UI
    queryClient.setQueryData(['admin-supporters'], reorderedSupporters.map((s, i) => ({ ...s, sort_order: i + 1 })));

    // Update in database
    for (const update of updates) {
      await supabase
        .from('supporters')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }

    queryClient.invalidateQueries({ queryKey: ['supporters'] });
    toast({ title: 'تم تحديث الترتيب ✅' });
  }, [supporters, queryClient]);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingSupporter(null);
    setIsDialogOpen(false);
    setPreviewImage(null);
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
    setPreviewImage(supporter.avatar_url);
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

  const removeImage = () => {
    setPreviewImage(null);
    setFormData(prev => ({ ...prev, avatar_url: '' }));
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
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingSupporter ? 'تعديل داعم' : 'إضافة داعم جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>صورة الداعم</Label>
                <div className="flex items-center gap-3">
                  {/* Preview */}
                  <div className="relative">
                    {previewImage || formData.avatar_url ? (
                      <div className="relative">
                        <img 
                          src={previewImage || formData.avatar_url} 
                          alt="Preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary/40"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span className="text-sm">
                          {isUploading ? 'جاري الرفع...' : 'رفع صورة'}
                        </span>
                      </div>
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      أو أدخل رابط الصورة أدناه
                    </p>
                  </div>
                </div>

                {/* URL Input */}
                <Input
                  value={formData.avatar_url}
                  onChange={(e) => {
                    setFormData({ ...formData, avatar_url: e.target.value });
                    setPreviewImage(e.target.value || null);
                  }}
                  placeholder="https://..."
                  type="url"
                  className="text-xs"
                />
              </div>

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="thank_you_text">نص الشكر</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateThankYouMessage}
                    disabled={isGeneratingMessage || !formData.name.trim()}
                    className="gap-1 h-7 text-xs"
                  >
                    {isGeneratingMessage ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    توليد بالذكاء الاصطناعي
                  </Button>
                </div>
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

      {/* Drag hint */}
      {supporters.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          اسحب وأفلت لتغيير ترتيب الداعمين ↕️
        </p>
      )}

      {/* Supporters List with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={supporters.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            <AnimatePresence>
              {supporters.map((supporter) => (
                <SortableSupporterItem
                  key={supporter.id}
                  supporter={supporter}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onToggleActive={toggleActive}
                  getInitials={getInitials}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      {supporters.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>لا يوجد داعمين بعد</p>
          <p className="text-xs">اضغط على "إضافة داعم" للبدء</p>
        </div>
      )}
    </div>
  );
};

export default SupportersManagement;
