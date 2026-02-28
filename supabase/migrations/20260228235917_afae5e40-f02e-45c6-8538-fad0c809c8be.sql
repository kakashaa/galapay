
-- Drop the restrictive super admin policy for management
DROP POLICY IF EXISTS "Super admins can manage blocked codes" ON public.blocked_agency_codes;

-- Add permissive policies like other admin-managed tables
CREATE POLICY "Allow inserts to blocked codes" ON public.blocked_agency_codes
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow deletes from blocked codes" ON public.blocked_agency_codes
FOR DELETE USING (true);

CREATE POLICY "Allow updates to blocked codes" ON public.blocked_agency_codes
FOR UPDATE USING (true) WITH CHECK (true);
