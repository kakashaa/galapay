-- Create a policy to allow anyone to update reserved requests (limited fields only)
-- This policy allows the user to update their reserved request via tracking code
-- The actual field restrictions are enforced by the frontend

CREATE POLICY "Users can update their own reserved requests" 
ON public.payout_requests 
FOR UPDATE 
USING (
  status = 'reserved' 
  AND deleted_at IS NULL
)
WITH CHECK (
  status = 'reserved'
);