-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view verified ban reports" ON public.ban_reports;

-- Create a new policy that allows anyone to view all ban reports for search functionality
CREATE POLICY "Anyone can view all ban reports" 
ON public.ban_reports 
FOR SELECT 
USING (true);