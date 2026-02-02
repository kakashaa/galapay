-- Add column to track user edits on reserved requests
ALTER TABLE public.payout_requests
ADD COLUMN user_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add column to store previous payout method before edit
ALTER TABLE public.payout_requests
ADD COLUMN previous_payout_method TEXT DEFAULT NULL;

-- Add column to store previous receipt image before edit  
ALTER TABLE public.payout_requests
ADD COLUMN previous_receipt_image_url TEXT DEFAULT NULL;

-- Create policy for users to update their own reserved requests (only specific fields)
-- Note: Users can only update when status is 'reserved'
CREATE OR REPLACE FUNCTION public.user_can_edit_reserved_request(request_tracking_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payout_requests
    WHERE tracking_code = request_tracking_code
      AND status = 'reserved'
      AND deleted_at IS NULL
  )
$$;