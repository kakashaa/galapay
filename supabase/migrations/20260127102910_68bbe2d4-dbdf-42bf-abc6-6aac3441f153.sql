-- Add reference_number column to payout_requests table
ALTER TABLE public.payout_requests 
ADD COLUMN reference_number TEXT;

-- Create unique index on reference_number (only for non-null values)
CREATE UNIQUE INDEX idx_payout_requests_reference_number 
ON public.payout_requests(reference_number) 
WHERE reference_number IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.payout_requests.reference_number IS 'Unique reference number from the receipt image - can only be used once';