import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PayoutSettings {
  enabled: boolean;
  next_date: string;
}

export const usePayoutSettings = () => {
  const [settings, setSettings] = useState<PayoutSettings>({ enabled: true, next_date: '30' });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'payout_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error fetching payout settings:', error);
        return;
      }

      if (data?.value) {
        const value = data.value as unknown as PayoutSettings;
        setSettings({
          enabled: value.enabled ?? true,
          next_date: value.next_date ?? '30',
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<PayoutSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('app_settings')
        .update({ value: updatedSettings })
        .eq('key', 'payout_enabled');

      if (error) throw error;

      setSettings(updatedSettings);
      return { success: true };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    payoutEnabled: settings.enabled,
    nextPayoutDate: settings.next_date,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};
