-- Add AI praise text column to supporters table
ALTER TABLE public.supporters 
ADD COLUMN IF NOT EXISTS ai_praise_text text;

-- Add comment explaining the column
COMMENT ON COLUMN public.supporters.ai_praise_text IS 'AI-generated unique praise text for each supporter';