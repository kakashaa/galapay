-- Add columns to track who processed the request
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payout_requests_processed_by ON public.payout_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_country ON public.payout_requests(country);

-- Create function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Update RLS policy for payout_requests to allow super_admin to delete
CREATE POLICY "Super admins can delete requests"
ON public.payout_requests
FOR DELETE
USING (is_super_admin(auth.uid()));