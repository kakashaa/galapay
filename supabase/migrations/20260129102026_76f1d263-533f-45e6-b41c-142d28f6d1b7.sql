-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 104857600);

-- Create table for video tutorials
CREATE TABLE public.video_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;

-- Public can view active videos
CREATE POLICY "Anyone can view active video tutorials"
  ON public.video_tutorials
  FOR SELECT
  USING (is_active = true);

-- Super admins can manage videos
CREATE POLICY "Super admins can manage video tutorials"
  ON public.video_tutorials
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Storage policies for videos bucket
CREATE POLICY "Anyone can view videos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Super admins can upload videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete videos"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'videos' AND is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_video_tutorials_updated_at
  BEFORE UPDATE ON public.video_tutorials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();