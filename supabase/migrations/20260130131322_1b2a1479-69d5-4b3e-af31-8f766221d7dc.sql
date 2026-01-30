-- Create special_id_requests table
CREATE TABLE public.special_id_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gala_user_id TEXT NOT NULL,
    gala_username TEXT,
    user_level INTEGER NOT NULL,
    digit_length INTEGER NOT NULL,
    pattern_code TEXT NOT NULL,
    preferred_exact_id TEXT,
    profile_screenshot_url TEXT NOT NULL,
    ai_verified_level INTEGER,
    ai_verification_status TEXT DEFAULT 'pending',
    ai_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'banned')),
    admin_notes TEXT,
    rejection_reason TEXT,
    ban_expires_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.special_id_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create requests
CREATE POLICY "Anyone can create special id requests"
ON public.special_id_requests
FOR INSERT
WITH CHECK (true);

-- Anyone can view their own requests by gala_user_id
CREATE POLICY "Anyone can view requests by gala_user_id"
ON public.special_id_requests
FOR SELECT
USING (true);

-- Super admin can update
CREATE POLICY "Super admin can update special id requests"
ON public.special_id_requests
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Super admin can delete
CREATE POLICY "Super admin can delete special id requests"
ON public.special_id_requests
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_special_id_requests_gala_user_id ON public.special_id_requests(gala_user_id);
CREATE INDEX idx_special_id_requests_status ON public.special_id_requests(status);
CREATE INDEX idx_special_id_requests_created_at ON public.special_id_requests(created_at DESC);