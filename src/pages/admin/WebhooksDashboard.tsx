import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Webhook, 
  Settings, 
  History, 
  Save, 
  Copy, 
  Check, 
  X,
  RefreshCw,
  ExternalLink,
  Key,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface WebhookConfig {
  id: string;
  webhook_url: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationLog {
  id: string;
  request_type: string;
  request_id: string;
  tracking_code: string | null;
  payload: Record<string, unknown>;
  sent_at: string;
  status: string;
  response_code: number | null;
  error_message: string | null;
}

const WebhooksDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    webhook_url: '',
    is_active: true,
  });

  // Get the base URL for the lookup endpoint
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const lookupEndpoint = `${supabaseUrl}/functions/v1/webhook-lookup`;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch webhook config
      const { data: configData, error: configError } = await supabase
        .from('webhook_config')
        .select('*')
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Error fetching config:', configError);
      }
      
      if (configData) {
        setConfig(configData as WebhookConfig);
        setFormData({
          webhook_url: configData.webhook_url,
          is_active: configData.is_active,
        });
      }

      // Fetch notification logs
      const { data: logsData, error: logsError } = await supabase
        .from('notification_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching logs:', logsError);
      } else {
        setLogs((logsData as NotificationLog[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.webhook_url.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رابط الـ Webhook',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL format
    try {
      new URL(formData.webhook_url);
    } catch {
      toast({
        title: 'خطأ',
        description: 'رابط الـ Webhook غير صالح',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (config) {
        // Update existing config
        const { error } = await supabase
          .from('webhook_config')
          .update({
            webhook_url: formData.webhook_url.trim(),
            is_active: formData.is_active,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('webhook_config')
          .insert({
            webhook_url: formData.webhook_url.trim(),
            is_active: formData.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        setConfig(data as WebhookConfig);
      }

      toast({
        title: '✅ تم الحفظ',
        description: 'تم حفظ إعدادات الـ Webhook بنجاح',
      });

      fetchData();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ الإعدادات',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: '📋 تم النسخ',
        description: 'تم نسخ النص إلى الحافظة',
      });
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 ml-1" />نجح</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><X className="w-3 h-3 ml-1" />فشل</Badge>;
      case 'sending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 ml-1" />جاري الإرسال</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  const getRequestTypeName = (type: string) => {
    const types: Record<string, string> = {
      'payout_request': 'طلب سحب شهري',
      'instant_payout': 'سحب فوري',
      'special_id': 'أيدي مميز',
      'ban_report': 'بلاغ حظر',
      'coins_payout': 'طلب كوينزات',
    };
    return types[type] || type;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-background to-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Webhook className="w-6 h-6" />
            <h1 className="text-lg font-bold">إعدادات Webhook</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              السجل
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {/* Webhook URL */}
            <Card className="bg-card/50 backdrop-blur border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  رابط الـ Webhook
                </CardTitle>
                <CardDescription>
                  سيتم إرسال إشعار POST لهذا الرابط عند إنشاء أي طلب جديد
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://your-webhook-url.com/endpoint"
                  className="bg-background/50 border-purple-500/30"
                  dir="ltr"
                />
                
                <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">تفعيل الإشعارات</span>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>

            {/* API Key */}
            {config && (
              <Card className="bg-card/50 backdrop-blur border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    مفتاح API
                  </CardTitle>
                  <CardDescription>
                    استخدم هذا المفتاح للوصول إلى endpoint الاستعلام
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={config.api_key}
                      readOnly
                      className="bg-background/30 border-purple-500/30 font-mono text-xs"
                      dir="ltr"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(config.api_key, 'api_key')}
                    >
                      {copiedField === 'api_key' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lookup Endpoint */}
            <Card className="bg-card/50 backdrop-blur border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Lookup API Endpoint
                </CardTitle>
                <CardDescription>
                  استخدم هذا الـ endpoint للاستعلام عن بيانات الطلبات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={lookupEndpoint}
                    readOnly
                    className="bg-background/30 border-purple-500/30 font-mono text-xs"
                    dir="ltr"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(lookupEndpoint, 'endpoint')}
                  >
                    {copiedField === 'endpoint' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Usage Examples */}
                <div className="bg-background/30 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-purple-300">أمثلة الاستخدام:</p>
                  <div className="space-y-2 text-xs font-mono text-muted-foreground" dir="ltr">
                    <p className="bg-black/30 p-2 rounded">
                      GET {lookupEndpoint}?type=payout&tracking_code=ABC123
                    </p>
                    <p className="bg-black/30 p-2 rounded">
                      GET {lookupEndpoint}?type=instant&id=uuid-here
                    </p>
                    <p className="bg-black/30 p-2 rounded">
                      Header: x-api-key: YOUR_API_KEY
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    الأنواع المتاحة: payout, instant, special_id, ban, coins
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="bg-card/50 backdrop-blur border-purple-500/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-purple-400 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    سجل الإشعارات
                  </CardTitle>
                  <CardDescription>
                    آخر 100 إشعار مرسل
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 ml-1" />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                      <p>لا توجد إشعارات مرسلة بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-background/30 rounded-lg p-3 border border-purple-500/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getRequestTypeName(log.request_type)}
                              </Badge>
                              {log.tracking_code && (
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {log.tracking_code}
                                </Badge>
                              )}
                            </div>
                            {getStatusBadge(log.status)}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm:ss', { locale: ar })}
                            </span>
                            {log.response_code && (
                              <span className="font-mono">HTTP {log.response_code}</span>
                            )}
                          </div>
                          {log.error_message && (
                            <p className="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded">
                              {log.error_message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WebhooksDashboard;
