import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InstantPayoutSettings {
  enabled: boolean;
}

export const useInstantPayoutSettings = () => {
  const [settings, setSettings] = useState<InstantPayoutSettings>({ enabled: true });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'instant_payout_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error fetching instant payout settings:', error);
        return;
      }

      if (data?.value) {
        const value = data.value as unknown as InstantPayoutSettings;
        setSettings({
          enabled: value.enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<InstantPayoutSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('app_settings')
        .update({ value: updatedSettings })
        .eq('key', 'instant_payout_enabled');

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
    instantPayoutEnabled: settings.enabled,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};
