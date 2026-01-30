-- Create storage bucket for supporter avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('supporter-avatars', 'supporter-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view supporter avatars
CREATE POLICY "Anyone can view supporter avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'supporter-avatars');

-- Super admins can upload supporter avatars
CREATE POLICY "Super admins can upload supporter avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'supporter-avatars' 
  AND is_super_admin(auth.uid())
);

-- Super admins can update supporter avatars
CREATE POLICY "Super admins can update supporter avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'supporter-avatars' 
  AND is_super_admin(auth.uid())
);

-- Super admins can delete supporter avatars
CREATE POLICY "Super admins can delete supporter avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'supporter-avatars' 
  AND is_super_admin(auth.uid())
);