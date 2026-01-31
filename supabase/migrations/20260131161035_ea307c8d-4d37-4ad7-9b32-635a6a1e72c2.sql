-- Create flagged_references table to track blocked reference numbers
CREATE TABLE public.flagged_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  original_account_id TEXT NOT NULL,
  flagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT NOT NULL DEFAULT 'duplicate_monthly_payout',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flagged_references ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a reference is flagged (read)
CREATE POLICY "Anyone can view flagged references"
ON public.flagged_references
FOR SELECT
USING (true);

-- Anyone can insert flagged references (when duplicate detected)
CREATE POLICY "Anyone can flag references"
ON public.flagged_references
FOR INSERT
WITH CHECK (true);

-- Only super admin can delete flagged references
CREATE POLICY "Super admin can delete flagged references"
ON public.flagged_references
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Create coins_payout_requests table for coins-only payouts
CREATE TABLE public.coins_payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_code TEXT NOT NULL DEFAULT generate_tracking_code(),
  gala_account_id TEXT NOT NULL,
  gala_username TEXT,
  amount_usd NUMERIC NOT NULL,
  coins_amount NUMERIC NOT NULL,
  reference_number TEXT NOT NULL,
  receipt_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coins_payout_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create coins payout requests
CREATE POLICY "Anyone can create coins payout requests"
ON public.coins_payout_requests
FOR INSERT
WITH CHECK (true);

-- Anyone can view by tracking code
CREATE POLICY "Anyone can view coins payout requests"
ON public.coins_payout_requests
FOR SELECT
USING (true);

-- Only super admin can update
CREATE POLICY "Super admin can update coins payout requests"
ON public.coins_payout_requests
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Only super admin can delete
CREATE POLICY "Super admin can delete coins payout requests"
ON public.coins_payout_requests
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_coins_payout_requests_updated_at
BEFORE UPDATE ON public.coins_payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();