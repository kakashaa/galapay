-- Add claimed_by column to track who is currently working on the request
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone;

-- Create admin_profiles table to store admin display names
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_profiles
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_profiles
CREATE POLICY "Admins can view all admin_profiles" ON public.admin_profiles
FOR SELECT USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Super admins can manage admin_profiles" ON public.admin_profiles
FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Insert existing admin profiles
INSERT INTO public.admin_profiles (user_id, display_name)
SELECT ur.user_id, 
  CASE 
    WHEN au.raw_user_meta_data->>'username' IS NOT NULL THEN au.raw_user_meta_data->>'username'
    ELSE 'مدير'
  END
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role IN ('admin', 'staff', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger for admin_profiles updated_at
CREATE TRIGGER update_admin_profiles_updated_at
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();