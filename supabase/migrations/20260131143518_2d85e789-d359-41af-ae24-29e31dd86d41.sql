-- Add deleted_at column to payout_requests for soft delete
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add deleted_at column to instant_payout_requests for soft delete
ALTER TABLE public.instant_payout_requests 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add deleted_at column to ban_reports for soft delete
ALTER TABLE public.ban_reports 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add deleted_at column to special_id_requests for soft delete
ALTER TABLE public.special_id_requests 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Store the trash PIN in app_settings (hashed)
INSERT INTO public.app_settings (key, value)
VALUES ('trash_pin_hash', '"5e884898da28047d9166e1c2c1f5b4d3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create index for faster queries on deleted items
CREATE INDEX IF NOT EXISTS idx_payout_requests_deleted_at ON public.payout_requests(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instant_payout_requests_deleted_at ON public.instant_payout_requests(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ban_reports_deleted_at ON public.ban_reports(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_special_id_requests_deleted_at ON public.special_id_requests(deleted_at) WHERE deleted_at IS NOT NULL;