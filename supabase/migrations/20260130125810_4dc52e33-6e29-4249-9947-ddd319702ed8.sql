-- Create ban_type enum
CREATE TYPE public.ban_type AS ENUM ('promotion', 'insult', 'defamation');

-- Create ban_reports table
CREATE TABLE public.ban_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_gala_id TEXT NOT NULL,
    reported_user_id TEXT NOT NULL,
    ban_type ban_type NOT NULL,
    description TEXT,
    evidence_url TEXT NOT NULL,
    evidence_type TEXT NOT NULL DEFAULT 'image',
    is_verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    reward_amount INTEGER,
    reward_paid BOOLEAN DEFAULT false,
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ban_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can create ban reports (no auth required for this app)
CREATE POLICY "Anyone can create ban reports"
ON public.ban_reports
FOR INSERT
WITH CHECK (true);

-- Anyone can view verified ban reports (for search feature)
CREATE POLICY "Anyone can view verified ban reports"
ON public.ban_reports
FOR SELECT
USING (is_verified = true OR is_super_admin(auth.uid()));

-- Only super admin can update ban reports
CREATE POLICY "Super admin can update ban reports"
ON public.ban_reports
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Only super admin can delete ban reports
CREATE POLICY "Super admin can delete ban reports"
ON public.ban_reports
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_ban_reports_updated_at
BEFORE UPDATE ON public.ban_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
CREATE POLICY "Anyone can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Anyone can view attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'attachments');

CREATE POLICY "Super admins can delete attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'attachments' AND is_super_admin(auth.uid()));