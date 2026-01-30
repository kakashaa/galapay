-- Add 'reserved' to the request_status enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'reserved';

-- Add reservation_reason column to payout_requests table for storing the reason
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS reservation_reason TEXT;