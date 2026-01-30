-- Create supporters table
CREATE TABLE public.supporters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  avatar_url TEXT,
  thank_you_text TEXT NOT NULL DEFAULT 'شكرًا جزيلًا لدعمك لتطبيق غلا لايف',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supporters ENABLE ROW LEVEL SECURITY;

-- Anyone can view active supporters
CREATE POLICY "Anyone can view active supporters"
  ON public.supporters
  FOR SELECT
  USING (is_active = true);

-- Super admins can manage supporters
CREATE POLICY "Super admins can manage supporters"
  ON public.supporters
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_supporters_updated_at
  BEFORE UPDATE ON public.supporters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.supporters (name, handle, thank_you_text, sort_order) VALUES
  ('أحمد محمد', '@ahmed_m', 'شكرًا جزيلًا لدعمك لتطبيق غلا لايف', 1),
  ('سارة علي', '@sara_ali', 'نقدر دعمك الكريم ❤️', 2),
  ('خالد العمري', '@khaled99', 'شكرًا لثقتك في غلا لايف', 3),
  ('فاطمة حسن', '@fatima_h', 'دعمك يعني لنا الكثير 🌟', 4),
  ('عبدالله سعد', '@abdullah_s', 'شكرًا جزيلًا لدعمك لتطبيق غلا لايف', 5);