-- Create hosts table for top hosts spotlight
CREATE TABLE public.hosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  avatar_url TEXT,
  thank_you_text TEXT NOT NULL DEFAULT 'مضيفة مميزة في غلا لايف',
  ai_praise_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone can see hosts)
CREATE POLICY "Hosts are publicly viewable" 
ON public.hosts 
FOR SELECT 
USING (true);

-- Only admins can modify hosts
CREATE POLICY "Admins can manage hosts" 
ON public.hosts 
FOR ALL 
USING (public.is_admin_or_staff(auth.uid()));

-- Insert the 3 hosts from the images
INSERT INTO public.hosts (name, handle, avatar_url, thank_you_text, sort_order) VALUES
('ترف', '@11122', '/hosts/taraf.jpeg', 'مضيفة مميزة ومحبوبة في غلا لايف', 1),
('روفان', '@111333', '/hosts/rofan.jpeg', 'من أجمل المضيفات في التطبيق', 2),
('حبيبي شوقر دادي', '@3590817', '/hosts/sugar-daddy.jpeg', 'مضيفة رائعة ومتميزة', 3);