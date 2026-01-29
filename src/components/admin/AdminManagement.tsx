import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2, Shield, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AdminUser {
  user_id: string;
  display_name: string;
  role: 'admin' | 'staff' | 'super_admin';
  email?: string;
}

interface AdminManagementProps {
  onUpdate?: () => void;
}

const AdminManagement = ({ onUpdate }: AdminManagementProps) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'admin' as 'admin' | 'staff',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      // Get user_roles with admin_profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'staff', 'super_admin']);

      if (rolesError) throw rolesError;

      // Get admin profiles
      const { data: profilesData } = await supabase
        .from('admin_profiles')
        .select('user_id, display_name');

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.display_name]) || []);

      const adminList: AdminUser[] = rolesData?.map(r => ({
        user_id: r.user_id,
        display_name: profilesMap.get(r.user_id) || 'مدير',
        role: r.role as 'admin' | 'staff' | 'super_admin',
      })) || [];

      setAdmins(adminList);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.displayName) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      // Call the setup-admins function with new admin data
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: {
          email: newAdmin.email,
          password: newAdmin.password,
          displayName: newAdmin.displayName,
          role: newAdmin.role,
        },
      });

      if (error) throw error;

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء حساب المدير بنجاح',
      });

      setIsAddDialogOpen(false);
      setNewAdmin({ email: '', password: '', displayName: '', role: 'admin' });
      fetchAdmins();
      onUpdate?.();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء حساب المدير',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAdmin = async (userId: string, displayName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المدير "${displayName}"؟`)) {
      return;
    }

    try {
      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Delete admin profile
      await supabase
        .from('admin_profiles')
        .delete()
        .eq('user_id', userId);

      toast({
        title: 'تم الحذف',
        description: 'تم حذف المدير بنجاح',
      });

      fetchAdmins();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المدير',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    return role === 'super_admin' ? (
      <ShieldCheck className="w-4 h-4 text-primary" />
    ) : (
      <Shield className="w-4 h-4 text-muted-foreground" />
    );
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'مسؤول أعلى';
      case 'admin':
        return 'مدير';
      case 'staff':
        return 'موظف';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg text-foreground">إدارة المديرين</h3>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              <span>إضافة مدير</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مدير جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم العرض</label>
                <input
                  type="text"
                  value={newAdmin.displayName}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, displayName: e.target.value }))}
                  className="input-field"
                  placeholder="مثال: أحمد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  placeholder="admin@example.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">كلمة المرور</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field"
                  placeholder="********"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الصلاحية</label>
                <Select
                  value={newAdmin.role}
                  onValueChange={(value) => setNewAdmin(prev => ({ ...prev, role: value as 'admin' | 'staff' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="staff">موظف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={handleCreateAdmin}
                disabled={creating}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                إنشاء المدير
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {admins.map((admin) => (
          <div
            key={admin.user_id}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              {getRoleIcon(admin.role)}
              <div>
                <p className="font-medium text-foreground">{admin.display_name}</p>
                <p className="text-sm text-muted-foreground">{getRoleLabel(admin.role)}</p>
              </div>
            </div>
            {admin.role !== 'super_admin' && (
              <button
                onClick={() => handleDeleteAdmin(admin.user_id, admin.display_name)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="حذف المدير"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {admins.length === 0 && (
          <p className="text-center text-muted-foreground py-4">لا يوجد مديرين</p>
        )}
      </div>
    </div>
  );
};

export default AdminManagement;
