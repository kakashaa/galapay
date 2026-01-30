-- Create enum for instant request status
CREATE TYPE public.instant_request_status AS ENUM ('pending', 'processing', 'completed', 'rejected');

-- Create available_banks table for admin-managed bank accounts
CREATE TABLE public.available_banks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code TEXT NOT NULL,
    country_name_arabic TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    bank_name_arabic TEXT NOT NULL,
    account_holder_name TEXT,
    account_number TEXT,
    iban TEXT,
    additional_info JSONB DEFAULT '{}'::jsonb,
    icon_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create external_charging_links table for Visa/Mastercard links
CREATE TABLE public.external_charging_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_arabic TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create instant_payout_requests table
CREATE TABLE public.instant_payout_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_code TEXT NOT NULL UNIQUE,
    status instant_request_status NOT NULL DEFAULT 'pending',
    
    -- Supporter (الدعم) information
    supporter_name TEXT NOT NULL,
    supporter_account_id TEXT NOT NULL,
    supporter_amount_usd NUMERIC NOT NULL,
    supporter_bank_id UUID REFERENCES public.available_banks(id),
    supporter_receipt_url TEXT NOT NULL,
    supporter_receipt_reference TEXT,
    
    -- Host (المضيف) information
    host_name TEXT NOT NULL,
    host_account_id TEXT NOT NULL,
    host_coins_amount NUMERIC NOT NULL,
    host_receipt_url TEXT NOT NULL,
    host_receipt_reference TEXT NOT NULL,
    
    -- Host payout details (same structure as monthly)
    host_country TEXT NOT NULL,
    host_country_dial_code TEXT NOT NULL,
    host_phone_number TEXT NOT NULL,
    host_payout_method TEXT NOT NULL,
    host_recipient_full_name TEXT NOT NULL,
    host_method_fields JSONB DEFAULT '{}'::jsonb,
    host_payout_amount NUMERIC NOT NULL,
    host_currency TEXT NOT NULL DEFAULT 'USD',
    
    -- AI validation
    ai_supporter_receipt_status TEXT,
    ai_host_receipt_status TEXT,
    ai_notes TEXT,
    
    -- Admin processing
    admin_notes TEXT,
    rejection_reason TEXT,
    admin_final_receipt_url TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for tracking code lookups
CREATE INDEX idx_instant_payout_tracking_code ON public.instant_payout_requests(tracking_code);
CREATE INDEX idx_instant_payout_status ON public.instant_payout_requests(status);
CREATE INDEX idx_instant_payout_host_receipt_reference ON public.instant_payout_requests(host_receipt_reference);

-- Enable RLS on all tables
ALTER TABLE public.available_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_charging_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instant_payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for available_banks
CREATE POLICY "Anyone can view active banks"
ON public.available_banks FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage banks"
ON public.available_banks FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for external_charging_links
CREATE POLICY "Anyone can view active charging links"
ON public.external_charging_links FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage charging links"
ON public.external_charging_links FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for instant_payout_requests
CREATE POLICY "Anyone can create instant payout requests"
ON public.instant_payout_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view by tracking code"
ON public.instant_payout_requests FOR SELECT
USING (true);

CREATE POLICY "Only super admin can update instant requests"
ON public.instant_payout_requests FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete instant requests"
ON public.instant_payout_requests FOR DELETE
USING (is_super_admin(auth.uid()));

-- Create function to check if reference number already used
CREATE OR REPLACE FUNCTION public.is_reference_used(ref_number TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.instant_payout_requests
        WHERE host_receipt_reference = ref_number
    ) OR EXISTS (
        SELECT 1 FROM public.payout_requests
        WHERE reference_number = ref_number
    )
$$;

-- Insert default banks data
INSERT INTO public.available_banks (country_code, country_name_arabic, bank_name, bank_name_arabic, account_holder_name, account_number, additional_info, icon_url, display_order) VALUES
-- USA Banks
('US', 'أمريكا', 'Cash App', 'كاش آب', NULL, NULL, '{"cashtag": "$username"}'::jsonb, '/wallets/cashapp.png', 1),
('US', 'أمريكا', 'Zelle', 'زيلي', NULL, NULL, '{"email_or_phone": "example@email.com"}'::jsonb, '/wallets/zelle.png', 2),
('US', 'أمريكا', 'Chime', 'تشايم', NULL, NULL, '{}'::jsonb, '/wallets/chime.png', 3),
('US', 'أمريكا', 'Apple Pay', 'آبل باي', NULL, NULL, '{}'::jsonb, '/wallets/apple-pay.png', 4),

-- Yemen Banks
('YE', 'اليمن', 'Any Transfer', 'أي حوالة', 'حمزه علي حسين غالب', NULL, '{}'::jsonb, NULL, 1),
('YE', 'اليمن', 'Jaib', 'جيب', 'حمزه علي حسين غالب', '776168713', '{"alt_number": "1542377"}'::jsonb, '/wallets/jaib.png', 2),
('YE', 'اليمن', 'Kuraimi SAR', 'الكريمي - ريال سعودي', 'حمزه علي حسين غالب', '3183733892', '{"currency": "SAR"}'::jsonb, '/wallets/kuraimi.png', 3),
('YE', 'اليمن', 'Kuraimi USD', 'الكريمي - دولار', 'حمزه علي حسين غالب', '3183929703', '{"currency": "USD"}'::jsonb, '/wallets/kuraimi.png', 4),
('YE', 'اليمن', 'Kuraimi YER', 'الكريمي - ريال يمني', 'حمزه علي حسين غالب', '3183742708', '{"currency": "YER"}'::jsonb, '/wallets/kuraimi.png', 5),

-- Saudi Arabia Banks
('SA', 'السعودية', 'Al Rajhi Bank', 'بنك الراجحي', 'Assaf ali ghalib', '618000010006080901670', '{"iban": "SA6780000618608010901670"}'::jsonb, NULL, 1);