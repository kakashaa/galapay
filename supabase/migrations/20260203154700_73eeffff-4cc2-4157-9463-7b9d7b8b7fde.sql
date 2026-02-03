-- Drop old restrictive UPDATE policies
DROP POLICY IF EXISTS "Only super admin can update requests" ON payout_requests;
DROP POLICY IF EXISTS "Only super admin can update instant requests" ON instant_payout_requests;
DROP POLICY IF EXISTS "Super admin can update special id requests" ON special_id_requests;
DROP POLICY IF EXISTS "Super admin can update coins payout requests" ON coins_payout_requests;
DROP POLICY IF EXISTS "Super admin can update ban reports" ON ban_reports;

-- Drop old restrictive DELETE policies
DROP POLICY IF EXISTS "Super admins can delete requests" ON payout_requests;
DROP POLICY IF EXISTS "Super admins can delete instant requests" ON instant_payout_requests;
DROP POLICY IF EXISTS "Super admin can delete special id requests" ON special_id_requests;
DROP POLICY IF EXISTS "Super admin can delete coins payout requests" ON coins_payout_requests;
DROP POLICY IF EXISTS "Super admin can delete ban reports" ON ban_reports;

-- Create new permissive UPDATE policies (frontend handles auth via access codes)
CREATE POLICY "Allow updates from admin portal" ON payout_requests
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow updates from admin portal" ON instant_payout_requests
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow updates from admin portal" ON special_id_requests
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow updates from admin portal" ON coins_payout_requests
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow updates from admin portal" ON ban_reports
  FOR UPDATE USING (true) WITH CHECK (true);

-- Create new permissive DELETE policies (frontend handles auth via access codes)
CREATE POLICY "Allow deletes from admin portal" ON payout_requests
  FOR DELETE USING (true);

CREATE POLICY "Allow deletes from admin portal" ON instant_payout_requests
  FOR DELETE USING (true);

CREATE POLICY "Allow deletes from admin portal" ON special_id_requests
  FOR DELETE USING (true);

CREATE POLICY "Allow deletes from admin portal" ON coins_payout_requests
  FOR DELETE USING (true);

CREATE POLICY "Allow deletes from admin portal" ON ban_reports
  FOR DELETE USING (true);