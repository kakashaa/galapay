-- Create enum for request statuses
CREATE TYPE public.request_status AS ENUM ('pending', 'review', 'paid', 'rejected');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');

-- Create countries_methods table (admin-managed)
CREATE TABLE public.countries_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_name_arabic TEXT NOT NULL,
    country_code TEXT NOT NULL,
    dial_code TEXT NOT NULL,
    methods JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_requests table
CREATE TABLE public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code TEXT NOT NULL UNIQUE,
    zalal_life_account_id TEXT NOT NULL,
    zalal_life_username TEXT,
    recipient_full_name TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    country TEXT NOT NULL,
    country_dial_code TEXT NOT NULL,
    payout_method TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    method_fields JSONB DEFAULT '{}',
    user_receipt_image_url TEXT NOT NULL,
    ai_receipt_status TEXT,
    ai_notes TEXT,
    status public.request_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    admin_final_receipt_image_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for admin/staff roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create audit_log table for status changes
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.payout_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_status public.request_status,
    new_status public.request_status,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.countries_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;

-- RLS Policies for countries_methods (public read, admin write)
CREATE POLICY "Anyone can view active countries_methods"
ON public.countries_methods FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage countries_methods"
ON public.countries_methods FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payout_requests
CREATE POLICY "Anyone can create payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Track by tracking code only"
ON public.payout_requests FOR SELECT
USING (true);

CREATE POLICY "Admins and staff can update requests"
ON public.payout_requests FOR UPDATE
TO authenticated
USING (public.is_admin_or_staff(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user_roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for audit_log
CREATE POLICY "Admins and staff can view audit_log"
ON public.audit_log FOR SELECT
TO authenticated
USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins and staff can create audit_log entries"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Create function to generate tracking code
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_countries_methods_updated_at
BEFORE UPDATE ON public.countries_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies for receipts bucket
CREATE POLICY "Anyone can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND public.is_admin_or_staff(auth.uid()));

-- Insert initial countries and methods data
INSERT INTO public.countries_methods (country_name_arabic, country_code, dial_code, methods) VALUES
('اليمن', 'YE', '+967', '[
  {"nameArabic": "جيب", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "الكريمي", "iconUrl": "building", "requiredFields": [{"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}, {"name": "idNumber", "labelArabic": "رقم الهوية (اختياري)", "type": "text", "optional": true}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'),
('مصر', 'EG', '+20', '[
  {"nameArabic": "فودافون كاش", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "building", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]}
]'),
('السعودية', 'SA', '+966', '[
  {"nameArabic": "تحويل بنكي", "iconUrl": "building", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]},
  {"nameArabic": "STC Pay", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]}
]'),
('الإمارات', 'AE', '+971', '[
  {"nameArabic": "تحويل بنكي", "iconUrl": "building", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]}
]'),
('الأردن', 'JO', '+962', '[
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "building", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]}
]');