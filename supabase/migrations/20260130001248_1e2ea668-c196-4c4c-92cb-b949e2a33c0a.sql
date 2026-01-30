-- Add agency_code column to payout_requests table
ALTER TABLE public.payout_requests 
ADD COLUMN agency_code text;

-- Create blocked agency codes table for admin management
CREATE TABLE public.blocked_agency_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    message text NOT NULL DEFAULT 'عفواً، يرجى استلام راتبك من وكيلك لأن راتبك عنده',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.blocked_agency_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can view blocked codes (needed for frontend validation)
CREATE POLICY "Anyone can view blocked codes"
ON public.blocked_agency_codes
FOR SELECT
USING (true);

-- Only super admins can manage blocked codes
CREATE POLICY "Super admins can manage blocked codes"
ON public.blocked_agency_codes
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Insert default blocked code "10"
INSERT INTO public.blocked_agency_codes (code, message) 
VALUES ('10', 'عفواً، يرجى استلام راتبك من وكيلك لأن راتبك عنده');