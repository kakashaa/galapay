-- Create webhook_config table
CREATE TABLE public.webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_url TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_log table
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL,
  request_id UUID NOT NULL,
  tracking_code TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  error_message TEXT
);

-- Enable RLS on both tables
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_config
CREATE POLICY "Super admins can manage webhook_config" 
ON public.webhook_config 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view webhook_config" 
ON public.webhook_config 
FOR SELECT 
USING (is_admin_or_staff(auth.uid()));

-- RLS policies for notification_log
CREATE POLICY "Admins can view notification_log" 
ON public.notification_log 
FOR SELECT 
USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Anyone can insert notification_log" 
ON public.notification_log 
FOR INSERT 
WITH CHECK (true);

-- Create updated_at trigger for webhook_config
CREATE TRIGGER update_webhook_config_updated_at
BEFORE UPDATE ON public.webhook_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_notification_log_request_type ON public.notification_log(request_type);
CREATE INDEX idx_notification_log_sent_at ON public.notification_log(sent_at DESC);