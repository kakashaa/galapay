-- Add flag fields to payout_requests for duplicate detection
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS is_duplicate_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_flag_reason text;

-- Create index for faster reference number lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_reference_number ON public.payout_requests(reference_number);