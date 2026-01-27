
-- Add unique constraint on country_code
ALTER TABLE public.countries_methods ADD CONSTRAINT countries_methods_country_code_unique UNIQUE (country_code);
