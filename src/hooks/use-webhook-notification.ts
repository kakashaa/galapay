import { supabase } from '@/integrations/supabase/client';

interface WebhookPayload {
  request_type: string;
  request_id: string;
  tracking_code?: string;
  name?: string;
  account_id?: string;
  amount?: number;
  currency?: string;
  created_at: string;
  additional_data?: Record<string, unknown>;
}

export const sendWebhookNotification = async (payload: WebhookPayload): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-webhook-notification', {
      body: payload,
    });

    if (error) {
      console.error('Error sending webhook notification:', error);
    }
  } catch (error) {
    // Don't throw - webhook failure shouldn't block the main operation
    console.error('Webhook notification failed:', error);
  }
};

// Helper functions for different request types
export const notifyNewPayoutRequest = async (data: {
  id: string;
  tracking_code: string;
  zalal_life_username?: string;
  zalal_life_account_id: string;
  amount: number;
  currency: string;
  country: string;
  payout_method: string;
  created_at: string;
}) => {
  await sendWebhookNotification({
    request_type: 'payout_request',
    request_id: data.id,
    tracking_code: data.tracking_code,
    name: data.zalal_life_username || data.zalal_life_account_id,
    account_id: data.zalal_life_account_id,
    amount: data.amount,
    currency: data.currency,
    created_at: data.created_at,
    additional_data: {
      country: data.country,
      payout_method: data.payout_method,
    },
  });
};

export const notifyNewInstantPayout = async (data: {
  id: string;
  tracking_code: string;
  supporter_name: string;
  supporter_account_id: string;
  host_name: string;
  host_account_id: string;
  supporter_amount_usd: number;
  host_coins_amount: number;
  created_at: string;
}) => {
  await sendWebhookNotification({
    request_type: 'instant_payout',
    request_id: data.id,
    tracking_code: data.tracking_code,
    name: data.supporter_name,
    account_id: data.supporter_account_id,
    amount: data.supporter_amount_usd,
    currency: 'USD',
    created_at: data.created_at,
    additional_data: {
      host_name: data.host_name,
      host_account_id: data.host_account_id,
      host_coins_amount: data.host_coins_amount,
    },
  });
};

export const notifyNewSpecialIdRequest = async (data: {
  id: string;
  gala_user_id: string;
  gala_username?: string;
  user_level: number;
  digit_length: number;
  pattern_code: string;
  created_at: string;
}) => {
  await sendWebhookNotification({
    request_type: 'special_id',
    request_id: data.id,
    name: data.gala_username || data.gala_user_id,
    account_id: data.gala_user_id,
    created_at: data.created_at,
    additional_data: {
      user_level: data.user_level,
      digit_length: data.digit_length,
      pattern_code: data.pattern_code,
    },
  });
};

export const notifyNewBanReport = async (data: {
  id: string;
  reporter_gala_id: string;
  reported_user_id: string;
  ban_type: string;
  created_at: string;
}) => {
  await sendWebhookNotification({
    request_type: 'ban_report',
    request_id: data.id,
    account_id: data.reporter_gala_id,
    created_at: data.created_at,
    additional_data: {
      reported_user_id: data.reported_user_id,
      ban_type: data.ban_type,
    },
  });
};

export const notifyNewCoinsPayout = async (data: {
  id: string;
  tracking_code: string;
  gala_account_id: string;
  gala_username?: string;
  amount_usd: number;
  coins_amount: number;
  created_at: string;
}) => {
  await sendWebhookNotification({
    request_type: 'coins_payout',
    request_id: data.id,
    tracking_code: data.tracking_code,
    name: data.gala_username || data.gala_account_id,
    account_id: data.gala_account_id,
    amount: data.amount_usd,
    currency: 'USD',
    created_at: data.created_at,
    additional_data: {
      coins_amount: data.coins_amount,
    },
  });
};
